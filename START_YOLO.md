# How to Run the AI Security System

## Quick Start

### 1. Start Django Backend
```bash
python manage.py runserver
```
Server runs on `http://127.0.0.1:8000`

### 2. Start YOLO Camera Feed (Combined Detection + Streaming)
```bash
python backend/yolo_camera_feed.py
```
Server runs on `http://127.0.0.1:5001` and automatically:
- Streams camera video with YOLO detections
- Draws bounding boxes on detected objects
- Posts incidents to Django API when security objects detected

### 3. Start Frontend
```bash
cd frontend
npm run dev
```
Server runs on `http://localhost:5173`

## Dashboard Usage

1. Open `http://localhost:5173` in your browser
2. Select a camera from the dropdown
3. Click "Start Analysis" to enable YOLO detection
4. Watch live feed with detections (bounding boxes drawn in real-time)
5. View incidents auto-posted to the database in the "Recent Incidents" panel

## Detection Features

**Objects Detected:**
- Persons 👤
- Vehicles 🚗 (cars, motorcycles, buses, trucks)
- Weapons ⚠️ (knives, guns, scissors, baseball bats)
- Suspicious items 🎒 (backpacks, handbags, umbrellas)
- All 80 COCO classes

**Auto-Reporting:**
- Posts incidents every 15 seconds (cooldown)
- Includes confidence scores
- Categorizes by detection type (YOLO/AI/MANUAL)

## Alternative Detection Modes

You can also run separate detectors:

**Motion Detection:**
```bash
python backend/motion_detect.py
```

**Color-Based Detection:**
```bash
python backend/ai_detector.py
```

**YOLO Only (No Web Feed):**
```bash
python backend/yolo_detector.py
```

## Troubleshooting

- **No feed?** Make sure camera is connected and `yolo_camera_feed.py` is running
- **No incidents?** Check Django logs and ensure CAMERA_ID matches your database
- **Import errors?** Activate venv and install requirements: `pip install -r requirements.txt`

