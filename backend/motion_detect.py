import cv2
import requests
import time

# Replace with your Django endpoint later
BACKEND_URL = "http://127.0.0.1:8000/api/incidents/"  

cap = cv2.VideoCapture(0)
time.sleep(10)  # warm-up camera

ret, frame1 = cap.read()
ret, frame2 = cap.read()

while cap.isOpened():
    diff = cv2.absdiff(frame1, frame2)
    gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5,5), 0)
    _, thresh = cv2.threshold(blur, 20, 255, cv2.THRESH_BINARY)
    dilated = cv2.dilate(thresh, None, iterations=3)
    contours, _ = cv2.findContours(dilated, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    motion_detected = False

    for contour in contours:
        if cv2.contourArea(contour) < 1000:
            continue
        motion_detected = True
        (x, y, w, h) = cv2.boundingRect(contour)
        cv2.rectangle(frame1, (x, y), (x+w, y+h), (0, 255, 0), 2)

    if motion_detected:
        print("🚨 Motion detected!")
        # Send to backend
        data = {"camera_id": 1, "description": "Motion detected"}
        try:
            response = requests.post(BACKEND_URL, json=data, timeout=5)
            if response.status_code == 201:
                print("✅ Incident reported successfully!")
            else:
                print(f"⚠️ Failed to report incident ({response.status_code}): {response.text}")
        except requests.exceptions.RequestException as e:
            print("❌ Error sending request:", e)

    cv2.imshow("Motion Detection", frame1)
    frame1 = frame2
    ret, frame2 = cap.read()

    if cv2.waitKey(40) == 27:  # press ESC to exit
        break

cap.release()
cv2.destroyAllWindows()
