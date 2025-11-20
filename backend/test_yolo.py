"""
Test YOLO detection with a static image
"""
import cv2
import requests
from ultralytics import YOLO

# Load model
print("🔄 Loading YOLOv8 model...")
model = YOLO('yolov8n.pt')
print("✅ Model loaded successfully!")

# Load test image (or create a dummy one)
try:
    # Try to load an image if available
    image = cv2.imread('test_image.jpg')
    if image is None:
        print("📸 Creating test image...")
        # Create a dummy image
        image = cv2.imread(0)  # Try webcam
        if image is None:
            # Create colored test image
            import numpy as np
            image = np.zeros((480, 640, 3), dtype=np.uint8)
            image.fill(100)
            cv2.putText(image, "Test Image - Point camera at something", (50, 240), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
except:
    print("⚠️ Could not load image, creating dummy...")
    import numpy as np
    image = np.zeros((480, 640, 3), dtype=np.uint8)
    image.fill(100)

# Run detection
print("🔍 Running detection...")
results = model(image, verbose=False)

# Process results
print("\n📊 Detection Results:")
print("-" * 50)
for result in results:
    boxes = result.boxes
    if len(boxes) > 0:
        for box in boxes:
            cls = int(box.cls[0])
            class_name = model.names[cls]
            confidence = float(box.conf[0])
            print(f"✓ {class_name}: {confidence:.2%}")
    else:
        print("⚠️ No objects detected")

# Test API endpoint
print("\n🌐 Testing API endpoint...")
test_data = {
    "camera_id": 1,
    "description": "Test incident from YOLO detector",
    "confidence_score": 85.0
}

try:
    response = requests.post("http://127.0.0.1:8000/api/incidents/", json=test_data, timeout=5)
    if response.status_code == 201:
        print("✅ API test successful!")
        print(f"   Incident ID: {response.json().get('id', 'N/A')}")
    else:
        print(f"⚠️ API test failed: {response.status_code}")
        print(f"   Response: {response.text}")
except requests.exceptions.ConnectionError:
    print("❌ Could not connect to Django server. Is it running?")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n✅ YOLO detector ready to use!")

