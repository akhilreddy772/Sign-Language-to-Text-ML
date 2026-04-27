import { motion } from 'framer-motion';

export function StatusIndicator({ status, isConnected, handDetected, fps, confidence }) {
  const isDetecting = handDetected;
  const confPct = Math.round((confidence || 0) * 100);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>

      {/* WebSocket connection pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '5px 11px', borderRadius: '999px',
        background: isConnected ? 'rgba(0,255,136,0.07)' : 'rgba(239,68,68,0.07)',
        border: `1px solid ${isConnected ? 'rgba(0,255,136,0.3)' : 'rgba(239,68,68,0.3)'}`,
      }}>
        <motion.div
          style={{ width: 7, height: 7, borderRadius: '50%', background: isConnected ? '#00ff88' : '#ef4444' }}
          animate={isConnected ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        <span style={{ color: isConnected ? '#00ff88' : '#ef4444', fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.06em' }}>
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      {/* Hand / Status badge */}
      <motion.div
        layout
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 13px', borderRadius: '999px',
          background: isDetecting ? 'rgba(0,255,136,0.10)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${isDetecting ? 'rgba(0,255,136,0.4)' : 'rgba(239,68,68,0.3)'}`,
        }}
        animate={isDetecting ? {
          boxShadow: ['0 0 0px rgba(0,255,136,0)', '0 0 14px rgba(0,255,136,0.3)', '0 0 0px rgba(0,255,136,0)'],
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: isDetecting ? '#00ff88' : '#ef4444',
          boxShadow: isDetecting ? '0 0 6px #00ff88' : 'none',
        }} />
        <span style={{
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
          color: isDetecting ? '#00ff88' : 'rgba(239,68,68,0.75)',
        }}>
          {isDetecting ? (status || 'Detecting') : 'No Hand'}
        </span>
      </motion.div>

      {/* Confidence Meter */}
      {isDetecting && confidence > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '5px 12px', borderRadius: '999px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ width: 48, height: 5, borderRadius: '999px', background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', borderRadius: '999px', background: confPct >= 80 ? '#00ff88' : confPct >= 60 ? '#ffa000' : '#ff4b4b' }}
              animate={{ width: `${confPct}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            {confPct}%
          </span>
        </div>
      )}

      {/* FPS badge */}
      {fps !== undefined && (
        <div style={{
          padding: '5px 10px', borderRadius: '999px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 600 }}>
            {fps} FPS
          </span>
        </div>
      )}
    </div>
  );
}
