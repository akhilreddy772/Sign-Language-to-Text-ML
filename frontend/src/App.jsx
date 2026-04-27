import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlignLeft,
  AlertCircle,
  BookOpen,
  RefreshCw,
  Type,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { WebcamFeed } from './components/WebcamFeed';
import { GesturesPanel } from './components/GesturesPanel';
import { CollectorOverlay } from './components/CollectorOverlay';
import { StatusIndicator } from './components/StatusIndicator';
import { SettingsPanel } from './components/SettingsPanel';
import { useWebSocket } from './hooks/useWebSocket';
import { useLanguage } from './context/LanguageContext';

const ToolbarBtn = ({ onClick, active, icon, label, activeColor = '0,207,255', isLightMode }) => (
  <motion.button
    whileHover={{ scale: 1.04, y: -2 }}
    whileTap={{ scale: 0.96 }}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minHeight: '44px',
      padding: '0 18px',
      borderRadius: '14px',
      cursor: 'pointer',
      background: active ? `rgba(${activeColor}, ${isLightMode ? '0.2' : '0.15'})` : (isLightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'),
      border: `1.5px solid ${active ? `rgba(${activeColor}, 0.6)` : (isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)')}`,
      color: active ? `rgb(${activeColor})` : (isLightMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'),
      fontWeight: 900,
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.02em',
      boxShadow: active ? `0 4px 15px rgba(${activeColor}, 0.2)` : 'none',
    }}
    title={label}
  >
    {icon}
    <span>{label}</span>
  </motion.button>
);

export default function App() {
  const { theme } = useLanguage();
  const isLightMode = theme === 'light';

  const [cameraActive, setCameraActive] = useState(true);
  const [history, setHistory] = useState([]);
  const [word, setWord] = useState('');
  const [handDetected, setHandDetected] = useState(false);
  const [fps, setFps] = useState(0);
  const [isSentenceMode, setIsSentenceMode] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [detectionStatus, setDetectionStatus] = useState('Initializing');
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectingLabel, setCollectingLabel] = useState(null);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [targetLang, setTargetLang] = useState('hi');
  const [showSkeleton, setShowSkeleton] = useState(true);

  const { isConnected, lastResult, sendFrame, startCollection, trainModel } = useWebSocket();
  const frameCountRef = useRef(0);
  const sentenceTimer = useRef(null);
  const lastWordRef = useRef('');
  const entryIdRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFrame = useCallback((dataUrl) => {
    if (!cameraActive) return;
    sendFrame(dataUrl, targetLang);
    frameCountRef.current += 1;
  }, [cameraActive, sendFrame, targetLang]);

  useEffect(() => {
    if (!lastResult) return;

    setHandDetected(Boolean(lastResult.handDetected));
    setDetectionStatus(lastResult.status || 'Detecting...');

    const currentWord = lastResult.prediction || lastResult.word;
    if (!currentWord || currentWord === 'Success') return;

    const emoji = lastResult.emoji || '';
    const confidence = lastResult.confidence || 0;
    const translated = lastResult.translated;
    setWord(currentWord);

    if (!isMuted && currentWord !== lastWordRef.current) {
      const utterance = new SpeechSynthesisUtterance(currentWord);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }

    if (currentWord === lastWordRef.current) return;
    lastWordRef.current = currentWord;

    setHistory((prev) => {
      const next = [...prev];
      const latest = next[next.length - 1];

      if (latest && latest.isDraft && isSentenceMode) {
        latest.text += ` ${currentWord}`;
        if (emoji) latest.emoji += ` ${emoji}`;
        latest.confidence = confidence;
        latest.translated = translated;
      } else {
        next.push({
          id: ++entryIdRef.current,
          text: currentWord,
          translated,
          emoji,
          confidence,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          isDraft: isSentenceMode,
        });
      }

      return next.slice(-5);
    });

    clearTimeout(sentenceTimer.current);
    sentenceTimer.current = setTimeout(() => {
      setHistory((prev) => {
        const next = [...prev];
        if (next.length > 0 && isSentenceMode) next[next.length - 1].isDraft = false;
        return next;
      });
      lastWordRef.current = '';
    }, 5000);
  }, [lastResult, isSentenceMode, isMuted]);

  useEffect(() => () => clearTimeout(sentenceTimer.current), []);

  const handleCapture = useCallback((label) => {
    setCollectingLabel(label);
    setIsCollecting(true);
    startCollection(label);
  }, [startCollection]);

  const handleTrain = useCallback(async () => {
    setDetectionStatus('Training...');
    const result = await trainModel();
    setTrainingStatus(result);
    setDetectionStatus(result.status === 'success' ? 'Model Ready' : 'Training Error');
    setTimeout(() => setTrainingStatus(null), 7000);
  }, [trainModel]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    setWord('');
    lastWordRef.current = '';
  }, []);

  const handleCopyText = useCallback(() => {
    const fullText = history.map((h) => h.text).join(' ');
    if (fullText) navigator.clipboard.writeText(fullText);
  }, [history]);

  const handleDownloadText = useCallback(() => {
    const text = history
      .map((h) => `[${h.timestamp}] ${h.text}${h.translated ? ` (${h.translated})` : ''}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signlive_transcript_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [history]);

  return (
    <div className="w-full min-h-screen overflow-hidden" style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      background: isLightMode
        ? 'radial-gradient(ellipse at top, #c7d2fe 0%, #e0f2fe 50%, #f0fdf4 100%)'
        : 'radial-gradient(ellipse at 50% 0%, #060c22 0%, #030810 60%, #010406 100%)',
    }}>
      {!isLightMode && (
        <>
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
          <div className="bg-orb bg-orb-3" />
        </>
      )}

      <div style={{
        position: 'relative',
        zIndex: 50,
        padding: '8px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        background: isLightMode ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.25)',
        borderBottom: isLightMode ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(18px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 900,
            fontSize: '1.15rem',
            color: isLightMode ? '#0f172a' : '#fff',
          }}>
            SignLive
          </h1>
          <StatusIndicator
            status={detectionStatus}
            isConnected={isConnected}
            handDetected={handDetected}
            fps={fps}
            confidence={lastResult?.confidence || 0}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            title="Translation language"
            style={{
              height: '38px',
              borderRadius: '12px',
              padding: '0 12px',
              border: isLightMode ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.2)',
              background: isLightMode ? '#fff' : '#1e293b',
              color: isLightMode ? '#000' : '#fff',
              fontWeight: 800,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option style={{ background: isLightMode ? '#fff' : '#1e293b', color: isLightMode ? '#000' : '#fff' }} value="en">English</option>
            <option style={{ background: isLightMode ? '#fff' : '#1e293b', color: isLightMode ? '#000' : '#fff' }} value="hi">Hindi (हिन्दी)</option>
            <option style={{ background: isLightMode ? '#fff' : '#1e293b', color: isLightMode ? '#000' : '#fff' }} value="te">Telugu (తెలుగు)</option>
            <option style={{ background: isLightMode ? '#fff' : '#1e293b', color: isLightMode ? '#000' : '#fff' }} value="ta">Tamil (தமிழ்)</option>
            <option style={{ background: isLightMode ? '#fff' : '#1e293b', color: isLightMode ? '#000' : '#fff' }} value="mr">Marathi (મરાठी)</option>
            <option style={{ background: isLightMode ? '#fff' : '#1e293b', color: isLightMode ? '#000' : '#fff' }} value="gu">Gujarati (ગુજરાતી)</option>
            <option style={{ background: isLightMode ? '#fff' : '#1e293b', color: isLightMode ? '#000' : '#fff' }} value="kn">Kannada (ಕನ್ನಡ)</option>
            <option style={{ background: isLightMode ? '#fff' : '#1e293b', color: isLightMode ? '#000' : '#fff' }} value="ml">Malayalam (മലയാളം)</option>
            <option style={{ background: isLightMode ? '#fff' : '#1e293b', color: isLightMode ? '#000' : '#fff' }} value="es">Spanish (Español)</option>
            <option style={{ background: isLightMode ? '#fff' : '#1e293b', color: isLightMode ? '#000' : '#fff' }} value="fr">French (Français)</option>
            <option style={{ background: isLightMode ? '#fff' : '#1e293b', color: isLightMode ? '#000' : '#fff' }} value="de">German (Deutsch)</option>
            <option style={{ background: isLightMode ? '#fff' : '#1e293b', color: isLightMode ? '#000' : '#fff' }} value="ja">Japanese (日本語)</option>
            <option style={{ background: isLightMode ? '#fff' : '#1e293b', color: isLightMode ? '#000' : '#fff' }} value="ko">Korean (한국어)</option>
          </select>
          <SettingsPanel />
        </div>
      </div>

      <main style={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: isPanelOpen ? 'minmax(0, 1fr) minmax(18rem, 24vw)' : 'minmax(0, 1fr)',
        gap: '16px',
        overflow: 'hidden',
        padding: '12px 16px',
      }}>
        <div style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-pro" style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            maxHeight: '70vh',
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: isLightMode ? '0 10px 30px rgba(0,0,0,0.05)' : '0 20px 50px rgba(0,0,0,0.4)',
          }}>
            <CollectorOverlay
              label={collectingLabel}
              isCollecting={isCollecting}
              onFinish={() => setIsCollecting(false)}
              status={detectionStatus}
            />
            <WebcamFeed
              onFrame={handleFrame}
              handDetected={handDetected}
              isActive={cameraActive}
              lastResult={lastResult}
              showSkeleton={showSkeleton}
            />
          </div>
        </div>

        {isPanelOpen && (
          <GesturesPanel
            isOpen={isPanelOpen}
            onClose={() => setIsPanelOpen(false)}
            isLightMode={isLightMode}
            onCapture={handleCapture}
            onTrain={handleTrain}
            isSidebar
          />
        )}
      </main>

      <div style={{
        position: 'relative',
        zIndex: 100, // Increased z-index to ensure it is always on top
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        background: isLightMode ? 'rgba(255,255,255,0.85)' : 'rgba(10, 12, 20, 0.8)',
        borderTop: isLightMode ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(25px)',
        boxShadow: isLightMode ? '0 -4px 20px rgba(0,0,0,0.03)' : '0 -10px 40px rgba(0,0,0,0.3)',
      }}>
        <ToolbarBtn onClick={() => setCameraActive((v) => !v)} active={cameraActive} icon={cameraActive ? <Video size={20} /> : <VideoOff size={20} />} label={cameraActive ? 'Camera On' : 'Camera Off'} isLightMode={isLightMode} />
        <ToolbarBtn onClick={() => setIsMuted((v) => !v)} active={!isMuted} icon={isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />} label={isMuted ? 'Muted' : 'Voice'} activeColor="0,255,136" isLightMode={isLightMode} />
        <ToolbarBtn onClick={() => setIsSentenceMode((v) => !v)} active={isSentenceMode} icon={<AlignLeft size={20} />} label="Sentence" activeColor="255,160,0" isLightMode={isLightMode} />
        <ToolbarBtn onClick={() => setShowSkeleton((v) => !v)} active={showSkeleton} icon={<Type size={20} />} label="Skeleton" activeColor="168,85,247" isLightMode={isLightMode} />
        <ToolbarBtn onClick={() => setIsPanelOpen((v) => !v)} active={isPanelOpen} icon={<BookOpen size={20} />} label="Gestures" activeColor="0,207,255" isLightMode={isLightMode} />
        <ToolbarBtn onClick={handleTrain} active={false} icon={<RefreshCw size={20} />} label="Train" activeColor="0,255,136" isLightMode={isLightMode} />
      </div>

      <AnimatePresence>
        {trainingStatus && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            style={{
              position: 'absolute',
              bottom: '92px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100,
              padding: '18px 24px',
              borderRadius: '18px',
              width: 'min(560px, calc(100vw - 32px))',
              background: trainingStatus.status === 'success' ? '#00ff88' : '#ff4b4b',
              color: '#000',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {trainingStatus.status === 'success' ? <Zap size={22} /> : <AlertCircle size={22} />}
              <div>
                <h4 style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.95rem' }}>
                  {trainingStatus.status === 'success' ? 'Training Success' : 'Training Needs Data'}
                </h4>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.82 }}>
                  {trainingStatus.message || trainingStatus.error || 'Check backend console for details.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
