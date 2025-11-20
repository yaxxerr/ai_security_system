#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test script to create alerts with different urgency levels for testing the dashboard urgency display.
Run this from Django shell: python manage.py shell, then:
exec(open('backend/test_alert_urgency.py', encoding='utf-8').read())
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import Camera, Incident, Alert, User
from django.utils import timezone

print("🧪 Testing Alert Urgency Display")
print("=" * 50)

# Get or create test data
camera = Camera.objects.first()
if not camera:
    camera = Camera.objects.create(
        name="Test Camera 1",
        location="Main Entrance",
        ip_address="192.168.1.100"
    )
    print(f"✅ Created test camera: {camera.name}")

user = User.objects.first()
if not user:
    print("⚠️  No users found. Please create a superuser first: python manage.py createsuperuser")
    sys.exit(1)

print(f"✅ Using user: {user.username}")
print(f"✅ Using camera: {camera.name}")
print()

# Delete existing test alerts (optional - uncomment to clean up)
# Alert.objects.filter(message__startswith="🧪 TEST").delete()

# Create test alerts with different urgency levels
test_alerts = [
    {
        "message": "⚠️ WEAPON DETECTED - Knife detected in camera view",
        "incident_description": "⚠️ Security objects detected: knife (85.3%)",
        "urgency": "CRITICAL",
        "color": "Red"
    },
    {
        "message": "⚠️ CRITICAL: Gun detected in security zone",
        "incident_description": "⚠️ WEAPON DETECTED - Security objects detected: gun (92.1%)",
        "urgency": "CRITICAL",
        "color": "Red"
    },
    {
        "message": "High Risk: Bear detected near perimeter",
        "incident_description": "Security objects detected: bear (78.5%)",
        "urgency": "HIGH",
        "color": "Orange"
    },
    {
        "message": "⚠️ Suspicious activity detected - Baseball bat found",
        "incident_description": "Security objects detected: baseball bat (82.0%)",
        "urgency": "HIGH",
        "color": "Orange"
    },
    {
        "message": "Person detected in restricted area",
        "incident_description": "Security objects detected: person (91.2%)",
        "urgency": "MEDIUM",
        "color": "Yellow"
    },
    {
        "message": "Backpack detected at entrance",
        "incident_description": "Security objects detected: backpack (75.4%)",
        "urgency": "MEDIUM",
        "color": "Yellow"
    },
    {
        "message": "Bicycle detected in parking lot",
        "incident_description": "Security objects detected: bicycle (68.9%)",
        "urgency": "LOW",
        "color": "Blue"
    },
    {
        "message": "Car detected in parking area",
        "incident_description": "Security objects detected: car (73.2%)",
        "urgency": "LOW",
        "color": "Blue"
    },
]

created_count = 0

for i, alert_data in enumerate(test_alerts, 1):
    # Create incident first
    incident = Incident.objects.create(
        camera=camera,
        description=alert_data["incident_description"],
        detected_by="YOLO",
        is_verified=False
    )
    
    # Create alert
    alert = Alert.objects.create(
        message=alert_data["message"],
        incident=incident,
        created_by=user,
        acknowledged=False  # All test alerts are unacknowledged
    )
    
    created_count += 1
    print(f"✅ Created {alert_data['urgency']} urgency alert #{alert.id}: {alert_data['message'][:50]}...")

print()
print("=" * 50)
print(f"✅ Successfully created {created_count} test alerts!")
print()
print("📋 Next Steps:")
print("1. Open your dashboard at: http://localhost:5173")
print("2. The alert overlay should appear automatically for the first unacknowledged alert")
print("3. Check the urgency indicator (left sidebar) - should show CRITICAL, HIGH, MEDIUM, or LOW")
print("4. Verify colors match urgency levels:")
print("   - CRITICAL: Red (pulsing animation)")
print("   - HIGH: Orange (subtle pulse)")
print("   - MEDIUM: Yellow")
print("   - LOW: Blue")
print()
print("5. To test overlay appearance:")
print("   - Acknowledge all alerts first")
print("   - Create a new alert using this script again")
print("   - The overlay should appear immediately")
print()
print("🔧 To clean up test alerts:")
print("   Alert.objects.filter(message__contains='detected').delete()")
