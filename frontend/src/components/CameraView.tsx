import { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';

interface CameraViewProps {
  visible: boolean;
  onHide: () => void;
  cameraId?: number;
  cameraName?: string;
  cameraIp?: string;
  darkMode?: boolean;
}

export default function CameraView({
  visible,
  onHide,
  cameraId,
  cameraName = 'Camera Feed',
  cameraIp,
  darkMode = false,
}: CameraViewProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  // Construct video feed URL - use the Flask video feed server
  const videoFeedUrl = cameraId
    ? `http://127.0.0.1:5001/video_feed?camera_id=${cameraId}`
    : cameraIp
    ? `http://127.0.0.1:5001/video_feed?ip=${cameraIp}`
    : 'http://127.0.0.1:5001/video_feed';

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setError(null);
      
      // Test if the feed is accessible
      const testImg = new Image();
      testImg.onload = () => {
        setLoading(false);
        setError(null);
      };
      testImg.onerror = () => {
        setLoading(false);
        setError('Unable to load camera feed. Please check if the camera is active.');
      };
      testImg.src = videoFeedUrl;
    }
  }, [visible, videoFeedUrl]);

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={cameraName}
      modal
      draggable={false}
      resizable={false}
      style={{ width: '90vw', maxWidth: '1200px' }}
      contentStyle={{
        padding: 0,
        backgroundColor: darkMode ? '#111827' : '#ffffff',
      }}
      className={darkMode ? 'dark-dialog' : ''}
    >
      <div
        className={`w-full ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} p-4`}
        style={{ minHeight: '70vh' }}
      >
        {loading && (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <i className="pi pi-spin pi-spinner text-4xl text-blue-500 mb-3 block"></i>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                Loading camera feed...
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-96">
            <Card className="w-full max-w-md">
              <div className="text-center p-6">
                <i className="pi pi-exclamation-triangle text-5xl text-red-500 mb-4 block"></i>
                <h3 className="text-xl font-bold mb-2">Camera Feed Unavailable</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button
                  label="Close"
                  icon="pi pi-times"
                  onClick={onHide}
                  className="p-button-secondary"
                />
              </div>
            </Card>
          </div>
        )}

        {!loading && !error && (
          <div className="relative w-full bg-black rounded-lg overflow-hidden">
            <img
              ref={imgRef}
              src={videoFeedUrl}
              alt={cameraName}
              className="w-full h-auto max-h-[70vh] object-contain"
              onError={() => {
                setError('Failed to load camera feed');
                setLoading(false);
              }}
              onLoad={() => {
                setLoading(false);
                setError(null);
              }}
            />
            <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button
            label="Close"
            icon="pi pi-times"
            onClick={onHide}
            className="p-button-secondary"
          />
        </div>
      </div>
    </Dialog>
  );
}

