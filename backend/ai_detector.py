import cv2
import numpy as np
import requests
import time

# ==========================
# CONFIG
# ==========================
BACKEND_URL = "http://127.0.0.1:8000/api/incidents/"  # Fixed: using correct endpoint
CAMERA_ID = 1  # must match your camera ID in your Django DB
SHOW_PREVIEW = True  # set to False if running headless

# ==========================
# COLOR RANGES (HSV)
# ==========================
# Yellow color range
yellow_lower = np.array([20, 100, 100])
yellow_upper = np.array([30, 255, 255])

# Black color range
black_lower = np.array([0, 0, 0])
black_upper = np.array([180, 255, 50])

# ==========================
# Initialize Camera
# ==========================
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("❌ Could not open webcam.")
    exit()

print("✅ AI detector running... press 'q' to quit.")
last_post_time = 0
cooldown = 10  # seconds between posts to avoid spam

while True:
    ret, frame = cap.read()
    if not ret:
        print("⚠️ Frame not captured, skipping...")
        continue

    # Convert to HSV color space
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

    # Create masks for black and yellow
    mask_yellow = cv2.inRange(hsv, yellow_lower, yellow_upper)
    mask_black = cv2.inRange(hsv, black_lower, black_upper)

    # Combine masks
    mask_combined = cv2.bitwise_or(mask_yellow, mask_black)
    detection_ratio = np.sum(mask_combined > 0) / mask_combined.size

    # If enough of the frame is black+yellow
    if detection_ratio > 0.02:  # 2% of frame pixels
        now = time.time()
        if now - last_post_time > cooldown:
            last_post_time = now
            data = {
                "camera_id": 1,
                "description": "mba3ar detected by AI.",
                "confidence_score": float(detection_ratio * 100),  # Add confidence for AI detection
            }
            try:
                response = requests.post(BACKEND_URL, json=data, timeout=5)
                if response.status_code == 201:
                    print("🚨 Incident reported successfully!")
                else:
                    print(f"⚠️ Failed to report incident ({response.status_code}): {response.text}")
            except requests.exceptions.RequestException as e:
                print("❌ Error sending request:", e)

    if SHOW_PREVIEW:
        # show live video feed and mask
        preview = cv2.bitwise_and(frame, frame, mask=mask_combined)
        cv2.imshow("Live AI Detection", np.hstack((frame, preview)))

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

cap.release()
cv2.destroyAllWindows()
