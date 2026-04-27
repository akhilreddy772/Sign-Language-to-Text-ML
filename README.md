# 🖐️ SignLive — Real-Time Sign Language to Text Converter

> Real-time system that translates hand gestures (sign language) into text using Machine Learning, improving accessibility and communication.

---



---

## 🚀 Overview
SignLive is a full-stack real-time application that detects hand gestures from a webcam and converts them into text using a Machine Learning model.  
It helps bridge the communication gap for people using sign language.

---

## 🔥 Key Features
- 🎥 Real-time webcam gesture detection
- 🧠 Random Forest Machine Learning model
- 📊 Confidence-based predictions
- 🔁 Multi-frame smoothing for stable output
- ⚡ Fast and responsive React UI
- 🖐️ Supports multiple gestures (Hello, Good, Bad, Stop, Peace, etc.)

---

## 🧠 How It Works
1. Capture hand landmarks using MediaPipe
2. Extract meaningful features from landmarks
3. Feed features into a trained Random Forest model
4. Predict gesture with confidence score
5. Display output text in real-time UI

---

## 🛠 Tech Stack
- **Frontend:** React (Vite)
- **Backend:** Python
- **ML Library:** scikit-learn
- **Computer Vision:** MediaPipe, OpenCV

---

## 📊 Machine Learning Model
- Algorithm: **Random Forest**
- Input: Hand landmark features
- Output: Gesture label + confidence score
- Optimization: Multi-frame voting for smoother predictions

---

## ▶️ Run Locally

### 🔹 Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
