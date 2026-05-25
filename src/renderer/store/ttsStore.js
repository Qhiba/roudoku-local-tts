import { create } from 'zustand';

export const useTTSStore = create((set) => ({
  status: 'idle', // 'idle' | 'playing' | 'paused' | 'stopped'
  currentChunkText: '',
  queue: [],
  
  setStatus: (status) => set({ status }),
  setCurrentChunk: (text) => set({ currentChunkText: text }),
  enqueueChunk: (chunk) => set((state) => ({ queue: [...state.queue, chunk] })),
  clearQueue: () => set({ queue: [] }),
}));
