from django.db import models
from django.contrib.auth.models import AbstractUser


# ==========================
#  USER SYSTEM
# ==========================

class User(AbstractUser):
    ROLE_CHOICES = [
        ('ADMIN', 'Administrator'),
        ('AGENT', 'Agent Controller'),
        ('AI', 'AI Agent'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='AGENT')

    # Fix group conflicts
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        related_name='core_user_set',
        related_query_name='core_user',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        related_name='core_user_set',
        related_query_name='core_user',
    )

    def __str__(self):
        return f"{self.username} ({self.role})"


# ==========================
#  CAMERA SYSTEM
# ==========================

class Camera(models.Model):
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField()
    is_active = models.BooleanField(default=True)
    last_checked = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} - {self.location}"


# ==========================
#  INCIDENT SYSTEM
# ==========================

class Incident(models.Model):
    INCIDENT_TYPES = [
        ('WORTH_CHECKING', 'Worth Checking'),
        ('DANGEROUS', 'Dangerous'),
        ('CRITICAL', 'Critical'),
    ]

    detected_by = models.CharField(max_length=50, choices=[
        ('YOLO', 'YOLO Local Detection'),
        ('AI', 'AI Verification'),
        ('MANUAL', 'Manual Report'),
    ])

    camera = models.ForeignKey(Camera, on_delete=models.CASCADE, related_name='incidents')
    timestamp = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True)

    type = models.CharField(max_length=20, choices=INCIDENT_TYPES, default='WORTH_CHECKING')

    # 1=low priority, 3=critical
    severity_level = models.IntegerField(default=1)

    is_verified = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        # Automatically assign severity numeric value
        if self.type == 'WORTH_CHECKING':
            self.severity_level = 1
        elif self.type == 'DANGEROUS':
            self.severity_level = 2
        elif self.type == 'CRITICAL':
            self.severity_level = 3

        creating = self.pk is None
        super().save(*args, **kwargs)

        # AUTO-CREATE ALERT IF CRITICAL
        if creating and self.type == 'CRITICAL':
            Alert.objects.create(
                incident=self,
                title="Critical Incident Detected",
                message=f"A critical incident occurred on camera: {self.camera.name}.",
                acknowledged=False
            )

    def __str__(self):
        return f"Incident #{self.id} - {self.type} ({self.camera.name})"


# ==========================
#  ALERT SYSTEM
# ==========================

class Alert(models.Model):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='alerts',
                                 null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL,
                                   null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    title = models.CharField(max_length=150, default="Security Alert")
    message = models.TextField()

    acknowledged = models.BooleanField(default=False)

    def __str__(self):
        return f"Alert #{self.id} - {self.title}"


# ==========================
#  REPORTING
# ==========================

class Report(models.Model):
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    summary = models.TextField()
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()

    def __str__(self):
        return f"Report by {self.generated_by} on {self.created_at.strftime('%Y-%m-%d')}"


# ==========================
#  AI VERIFICATION LOGS
# ==========================

class AIVerificationLog(models.Model):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE,
                                 related_name='ai_verifications',
                                 null=True, blank=True)

    confidence_score = models.FloatField(null=True, blank=True)
    decision = models.CharField(max_length=20, choices=[
        ('SAFE', 'Safe'),
        ('SUSPICIOUS', 'Suspicious'),
        ('CONFIRMED', 'Confirmed Incident'),
    ])

    raw_response = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"AI Verification - {self.decision} ({self.confidence_score or 'N/A'})"
