import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FRAME_INTERVAL_MS = 100; // Increased to 10 FPS for smoother detection

export function WebcamFeed({ onFrame, handDetected, isActive, lastResult, showSkeleton }) {
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null); // Visible skeleton canvas
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  // Handle webcam stream based on isActive
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(e => console.error("[Camera] Play failed:", e));
          };
        }
        setError(null);
      } catch (err) {
        console.error('[Camera] Error:', err);
        setError(err.name === 'NotAllowedError' ? 'Permission Denied' : 'Camera Error');
      }
    };

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isActive]);

  // Capture canvas frame and send to parent
  const captureAndSend = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // optimized for speed/quality balance
    onFrame(dataUrl);
  }, [onFrame]);

  // Start/stop interval based on isActive
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (isActive) {
      intervalRef.current = setInterval(captureAndSend, FRAME_INTERVAL_MS);
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive, captureAndSend]);

  // Handle Skeleton Drawing
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showSkeleton && lastResult?.landmarks) {
      canvas.width = 640;
      canvas.height = 480;
      
      lastResult.landmarks.forEach((hand) => {
        // Draw connections
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ff88';

        const connections = [
          [0,1], [1,2], [2,3], [3,4], // Thumb
          [0,5], [5,6], [6,7], [7,8], // Index
          [0,9], [9,10],[10,11],[11,12], // Middle
          [0,13], [13,14],[14,15],[15,16], // Ring
          [0,17], [17,18],[18,19],[19,20], // Pinky
          [5,9], [9,13], [13,17] // Palm
        ];

        connections.forEach(([i, j]) => {
          const lmi = hand[i];
          const lmj = hand[j];
          ctx.beginPath();
          ctx.moveTo((1 - lmi.x) * canvas.width, lmi.y * canvas.height); // Mirror logic
          ctx.lineTo((1 - lmj.x) * canvas.width, lmj.y * canvas.height);
          ctx.stroke();
        });

        // Draw points
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        hand.forEach((lm) => {
          ctx.beginPath();
          ctx.arc((1 - lm.x) * canvas.width, lm.y * canvas.height, 4, 0, 2 * Math.PI);
          ctx.fill();
        });
      });
    }
  }, [lastResult, showSkeleton]);

  const glowColor = handDetected ? 'rgba(0, 255, 136, 0.45)' : 'rgba(239, 68, 68, 0.25)';
  const borderColor = handDetected ? 'rgba(0, 255, 136, 0.6)' : 'rgba(239, 68, 68, 0.35)';

  const word = lastResult?.prediction || lastResult?.word;

  return (
    <div className="relative w-full h-full max-h-[70vh] flex items-center justify-center bg-black rounded-xl overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />

      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />

      {/* Skeleton Overlay */}
      <canvas
        ref={overlayCanvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      />

      {/* Floating Subtitle Overlay (Ultimate Edition) */}
      <AnimatePresence>
        {word && word !== 'unknown' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-4xl font-bold text-white z-10 text-center"
          >
            <h1>{word}</h1>
            {lastResult.translated && (
              <span className="block text-lg font-semibold text-emerald-300">
                {lastResult.translated}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Static Glow Frame */}
      <div style={{
          position: 'absolute', inset: 0,
          border: `3px solid ${borderColor}`,
          boxShadow: `inset 0 0 40px ${glowColor}`,
          pointerEvents: 'none',
          transition: 'all 0.4s ease',
          borderRadius: '1.5rem'
      }} />

      {/* Error/Paused UI */}
      {!isActive && !error && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem', fontWeight: 600 }}>Camera Paused</p>
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <p style={{ color: '#ff4b4b', fontSize: '1.4rem', fontWeight: 800 }}>{error}</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '10px' }}>Check camera permissions and try again.</p>
        </div>
      )}
    </div>
  );
}
