# Testing Alert Urgency Display

This guide explains how to test the new alert urgency display feature on the dashboard.

## Prerequisites

1. **Django Backend Running**
   ```bash
   python manage.py runserver
   ```
   Should be running at `http://127.0.0.1:8000`

2. **React Frontend Running**
   ```bash
   cd frontend
   npm run dev
   ```
   Should be running at `http://localhost:5173`

3. **Have a superuser created**
   ```bash
   python manage.py createsuperuser
   ```

## Quick Test Method

### Step 1: Create Test Alerts with Different Urgency Levels

**Option A: Using the Test Script (Recommended)**
```bash
python manage.py shell
```
Then in the shell:
```python
exec(open('backend/test_alert_urgency.py').read())
```

This will create 8 test alerts with different urgency levels:
- 2 CRITICAL alerts (weapons)
- 2 HIGH alerts (bear, baseball bat)
- 2 MEDIUM alerts (person, backpack)
- 2 LOW alerts (bicycle, car)

**Option B: Using Django Admin**
1. Go to `http://127.0.0.1:8000/admin`
2. Navigate to **Alerts** → **Add Alert**
3. Create alerts with these messages to test different urgency levels:

   **CRITICAL:**
   - `⚠️ WEAPON DETECTED - Knife detected in camera view`
   - `⚠️ CRITICAL: Gun detected in security zone`

   **HIGH:**
   - `High Risk: Bear detected near perimeter`
   - `⚠️ Suspicious activity detected - Baseball bat found`

   **MEDIUM:**
   - `Person detected in restricted area`
   - `Backpack detected at entrance`

   **LOW:**
   - `Bicycle detected in parking lot`
   - `Car detected in parking area`

### Step 2: Open Dashboard

1. Navigate to `http://localhost:5173` (or your dashboard route)
2. The alert overlay should **automatically appear** for the first unacknowledged alert

### Step 3: Verify Urgency Display

For each alert overlay, check:

#### Visual Elements:

1. **Left Sidebar Urgency Indicator**
   - [ ] Shows urgency level (CRITICAL, HIGH, MEDIUM, or LOW)
   - [ ] Has color-coded background:
     - CRITICAL: Red (`bg-red-600`)
     - HIGH: Orange (`bg-orange-600`)
     - MEDIUM: Yellow (`bg-yellow-600`)
     - LOW: Blue (`bg-blue-600`)
   - [ ] Icon matches urgency level

2. **Card Border**
   - [ ] Border color matches urgency level
   - [ ] Border is prominent (2px thick)

3. **Alert Message Box**
   - [ ] Left border color matches urgency
   - [ ] Background tint matches urgency (light version)
   - [ ] Text is readable

4. **Backdrop**
   - [ ] CRITICAL: Red-tinted backdrop (`bg-red-900/60`)
   - [ ] HIGH: Orange-tinted backdrop (`bg-orange-900/50`)
   - [ ] MEDIUM/LOW: Black backdrop (`bg-black/40`)

#### Animations:

1. **CRITICAL Alerts:**
   - [ ] Red pulsing backdrop animation
   - [ ] Bouncing icon animation
   - [ ] Card scale/pulse animation (subtle)
   - [ ] Warning message: "🚨 IMMEDIATE ATTENTION REQUIRED 🚨"

2. **HIGH Alerts:**
   - [ ] Subtle card scale animation
   - [ ] Warning message: "⚠️ HIGH PRIORITY - Please Review"

3. **MEDIUM/LOW Alerts:**
   - [ ] Smooth fade-in animation
   - [ ] No warning banner

#### Functionality:

1. **Overlay Behavior:**
   - [ ] Overlay appears automatically when new alert is detected
   - [ ] Clicking backdrop dismisses overlay
   - [ ] "Dismiss" button works
   - [ ] "Acknowledge" button marks alert as acknowledged

2. **Auto-Detection:**
   - [ ] Overlay only shows for NEW unacknowledged alerts
   - [ ] Once shown, alert won't trigger overlay again (tracked by ID)

## Testing Workflow

### Test 1: First Alert Overlay

1. **Clear existing alerts:**
   ```python
   # In Django shell
   from core.models import Alert
   Alert.objects.filter(acknowledged=False).update(acknowledged=True)
   ```

2. **Create a CRITICAL alert:**
   ```python
   from core.models import Camera, Incident, Alert, User
   
   camera = Camera.objects.first()
   user = User.objects.first()
   
   incident = Incident.objects.create(
       camera=camera,
       description="⚠️ Security objects detected: knife (85.3%)",
       detected_by="YOLO"
   )
   
   alert = Alert.objects.create(
       message="⚠️ WEAPON DETECTED - Knife detected in camera view",
       incident=incident,
       created_by=user,
       acknowledged=False
   )
   ```

3. **Verify:**
   - [ ] Overlay appears within 5 seconds (auto-refresh interval)
   - [ ] Shows CRITICAL urgency with red styling
   - [ ] Has pulsing animations

### Test 2: Different Urgency Levels

Create alerts in sequence and verify each shows correct urgency:

1. **Create CRITICAL alert** → Should show red, pulsing
2. **Acknowledge it** → Overlay dismisses
3. **Create HIGH alert** → Should show orange, subtle pulse
4. **Acknowledge it** → Overlay dismisses
5. **Create MEDIUM alert** → Should show yellow, no pulse
6. **Create LOW alert** → Should show blue, no pulse

### Test 3: Real-time Updates

1. **Open dashboard** in browser
2. **In another terminal**, create a new alert using Django shell
3. **Wait 5 seconds** → Overlay should appear automatically
4. **Verify** it shows correct urgency level

### Test 4: Multiple New Alerts

1. **Acknowledge all existing alerts**
2. **Create 3 new alerts at once** (using the test script)
3. **Verify:**
   - [ ] Overlay shows the first one
   - [ ] After acknowledging, overlay shows next one
   - [ ] Each shows correct urgency

## Expected Behavior by Urgency Level

### CRITICAL (Red)
- **Triggers:** weapon, knife, gun in message/description
- **Visual:**
  - Red background and borders
  - Red-tinted pulsing backdrop
  - Bouncing icon
  - Pulsing card animation
  - "🚨 IMMEDIATE ATTENTION REQUIRED 🚨" banner

### HIGH (Orange)
- **Triggers:** bear, baseball bat, scissors, suspicious, high risk
- **Visual:**
  - Orange background and borders
  - Orange-tinted backdrop
  - Subtle pulsing
  - "⚠️ HIGH PRIORITY - Please Review" banner

### MEDIUM (Yellow)
- **Triggers:** person, backpack, suitcase, handbag, umbrella
- **Visual:**
  - Yellow background and borders
  - Normal backdrop
  - Smooth fade-in
  - No warning banner

### LOW (Blue)
- **Triggers:** Everything else (bicycle, car, etc.)
- **Visual:**
  - Blue background and borders
  - Normal backdrop
  - Smooth fade-in
  - No warning banner

## Troubleshooting

### Overlay Not Appearing

1. **Check browser console** for errors
2. **Verify alerts exist:**
   ```python
   from core.models import Alert
   Alert.objects.filter(acknowledged=False).count()
   ```
3. **Check API is working:**
   - Open `http://127.0.0.1:8000/api/alerts/` in browser
   - Should see JSON with alerts
4. **Verify auto-refresh:**
   - Check network tab in browser dev tools
   - Should see requests every 5 seconds to `/api/alerts/`

### Wrong Urgency Level

1. **Check alert message and incident description:**
   - The urgency detection looks for keywords in both
   - Make sure the message/description contains the trigger words

2. **Test urgency detection manually:**
   ```javascript
   // In browser console on dashboard page
   // Check what urgency would be detected
   const testAlert = {
     message: "Your alert message",
     incident: { description: "Incident description" }
   };
   // The getAlertUrgency function should be in scope
   ```

### Animations Not Working

1. **Check browser supports CSS animations**
2. **Verify CSS is loaded:**
   - Check `<style>` tag in DOM
   - Should contain `@keyframes alertCritical`, `alertHigh`, etc.

### Colors Not Matching

1. **Check dark mode:**
   - Toggle dark mode to verify colors work in both themes
2. **Verify Tailwind classes:**
   - Check computed styles in browser dev tools
   - Colors should match: red-600, orange-600, yellow-600, blue-600

## Clean Up Test Data

```python
# In Django shell
from core.models import Alert, Incident

# Delete test alerts
Alert.objects.filter(message__contains="detected").delete()

# Or delete all unacknowledged alerts
Alert.objects.filter(acknowledged=False).delete()

# Delete related incidents if needed
Incident.objects.filter(description__contains="Security objects detected").delete()
```

## API Testing

You can also test via API:

```bash
# Create a CRITICAL alert
curl -X POST http://127.0.0.1:8000/api/alerts/ \
  -H "Content-Type: application/json" \
  -d '{
    "message": "⚠️ WEAPON DETECTED - Knife detected",
    "acknowledged": false
  }'
```

Then check the dashboard - overlay should appear within 5 seconds.

## Success Criteria

✅ All urgency levels display correctly with appropriate colors
✅ CRITICAL and HIGH alerts have animations
✅ Overlay appears automatically for new alerts
✅ Urgency detection works correctly based on message/description
✅ Dark mode works with all urgency levels
✅ Overlay dismisses properly
✅ Acknowledge button works
