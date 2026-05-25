// ADDED: settingsStore electron-store sync — all user prefs persisted to JSON on disk on every change

import { create } from 'zustand';

export const useSettingsStore = create((set, get) => ({
  modelPath: '',
  tier: '',
  voiceBankId: 0,
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  speedMultiplier: 1.0,

  // Load all initial values from electron-store on app start
  init: async () => {
    try {
      const store = await window.electronAPI.settings.getStore();
      if (store) {
        const savedModelPath = store.modelPath ?? '';
        let modelLoadedSuccessfully = false;

        if (savedModelPath) {
          const res = await window.electronAPI.model.loadModel(savedModelPath);
          if (res && res.success) {
            modelLoadedSuccessfully = true;
          } else {
            console.error('Failed to auto-load model on startup:', res ? res.error : 'Unknown error');
            await window.electronAPI.settings.set('modelPath', '');
          }
        }

        set({
          modelPath: modelLoadedSuccessfully ? savedModelPath : '',
          tier: store.tier ?? '',
          voiceBankId: store.voiceBankId ?? 0,
          rate: store.rate ?? 1.0,
          pitch: store.pitch ?? 1.0,
          volume: store.volume ?? 1.0,
          speedMultiplier: store.speedMultiplier ?? 1.0,
        });
      }
    } catch (e) {
      console.error('Failed to initialize settingsStore from disk:', e);
    }
  },

  // Updates local store state and writes back to disk asynchronously
  setSetting: async (key, val) => {
    set({ [key]: val });
    try {
      await window.electronAPI.settings.set(key, val);
    } catch (e) {
      console.error(`Failed to persist setting ${key}:`, e);
    }
  }
}));
