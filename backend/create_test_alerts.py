"""
Script to create test alerts for testing the alerts page.
Run this from the Django shell or as a management command.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import Camera, Incident, Alert, User
from django.utils import timezone

def create_test_alerts():
    """Create test alerts with various scenarios"""
    
    # Get or create a test camera
    camera, _ = Camera.objects.get_or_create(
        name="Test Camera 1",
        defaults={
            'location': "Main Entrance",
            'ip_address': "192.168.1.100",
            'is_active': True
        }
    )
    
    # Get or create a test user
    user, _ = User.objects.get_or_create(
        username='testuser',
        defaults={
            'email': 'test@example.com',
            'role': 'AGENT'
        }
    )
    
    # Create test incidents
    incidents = []
    
    # Incident 1: YOLO Detection
    incident1, _ = Incident.objects.get_or_create(
        camera=camera,
        detected_by='YOLO',
        defaults={
            'description': 'Person detected near entrance with high confidence',
            'is_verified': False
        }
    )
    incidents.append(incident1)
    
    # Incident 2: AI Detection
    incident2, _ = Incident.objects.get_or_create(
        camera=camera,
        detected_by='AI',
        defaults={
            'description': 'Suspicious behavior detected by AI analysis',
            'is_verified': False
        }
    )
    incidents.append(incident2)
    
    # Incident 3: Manual Report
    incident3, _ = Incident.objects.get_or_create(
        camera=camera,
        detected_by='MANUAL',
        defaults={
            'description': 'Security guard reported unauthorized access',
            'is_verified': True
        }
    )
    incidents.append(incident3)
    
    # Create test alerts
    alerts_created = []
    
    # Alert 1: Unacknowledged with YOLO incident
    alert1, created = Alert.objects.get_or_create(
        message='⚠️ CRITICAL: Person detected with weapon',
        defaults={
            'incident': incident1,
            'created_by': user,
            'acknowledged': False
        }
    )
    if created:
        alerts_created.append(alert1)
        print(f"✅ Created Alert #{alert1.id}: {alert1.message}")
    
    # Alert 2: Unacknowledged with AI incident
    alert2, created = Alert.objects.get_or_create(
        message='🔍 AI Analysis: Suspicious activity detected',
        defaults={
            'incident': incident2,
            'created_by': user,
            'acknowledged': False
        }
    )
    if created:
        alerts_created.append(alert2)
        print(f"✅ Created Alert #{alert2.id}: {alert2.message}")
    
    # Alert 3: Acknowledged alert
    alert3, created = Alert.objects.get_or_create(
        message='✅ Manual Report: Unauthorized access resolved',
        defaults={
            'incident': incident3,
            'created_by': user,
            'acknowledged': True
        }
    )
    if created:
        alerts_created.append(alert3)
        print(f"✅ Created Alert #{alert3.id}: {alert3.message}")
    
    # Alert 4: Alert without incident (standalone)
    alert4, created = Alert.objects.get_or_create(
        message='📢 System Notice: Camera maintenance scheduled',
        defaults={
            'incident': None,
            'created_by': user,
            'acknowledged': False
        }
    )
    if created:
        alerts_created.append(alert4)
        print(f"✅ Created Alert #{alert4.id}: {alert4.message}")
    
    # Alert 5: Another unacknowledged alert
    alert5, created = Alert.objects.get_or_create(
        message='🚨 High Priority: Multiple detections in parking lot',
        defaults={
            'incident': None,
            'created_by': user,
            'acknowledged': False
        }
    )
    if created:
        alerts_created.append(alert5)
        print(f"✅ Created Alert #{alert5.id}: {alert5.message}")
    
    print(f"\n🎉 Created {len(alerts_created)} test alerts!")
    print(f"📊 Total alerts in database: {Alert.objects.count()}")
    print(f"   - Active (unacknowledged): {Alert.objects.filter(acknowledged=False).count()}")
    print(f"   - Resolved (acknowledged): {Alert.objects.filter(acknowledged=True).count()}")
    
    return alerts_created

if __name__ == '__main__':
    create_test_alerts()

