import React, { useState } from 'react';
import { useHardware } from '../../hooks/useHardware';
import HardwareStatus from './HardwareStatus';
import TierSelector from './TierSelector';
import VoiceBankPicker from './VoiceBankPicker';
import { useSettingsStore } from '../../store/settingsStore';

export default function ModelSetupView() {
  const {
    gpuName,
    vramMB,
    recommendedTier,
    cudaAvailable,
    voiceBanks,
    loadModel,
    tierRegistry,
    loading
  } = useHardware();

  const [selectedTier, setSelectedTier] = useState('Potato');
  const [modelPathInput, setModelPathInput] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loadSuccess, setLoadSuccess] = useState(false);
  const [selectedModelPath, setSelectedModelPath] = useState('');
  const [detectedModel, setDetectedModel] = useState(null);

  const setSetting = useSettingsStore((state) => state.setSetting);

  // Synchronize detected recommended tier
  React.useEffect(() => {
    if (recommendedTier) {
      setSelectedTier(recommendedTier);
    }
  }, [recommendedTier]);

  const handleBrowse = async () => {
    setLoadError('');
    setLoadSuccess(false);
    setDetectedModel(null);
    try {
      const filePath = await window.electronAPI.model.selectFile();
      if (!filePath) return;

      setModelPathInput(filePath);
      const res = await loadModel(filePath);
      setDetectedModel(res);
      if (res.success) {
        setLoadSuccess(true);
        setSelectedModelPath(filePath);
      } else {
        setLoadError(res.reason || res.error || 'Failed to load model.');
      }
    } catch (e) {
      setLoadError(e.message || 'Error choosing file.');
    }
  };

  const handleDone = async () => {
    if (loadSuccess && selectedModelPath) {
      await setSetting('modelPath', selectedModelPath);
      await setSetting('tier', selectedTier);
    }
  };

  return (
    <div className="h-full w-full bg-dark-950 flex flex-col items-center overflow-y-auto p-8">
      <div className="max-w-4xl w-full space-y-8">
        
        {/* Wizard title */}
        <div className="text-center space-y-2 mt-4">
          <h2 className="text-2xl font-bold tracking-tight text-white">First-Time Setup</h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Configure your model and hardware tier to enable natural offline Japanese narration.
          </p>
        </div>

        {/* Step 1: Hardware Diagnostics */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 shadow-md">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400 mb-4 flex items-center">
            <span className="w-2 h-2 rounded-full bg-brand-500 mr-2"></span>
            Step 1: Hardware Diagnostics
          </h3>
          <HardwareStatus 
            gpuName={gpuName}
            vramMB={vramMB}
            cudaAvailable={cudaAvailable}
            recommendedTier={recommendedTier}
          />
        </div>

        {/* Step 2: Tier Selection */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 shadow-md">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400 mb-4 flex items-center">
            <span className="w-2 h-2 rounded-full bg-brand-500 mr-2"></span>
            Step 2: Choose Hardware Tier & Download Model
          </h3>
          <TierSelector 
            selectedTier={selectedTier}
            onSelectTier={setSelectedTier}
            recommendedTier={recommendedTier}
            vramMB={vramMB}
            tierRegistry={tierRegistry}
          />
        </div>

        {/* Step 3: Browse and Load Model */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 shadow-md space-y-6">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400 flex items-center">
            <span className="w-2 h-2 rounded-full bg-brand-500 mr-2"></span>
            Step 3: Load Model File & Choose Voice
          </h3>

          {detectedModel && (
            <div className={`rounded-lg p-4 text-xs font-medium border ${
              detectedModel.supported && loadSuccess
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <div className="font-bold text-sm mb-1">
                Detected: {detectedModel.label || detectedModel.family || 'Unknown Model'}
              </div>
              <div className="leading-relaxed">
                Status: {detectedModel.supported 
                  ? 'Supported and ready.' 
                  : (detectedModel.reason || 'This model family is not supported.')}
              </div>
              {detectedModel.missingFiles && detectedModel.missingFiles.length > 0 && (
                <div className="mt-2 text-amber-400 border-t border-amber-500/20 pt-2">
                  <span className="font-semibold text-amber-300">Missing required companion files in model folder:</span>
                  <ul className="list-disc list-inside mt-1 ml-1 text-slate-300">
                    {detectedModel.missingFiles.map((file) => (
                      <li key={file}>{file}</li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-slate-400 text-[10px]">
                    Please download or place the files listed above in the same folder as your .onnx file.
                  </p>
                </div>
              )}
            </div>
          )}

          {!detectedModel && !loadSuccess && (
            <div className="bg-brand-500/5 border border-brand-500/10 rounded-lg p-4 text-sm text-brand-300">
              <p className="font-semibold mb-1">No model loaded yet?</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pick your tier above and click its Download link to get the model file from Hugging Face, then come back here to load it.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                readOnly
                placeholder="No model file selected (.onnx)..."
                value={modelPathInput}
                className="w-full bg-dark-950 border border-dark-800 rounded-lg px-4 py-2.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
              />
            </div>
            <button
              onClick={handleBrowse}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-semibold text-xs px-6 py-2.5 rounded-lg shadow transition duration-200 focus:outline-none flex items-center justify-center space-x-1"
            >
              <span>{loading ? 'Loading...' : 'Browse Model'}</span>
            </button>
          </div>

          {loadError && (
            <p className="text-xs text-red-400 bg-red-950/20 border border-red-950/40 rounded p-2.5">
              ⚠️ {loadError}
            </p>
          )}

          {/* Voice Picker (Step 4 - reveals once loaded) */}
          {loadSuccess && voiceBanks.length > 0 && (
            <div className="border-t border-dark-800 pt-6">
              <VoiceBankPicker voiceBanks={voiceBanks} />
            </div>
          )}
        </div>

        {/* Done / Finish */}
        <div className="flex justify-end pt-4 pb-12">
          <button
            onClick={handleDone}
            disabled={!loadSuccess}
            className={`w-full sm:w-auto font-bold text-xs px-8 py-3 rounded-lg shadow-lg transition duration-200 ${
              loadSuccess
                ? 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white transform hover:-translate-y-0.5'
                : 'bg-dark-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Complete Setup
          </button>
        </div>

      </div>
    </div>
  );
}
