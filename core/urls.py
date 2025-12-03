from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet,
    CameraViewSet,
    IncidentViewSet,
    AlertViewSet,
    ReportViewSet,
    AIVerificationLogViewSet,
    login,
    start_analysis,
    stop_analysis,
    dashboard_stats,
)
from .video_views import VideoDetectionViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'cameras', CameraViewSet)
router.register(r'incidents', IncidentViewSet)
router.register(r'alerts', AlertViewSet)
router.register(r'reports', ReportViewSet)
router.register(r'ai-logs', AIVerificationLogViewSet)
router.register(r'detection', VideoDetectionViewSet, basename='detection')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', login, name='login'),
    path('analysis/start/', start_analysis, name='start-analysis'),
    path('analysis/stop/', stop_analysis, name='stop-analysis'),
    path('dashboard/stats/', dashboard_stats, name='dashboard-stats'),
]
