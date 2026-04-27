import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
import numpy as np
import base64
import os
import time
import csv
import joblib
import pandas as pd
from collections import deque, Counter
from deep_translator import GoogleTranslator

MODEL_PATH = os.path.join(os.path.dirname(__file__), "hand_landmarker.task")
CSV_PATH = os.path.join(os.path.dirname(__file__), "data.csv")
MODEL_PKL = os.path.join(os.path.dirname(__file__), "model.pkl")
REQUIRED_CLASSES = {"hello", "good", "bad", "stop", "okay", "peace"}

class SignLanguageProcessor:
    def __init__(self):
        # Optimized HandLandmarker Tasks API (Python 3.13 Ready)
        base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=2, # Best Edition: Support 2-hand gestures
            min_hand_detection_confidence=0.3, # Ultra-sensitive for stable tracking
            min_hand_presence_confidence=0.3,
            min_tracking_confidence=0.3,
            running_mode=vision.RunningMode.VIDEO
        )
        self.detector = vision.HandLandmarker.create_from_options(options)

        self.last_emitted_word = None
        self.last_emit_time = None
        self.no_hand_count = 0
        self.frame_count = 0
        
        # Stability Buffers — Restored for strict 4/7 consensus
        self.wrist_history = deque(maxlen=15)
        self.prediction_buffer = deque(maxlen=7)   # 7 frames for strict voting
        self.VOTE_THRESHOLD = 4                    # 4 out of 7 frames = emit
        self.confidence_buffer = deque(maxlen=7)
        
        # Hand Stability Threshold (tightened for precision)
        self.VELOCITY_THRESHOLD = 0.05
        self.BASE_VELOCITY_THRESHOLD = 0.05
        
        # Gesture Lock System — Restored
        self.locked_word = None
        self.lock_frames = 0
        self.MIN_LOCK_FRAMES = 3
        self.gesture_confidence_history = deque(maxlen=7)
        
        self.last_known_status = self._no_hand("Initializing")

        # Collection State
        self.collecting = False
        self.collecting_label = None
        self.is_collecting = False
        self.current_label = None
        self.collection_buffer = []
        self.COLLECTION_GOAL = 150 
        self.collection_start_time = None

        # Translation Cache (Prevents lag)
        self.translation_cache = {}
        self.last_translated_word = None
        self.last_translation_result = None

        # ML Model
        self.model = self._load_model()

    def _missing_gesture_classes(self):
        if not os.path.exists(CSV_PATH):
            return sorted(REQUIRED_CLASSES)
        try:
            df = pd.read_csv(CSV_PATH, usecols=["label"])
            labels = set(df["label"].dropna().astype(str).str.lower().str.strip())
            return sorted(REQUIRED_CLASSES - labels)
        except Exception as e:
            print(f"[ML] Could not validate data.csv: {e}")
            return sorted(REQUIRED_CLASSES)

    def _load_model(self):
        """Loads the machine learning model with fallbacks."""
        nn_model_path = os.path.join(os.path.dirname(__file__), "nn_model.h5")
        encoder_path = os.path.join(os.path.dirname(__file__), "label_encoder.pkl")
        scaler_path = os.path.join(os.path.dirname(__file__), "scaler.pkl")

        scaler = None
        if os.path.exists(scaler_path):
            try:
                scaler = joblib.load(scaler_path)
            except Exception as e:
                print(f"[ML] Error loading scaler: {e}")

        # Priority 1: Neural Network Model
        if os.path.exists(nn_model_path) and os.path.exists(encoder_path):
            try:
                from tensorflow.keras.models import load_model
                model = load_model(nn_model_path)
                encoder = joblib.load(encoder_path)
                print("[ML] Loaded Neural Network model")
                return {"model": model, "encoder": encoder, "scaler": scaler, "type": "nn"}
            except Exception as e:
                print(f"[ML] Error loading NN model: {e}")

        # Priority 2: Random Forest Model (model.pkl)
        if os.path.exists(MODEL_PKL):
            try:
                model = joblib.load(MODEL_PKL)
                encoder = None
                if os.path.exists(encoder_path):
                    encoder = joblib.load(encoder_path)
                print("[ML] Loaded Random Forest model")
                return {"model": model, "encoder": encoder, "scaler": scaler, "type": "rf"}
            except Exception as e:
                print(f"[ML] Error loading RF model: {e}")
        
        # Fallback: No model found or missing classes check
        missing_classes = self._missing_gesture_classes()
        if missing_classes:
            print(f"[ML] Missing gesture data for: {', '.join(missing_classes)}")
            print("[ML] Using heuristic fallback until models are trained.")
            
        return None

    def process_frame(self, base64_image: str, target_lang: str = 'hi') -> dict:
        self.frame_count += 1
        try:
            if "," in base64_image:
                raw = base64_image.split(",", 1)[1]
            else:
                raw = base64_image
                
            img_bytes = base64.b64decode(raw)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame_bgr is None:
                return self._no_hand("Decode error")
            
            # Match frontend mirroring and optimize size
            frame_resized = cv2.resize(frame_bgr, (320, 240))
            frame_rgb = cv2.cvtColor(frame_resized, cv2.COLOR_BGR2RGB)      
            
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
            timestamp_ms = int(time.time() * 1000)
            result = self.detector.detect_for_video(mp_image, timestamp_ms)

            if not result.hand_landmarks:
                # Clear history so we don't keep showing the last gesture
                if hasattr(self, 'history'): self.history = []
                self.last_known_status = self._no_hand()
                return self.last_known_status

            # Get primary hand landmarks
            landmarks = result.hand_landmarks[0]
            features = self._extract_features(landmarks)

            # 1. Data Collection logic
            if self.is_collecting and len(features) == 63:
                try:
                    with open(CSV_PATH, "a", newline="") as f:
                        csv.writer(f).writerow([self.current_label] + features)
                except Exception as e:
                    print(f"[COLLECT ERROR] {e}")

            # 2. Prediction (ML or Heuristic fallback)
            word, emoji, confidence = None, None, 0.0
            
            # Try ML first if model exists
            if self.model is not None and len(features) == 63:
                word, emoji, confidence = self._predict_ml(features)
                
            # If ML is missing, or confidence is low, use Heuristic fallback
            # Threshold 0.90 is higher now to ensure accuracy
            if word is None or confidence < 0.90 or word == "unknown":
                h_word, h_emoji, h_conf = self._predict(landmarks)
                if h_word != "unknown":
                    word, emoji, confidence = h_word, h_emoji, h_conf
                else:
                    word, emoji, confidence = None, None, 0.0

            # 3. Filtering & Smoothing (Latency reduction: keep history short)
            if not hasattr(self, 'history'): self.history = []
            if word and word != "unknown": 
                self.history.append(word)
            if len(self.history) > 5: self.history.pop(0)

            # Majority voting for stability
            stable_word = None
            if self.history:
                counts = Counter(self.history)
                most_common = counts.most_common(1)[0]
                if most_common[1] >= 3: # 3/5 consensus for stability
                    stable_word = most_common[0]
            
            # Match emoji
            stable_emoji = emoji if stable_word == word else "✨"

            # 4. Fast Translation
            translated = None
            if stable_word:
                translated = self._translate(stable_word, target=target_lang)

            return {
                "word": stable_word,
                "prediction": stable_word,
                "emoji": stable_emoji,
                "confidence": round(float(confidence), 2),
                "handDetected": True,
                "status": "Stable" if stable_word else "Detecting...",
                "translated": translated,
                "landmarks": [[{"x": lm.x, "y": lm.y, "z": lm.z} for lm in hand] for hand in result.hand_landmarks]
            }

        except Exception as e:
            print(f"[BACKEND ERROR] {e}")
            import traceback; traceback.print_exc()
            return self._no_hand(f"Error: {e}")

        except Exception as e:
            print(f"Bkd Error: {e}")
            self.last_known_status = self._no_hand(f"Error: {e}")
            return self.last_known_status

    def _check_hand_stability(self, wrist) -> bool:
        """Determines if the hand is steady enough for a reliable prediction."""
        self.wrist_history.append((wrist.x, wrist.y))
        if len(self.wrist_history) < 5:
            return True # Not enough data, assume stable
            
        # Calc velocity with recent emphasis (last 5 frames)
        velocities = []
        history_len = min(5, len(self.wrist_history))
        for i in range(1, history_len):
            v = np.sqrt((self.wrist_history[-(i)][0] - self.wrist_history[-(i+1)][0])**2 + 
                        (self.wrist_history[-(i)][1] - self.wrist_history[-(i+1)][1])**2)
            velocities.append(v)
        
        # Weight recent frames higher
        avg_v = np.mean(velocities)
        max_v = np.max(velocities)
        
        # Hand is stable if average is low AND no sudden jumps
        return avg_v < self.VELOCITY_THRESHOLD and max_v < (self.VELOCITY_THRESHOLD * 3)

    def _extract_features(self, landmarks):
        """
        Extracts 63 normalized features from hand landmarks.
        Normalizes all points relative to the wrist (point 0) and 
        scales them based on the distance between wrist and middle finger MCP (point 9).
        """
        if not landmarks or len(landmarks) < 21:
            return []
            
        # 1. Convert to numpy array
        points = np.array([[lm.x, lm.y, lm.z] for lm in landmarks])
        wrist = points[0]
        
        # 2. Calculate stable scale (Wrist to Middle Finger base)
        scale = np.linalg.norm(points[9] - wrist) + 1e-6
        
        # 3. Normalize relative to wrist and scale
        normalized_coords = (points - wrist) / scale
        
        # 4. Flatten to 63 features
        features = normalized_coords.flatten().tolist()
        
        return [float(f) for f in features]

    def _save_collection_data(self):
        """Saves current collection buffer to CSV."""
        if not self.collection_buffer:
            return
            
        # Updated to new feature count (63)
        num_features = len(self.collection_buffer[0]) - 1
        columns = ["label"] + [f"feat_{i}" for i in range(num_features)]
        
        df = pd.DataFrame(self.collection_buffer, columns=columns)
        
        if df.empty:
            print("[ML] ⚠️ Skip save: No valid frames collected")
            return

        mode = "a" if not os.path.exists(CSV_PATH) or os.path.getsize(CSV_PATH) == 0 else "a"
        header = not os.path.exists(CSV_PATH) or os.path.getsize(CSV_PATH) == 0
        
        df.to_csv(CSV_PATH, mode=mode, header=header, index=False)
        print(f"[ML] Saved {len(self.collection_buffer)} frames to {CSV_PATH}")
        self.collection_buffer = []

    def start_collecting(self, label: str):
        self.collecting = True
        self.collecting_label = label
        self.is_collecting = True
        self.current_label = label
        self.collection_buffer = []
        self.collection_start_time = time.time()
        print(f"[DEBUG] Recording started for: {label}")

    def _predict_ml(self, features) -> tuple:
        if self.model is None:
            # Fallback to simple logic if no model is trained yet
            return "No Model", "⚠️", 0.0

        try:
            # Wrapped in list for single sample prediction
            if len(features) != 63:
                print(f"[ML] Incorrect feature size: Expected 63, got {len(features)}")
                return "error", "❌", 0.0

            X = np.array([features])
            print(f"[DEBUG] Feature vector length: {len(features)}")
            if isinstance(self.model, dict) and self.model.get("type") == "nn":
                # Neural Network
                model = self.model["model"]
                encoder = self.model["encoder"]
                proba = model.predict(X)[0]
                max_idx = np.argmax(proba)
                confidence = proba[max_idx]
                label = encoder.inverse_transform([max_idx])[0]
            else:
                # Random Forest
                model = self.model["model"] if isinstance(self.model, dict) else self.model
                encoder = self.model["encoder"] if isinstance(self.model, dict) else None
                proba = model.predict_proba(X)[0]
                max_idx = np.argmax(proba)
                confidence = proba[max_idx]
                if encoder:
                    # Check if classes are integers that need inverse_transform
                    model_class_val = model.classes_[max_idx]
                    try:
                        label = encoder.inverse_transform([model_class_val])[0]
                    except ValueError:
                        label = str(model_class_val)
                else:
                    label = str(model.classes_[max_idx])
            
            print(f"[DEBUG] ML Raw prediction label: {label}, confidence: {confidence}")
            
            # Map labels to emojis
            emoji_map = {
                "hello": "✋", "good": "👍", "bad": "👎", "stop": "✊",
                "okay": "👌", "peace": "✌️"
            }
            emoji = emoji_map.get(label, "✨")
            
            return label, emoji, float(confidence)
        except Exception as e:
            print(f"[ML] Prediction error: {e}")
            return "error", "❌", 0.0

    def _predict(self, landmarks) -> tuple:
        """High-accuracy vector-based heuristic gesture detector."""
        wrist = landmarks[0]
        thumb_tip = landmarks[4]
        index_mcp = landmarks[5]
        index_tip = landmarks[8]
        middle_mcp = landmarks[9]
        middle_tip = landmarks[12]
        ring_tip = landmarks[16]
        pinky_mcp = landmarks[17]
        pinky_tip = landmarks[20]

        # ── VECTOR HELPERS ──
        def to_vec(lm): return np.array([lm.x, lm.y, lm.z])
        
        v_wrist = to_vec(wrist)
        v_index_mcp = to_vec(index_mcp)
        v_pinky_mcp = to_vec(pinky_mcp)
        
        # Calculate Palm Normal (Right hand rule: Index -> Pinky = Palm Facing)
        v1 = v_index_mcp - v_wrist
        v2 = v_pinky_mcp - v_wrist
        palm_normal = np.cross(v1, v2)
        palm_normal = palm_normal / (np.linalg.norm(palm_normal) + 1e-6)
        
        # Hand Size for scaling
        hand_size = np.linalg.norm(v_index_mcp - v_wrist)
        if hand_size < 0.01: return "unknown", "❓", 0.30

        # ── FINGER STATE ENGINE (Angle & Direction Based) ──
        def is_extended(tip_idx, mcp_idx):
            tip = to_vec(landmarks[tip_idx])
            pip = to_vec(landmarks[tip_idx - 2])
            mcp = to_vec(landmarks[mcp_idx])
            # Vector from MCP to TIP should be aligned with MCP to PIP
            v_mcp_tip = tip - mcp
            v_mcp_pip = pip - mcp
            cos_sim = np.dot(v_mcp_tip, v_mcp_pip) / (np.linalg.norm(v_mcp_tip) * np.linalg.norm(v_mcp_pip) + 1e-6)
            # Higher distance from wrist than PIP + straightness
            return cos_sim > 0.85 and np.linalg.norm(tip - v_wrist) > np.linalg.norm(pip - v_wrist)

        index_ext = is_extended(8, 5)
        middle_ext = is_extended(12, 9)
        ring_ext = is_extended(16, 13)
        pinky_ext = is_extended(20, 17)
        ext_count = sum([index_ext, middle_ext, ring_ext, pinky_ext])

        # Thumb Analysis
        v_thumb_tip = to_vec(thumb_tip)
        v_thumb_mcp = to_vec(landmarks[2])
        thumb_dir = v_thumb_tip - v_thumb_mcp
        thumb_dir = thumb_dir / (np.linalg.norm(thumb_dir) + 1e-6)
        
        # Is thumb pointing up relative to global Y axis? (In image space, smaller Y is up)
        thumb_up = thumb_dir[1] < -0.4
        thumb_down = thumb_dir[1] > 0.4
        
        # Robust Thumb Extension: Distance from thumb tip to pinky base
        # If thumb is out, this distance is much larger
        d_thumb_pinky = np.linalg.norm(v_thumb_tip - v_pinky_mcp)
        thumb_extended = d_thumb_pinky > hand_size * 0.9 or np.linalg.norm(v_thumb_tip - v_index_mcp) > hand_size * 0.7

        # 👍 GOOD — Thumb pointing UP, other fingers curled
        if thumb_up and thumb_extended and ext_count <= 1:
            return "good", "👍", 0.98

        # 👎 BAD — Thumb pointing DOWN, other fingers curled
        if thumb_down and thumb_extended and ext_count <= 1:
            return "bad", "👎", 0.98

        # ✋ HELLO — Full extension (Open Palm)
        if ext_count >= 3 and (thumb_extended or index_ext):
            return "hello", "✋", 0.96

        # ✊ STOP — Tight Fist (All fingers curled, thumb not extended)
        if ext_count == 0 and not thumb_extended:
            return "stop", "✊", 0.95

        # ✌️ PEACE — Index and Middle extended, others curled (Stricter)
        if index_ext and middle_ext and not ring_ext and not pinky_ext:
            # Ensure thumb is not interfering and fingers are actually apart
            d_index_middle = np.linalg.norm(to_vec(index_tip) - to_vec(middle_tip))
            if d_index_middle > hand_size * 0.3: # Must have a "V" gap
                return "peace", "✌️", 0.96

        # 👌 OKAY — Thumb and index tip close, other 3 fingers extended (Stricter)
        v_index_tip = to_vec(index_tip)
        d_thumb_index = np.linalg.norm(v_thumb_tip - v_index_tip)
        if d_thumb_index < hand_size * 0.2 and middle_ext and ring_ext and pinky_ext:
            return "okay", "👌", 0.96

        return "unknown", "❓", 0.40

        return "unknown", "❓", 0.40

    def _smooth_voting(self):
        """Improved voting with confidence weighting: 4 out of 5 frames with high confidence."""
        if len(self.prediction_buffer) < 5:
            return None, None

        words = [p[0] for p in self.prediction_buffer]
        counter = Counter(words)
        
        if not counter:
            return None, None
            
        most_common_word, count = counter.most_common(1)[0]

        # Check if word appears enough times with sufficient confidence
        if count >= self.VOTE_THRESHOLD and most_common_word not in ("unknown", "No Model", "error"):
            # Get average confidence for this word
            word_confidences = [c for w, c in zip(words, list(self.confidence_buffer)) if w == most_common_word]
            avg_confidence = np.mean(word_confidences) if word_confidences else 0.5
            
            # Only accept if average confidence is reasonable
            if avg_confidence < 0.40:
                return None, None
            
            emoji = next(p[1] for p in self.prediction_buffer if p[0] == most_common_word)
            now = time.time()

            # Same word but within cooldown — skip duplicate
            if (most_common_word == self.last_emitted_word and
                    self.last_emit_time and (now - self.last_emit_time) < 1.2):
                return None, None

            # New word — lock it and wait for confirmation
            if most_common_word != self.locked_word:
                self.locked_word = most_common_word
                self.lock_frames = 1
                return None, None  # First frame: just register
            else:
                self.lock_frames += 1
                # Emit after MIN_LOCK_FRAMES with high confidence agreement
                if self.lock_frames >= self.MIN_LOCK_FRAMES:
                    self.last_emitted_word = most_common_word
                    self.last_emit_time = now
                    return most_common_word, emoji

        # Reset lock if word changes or confidence too low
        if self.lock_frames > 0 and most_common_word != self.locked_word:
            self.lock_frames = 0
            self.locked_word = None

        return None, None

    def _translate(self, word: str, target: str = 'hi') -> str:
        """Translates the word into a target language with caching."""
        if not word or word == "unknown":
            return None
        if target == 'en':
            return None
            
        cache_key = f"{word}_{target}"
        if cache_key in self.translation_cache:
            return self.translation_cache[cache_key]

        try:
            # Add timeout to prevent long hangs
            translated = GoogleTranslator(source='en', target=target).translate(word)
            self.translation_cache[cache_key] = translated
            return translated
        except Exception as e:
            print(f"[TRANS ERROR] {e}")
            return None

    def _no_hand(self, status: str = "No Hand") -> dict:
        return {
            "prediction": None,
            "word": None,
            "emoji": None,
            "confidence": 0.0,
            "handDetected": False,
            "status": "No Hand"
        }
