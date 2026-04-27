import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, CheckCircle2, AlertCircle } from 'lucide-react';

export function CollectorOverlay({ label, isCollecting, onFinish, status }) {
  const [phase, setPhase] = useState('countdown'); // countdown, capturing, finished
  const [progress, setProgress] = useState(0);
  const [samplesText, setSamplesText] = useState('');

  // Reset when starting a new collection
  useEffect(() => {
    if (isCollecting) {
      setPhase('countdown');
      setProgress(0);
      setSamplesText('');
    }
  }, [isCollecting, label]);

  // Handle Countdown (Restored)
  useEffect(() => {
    if (isCollecting && phase === 'countdown') {
      let count = 3;
      const timer = setInterval(() => {
        count -= 1;
        if (count === 0) {
          clearInterval(timer);
          setPhase('capturing');
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isCollecting, phase]);

  // Handle Capture Progress from Status
  useEffect(() => {
    if (isCollecting && phase === 'capturing' && status) {
      // Parse status like "Collecting hello: 45/100" or "Collection Finished: 100/100"
      const match = status.match(/(\d+)\/(\d+)$/);
      if (match) {
        const current = parseInt(match[1]);
        const total = parseInt(match[2]);
        const p = Math.min(100, (current / total) * 100);
        setProgress(p);
        setSamplesText(`${current} / ${total} samples`);
        
        if (current >= total || status.includes('Finished')) {
          setPhase('finished');
          setTimeout(() => onFinish(), 2000);
        }
      }
    }
  }, [status, isCollecting, phase, onFinish]);

  if (!isCollecting) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 1000,
      pointerEvents: 'none',
      color: '#fff', textAlign: 'center', overflow: 'hidden'
    }}>
      {phase === 'capturing' && (
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 text-red-500 font-semibold text-lg z-10 rounded-full bg-black/70 px-5 py-2">
          RECORDING...
        </div>
      )}
      <AnimatePresence mode="wait">
        {phase === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="absolute top-5 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-6 py-3 text-2xl md:text-3xl font-black"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Recording in...
          </motion.div>
        )}

        {phase === 'capturing' && (
          <motion.div
            key="capturing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-2xl bg-black/70 px-5 py-4"
            style={{ width: 'min(92%, 440px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
          >
            <h2 className="text-3xl md:text-4xl font-black break-words" style={{ fontFamily: "'Outfit', sans-serif" }}>
              "{label}"
            </h2>

            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden', padding: '1px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <motion.div
                animate={{ width: `${progress}%` }}
                style={{ height: '100%', background: 'linear-gradient(90deg, #ff4b4b, #ff8e8e)', borderRadius: '10px' }}
              />
            </div>
            
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.02em' }}>
              {samplesText || "Keep your hand steady in the frame"}
            </p>
          </motion.div>
        )}

        {phase === 'finished' && (
          <motion.div
            key="finished"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
          >
            <CheckCircle2 size={80} color="#00ff88" />
            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Capture Complete!</h2>
            <p style={{ opacity: 0.7 }}>{samplesText} saved to dataset</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
