#!/usr/bin/env python3
"""
AI Security System - Multi-source YOLO + AI confirmation
- Supports webcam (index 0) or video files
- Multiple sources simultaneously
- YOLO detection every 10 seconds
- AI confirmation triggers alerts only
- Blind AI check every 2 minutes
- Live stream display (~10 FPS simulation for videos)
"""

import os
import cv2
import time
import asyncio
import aiohttp
import numpy as np
from datetime import datetime
from ultralytics import YOLO

# -------------------------------
# CONFIGURATION
# -------------------------------
# Define sources (webcams or video files)
SOURCES = {
    "cam1": 0,  # Local webcam
    # "cam2": "video1.mp4",  # Example video file
    # "cam3": "video2.mp4",  # Another video
}

FPS = 10                 # For video simulation
YOLO_INTERVAL = 10       # seconds
AI_BLIND_INTERVAL = 120  # seconds (2 minutes)
CONFIDENCE_THRESHOLD = 0.5
BACKEND_API = "http://127.0.0.1:8000/api/incidents/"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL = "gpt-4o-mini"
YOLO_MODEL_PATH = "yolov8m.pt"

# Security objects to track
SECURITY_OBJECTS = {
    'person': {'risk': 'medium', 'label': '👤 Person'},
    'car': {'risk': 'low', 'label': '🚗 Vehicle'},
    'bicycle': {'risk': 'low', 'label': '🚲 Bicycle'},
    'knife': {'risk': 'high', 'label': '⚠️ WEAPON'},
    'scissors': {'risk': 'high', 'label': '⚠️ SCISSORS'},
    'baseball bat': {'risk': 'high', 'label': '⚠️ BAT'},
    'backpack': {'risk': 'medium', 'label': '🎒 Backpack'},
    'suitcase': {'risk': 'medium', 'label': '🧳 Suitcase'},
}

# -------------------------------
# UTILITY FUNCTIONS
# -------------------------------
def current_timestamp():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def create_alert(camera_name, description, ai_summary=None):
    """Send alert to backend or log in console"""
    data = {
        "camera_id": camera_name,
        "description": description,
        "ai_summary": ai_summary if ai_summary else "",
        "timestamp": current_timestamp()
    }
    try:
        import requests
        resp = requests.post(BACKEND_API, json=data, timeout=5)
        if resp.status_code in (200, 201):
            print(f"✅ Alert sent for {camera_name} | {description}")
            if ai_summary:
                print(f"   AI summary: {ai_summary[:100]}")
        else:
            print(f"⚠️ Failed to send alert ({resp.status_code})")
    except Exception as e:
        print(f"❌ Exception sending alert: {e}")

async def analyze_with_openai(frame):
    """Send frame to OpenAI API for analysis"""
    if not OPENAI_API_KEY:
        return None
    try:
        _, jpeg = cv2.imencode('.jpg', frame)
        frame_bytes = jpeg.tobytes()
        import base64
        encoded_image = base64.b64encode(frame_bytes).decode("utf-8")

        payload = {
            "model": OPENAI_MODEL,
            "input": [
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": "Describe this image and detect suspicious activity."},
                        {"type": "input_image", "image_url": f"data:image/jpeg;base64,{encoded_image}"}
                    ]
                }
            ]
        }

        async with aiohttp.ClientSession() as session:
            headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
            async with session.post("https://api.openai.com/v1/responses", json=payload, headers=headers) as resp:
                if resp.status != 200:
                    print(f"⚠️ OpenAI API error: {resp.status}")
                    return None
                result = await resp.json()
                try:
                    return result["output"][0]["content"][0]["text"]
                except Exception:
                    return None
    except Exception as e:
        print(f"⚠️ OpenAI call failed: {e}")
        return None

# -------------------------------
# CAMERA PROCESSING
# -------------------------------
async def process_camera(camera_name, source, yolo_model):
    # Open source
    if isinstance(source, int):
        cap = cv2.VideoCapture(source)  # webcam
    else:
        cap = cv2.VideoCapture(source)  # video file

    if not cap.isOpened():
        print(f"❌ Failed to open {camera_name}")
        return

    print(f"📹 Camera {camera_name} started")
    last_yolo = 0
    last_ai_blind = 0

    while True:
        start_time = time.time()
        ret, frame = cap.read()
        if not ret:
            # Loop video for simulation
            if isinstance(source, str):
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            else:
                await asyncio.sleep(1)
                continue

        now = time.time()

        # YOLO detection every YOLO_INTERVAL seconds
        if now - last_yolo >= YOLO_INTERVAL:
            last_yolo = now
            results = yolo_model(frame)
            detected_objects = []

            for result in results:
                for box in result.boxes:
                    cls_idx = int(box.cls[0])
                    class_name = yolo_model.names[cls_idx].lower()
                    confidence = float(box.conf[0])
                    if confidence < CONFIDENCE_THRESHOLD:
                        continue
                    if class_name in SECURITY_OBJECTS:
                        detected_objects.append(class_name)
                        # Draw box for visualization
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        color = (0, 0, 255) if SECURITY_OBJECTS[class_name]['risk']=='high' else (0, 165, 255)
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                        label = f"{class_name}: {confidence:.2f}"
                        cv2.putText(frame, label, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            # If YOLO detected something, call AI for confirmation
            if detected_objects:
                ai_summary = await analyze_with_openai(frame)
                if ai_summary and any(word in ai_summary.lower() for word in ['suspicious', 'weapon', 'danger', 'fire']):
                    create_alert(camera_name, f"YOLO detected: {', '.join(detected_objects)}", ai_summary)

        # Blind AI check every 2 minutes
        if now - last_ai_blind >= AI_BLIND_INTERVAL:
            last_ai_blind = now
            ai_summary = await analyze_with_openai(frame)
            if ai_summary and any(word in ai_summary.lower() for word in ['suspicious', 'weapon', 'danger', 'fire']):
                create_alert(camera_name, "Blind AI check", ai_summary)

        # Display live stream
        display_frame = frame.copy()
        cv2.putText(display_frame, f"{camera_name}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)
        cv2.imshow(f"Live - {camera_name}", display_frame)

        if cv2.waitKey(int(1000/FPS)) & 0xFF == ord('q'):
            break

        # Small async sleep to allow other cameras to process
        await asyncio.sleep(0.001)

    cap.release()
    cv2.destroyWindow(f"Live - {camera_name}")
    print(f"🛑 Camera {camera_name} stopped")

# -------------------------------
# MAIN
# -------------------------------
async def main():
    yolo_model = YOLO(YOLO_MODEL_PATH)
    print(f"✅ YOLO model loaded: {YOLO_MODEL_PATH}")

    tasks = []
    for cam_name, source in SOURCES.items():
        tasks.append(asyncio.create_task(process_camera(cam_name, source, yolo_model)))

    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
