# WebSocket Troubleshooting Guide

## Current Status
✅ Channels 4.0.0 is installed
✅ ASGI_APPLICATION is configured: `backend.asgi.application`
✅ CHANNEL_LAYERS is configured
✅ WebSocket routing patterns are defined:
   - `^ws/alerts/$`
   - `^ws/camera/(?P<camera_id>\w+)/$`
   - `^ws/dashboard/$`

## If you're getting 404 for `/ws/alerts/`:

### Step 1: Restart the Django Server
**IMPORTANT**: After installing Channels or changing ASGI configuration, you MUST restart the server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
python manage.py runserver
```

### Step 2: Verify Server is Using ASGI
When you start the server, you should see output indicating it's using ASGI:
```
Starting ASGI/Channels version X.X.X development server at http://127.0.0.1:8000/
```

If you see "Starting development server" without "ASGI/Channels", Channels might not be detected.

### Step 3: Test WebSocket Connection
Open browser console and check:
1. Navigate to Alerts or Dashboard page
2. Look for WebSocket connection messages in console
3. Check Network tab → WS (WebSocket) filter
4. You should see a connection to `ws://127.0.0.1:8000/ws/alerts/`

### Step 4: Verify URL Pattern
The frontend connects to: `ws://127.0.0.1:8000/ws/alerts/`
The routing pattern is: `^ws/alerts/$`

These should match. If still not working, try:
- Remove trailing slash: Change frontend to `ws://127.0.0.1:8000/ws/alerts` (no trailing slash)
- Or update routing pattern to: `r'^ws/alerts/?$'` (optional trailing slash)

### Step 5: Check for Errors
Look for errors in:
- Django server console
- Browser console
- Network tab (check the WebSocket request status)

### Common Issues:

1. **Server not restarted**: Most common issue - restart required after Channels setup
2. **Wrong port**: Frontend uses port 8000, make sure Django is on 8000
3. **CORS/Origin issues**: Already fixed by removing AllowedHostsOriginValidator
4. **Routing pattern mismatch**: Check that URL exactly matches pattern

### Manual Test:
You can test the WebSocket connection directly in browser console:
```javascript
const ws = new WebSocket('ws://127.0.0.1:8000/ws/alerts/');
ws.onopen = () => console.log('Connected!');
ws.onerror = (e) => console.error('Error:', e);
ws.onclose = (e) => console.log('Closed:', e.code, e.reason);
```

If this works, the issue is in the frontend code. If it doesn't, the issue is in the backend routing.

