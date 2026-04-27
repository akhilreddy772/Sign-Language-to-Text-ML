import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from processor import SignLanguageProcessor
import os

app = FastAPI(title="SignLive API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Single shared processor instance (initialized once at startup)
processor = SignLanguageProcessor()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.get("/")
async def root():
    return {"status": "ok", "message": "SignLive API v2 running on :8000"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/start-collect")
def start_collect(label: str):
    processor.is_collecting = True
    processor.current_label = label
    processor.collecting = True
    processor.collecting_label = label
    print(f"[COLLECT] Started for {label}")
    return {"status": "started"}

@app.post("/stop-collect")
def stop_collect():
    processor.is_collecting = False
    processor.collecting = False
    print("[COLLECT] Stopped")
    return {"status": "stopped"}

@app.post("/train")
async def train_model():
    """Triggers the training script and reloads the model."""
    import subprocess
    import sys
    
    try:
        # Run training script
        result = subprocess.run(
            [sys.executable, "train_model.py"],
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
            check=True
        )
        
        # Reload model in processor
        processor.model = processor._load_model()
        
        return {
            "status": "success", 
            "message": "Model trained and reloaded",
            "output": result.stdout
        }
    except subprocess.CalledProcessError as e:
        message = "Training failed"
        if "Missing gesture data:" in e.stdout:
            message = e.stdout.split("Missing gesture data:", 1)[1].splitlines()[0].strip()
            message = f"Missing gesture data: {message}"
        return {
            "status": "error", 
            "message": message,
            "output": e.stdout,
            "error": e.stderr
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    client = websocket.client
    print(f"\n[WS] Client connected: {client}")

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                print("[WS] ❌ Bad JSON received, skipping")
                continue

            # 1. Handle Control Messages
            msg_type = payload.get("type", "frame")
            
            if msg_type == "start_collection":
                label = payload.get("label", "unknown")
                processor.start_collecting(label)
                await websocket.send_text(json.dumps({
                    "prediction": None,
                    "word": None,
                    "confidence": 0.0,
                    "handDetected": False,
                    "status": f"Collection started for {label}",
                    "message": f"Collection started for {label}"
                }))
                continue

            if msg_type == "stop_collection":
                processor.is_collecting = False
                processor.collecting = False
                await websocket.send_text(json.dumps({
                    "prediction": None,
                    "word": None,
                    "confidence": 0.0,
                    "handDetected": False,
                    "status": "Collection stopped",
                    "message": "Collection stopped"
                }))
                continue

            # 2. Handle Frames
            image_data = payload.get("image")
            lang = payload.get("lang", "hi")
            if not image_data:
                print("[WS] ❌ No 'image' field in payload, skipping")
                continue

            # Process frame — English output only
            result = processor.process_frame(image_data, target_lang=lang)

            # Output format as requested:
            # { "word": "hello", "confidence": 0.92, "handDetected": true }
            response = {
                "prediction":  result.get("prediction"),
                "word":        result.get("word"),
                "confidence":  result.get("confidence", 0.0),
                "handDetected": result.get("handDetected", False),
                "status":      result.get("status", ""),
                "emoji":       result.get("emoji"),
                "translated":  result.get("translated"),
                "landmarks":   result.get("landmarks", []),
            }

            await websocket.send_text(json.dumps(response))

    except WebSocketDisconnect:
        print(f"[WS] Client disconnected: {client}")
    except Exception as e:
        print(f"[WS] Error: {e}")
        import traceback; traceback.print_exc()
        try:
            await websocket.close()
        except Exception:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
