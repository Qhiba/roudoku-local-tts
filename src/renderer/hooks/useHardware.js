import { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';

export function useHardware() {
  const [hardware, setHardware] = useState({
    gpuName: 'Detecting...',
    vramMB: 0,
    recommendedTier: 'Potato',
    cudaAvailable: false
  });
  const [voiceBanks, setVoiceBanks] = useState([]);
  const [tierRegistry, setTierRegistry] = useState({});
  const [loading, setLoading] = useState(true);

  const modelPath = useSettingsStore((state) => state.modelPath);
  const setSetting = useSettingsStore((state) => state.setSetting);

  const detect = async () => {
    try {
      const hw = await window.electronAPI.model.detectHardware();
      setHardware(hw);
      const registry = await window.electronAPI.model.getTierRegistry();
      setTierRegistry(registry);
    } catch (e) {
      console.error('Failed to detect hardware:', e);
    }
  };

  const updateVoiceBanks = async () => {
    try {
      const speakers = await window.electronAPI.model.listVoiceBanks();
      setVoiceBanks(speakers);
      
      const activeVoiceBankId = useSettingsStore.getState().voiceBankId;
      const speakerExists = speakers.some(sp => sp.id === activeVoiceBankId);
      if (speakers.length > 0 && !speakerExists) {
        setSetting('voiceBankId', speakers[0].id);
      }
    } catch (e) {
      console.error('Failed to list voice banks:', e);
    }
  };

  const loadModel = async (path) => {
    setLoading(true);
    try {
      const result = await window.electronAPI.model.loadModel(path);
      if (result.success) {
        await setSetting('modelPath', path);
        await updateVoiceBanks();
      }
      return result;
    } catch (e) {
      console.error('Failed to load model:', e);
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await detect();
      if (modelPath) {
        await updateVoiceBanks();
      }
      setLoading(false);
    };
    init();
  }, [modelPath]);

  return {
    ...hardware,
    voiceBanks,
    tierRegistry,
    loading,
    loadModel,
    refreshHardware: detect
  };
}
