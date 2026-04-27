import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
const RECONNECT_DELAY_MS = 2000;

export function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const isMounted = useRef(true);

  const [isConnected, setIsConnected] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const connect = useCallback(() => {
    if (!isMounted.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    console.log('[WS] Connecting...');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      console.log('[WS] Connected ✅');
      setIsConnected(true);
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('[WS] Received:', data);
        setLastResult(data);
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      if (!isMounted.current) return;
      console.log(`[WS] Disconnected. Reconnecting in ${RECONNECT_DELAY_MS}ms…`);
      setIsConnected(false);
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      ws.close();
    };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // Stable sendFrame using ref — never stale
  const sendFrame = useCallback((imageDataUrl, lang = 'hi') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ image: imageDataUrl, lang }));
    }
  }, []);

  // Control messages
  const startCollection = useCallback((label) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start_collection', label }));
    }
  }, []);

  const trainModel = useCallback(async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const resp = await fetch(`${apiBase}/train`, { method: 'POST' });
      return await resp.json();
    } catch (err) {
      console.error('Training Error:', err);
      return { status: 'error', message: err.message };
    }
  }, []);

  return { isConnected, lastResult, sendFrame, startCollection, trainModel };
}
