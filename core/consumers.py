import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Alert, Incident, Camera


class AlertConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time alerts"""
    
    async def connect(self):
        self.room_group_name = 'alerts'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        print(f"WebSocket connected: {self.channel_name}")

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print(f"WebSocket disconnected: {self.channel_name}")

    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'message')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'message': 'Connection alive'
                }))
        except json.JSONDecodeError:
            pass

    # Receive message from room group
    async def alert_message(self, event):
        message = event['message']
        alert_data = event.get('alert_data', {})
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'alert',
            'message': message,
            'data': alert_data
        }))


class CameraConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for camera feeds"""
    
    async def connect(self):
        self.camera_id = self.scope['url_route']['kwargs']['camera_id']
        self.room_group_name = f'camera_{self.camera_id}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        print(f"Camera WebSocket connected: {self.camera_id}")

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print(f"Camera WebSocket disconnected: {self.camera_id}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'message')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'camera_id': self.camera_id
                }))
        except json.JSONDecodeError:
            pass

    async def camera_frame(self, event):
        """Send camera frame data to WebSocket"""
        frame_data = event.get('frame_data', {})
        
        await self.send(text_data=json.dumps({
            'type': 'frame',
            'camera_id': self.camera_id,
            'data': frame_data
        }))

    async def camera_detection(self, event):
        """Send detection data to WebSocket"""
        detection_data = event.get('detection_data', {})
        
        await self.send(text_data=json.dumps({
            'type': 'detection',
            'camera_id': self.camera_id,
            'data': detection_data
        }))


class DashboardConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for dashboard updates"""
    
    async def connect(self):
        self.room_group_name = 'dashboard'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        print(f"Dashboard WebSocket connected: {self.channel_name}")

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print(f"Dashboard WebSocket disconnected: {self.channel_name}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'message')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'message': 'Dashboard connection alive'
                }))
        except json.JSONDecodeError:
            pass

    async def dashboard_update(self, event):
        """Send dashboard update to WebSocket"""
        update_data = event.get('data', {})
        
        await self.send(text_data=json.dumps({
            'type': 'dashboard_update',
            'data': update_data
        }))

