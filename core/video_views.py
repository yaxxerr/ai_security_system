"""
API endpoints for video-based AI detection testing
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
import os
import subprocess
import json
from django.conf import settings

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv']


class VideoDetectionViewSet(viewsets.ViewSet):
    """Endpoints for video detection testing."""

    @action(detail=False, methods=['get'])
    def videos(self, request):
        """List all video files in backend folder."""
        videos = []
        backend_path = BACKEND_DIR

        try:
            for filename in os.listdir(backend_path):
                if any(filename.lower().endswith(ext) for ext in VIDEO_EXTENSIONS):
                    full_path = os.path.join(backend_path, filename)
                    videos.append({
                        'name': filename,
                        'path': full_path,
                        'size': os.path.getsize(full_path),
                    })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(videos)

    @action(detail=False, methods=['post'])
    def start(self, request):
        """Start YOLO detection on a video file."""
        video_path = request.data.get('video_path')

        if not video_path:
            return Response(
                {'error': 'video_path is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not os.path.exists(video_path):
            return Response(
                {'error': f'Video file not found: {video_path}'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Generate a task ID (simple approach: use timestamp)
        import time
        task_id = str(int(time.time() * 1000))

        # Start the YOLO detector in the background
        try:
            cmd = [
                'python', 'backend/yolo_detector_v2.py',
                '--source', video_path,
                '--confidence', '0.4',
                '--cooldown', '5',
                '--backend', 'http://127.0.0.1:8000/api/incidents/',
                '--camera-id', '1',
            ]

            # Run in background (store PID for later stop)
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            # Store process info in session or cache (simple approach)
            request.session['detection_process'] = process.pid
            request.session.save()

            return Response({
                'task_id': task_id,
                'pid': process.pid,
                'status': 'started',
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def stop(self, request):
        """Stop the running detection process."""
        try:
            pid = request.session.get('detection_process')
            if pid:
                import signal
                os.kill(pid, signal.SIGTERM)
                del request.session['detection_process']
                request.session.save()
                return Response({'status': 'stopped'})
            return Response(
                {'error': 'No detection process running'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get status of detection (simplified - returns last incidents)."""
        try:
            from core.models import Incident
            # Return recent incidents
            recent = Incident.objects.order_by('-timestamp')[:20]
            logs = [
                {
                    'timestamp': inc.timestamp.strftime('%H:%M:%S'),
                    'description': inc.description,
                    'confidence': getattr(inc, 'confidence_score', 0),
                    'ai_summary': inc.ai_summary,
                }
                for inc in recent
            ]
            return Response({
                'status': 'running',
                'logs': logs,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
