# 🤟 SignLive — Real-Time Sign Language to Live Subtitles

A production-level web application that captures live webcam video, detects hand signs using MediaPipe, predicts words using AI, and displays smooth cinematic subtitles in real-time.

---

## 🧠 Architecture

```
┌──────────────┐    WebSocket     ┌──────────────────┐
│   React      │ ◄─────────────► │  FastAPI Backend  │
│   Frontend   │   Base64 frames  │  + MediaPipe      │
│   (Vite)     │   JSON results   │  + AI Prediction  │
└──────────────┘                  └──────────────────┘
```

## ⚡ Quick Start

### Prerequisites
- **Python 3.9+** with pip
- **Node.js 18+** with npm
- A working **webcam**

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```
Backend runs on `http://localhost:8000`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`

### 3. Open the App
Navigate to `http://localhost:5173` in your browser. Allow camera access when prompted.

---

## 🎥 Features

| Feature | Description |
|---------|-------------|
| 🤟 Hand Detection | Real-time MediaPipe hand landmark tracking |
| 🎬 Cinematic Subtitles | Netflix-style fade-in + typing animation |
| 🧠 AI Prediction | Word prediction with confidence scoring |
| 🌙 Dark/Light Mode | Toggle between themes |
| 🌐 Telugu Translation | Optional English → Telugu subtitle translation |
| 📜 History Panel | View last 5 detected sentences |
| 🔊 Sound Effects | Subtle audio cue on new word detection |
| 📱 Responsive | Works on mobile and desktop |

---

## 📁 Project Structure

```
python-project/
├── backend/
│   ├── main.py              # FastAPI + WebSocket server
│   ├── processor.py          # MediaPipe processing + smoothing
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── WebcamFeed.jsx       # Camera + frame capture
│   │   │   ├── SubtitleDisplay.jsx  # Cinematic subtitle overlay
│   │   │   ├── HistoryPanel.jsx     # Slide-out history
│   │   │   └── StatusIndicator.jsx  # Detection status badge
│   │   ├── hooks/
│   │   │   └── useWebSocket.js      # WebSocket hook w/ auto-reconnect
│   │   ├── App.jsx                  # Main application shell
│   │   ├── main.jsx                 # Entry point
│   │   └── index.css                # Global styles + glassmorphism
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## 🔧 Replacing the Mock Model

The current backend uses heuristic-based gesture mapping. To use a real trained model:

1. Place your `model.h5` in the `backend/` folder
2. Edit `processor.py`:
   - Load the model with `tensorflow.keras.models.load_model('model.h5')`
   - Replace `mock_predict()` with actual model inference
   - Ensure input shape matches your model's expected landmark format

---

## 📄 License

MIT
