# YOLO Security Detection System

## Overview
Smart AI-powered security camera system using YOLOv8 for real-time object detection and incident reporting.

## Features
- **Real-time Detection**: YOLOv8 processes live camera feed
- **Security-focused Objects**: Detects persons, vehicles, weapons, suspicious items
- **Risk Classification**: Low, medium, high, and critical risk levels
- **Automatic Incident Reporting**: Posts to Django API endpoint
- **Confidence Scoring**: Confidence-based thresholding
- **Visual Overlays**: Bounding boxes and labels on detected objects

## Security Objects Detected
### Critical Risk
- `gun` - Firearms
- `knife` - Bladed weapons

### High Risk
- Weapons and dangerous items

### Medium Risk
- `person` - People detected

### Low Risk
- `bicycle`, `car`, `motorcycle`, `bus`, `truck` - Vehicles
- `cell phone`, `handbag`, `backpack` - Common items

## Usage

### Basic Usage
```bash
python backend/yolo_detector.py
```

### Configuration
Edit `backend/yolo_detector.py`:
- `BACKEND_URL`: Your Django API endpoint
- `CAMERA_ID`: Camera ID in your database
- `SHOW_PREVIEW`: Set to False for headless mode
- `cooldown`: Seconds between incident reports (default: 15s)

### Requirements
- Camera connected
- Django server running on port 8000
- Camera entry in database (ID must match CAMERA_ID)

## Detection Logic
- Processes every 3rd frame for performance
- Only reports if confidence > 0.5
- Automatic incident creation when:
  - High or critical risk objects detected
  - Multiple objects detected (>2)
- Cooldown prevents spam

## API Integration
Incidents are automatically posted to `/api/incidents/` with:
```json
{
  "camera_id": 1,
  "description": "Security objects detected: ...",
  "confidence_score": 85.5
}
```

## Model Options
- `yolov8n.pt` - Nano (fastest, less accurate)
- `yolov8s.pt` - Small (balanced)
- `yolov8m.pt` - Medium (better accuracy)
- `yolov8l.pt` - Large (high accuracy, slower)
- `yolov8x.pt` - Extra Large (best accuracy, slowest)

Change in line 25 of `yolo_detector.py`.

