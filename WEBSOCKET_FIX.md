# WebSocket Fix Summary

## Issues Fixed

### 1. WebSocket 404 Error
**Problem**: WebSocket connection to `/ws/alerts/` was returning 404

**Fixes Applied**:
- Removed `AllowedHostsOriginValidator` from ASGI config for development (can be re-enabled for production)
- Updated `ALLOWED_HOSTS` in settings.py to include localhost
- Added `^` anchor to routing patterns for better matching
- Improved error logging in WebSocket client

### 2. GET Requests Still Polling
**Problem**: Alerts were still being fetched via GET requests every few seconds

**Fixes Applied**:
- Removed `fetchAlerts()` call from `acknowledgeAlert()` in dashboard.tsx
- WebSocket now handles all alert updates automatically
- Only initial fetch on mount, then WebSocket takes over

## Important: Running the Server

**For WebSockets to work, you MUST run Django with ASGI, not WSGI:**

### Development (with Channels):
```bash
python manage.py runserver
```
Channels automatically handles both HTTP and WebSocket connections in development.

### Production:
```bash
daphne backend.asgi:application --port 8000
# OR
uvicorn backend.asgi:application --port 8000
```

## Testing WebSocket Connection

1. Start the Django server
2. Open browser console
3. Navigate to Alerts or Dashboard page
4. You should see: `WebSocket connected: ws://127.0.0.1:8000/ws/alerts/`
5. If you see 404, check:
   - Server is running with `python manage.py runserver` (not gunicorn)
   - Channels is installed: `pip install channels channels-redis`
   - ASGI application is configured correctly in `backend/asgi.py`

## WebSocket Endpoints

- `ws://localhost:8000/ws/alerts/` - Real-time alerts
- `ws://localhost:8000/ws/camera/<camera_id>/` - Camera feeds
- `ws://localhost:8000/ws/dashboard/` - Dashboard updates

## Current Behavior

- **Alerts Page**: Fetches alerts once on mount, then uses WebSocket for all updates
- **Dashboard**: Fetches alerts once on mount, then uses WebSocket for all updates
- **No Polling**: No more GET requests spamming the server
- **Real-time**: Alerts appear instantly when created/updated

