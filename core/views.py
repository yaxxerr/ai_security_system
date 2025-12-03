from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from django.utils import timezone
from django.contrib.auth import authenticate
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import User, Camera, Incident, Alert, Report, AIVerificationLog
from .serializers import (
    UserSerializer,
    CameraSerializer,
    IncidentSerializer,
    AlertSerializer,
    ReportSerializer,
    AIVerificationLogSerializer,
)


# ==========================
#  BASIC CRUD VIEWSETS
# ==========================

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]  # Allow unauthenticated access for development


class CameraViewSet(viewsets.ModelViewSet):
    queryset = Camera.objects.all().order_by('-last_checked')
    serializer_class = CameraSerializer
    permission_classes = [AllowAny]  # Allow unauthenticated access for development

    @action(detail=True, methods=['get'])
    def feed(self, request, pk=None):
        """Get camera feed URL - returns the video feed endpoint"""
        try:
            camera = Camera.objects.get(pk=pk)
            # Return the feed URL - frontend will use this to display the camera
            return Response({
                'camera_id': camera.id,
                'camera_name': camera.name,
                'feed_url': f'http://127.0.0.1:5001/video_feed?camera_id={camera.id}',
                'ip_address': camera.ip_address,
            })
        except Camera.DoesNotExist:
            return Response({'error': 'Camera not found'}, status=status.HTTP_404_NOT_FOUND)


class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.all().order_by('-timestamp')
    serializer_class = IncidentSerializer
    permission_classes = [AllowAny]  # Allow unauthenticated access for development

    def create(self, request, *args, **kwargs):
        """
        Handles manual, YOLO, and AI-created incidents.
        Auto-creates an Alert when type = CRITICAL.
        """
        camera_id = request.data.get("camera_id")
        description = request.data.get("description", "Incident reported")
        incident_type = request.data.get("type", "WORTH_CHECKING")
        severity = request.data.get("severity", 1)

        confidence_score = request.data.get("confidence_score", None)

        if not camera_id:
            return Response({"error": "camera_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            camera = Camera.objects.get(id=camera_id)
        except Camera.DoesNotExist:
            return Response({"error": "Invalid camera ID"}, status=status.HTTP_404_NOT_FOUND)

        # Determine detection source
        detected_by = "AI" if confidence_score is not None else "MANUAL"

        # Create incident
        incident = Incident.objects.create(
            camera=camera,
            description=description,
            detected_by=detected_by,
            type=incident_type,
            severity=severity,
            is_verified=False,
            confidence_score=confidence_score if confidence_score is not None else 0.0,
            ai_summary=request.data.get("ai_summary", None)
        )

        # Log AI verification if confidence_score provided
        if confidence_score is not None:
            AIVerificationLog.objects.create(
                incident=incident,
                decision="CONFIRMED",
                confidence_score=confidence_score
            )

        # AUTO-CREATE ALERT IF INCIDENT IS CRITICAL
        if incident_type == "CRITICAL":
            alert = Alert.objects.create(
                incident=incident,
                title=f"⚠️ Critical Alert - {camera.name}",
                message=f"Critical incident detected: {description}",
                created_by=None  # system generated
            )
            # Send WebSocket notification
            try:
                channel_layer = get_channel_layer()
                if channel_layer:
                    alert_serializer = AlertSerializer(alert)
                    async_to_sync(channel_layer.group_send)(
                        'alerts',
                        {
                            'type': 'alert_message',
                            'message': 'New critical alert',
                            'alert_data': {
                                'action': 'created',
                                'alert': alert_serializer.data,
                            }
                        }
                    )
            except Exception as e:
                print(f"Error sending WebSocket message: {e}")

        serializer = IncidentSerializer(incident)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all().order_by('-created_at')
    serializer_class = AlertSerializer
    permission_classes = [AllowAny]  # Allow unauthenticated access for development

    def create(self, request, *args, **kwargs):
        """Create alert and send WebSocket notification"""
        response = super().create(request, *args, **kwargs)
        
        # Send WebSocket message
        if response.status_code == status.HTTP_201_CREATED:
            alert_data = response.data
            self._send_websocket_alert('created', alert_data)
        
        return response

    def update(self, request, *args, **kwargs):
        """Update alert and send WebSocket notification"""
        response = super().update(request, *args, **kwargs)
        
        # Send WebSocket message
        if response.status_code == status.HTTP_200_OK:
            alert_data = response.data
            self._send_websocket_alert('updated', alert_data)
        
        return response

    def partial_update(self, request, *args, **kwargs):
        """Partial update alert and send WebSocket notification"""
        response = super().partial_update(request, *args, **kwargs)
        
        # Send WebSocket message
        if response.status_code == status.HTTP_200_OK:
            alert_data = response.data
            self._send_websocket_alert('updated', alert_data)
        
        return response

    def _send_websocket_alert(self, action: str, alert_data: dict):
        """Send alert update via WebSocket"""
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    'alerts',
                    {
                        'type': 'alert_message',
                        'message': f'Alert {action}',
                        'alert_data': {
                            'action': action,
                            'alert': alert_data,
                        }
                    }
                )
        except Exception as e:
            print(f"Error sending WebSocket message: {e}")


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all().order_by('-created_at')
    serializer_class = ReportSerializer
    permission_classes = [AllowAny]  # Allow unauthenticated access for development


class AIVerificationLogViewSet(viewsets.ModelViewSet):
    queryset = AIVerificationLog.objects.all().order_by('-created_at')
    serializer_class = AIVerificationLogSerializer
    permission_classes = [AllowAny]  # Allow unauthenticated access for development



# ==========================
#  CUSTOM ENDPOINTS
# ==========================

@api_view(['POST'])
@authentication_classes([])  # No authentication required for login
@permission_classes([AllowAny])
def login(request):
    """Authenticate user with username and password"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Check if user exists first
        try:
            user_obj = User.objects.get(username=username)
        except User.DoesNotExist:
            print(f"Login attempt: User '{username}' does not exist")
            return Response(
                {'error': 'User does not exist'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if user is active
        if not user_obj.is_active:
            print(f"Login attempt: User '{username}' is inactive")
            return Response(
                {'error': 'User account is disabled'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if user has a password set
        if not user_obj.password or user_obj.password == '':
            print(f"Login attempt: User '{username}' has no password set")
            return Response(
                {'error': 'User account has no password set. Please set a password in Django admin.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Use Django's authenticate function
        user = authenticate(request, username=username, password=password)
        
        if user is None:
            # Password is incorrect
            print(f"Login attempt: Invalid password for user '{username}'")
            return Response(
                {'error': 'Invalid password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        print(f"Login successful for user '{username}'")
        
        # Serialize user data (without password)
        from .serializers import UserSerializer
        user_data = UserSerializer(user).data
        
        # Generate a simple token (in production, use JWT or similar)
        import hashlib
        import time
        token_string = f"{user.id}_{user.username}_{time.time()}"
        token = hashlib.sha256(token_string.encode()).hexdigest()
        
        return Response({
            'token': token,
            'user': user_data,
            'message': 'Login successful'
        })
        
    except Exception as e:
        import traceback
        print(f"Login error: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {'error': f'Authentication error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])  # Allow unauthenticated access for development
def start_analysis(request):
    camera_ids = request.data.get("camera_ids", [])

    if not camera_ids:
        return Response({"error": "camera_ids is required"}, status=status.HTTP_400_BAD_REQUEST)

    cameras = list(Camera.objects.filter(id__in=camera_ids))

    if not cameras:
        return Response({"error": "No matching cameras found"}, status=status.HTTP_404_NOT_FOUND)

    Camera.objects.filter(id__in=camera_ids).update(is_active=True, last_checked=timezone.now())

    results = [
        {"camera": cam.name, "status": "Analyzing", "result": "Waiting for detections..."}
        for cam in cameras
    ]

    return Response({"message": "Analysis started successfully", "results": results})


@api_view(['POST'])
@permission_classes([AllowAny])  # Allow unauthenticated access for development
def stop_analysis(request):
    camera_ids = request.data.get("camera_ids", [])

    if not camera_ids:
        return Response({"error": "camera_ids is required"}, status=status.HTTP_400_BAD_REQUEST)

    cameras = list(Camera.objects.filter(id__in=camera_ids))

    if not cameras:
        return Response({"error": "No matching cameras found"}, status=status.HTTP_404_NOT_FOUND)

    Camera.objects.filter(id__in=camera_ids).update(is_active=False, last_checked=timezone.now())

    results = [
        {"camera": cam.name, "status": "Stopped", "result": "Analysis halted"}
        for cam in cameras
    ]

    return Response({"message": "Analysis stopped successfully", "results": results})


@api_view(['GET'])
@permission_classes([AllowAny])  # Allow unauthenticated access for development
def dashboard_stats(request):
    data = {
        "total_cameras": Camera.objects.count(),
        "active_cameras": Camera.objects.filter(is_active=True).count(),
        "recent_alerts": Alert.objects.order_by('-created_at')[:5].values('title', 'message', 'created_at'),
        "active_incidents": Incident.objects.filter(is_verified=False).count(),
        "last_reports": Report.objects.order_by('-created_at')[:3].values('summary', 'created_at'),
    }
    return Response(data)
