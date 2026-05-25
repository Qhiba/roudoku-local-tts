import React, { useEffect, useRef } from 'react';
import { useTTSStore } from '../../store/ttsStore';
import { useSettingsStore } from '../../store/settingsStore';

export default function AudioQueue() {
  const status = useTTSStore((state) => state.status);
  const queue = useTTSStore((state) => state.queue);
  const setStatus = useTTSStore((state) => state.setStatus);
  const setCurrentChunk = useTTSStore((state) => state.setCurrentChunk);

  const volume = useSettingsStore((state) => state.volume);
  const speedMultiplier = useSettingsStore((state) => state.speedMultiplier);

  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const nextPlayTimeRef = useRef(0);
  const activeSourcesRef = useRef([]);
  const processedCountRef = useRef(0);

  const getAudioContext = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      gainNodeRef.current = audioCtxRef.current.createGain();
      gainNodeRef.current.gain.value = volume;
      gainNodeRef.current.connect(audioCtxRef.current.destination);
    }
    return audioCtxRef.current;
  };

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    const ctx = getAudioContext();

    if (status === 'playing') {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    } else if (status === 'paused') {
      if (ctx.state === 'running') {
        ctx.suspend();
      }
    } else if (status === 'stopped' || status === 'idle') {
      activeSourcesRef.current.forEach(source => {
        try {
          source.stop();
        } catch (e) {}
      });
      activeSourcesRef.current = [];
      nextPlayTimeRef.current = 0;
      processedCountRef.current = 0;
      setCurrentChunk('');

      if (ctx.state === 'running') {
        ctx.suspend();
      }
    }
  }, [status, setCurrentChunk]);

  useEffect(() => {
    if (status !== 'playing' || queue.length === 0) return;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    while (processedCountRef.current < queue.length) {
      const chunk = queue[processedCountRef.current];
      processedCountRef.current += 1;

      let pcmData = chunk.pcm;

      // Robustly convert/reconstruct the float32 PCM samples from whatever serialization format it arrived in
      if (pcmData && !(pcmData instanceof Float32Array)) {
        if (pcmData instanceof Uint8Array || pcmData instanceof ArrayBuffer) {
          const buffer = pcmData instanceof ArrayBuffer ? pcmData : pcmData.buffer;
          const byteOffset = pcmData.byteOffset || 0;
          const byteLength = pcmData.byteLength || pcmData.length;
          
          if (byteOffset % 4 === 0) {
            pcmData = new Float32Array(buffer, byteOffset, byteLength / 4);
          } else {
            const alignedBuffer = buffer.slice(byteOffset, byteOffset + byteLength);
            pcmData = new Float32Array(alignedBuffer);
          }
        } else if (Array.isArray(pcmData)) {
          pcmData = Float32Array.from(pcmData);
        } else if (typeof pcmData === 'object') {
          if (pcmData.type === 'Buffer' && Array.isArray(pcmData.data)) {
            const uint8 = Uint8Array.from(pcmData.data);
            pcmData = new Float32Array(uint8.buffer, uint8.byteOffset, uint8.byteLength / 4);
          } else {
            const keys = Object.keys(pcmData);
            const len = pcmData.length !== undefined ? pcmData.length : keys.length;
            const arr = new Float32Array(len);
            for (let i = 0; i < len; i++) {
              arr[i] = pcmData[i] || 0;
            }
            pcmData = arr;
          }
        }
      }

      if (!pcmData || pcmData.length === 0) {
        continue;
      }

      const sampleRate = chunk.sampleRate || 22050; 

      const audioBuffer = ctx.createBuffer(1, pcmData.length, sampleRate);
      audioBuffer.getChannelData(0).set(pcmData);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = speedMultiplier;

      source.connect(gainNodeRef.current);

      const now = ctx.currentTime;
      let startTime = nextPlayTimeRef.current;

      if (startTime < now) {
        startTime = now + 0.05; 
      }

      source.start(startTime);
      
      const duration = audioBuffer.duration / speedMultiplier;
      nextPlayTimeRef.current = startTime + duration;

      const delayMs = (startTime - now) * 1000;
      const text = chunk.text;
      const timeoutId = setTimeout(() => {
        if (useTTSStore.getState().status === 'playing') {
          setCurrentChunk(text);
        }
      }, Math.max(0, delayMs));

      source.onended = () => {
        clearTimeout(timeoutId);
        activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
        
        if (activeSourcesRef.current.length === 0 && processedCountRef.current >= useTTSStore.getState().queue.length) {
          setStatus('idle');
          setCurrentChunk('');
        }
      };

      activeSourcesRef.current.push(source);
    }
  }, [queue, status, speedMultiplier, setStatus, setCurrentChunk]);

  useEffect(() => {
    return () => {
      activeSourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
      });
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  return null;
}
