import { useEffect } from 'react';
import { useTTSStore } from '../store/ttsStore';
import { useSettingsStore } from '../store/settingsStore';

export function useTTS() {
  const status = useTTSStore((state) => state.status);
  const currentChunkText = useTTSStore((state) => state.currentChunkText);
  const setStatus = useTTSStore((state) => state.setStatus);
  const setCurrentChunk = useTTSStore((state) => state.setCurrentChunk);
  const clearQueue = useTTSStore((state) => state.clearQueue);

  const voiceBankId = useSettingsStore((state) => state.voiceBankId);
  const rate = useSettingsStore((state) => state.rate);

  // Subscribe to incoming PCM chunks exactly once on mount, unsubscribe on unmount.
  // Dependency array is intentionally empty: registering more than one ipcRenderer.on
  // listener causes every chunk to be enqueued N times (doubled / tripled audio).
  // enqueueChunk is read via useTTSStore.getState() at call time, so no closure-stale risk.
  useEffect(() => {
    const unsubscribe = window.electronAPI.tts.onPcmChunk((chunk) => {
      if (useTTSStore.getState().status === 'playing' && chunk && chunk.pcm) {
        useTTSStore.getState().enqueueChunk({
          text: chunk.text,
          pcm: chunk.pcm,
          sampleRate: chunk.sampleRate
        });
      }
    });
    return () => {
      unsubscribe();
    };
  }, []); // [] = register once on mount only — never re-subscribe

  const startPreview = async (text) => {
    if (!text || !text.trim()) return;

    await stop();

    // Clear queue before playing to prevent race conditions with old chunks
    clearQueue();
    setStatus('playing');

    try {
      await window.electronAPI.tts.startPreview(text, voiceBankId, rate);
    } catch (e) {
      console.error('TTS execution failed:', e);
      setStatus('stopped');
    }
  };

  const stop = async () => {
    try {
      await window.electronAPI.tts.stopPreview();
    } catch (e) {
      console.error('Failed to stop TTS preview:', e);
    }

    clearQueue();
    setCurrentChunk('');
    setStatus('stopped');
  };

  return {
    status,
    currentChunkText,
    startPreview,
    stop
  };
}
