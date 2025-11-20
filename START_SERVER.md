# How to Start the Server with WebSocket Support

## Problem
If `python manage.py runserver` doesn't show "ASGI/Channels" in the startup message, it means Django is using WSGI instead of ASGI, and WebSockets won't work.

## Solution: Use Daphne (ASGI Server)

### Step 1: Install Daphne
```bash
pip install daphne
```

Or if using requirements.txt:
```bash
pip install -r requirements.txt
```

### Step 2: Start Server with Daphne
Instead of `python manage.py runserver`, use:

**On Windows (PowerShell/CMD):**
```bash
python -m daphne -b 127.0.0.1 -p 8000 backend.asgi:application
```

**On Linux/Mac:**
```bash
daphne -b 127.0.0.1 -p 8000 backend.asgi:application
```

Or simply double-click `start_server.bat` on Windows.

### Step 3: Verify
When you start with daphne, you should see:
```
2024-XX-XX XX:XX:XX [INFO] Starting server at tcp:port=8000:interface=127.0.0.1
2024-XX-XX XX:XX:XX [INFO] HTTP/2 support not enabled (install the http2 and tls Twisted extras)
2024-XX-XX XX:XX:XX [INFO] Configuring endpoint tcp:port=8000:interface=127.0.0.1
2024-XX-XX XX:XX:XX [INFO] Listening on TCP address 127.0.0.1:8000
```

### Alternative: Use Uvicorn
You can also use uvicorn:

```bash
pip install uvicorn
uvicorn backend.asgi:application --host 127.0.0.1 --port 8000
```

## Why This is Needed

Django's `runserver` command should automatically detect Channels when:
- `channels` is in `INSTALLED_APPS`
- `ASGI_APPLICATION` is set in settings

However, sometimes it doesn't detect it properly. Using `daphne` directly ensures ASGI is used, which is required for WebSocket support.

## Testing WebSocket

After starting with daphne, test the WebSocket connection:
1. Open browser console
2. Navigate to Alerts or Dashboard page
3. You should see: `WebSocket connected: ws://127.0.0.1:8000/ws/alerts/`

Or test directly in console:
```javascript
const ws = new WebSocket('ws://127.0.0.1:8000/ws/alerts/');
ws.onopen = () => console.log('✅ Connected!');
ws.onerror = (e) => console.error('❌ Error:', e);
```

