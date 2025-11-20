from rest_framework import serializers
from .models import User, Camera, Incident, Alert, Report, AIVerificationLog


# ==========================
#  USER
# ==========================

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'is_active', 'is_staff']


# ==========================
#  CAMERA
# ==========================

class CameraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Camera
        fields = ['id', 'name', 'location', 'ip_address', 'is_active', 'last_checked']


# ==========================
#  INCIDENT
# ==========================

class IncidentSerializer(serializers.ModelSerializer):
    camera = CameraSerializer(read_only=True)

    camera_id = serializers.PrimaryKeyRelatedField(
        queryset=Camera.objects.all(),
        source='camera',
        write_only=True
    )

    class Meta:
        model = Incident
        fields = [
            'id',
            'camera',
            'camera_id',
            'description',
            'detected_by',
            'timestamp',
            'is_verified',
            'type'      # NEW
        ]


# ==========================
#  ALERT
# ==========================

class AlertSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    created_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='created_by',
        write_only=True
    )

    incident = IncidentSerializer(read_only=True)
    incident_id = serializers.PrimaryKeyRelatedField(
        queryset=Incident.objects.all(),
        source='incident',
        write_only=True,
        required=False
    )

    class Meta:
        model = Alert
        fields = [
            'id',
            'title',           # NEW
            'message',
            'incident',
            'incident_id',
            'created_by',
            'created_by_id',
            'created_at',
            'acknowledged'
        ]


# ==========================
#  REPORT
# ==========================

class ReportSerializer(serializers.ModelSerializer):
    generated_by = UserSerializer(read_only=True)
    generated_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='generated_by',
        write_only=True
    )

    class Meta:
        model = Report
        fields = [
            'id',
            'summary',
            'period_start',
            'period_end',
            'generated_by',
            'generated_by_id',
            'created_at'
        ]


# ==========================
#  AI VERIFICATION LOGS
# ==========================

class AIVerificationLogSerializer(serializers.ModelSerializer):
    incident = IncidentSerializer(read_only=True)
    incident_id = serializers.PrimaryKeyRelatedField(
        queryset=Incident.objects.all(),
        source='incident',
        write_only=True
    )

    class Meta:
        model = AIVerificationLog
        fields = [
            'id',
            'incident',
            'incident_id',
            'decision',
            'confidence_score',
            'raw_response',
            'created_at'
        ]
