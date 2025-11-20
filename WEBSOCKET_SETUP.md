# WebSocket Setup Guide

This guide explains how to set up and use WebSockets in the AI Security System.

## Installation

1. Install the required packages:
```bash
pip install channels channels-redis
```

2. The packages are already added to `requirements.txt`. Run:
```bash
pip install -r requirements.txt
```

## Backend Setup

### 1. Settings Configuration
The `backend/settings.py` has been updated with:
- `channels` added to `INSTALLED_APPS`
- `ASGI_APPLICATION` configured
- `CHANNEL_LAYERS` configured (using InMemoryChannelLayer for development)

### 2. ASGI Configuration
The `backend/asgi.py` has been updated to handle both HTTP and WebSocket connections.

### 3. WebSocket Consumers
Three consumers are available in `core/consumers.py`:
- **AlertConsumer**: Real-time alerts (`/ws/alerts/`)
- **CameraConsumer**: Camera feeds (`/ws/camera/<camera_id>/`)
- **DashboardConsumer**: Dashboard updates (`/ws/dashboard/`)

### 4. Routing
WebSocket routes are defined in `core/routing.py`.

## Running the Server

Instead of using `python manage.py runserver`, use:
```bash
python manage.py runserver
```

For production with ASGI, use:
```bash
daphne backend.asgi:application --port 8000
```

## Frontend Usage

### Basic Example

```typescript
import { createAlertWebSocket } from './utils/websocket';

// Create WebSocket connection
const ws = createAlertWebSocket();

// Connect
await ws.connect();

// Listen for alerts
ws.on('alert', (data) => {
  console.log('New alert:', data);
  // Update your UI with the alert
});

// Send ping to keep connection alive
setInterval(() => {
  ws.send({ type: 'ping' });
}, 30000); // Every 30 seconds

// Disconnect when done
// ws.disconnect();
```

### Camera Feed Example

```typescript
import { createCameraWebSocket } from './utils/websocket';

const cameraId = 1;
const ws = createCameraWebSocket(cameraId);

await ws.connect();

ws.on('frame', (data) => {
  // Handle camera frame data
  console.log('Frame received:', data);
});

ws.on('detection', (data) => {
  // Handle detection data
  console.log('Detection:', data);
});
```

### Dashboard Updates Example

```typescript
import { createDashboardWebSocket } from './utils/websocket';

const ws = createDashboardWebSocket();

await ws.connect();

ws.on('dashboard_update', (data) => {
  // Update dashboard stats
  console.log('Dashboard update:', data);
});
```

## Sending Messages from Backend

To send messages to connected clients from your Django views:

```python
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()

# Send alert to all connected clients
async_to_sync(channel_layer.group_send)(
    'alerts',
    {
        'type': 'alert_message',
        'message': 'New security alert!',
        'alert_data': {
            'id': 1,
            'message': 'Motion detected',
            'timestamp': '2024-01-01T12:00:00Z'
        }
    }
)

# Send camera frame
async_to_sync(channel_layer.group_send)(
    f'camera_{camera_id}',
    {
        'type': 'camera_frame',
        'frame_data': {
            'frame': base64_encoded_frame,
            'timestamp': '2024-01-01T12:00:00Z'
        }
    }
)
```

## Production Setup

For production, use Redis as the channel layer:

1. Install Redis
2. Update `CHANNEL_LAYERS` in `settings.py`:
```python
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}
```

3. Run with Daphne or uvicorn:
```bash
daphne backend.asgi:application --bind 0.0.0.0 --port 8000
```

## WebSocket Endpoints

- `ws://localhost:8000/ws/alerts/` - Real-time alerts
- `ws://localhost:8000/ws/camera/<camera_id>/` - Camera feeds
- `ws://localhost:8000/ws/dashboard/` - Dashboard updates

