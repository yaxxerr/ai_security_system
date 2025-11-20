# Testing the Alerts Page

## Quick Start Testing

### Step 1: Start the Servers

**Terminal 1 - Django Backend:**
```bash
cd C:\Users\Yaxxe\ai_security_system
python manage.py runserver
```
The backend should be running at `http://127.0.0.1:8000`

**Terminal 2 - React Frontend:**
```bash
cd C:\Users\Yaxxe\ai_security_system\frontend
npm run dev
```
The frontend should be running at `http://localhost:5173`

### Step 2: Create Test Alerts

**Option A: Using Django Shell (Recommended)**
```bash
cd C:\Users\Yaxxe\ai_security_system
python manage.py shell
```
Then in the shell:
```python
exec(open('backend/create_test_alerts.py').read())
```

**Option B: Using Django Admin**
1. Go to `http://127.0.0.1:8000/admin`
2. Login with your superuser credentials
3. Navigate to **Alerts** → **Add Alert**
4. Create test alerts manually:
   - Message: "⚠️ CRITICAL: Person detected with weapon"
   - Incident: (optional - select an incident if available)
   - Created by: (select your user)
   - Acknowledged: Leave unchecked for active alerts

**Option C: Using API (PowerShell/Postman)**
```powershell
# Create an alert via API
curl -X POST http://127.0.0.1:8000/api/alerts/ `
  -H "Content-Type: application/json" `
  -d '{\"message\": \"Test Alert from API\", \"acknowledged\": false}'
```

### Step 3: Navigate to Alerts Page

1. Open your browser to `http://localhost:5173`
2. Navigate to the **Alerts** page (or go directly to `/alerts` route)

## What to Test

### ✅ Visual Testing

1. **Header**
   - [ ] Header shows correct stats (Active, Resolved, Total)
   - [ ] Dark mode toggle works
   - [ ] Header background changes in dark mode

2. **Alert Cards**
   - [ ] Alerts display with proper styling
   - [ ] Active alerts have red border
   - [ ] Resolved alerts are grayed out
   - [ ] Cards have shadows and rounded corners

3. **Related Incident Info**
   - [ ] Alerts with incidents show incident details
   - [ ] Camera name displays correctly
   - [ ] Detection method icons show (🤖 YOLO, ✨ AI, 👤 Manual)
   - [ ] Timestamps format correctly

### ✅ Functionality Testing

1. **Filtering**
   - [ ] Click "All" → Shows all alerts
   - [ ] Click "Active" → Shows only unacknowledged alerts
   - [ ] Click "Resolved" → Shows only acknowledged alerts
   - [ ] Counter updates correctly with filter

2. **Acknowledge Button**
   - [ ] Click "Acknowledge" on an active alert
   - [ ] Alert moves to "Resolved" after acknowledgment
   - [ ] Stats update immediately
   - [ ] Alert disappears from "Active" filter

3. **Auto-Refresh**
   - [ ] Create a new alert via admin/API
   - [ ] Wait 5 seconds
   - [ ] New alert appears automatically

4. **Dark Mode**
   - [ ] Toggle dark mode
   - [ ] All colors update correctly
   - [ ] Text is readable in both modes
   - [ ] Cards have proper contrast

### ✅ Edge Cases

1. **Empty State**
   - Delete all alerts → Should show "No alerts found" message

2. **No Related Incident**
   - Alerts without incidents should still display
   - No error should occur

3. **Long Messages**
   - Create alert with very long message → Should display properly

## Quick Test Script

Run this in Django shell to create a variety of test alerts:

```python
from core.models import Camera, Incident, Alert, User

# Get or create test data
camera = Camera.objects.first() or Camera.objects.create(
    name="Test Camera", location="Test", ip_address="192.168.1.1"
)
user = User.objects.first()

# Create test alerts
Alert.objects.create(
    message="🚨 Active Alert 1 - YOLO Detection",
    acknowledged=False,
    created_by=user
)

Alert.objects.create(
    message="✅ Resolved Alert - Already Acknowledged",
    acknowledged=True,
    created_by=user
)

Alert.objects.create(
    message="⚠️ Active Alert 2 - AI Analysis",
    acknowledged=False,
    created_by=user
)

print(f"Created test alerts. Total: {Alert.objects.count()}")
```

## API Testing

You can also test the API directly:

```powershell
# Get all alerts
curl http://127.0.0.1:8000/api/alerts/

# Get unacknowledged alerts only
curl "http://127.0.0.1:8000/api/alerts/?acknowledged=false"

# Acknowledge an alert (replace 1 with actual alert ID)
curl -X PATCH http://127.0.0.1:8000/api/alerts/1/ `
  -H "Content-Type: application/json" `
  -d '{"acknowledged": true}'
```

## Troubleshooting

**Issue: No alerts showing**
- Check Django server is running
- Verify API endpoint: `http://127.0.0.1:8000/api/alerts/`
- Check browser console for errors
- Verify CORS is configured correctly

**Issue: Acknowledge button not working**
- Check browser console for errors
- Verify API endpoint is accessible
- Check network tab for failed requests

**Issue: Dark mode not working**
- Check localStorage for "ai_theme_mode"
- Verify theme CSS is loading
- Check browser console for errors

