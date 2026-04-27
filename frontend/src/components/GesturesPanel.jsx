import { motion } from 'framer-motion';
import { BookOpen, X, ShieldCheck, Video, BrainCircuit } from 'lucide-react';

const SUPPORTED_GESTURES = [
  { w: "hello", e: "✋", desc: "Open palm with thumb out" },
  { w: "good", e: "👍", desc: "Thumbs up (fingers curled)" },
  { w: "bad", e: "👎", desc: "Thumbs down (fingers curled)" },
  { w: "stop", e: "✊", desc: "Closed fist (palm forward)" },
  { w: "okay", e: "👌", desc: "Thumb and index form a circle" },
  { w: "peace", e: "✌️", desc: "Index and middle fingers raised" }
];

export function GesturesPanel({ isOpen, onClose, isLightMode, onCapture, onTrain, isSidebar = false }) {
  if (!isOpen && !isSidebar) return null;

  const containerStyle = isSidebar ? {
    width: '100%', height: '100%', maxHeight: '70vh',
    background: isLightMode ? 'rgba(255,255,255,0.6)' : 'rgba(3, 7, 18, 0.4)',
    backdropFilter: 'blur(30px)',
    borderRadius: '24px',
    border: isLightMode ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden'
  } : {
    position: 'absolute', top: 0, right: 0, bottom: 0, width: '360px',
    background: isLightMode ? 'rgba(255,255,255,0.92)' : 'rgba(10,12,20,0.95)',
    backdropFilter: 'blur(30px)',
    borderLeft: isLightMode ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
    zIndex: 100, display: 'flex', flexDirection: 'column',
    boxShadow: '-10px 0 30px rgba(0,0,0,0.3)'
  };

  return (
    <motion.div
      initial={isSidebar ? { opacity: 0 } : { opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      style={containerStyle}
    >
      <div style={{
        padding: '20px 24px', borderBottom: isLightMode ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={20} color={isLightMode ? "#00cfff" : "#00ff88"} />
          <h2 style={{
            fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '1.2rem',
            color: isLightMode ? '#000' : '#fff'
          }}>
            Stable Dictionary
          </h2>
        </div>
        {!isSidebar && (
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '8px', opacity: 0.6
          }}>
            <X size={20} color={isLightMode ? '#000' : '#fff'} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ 
          background: 'rgba(0, 255, 136, 0.08)', 
          padding: '14px', borderRadius: '16px', 
          marginBottom: '20px', border: '1px solid rgba(0, 255, 136, 0.2)',
          display: 'flex', gap: '12px'
        }}>
          <ShieldCheck size={20} color="#00ff88" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.75rem', color: isLightMode ? '#065f46' : '#a7f3d0', lineHeight: 1.6, fontWeight: 500 }}>
            Advanced Stability active. Gestures require 4/7 frame consensus and a steady hand to trigger.
          </p>
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          {SUPPORTED_GESTURES.map((it, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ x: 5 }}
              style={{
                padding: '12px 16px', borderRadius: '18px',
                background: isLightMode ? '#fff' : 'rgba(255,255,255,0.03)',
                border: isLightMode ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', gap: '14px'
              }}
            >
              <div style={{ 
                width: 48, height: 48, borderRadius: '12px', background: 'rgba(255,255,255,0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem'
              }}>
                {it.e}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.95rem', fontWeight: 800, color: isLightMode ? '#000' : '#fff', textTransform: 'capitalize' }}>
                  {it.w}
                </p>
                <p style={{ fontSize: '0.7rem', color: isLightMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                  {it.desc}
                </p>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.1, background: 'rgba(255, 75, 75, 0.3)' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onCapture(it.w)}
                style={{
                  padding: '10px', borderRadius: '12px', background: 'rgba(255, 75, 75, 0.15)',
                  border: '1px solid rgba(255, 75, 75, 0.3)', cursor: 'pointer',
                  color: '#ff4b4b', display: 'flex', alignItems: 'center'
                }}
                title="Capture training data"
              >
                <Video size={16} />
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>

      <div style={{ 
        padding: '20px', 
        borderTop: isLightMode ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.08)',
        background: isLightMode ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.01)'
      }}>
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(0,255,136,0.3)' }}
          whileTap={{ scale: 0.98 }}
          onClick={onTrain}
          style={{
            width: '100%', padding: '14px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #00ff88, #00cfff)',
            border: 'none', cursor: 'pointer', color: '#000',
            fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}
        >
          <BrainCircuit size={18} />
          TRAIN ML MODEL
        </motion.button>
        <p style={{ textAlign: 'center', fontSize: '0.65rem', marginTop: '10px', opacity: 0.5, color: isLightMode ? '#000' : '#fff', fontWeight: 600 }}>
          Recommended: Collect 200+ samples per label before training.
        </p>
      </div>
    </motion.div>
  );
}
