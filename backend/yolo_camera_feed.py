import cv2
import requests
import time
from flask import Flask, Response
from ultralytics import YOLO

# ==========================
# CONFIG
# ==========================
BACKEND_URL = "http://127.0.0.1:8000/api/incidents/"
CAMERA_ID = 1
SHOW_PREVIEW = True

# Security-relevant objects to detect
SECURITY_OBJECTS = {
    'person': {'risk': 'medium', 'alert': 'Person detected'},
    'bicycle': {'risk': 'low', 'alert': 'Bicycle detected'},
    'car': {'risk': 'low', 'alert': 'Vehicle detected'},
    'motorcycle': {'risk': 'low', 'alert': 'Motorcycle detected'},
    'bus': {'risk': 'low', 'alert': 'Bus detected'},
    'truck': {'risk': 'low', 'alert': 'Truck detected'},
    'knife': {'risk': 'high', 'alert': '⚠️ WEAPON DETECTED'},
    'gun': {'risk': 'critical', 'alert': '🚨 FIREARM DETECTED'},
    'cell phone': {'risk': 'low', 'alert': 'Cell phone detected'},
    'handbag': {'risk': 'low', 'alert': 'Handbag detected'},
    'backpack': {'risk': 'medium', 'alert': 'Backpack detected'},
    'umbrella': {'risk': 'low', 'alert': 'Umbrella detected'},
    'scissors': {'risk': 'high', 'alert': '⚠️ SCISSORS DETECTED'},
    'baseball bat': {'risk': 'high', 'alert': '⚾ Baseball bat'},
}

# ==========================
# Initialize YOLO
# ==========================
print("🔄 Loading YOLOv8 model...")
model = YOLO('yolov8n.pt')
print("✅ Model loaded successfully!")

# ==========================
# Initialize Camera
# ==========================
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("❌ Could not open webcam.")
    exit()

last_post_time = 0
cooldown = 15
frame_count = 0

# ==========================
# FLASK APP
# ==========================
app = Flask(__name__)

def generate_frames():
    global frame_count, last_post_time
    while True:
        success, frame = cap.read()
        if not success:
            break
        
        frame_count += 1
        
        # Run YOLO detection every 3rd frame
        if frame_count % 3 == 0:
            results = model(frame, verbose=False)
            
            detected_objects = {}
            highest_risk = 'low'
            
            for result in results:
                boxes = result.boxes
                
                for box in boxes:
                    cls = int(box.cls[0])
                    class_name = model.names[cls]
                    confidence = float(box.conf[0])
                    
                    if confidence > 0.5 and class_name.lower() in SECURITY_OBJECTS:
                        obj_info = SECURITY_OBJECTS[class_name.lower()]
                        detected_objects[class_name] = {
                            'confidence': confidence,
                            'risk': obj_info['risk'],
                            'alert': obj_info['alert']
                        }
                        
                        if obj_info['risk'] == 'critical':
                            highest_risk = 'critical'
                        elif obj_info['risk'] == 'high' and highest_risk != 'critical':
                            highest_risk = 'high'
                        elif obj_info['risk'] == 'medium' and highest_risk not in ['critical', 'high']:
                            highest_risk = 'medium'
                        
                        # Draw bounding box
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        color = (0, 255, 0) if highest_risk == 'low' else (0, 165, 255) if highest_risk == 'medium' else (0, 0, 255) if highest_risk == 'high' else (255, 0, 255)
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                        label = f"{class_name}: {confidence:.2f}"
                        cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
            # Report incident if objects detected
            if detected_objects:
                now = time.time()
                if now - last_post_time > cooldown:
                    last_post_time = now
                    
                    obj_list = ", ".join([f"{name} ({info['confidence']:.1%})" for name, info in detected_objects.items()])
                    description = f"Security objects detected: {obj_list}"
                    
                    if highest_risk in ['high', 'critical']:
                        description = f"⚠️ {detected_objects[list(detected_objects.keys())[0]]['alert']} - {description}"
                    
                    avg_confidence = sum(info['confidence'] for info in detected_objects.values()) / len(detected_objects)
                    
                    data = {
                        "camera_id": CAMERA_ID,
                        "description": description,
                        "confidence_score": float(avg_confidence * 100),
                    }
                    
                    try:
                        response = requests.post(BACKEND_URL, json=data, timeout=5)
                        if response.status_code == 201:
                            print(f"✅ Incident #{response.json().get('id', 'N/A')} reported!")
                    except:
                        pass
        
        # Add status overlay
        cv2.putText(frame, "YOLO Security Detection ACTIVE", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Encode frame
        _, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/')
def index():
    return "YOLO Camera Feed Server - Use /video_feed endpoint"

if __name__ == "__main__":
    print("✅ AI Security System activated on http://0.0.0.0:5001")
    print("📹 Video feed available at http://127.0.0.1:5001/video_feed")
    app.run(host="0.0.0.0", port=5001, debug=False, threaded=True)

