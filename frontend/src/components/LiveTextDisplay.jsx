import { motion } from 'framer-motion';
import { Copy, Download, RotateCcw } from 'lucide-react';

export function LiveTextDisplay({ history, isLightMode, onClear, onDownload, onCopy }) {
  const currentSentence = history.length > 0 ? history[history.length - 1] : null;
  const fullText = history.map(h => h.text).join(' ');
  const fullEmoji = history.map(h => h.emoji).join(' ');

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '140px',
      background: isLightMode 
        ? 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(200,230,255,0.8) 100%)'
        : 'linear-gradient(135deg, rgba(10,15,30,0.98) 0%, rgba(20,30,50,0.9) 100%)',
      backdropFilter: 'blur(20px)',
      borderBottom: isLightMode 
        ? '2px solid rgba(0,207,255,0.3)' 
        : '2px solid rgba(0,255,136,0.2)',
      padding: '16px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      zIndex: 40
    }}>
      {/* Title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#00ff88',
            animation: 'pulse 2s infinite',
            boxShadow: '0 0 12px #00ff88'
          }} />
          <h1 style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: isLightMode ? '#0072ff' : '#00ff88',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            LIVE SIGN DETECTION
          </h1>
        </div>
        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onCopy}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: `1px solid ${isLightMode ? 'rgba(0,207,255,0.3)' : 'rgba(0,255,136,0.2)'}`,
              background: isLightMode ? 'rgba(0,207,255,0.1)' : 'rgba(0,255,136,0.05)',
              color: isLightMode ? '#0072ff' : '#00ff88',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Copy size={14} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onDownload}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: `1px solid ${isLightMode ? 'rgba(0,207,255,0.3)' : 'rgba(0,255,136,0.2)'}`,
              background: isLightMode ? 'rgba(0,207,255,0.1)' : 'rgba(0,255,136,0.05)',
              color: isLightMode ? '#0072ff' : '#00ff88',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Download size={14} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClear}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: `1px solid ${isLightMode ? 'rgba(255,75,75,0.3)' : 'rgba(255,100,100,0.2)'}`,
              background: isLightMode ? 'rgba(255,75,75,0.1)' : 'rgba(255,100,100,0.05)',
              color: isLightMode ? '#ff4b4b' : '#ff6464',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RotateCcw size={14} />
          </motion.button>
        </div>
      </div>

      {/* Emoji Line */}
      {fullEmoji && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: '1.6rem',
            letterSpacing: '8px',
            height: '28px',
            overflow: 'hidden',
            color: isLightMode ? '#444' : '#fff'
          }}
        >
          {fullEmoji}
        </motion.div>
      )}

      {/* Main Text Display */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={fullText || 'empty'}
        style={{
          fontSize: '1.8rem',
          fontWeight: 700,
          fontFamily: "'Outfit', sans-serif",
          color: isLightMode ? '#000' : '#fff',
          minHeight: '32px',
          display: 'flex',
          alignItems: 'center',
          letterSpacing: '0.02em',
          wordBreak: 'break-word'
        }}
      >
        {fullText || 'Waiting for hand signs...'}
      </motion.div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        gap: '16px',
        fontSize: '0.7rem',
        color: isLightMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
        fontFamily: 'monospace'
      }}>
        <span>Words: {history.length}</span>
        {currentSentence && (
          <>
            <span>Last: {currentSentence.text}</span>
            <span>Confidence: {Math.round(currentSentence.confidence * 100)}%</span>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
