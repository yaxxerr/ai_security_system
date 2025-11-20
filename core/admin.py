from django.contrib import admin
from .models import User, Camera, Incident, Alert, Report, AIVerificationLog


# ==========================
#  CUSTOM ADMIN CONFIG
# ==========================

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'is_active', 'is_staff', 'last_login')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('username', 'email')
    ordering = ('username',)


@admin.register(Camera)
class CameraAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'ip_address', 'is_active', 'last_checked')
    list_filter = ('is_active',)
    search_fields = ('name', 'location', 'ip_address')
    ordering = ('name',)


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ('id', 'camera', 'detected_by', 'timestamp', 'is_verified')
    list_filter = ('detected_by', 'is_verified', 'timestamp')
    search_fields = ('description', 'camera__name')
    date_hierarchy = 'timestamp'
    ordering = ('-timestamp',)


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('id', 'message_preview', 'created_by', 'created_at', 'acknowledged')
    list_filter = ('acknowledged', 'created_at')
    search_fields = ('message', 'created_by__username')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    def message_preview(self, obj):
        return obj.message[:50] + ("..." if len(obj.message) > 50 else "")
    message_preview.short_description = "Message"


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'generated_by', 'created_at', 'period_start', 'period_end')
    list_filter = ('created_at',)
    search_fields = ('generated_by__username', 'summary')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)


@admin.register(AIVerificationLog)
class AIVerificationLogAdmin(admin.ModelAdmin):
    list_display = ('incident', 'decision', 'confidence_score', 'created_at')
    list_filter = ('decision', 'created_at')
    search_fields = ('incident__camera__name', 'decision')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
