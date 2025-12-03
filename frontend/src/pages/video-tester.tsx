import { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { Dialog } from 'primereact/dialog';
import apiClient from '../utils/api';

interface VideoFile {
  name: string;
  path: string;
}

interface DetectionLog {
  timestamp: string;
  description: string;
  confidence: number;
  ai_summary?: string;
}

export default function VideoDetectionTester() {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [detectionLogs, setDetectionLogs] = useState<DetectionLog[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [showOutput, setShowOutput] = useState(false);

  // Load available videos on mount
  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/videos/');
      setVideos(res.data || []);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
      setStatusMessage('❌ Failed to load videos from backend');
    } finally {
      setLoading(false);
    }
  };

  const startDetection = async () => {
    if (!selectedVideo) {
      setStatusMessage('⚠️ Please select a video first');
      return;
    }

    try {
      setRunning(true);
      setDetectionLogs([]);
      setStatusMessage(`🔄 Starting detection on: ${selectedVideo}`);
      setShowOutput(true);

      // Call backend endpoint to start YOLO detection on the video
      const res = await apiClient.post('/detection/start/', {
        video_path: selectedVideo,
      });

      setStatusMessage(`✅ Detection started - Task ID: ${res.data.task_id}`);

      // Poll for results
      pollDetectionResults(res.data.task_id);
    } catch (err: any) {
      console.error('Failed to start detection:', err);
      setStatusMessage(`❌ Error: ${err.response?.data?.detail || 'Unknown error'}`);
      setRunning(false);
    }
  };

  const pollDetectionResults = async (taskId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/detection/status/${taskId}/`);

        if (res.data.logs) {
          setDetectionLogs(res.data.logs);
        }

        if (res.data.status === 'completed' || res.data.status === 'error') {
          clearInterval(pollInterval);
          setRunning(false);
          setStatusMessage(
            res.data.status === 'completed'
              ? `✅ Detection completed! ${res.data.logs?.length || 0} incidents detected.`
              : `❌ Detection failed: ${res.data.error}`
          );
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 2000); // Poll every 2 seconds
  };

  const stopDetection = async () => {
    try {
      await apiClient.post('/detection/stop/', {});
      setRunning(false);
      setStatusMessage('🛑 Detection stopped');
    } catch (err) {
      console.error('Failed to stop detection:', err);
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <Card className="shadow-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">🎬 Video Detection Tester</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Select a video file from the backend folder and run YOLO detection on it to test the AI system.
          </p>

          {/* Status Message */}
          {statusMessage && (
            <Message
              severity={
                statusMessage.startsWith('✅')
                  ? 'success'
                  : statusMessage.startsWith('❌')
                  ? 'error'
                  : 'info'
              }
              text={statusMessage}
              className="mb-4 w-full"
            />
          )}

          {/* Video Selection */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Select Video File</label>
              <Dropdown
                value={selectedVideo}
                onChange={(e) => setSelectedVideo(e.value)}
                options={videos}
                optionLabel="name"
                optionValue="path"
                placeholder="Choose a video..."
                className="w-full"
                disabled={running || loading}
              />
            </div>

            <div className="flex gap-3">
              <Button
                label={running ? 'Running...' : 'Start Detection'}
                icon={running ? 'pi pi-spin pi-spinner' : 'pi pi-play'}
                onClick={startDetection}
                disabled={!selectedVideo || running}
                className="p-button-success"
              />
              {running && (
                <Button
                  label="Stop"
                  icon="pi pi-stop"
                  onClick={stopDetection}
                  className="p-button-danger"
                />
              )}
              <Button
                label="Refresh Videos"
                icon="pi pi-refresh"
                onClick={fetchVideos}
                disabled={running}
                className="p-button-secondary"
              />
            </div>
          </div>

          {/* Detection Progress */}
          {running && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <i className="pi pi-spin pi-spinner text-2xl text-blue-500"></i>
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    Detection in Progress
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Processing video frames... Detections will appear below.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Detection Results */}
          {detectionLogs.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-3">
                📊 Detection Results ({detectionLogs.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {detectionLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {log.timestamp}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                        {Math.round(log.confidence)}%
                      </span>
                    </div>
                    <p className="font-medium mb-1">{log.description}</p>
                    {log.ai_summary && (
                      <p className="text-sm italic text-gray-600 dark:text-gray-400">
                        🤖 {log.ai_summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!running && detectionLogs.length === 0 && selectedVideo && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <i className="pi pi-inbox text-5xl mb-3 block opacity-30"></i>
              <p>No detections yet. Click "Start Detection" to begin.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Output Dialog (optional - shows raw output) */}
      <Dialog
        header="Detection Output"
        visible={showOutput}
        onHide={() => setShowOutput(false)}
        style={{ width: '80vw', maxWidth: '900px' }}
        modal
      >
        <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
          {detectionLogs.length > 0 ? (
            detectionLogs.map((log, idx) => (
              <div key={idx} className="mb-2">
                <span className="text-green-400">[{log.timestamp}]</span> {log.description}
              </div>
            ))
          ) : (
            <div className="text-gray-500">Waiting for output...</div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
