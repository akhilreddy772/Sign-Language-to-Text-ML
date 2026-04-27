import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareText } from 'lucide-react';

export function SubtitlePanel({ history, isLightMode }) {
  const panelRef = useRef(null);

  // Auto-scroll to the bottom whenever history changes
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: isLightMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(255,255,255,0.07)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: isLightMode ? '1px solid rgba(0,0,0,0.07)' : '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: isLightMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageSquareText size={20} color={isLightMode ? "#00cfff" : "#00ff88"} />
          <h2 style={{
            fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1.1rem',
            color: isLightMode ? '#111' : '#fff', letterSpacing: '0.02em',
          }}>
            Live Subtitles
          </h2>
        </div>
        {history.length > 0 && (
          <span style={{
            background: isLightMode ? 'rgba(0,207,255,0.15)' : 'rgba(0,255,136,0.1)',
            border: isLightMode ? '1px solid rgba(0,207,255,0.4)' : '1px solid rgba(0,255,136,0.3)',
            color: isLightMode ? '#0072ff' : '#00ff88',
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em',
            padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase'
          }}>
            {history.length} {history.length === 1 ? 'word' : 'words'}
          </span>
        )}
      </div>

      {/* Chat Messages */}
      <div
        ref={panelRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '20px',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}
        className="scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {history.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                textAlign: 'center', marginTop: 'auto', marginBottom: 'auto',
                color: isLightMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.3)',
                fontStyle: 'italic', fontSize: '0.95rem'
              }}
            >
              Waiting for signs...
            </motion.div>
          ) : (
            history.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  alignSelf: 'flex-start', maxWidth: '90%',
                  background: isLightMode ? 'rgba(255,255,255,0.8)' : 'rgba(25,25,35,0.85)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  border: isLightMode ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px', borderTopLeftRadius: '4px',
                  padding: '12px 18px',
                }}
              >
                {/* Confidence Badge */}
                {entry.confidence && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px'
                  }}>
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: '#00ff88', boxShadow: '0 0 8px #00ff88'
                    }} />
                    <span style={{
                      fontSize: '0.65rem', fontFamily: 'monospace',
                      color: isLightMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
                      textTransform: 'uppercase', letterSpacing: '0.04em'
                    }}>
                      Confidence {Math.round(entry.confidence * 100)}%
                    </span>
                  </div>
                )}
                
                {/* Text Content */}
                <p style={{
                  fontFamily: "'Outfit', sans-serif", fontWeight: 600,
                  fontSize: '1.25rem', lineHeight: 1.4,
                  color: isLightMode ? '#000' : '#fff',
                }}>
                  {entry.emoji && <span style={{ marginRight: '8px', letterSpacing: '4px' }}>{entry.emoji}</span>}
                  {entry.text}
                  {entry.isDraft && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: '3px',
                        height: '1em',
                        background: '#00cfff',
                        marginLeft: '4px',
                        verticalAlign: 'text-bottom',
                        animation: 'blink 1s step-end infinite',
                        borderRadius: '2px',
                      }}
                    />
                  )}
                </p>

                {/* Translation Display */}
                {entry.translated && (
                  <p style={{
                    fontSize: '0.85rem', fontWeight: 500, marginTop: '2px',
                    color: isLightMode ? '#0072ff' : '#00ff88',
                    opacity: 0.9, letterSpacing: '0.01em'
                  }}>
                    {entry.translated}
                  </p>
                )}
                
                {/* Timestamp */}
                <div style={{
                  textAlign: 'right', marginTop: '6px',
                  fontSize: '0.65rem', color: isLightMode ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)'
                }}>
                  {entry.timestamp}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
      
      {/* Injecting keyframes for blinking cursor */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(150,150,150,0.3); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(150,150,150,0.5); }
      `}</style>
    </div>
  );
}
