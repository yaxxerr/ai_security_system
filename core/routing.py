from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^ws/alerts/?$', consumers.AlertConsumer.as_asgi()),
    re_path(r'^ws/camera/(?P<camera_id>\w+)/?$', consumers.CameraConsumer.as_asgi()),
    re_path(r'^ws/dashboard/?$', consumers.DashboardConsumer.as_asgi()),
]

