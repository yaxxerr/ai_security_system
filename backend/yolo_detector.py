import cv2
import requests
import time
from ultralytics import YOLO

# ==========================
# CONFIG
# ==========================
BACKEND_URL = "http://127.0.0.1:8000/api/incidents/"
CAMERA_ID = 1  # Your camera ID in Django DB
SHOW_PREVIEW = True  # Set to False if running headless

# Security-relevant objects to detect (YOLOv8 COCO classes)
SECURITY_OBJECTS = {
    'person': {'risk': 'medium', 'alert': '👤 Person detected'},
    'bicycle': {'risk': 'low', 'alert': '🚲 Bicycle detected'},
    'car': {'risk': 'low', 'alert': '🚗 Vehicle detected'},
    'motorcycle': {'risk': 'low', 'alert': '🏍️ Motorcycle detected'},
    'airplane': {'risk': 'low', 'alert': '✈️ Aircraft detected'},
    'bus': {'risk': 'low', 'alert': '🚌 Bus detected'},
    'train': {'risk': 'low', 'alert': '🚂 Train detected'},
    'truck': {'risk': 'low', 'alert': '🚚 Truck detected'},
    'boat': {'risk': 'low', 'alert': '⛵ Boat detected'},
    'traffic light': {'risk': 'low', 'alert': '🚦 Traffic light'},
    'fire hydrant': {'risk': 'low', 'alert': '🔴 Fire hydrant'},
    'stop sign': {'risk': 'low', 'alert': '🛑 Stop sign'},
    'parking meter': {'risk': 'low', 'alert': '⏰ Parking meter'},
    'bench': {'risk': 'low', 'alert': '🪑 Bench'},
    'bird': {'risk': 'low', 'alert': '🐦 Bird'},
    'cat': {'risk': 'low', 'alert': '🐱 Cat'},
    'dog': {'risk': 'low', 'alert': '🐕 Dog'},
    'horse': {'risk': 'low', 'alert': '🐴 Horse'},
    'sheep': {'risk': 'low', 'alert': '🐑 Sheep'},
    'cow': {'risk': 'low', 'alert': '🐄 Cow'},
    'elephant': {'risk': 'low', 'alert': '🐘 Elephant'},
    'bear': {'risk': 'high', 'alert': '🐻 Bear detected'},
    'zebra': {'risk': 'low', 'alert': '🦓 Zebra'},
    'giraffe': {'risk': 'low', 'alert': '🦒 Giraffe'},
    'backpack': {'risk': 'medium', 'alert': '🎒 Backpack detected'},
    'umbrella': {'risk': 'medium', 'alert': '☂️ Umbrella detected'},
    'handbag': {'risk': 'medium', 'alert': '👜 Handbag detected'},
    'tie': {'risk': 'low', 'alert': '👔 Tie'},
    'suitcase': {'risk': 'medium', 'alert': '🧳 Suitcase detected'},
    'frisbee': {'risk': 'low', 'alert': '🥏 Frisbee'},
    'skis': {'risk': 'low', 'alert': '🎿 Skis'},
    'snowboard': {'risk': 'low', 'alert': '🏂 Snowboard'},
    'sports ball': {'risk': 'low', 'alert': '⚽ Ball'},
    'kite': {'risk': 'low', 'alert': '🪁 Kite'},
    'baseball bat': {'risk': 'high', 'alert': '⚾ Baseball bat'},
    'baseball glove': {'risk': 'low', 'alert': '🧤 Baseball glove'},
    'skateboard': {'risk': 'low', 'alert': '🛹 Skateboard'},
    'surfboard': {'risk': 'low', 'alert': '🏄 Surfboard'},
    'tennis racket': {'risk': 'low', 'alert': '🎾 Tennis racket'},
    'bottle': {'risk': 'low', 'alert': '🍾 Bottle'},
    'wine glass': {'risk': 'low', 'alert': '🍷 Wine glass'},
    'cup': {'risk': 'low', 'alert': '☕ Cup'},
    'fork': {'risk': 'low', 'alert': '🍴 Fork'},
    'knife': {'risk': 'high', 'alert': '⚠️ WEAPON DETECTED'},
    'spoon': {'risk': 'low', 'alert': '🥄 Spoon'},
    'bowl': {'risk': 'low', 'alert': '🥣 Bowl'},
    'banana': {'risk': 'low', 'alert': '🍌 Banana'},
    'apple': {'risk': 'low', 'alert': '🍎 Apple'},
    'sandwich': {'risk': 'low', 'alert': '🥪 Sandwich'},
    'orange': {'risk': 'low', 'alert': '🍊 Orange'},
    'broccoli': {'risk': 'low', 'alert': '🥦 Broccoli'},
    'carrot': {'risk': 'low', 'alert': '🥕 Carrot'},
    'hot dog': {'risk': 'low', 'alert': '🌭 Hot dog'},
    'pizza': {'risk': 'low', 'alert': '🍕 Pizza'},
    'donut': {'risk': 'low', 'alert': '🍩 Donut'},
    'cake': {'risk': 'low', 'alert': '🎂 Cake'},
    'chair': {'risk': 'low', 'alert': '🪑 Chair'},
    'couch': {'risk': 'low', 'alert': '🛋️ Couch'},
    'potted plant': {'risk': 'low', 'alert': '🪴 Plant'},
    'bed': {'risk': 'low', 'alert': '🛏️ Bed'},
    'dining table': {'risk': 'low', 'alert': '🍽️ Table'},
    'toilet': {'risk': 'low', 'alert': '🚽 Toilet'},
    'tv': {'risk': 'low', 'alert': '📺 TV'},
    'laptop': {'risk': 'low', 'alert': '💻 Laptop'},
    'mouse': {'risk': 'low', 'alert': '🖱️ Mouse'},
    'remote': {'risk': 'low', 'alert': '📱 Remote'},
    'keyboard': {'risk': 'low', 'alert': '⌨️ Keyboard'},
    'cell phone': {'risk': 'low', 'alert': '📱 Cell phone'},
    'microwave': {'risk': 'low', 'alert': '🔔 Microwave'},
    'oven': {'risk': 'low', 'alert': '🔥 Oven'},
    'toaster': {'risk': 'low', 'alert': '🍞 Toaster'},
    'sink': {'risk': 'low', 'alert': '🚰 Sink'},
    'refrigerator': {'risk': 'low', 'alert': '❄️ Refrigerator'},
    'book': {'risk': 'low', 'alert': '📖 Book'},
    'clock': {'risk': 'low', 'alert': '🕐 Clock'},
    'vase': {'risk': 'low', 'alert': '🏺 Vase'},
    'scissors': {'risk': 'high', 'alert': '⚠️ SCISSORS DETECTED'},
    'teddy bear': {'risk': 'low', 'alert': '🧸 Teddy bear'},
    'hair drier': {'risk': 'low', 'alert': '💨 Hair dryer'},
    'toothbrush': {'risk': 'low', 'alert': '🪥 Toothbrush'},
}

# ==========================
# Initialize YOLO Model
# ==========================
print("🔄 Loading YOLOv8 model...")
model = YOLO('yolov8n.pt')  # nano model for speed (yolov8s.pt or yolov8m.pt for better accuracy)
print("✅ Model loaded successfully!")

# ==========================
# Initialize Camera
# ==========================
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("❌ Could not open webcam.")
    exit()

print("✅ AI Security System activated. Press 'q' to quit.")
last_post_time = 0
cooldown = 15  # seconds between incident reports to avoid spam

# ==========================
# Main Detection Loop
# ==========================
frame_count = 0
while True:
    ret, frame = cap.read()
    if not ret:
        print("⚠️ Frame not captured, skipping...")
        continue

    frame_count += 1
    
    # Run YOLO inference (process every 3rd frame for performance)
    if frame_count % 3 == 0:
        results = model(frame, verbose=False)
        
        # Process detections
        for result in results:
            boxes = result.boxes
            
            detected_objects = {}
            highest_risk = 'low'
            
            for box in boxes:
                # Get class name
                cls = int(box.cls[0])
                class_name = model.names[cls]
                confidence = float(box.conf[0])
                
                # Only process high-confidence detections and security-relevant objects
                if confidence > 0.5 and class_name.lower() in SECURITY_OBJECTS:
                    obj_info = SECURITY_OBJECTS[class_name.lower()]
                    
                    # Track detected object
                    detected_objects[class_name] = {
                        'confidence': confidence,
                        'risk': obj_info['risk'],
                        'alert': obj_info['alert']
                    }
                    
                    # Update highest risk level
                    if obj_info['risk'] == 'critical':
                        highest_risk = 'critical'
                    elif obj_info['risk'] == 'high' and highest_risk != 'critical':
                        highest_risk = 'high'
                    elif obj_info['risk'] == 'medium' and highest_risk not in ['critical', 'high']:
                        highest_risk = 'medium'
                    
                    # Draw bounding box
                    if SHOW_PREVIEW:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        color = (0, 255, 0) if highest_risk == 'low' else (0, 165, 255) if highest_risk == 'medium' else (0, 0, 255) if highest_risk == 'high' else (255, 0, 255)
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                        label = f"{class_name}: {confidence:.2f}"
                        cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
            # Report incident if security-relevant objects detected
            if detected_objects:  # Report any security object detected
                now = time.time()
                if now - last_post_time > cooldown:
                    last_post_time = now
                    
                    # Create description with detected objects
                    obj_list = ", ".join([f"{name} ({info['confidence']:.1%})" for name, info in detected_objects.items()])
                    description = f"Security objects detected: {obj_list}"
                    
                    if highest_risk in ['high', 'critical']:
                        description = f"⚠️ {detected_objects[list(detected_objects.keys())[0]]['alert']} - {description}"
                    
                    # Calculate average confidence
                    avg_confidence = sum(info['confidence'] for info in detected_objects.values()) / len(detected_objects)
                    
                    data = {
                        "camera_id": CAMERA_ID,
                        "description": description,
                        "confidence_score": float(avg_confidence * 100),
                    }
                    
                    try:
                        print(f"📤 Reporting incident: {description[:60]}...")
                        response = requests.post(BACKEND_URL, json=data, timeout=5)
                        if response.status_code == 201:
                            print(f"✅ Incident #{response.json().get('id', 'N/A')} reported successfully!")
                        else:
                            print(f"⚠️ Failed to report incident ({response.status_code}): {response.text}")
                    except requests.exceptions.RequestException as e:
                        print(f"❌ Error sending request: {e}")
    
    # Display video feed
    if SHOW_PREVIEW:
        # Add status overlay
        cv2.putText(frame, "YOLO Security Detection ACTIVE", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.imshow("AI Security Detection - YOLOv8", frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

# Cleanup
cap.release()
cv2.destroyAllWindows()
print("🛑 Security system deactivated.")

