import React from 'react';
import { useSettingsStore } from '../../store/settingsStore';

export default function SettingsPanel() {
  const rate = useSettingsStore((state) => state.rate);
  const pitch = useSettingsStore((state) => state.pitch);
  const volume = useSettingsStore((state) => state.volume);
  const setSetting = useSettingsStore((state) => state.setSetting);

  const presets = [0.8, 1.0, 1.2, 1.5, 1.8];

  return (
    <div className="space-y-6 text-left">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-dark-800 pb-3">
        Audio Parameters
      </h3>

      {/* Volume Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span>Volume</span>
          <span className="text-white font-medium">{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => setSetting('volume', parseFloat(e.target.value))}
          className="w-full h-1 bg-dark-950 rounded-lg appearance-none cursor-pointer accent-brand-500"
        />
      </div>

      {/* Speech Rate (Synthesizer speed) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span>Speech Rate</span>
          <span className="text-white font-medium">{rate.toFixed(2)}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.05"
          value={rate}
          onChange={(e) => setSetting('rate', parseFloat(e.target.value))}
          className="w-full h-1 bg-dark-950 rounded-lg appearance-none cursor-pointer accent-brand-500"
        />
        
        {/* Presets */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Presets</span>
          <div className="flex space-x-1">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setSetting('rate', p)}
                className={`text-[9px] font-bold px-2 py-0.5 rounded border transition duration-200 focus:outline-none ${
                  Math.abs(rate - p) < 0.01
                    ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                    : 'bg-dark-950 border-dark-800 hover:border-dark-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Synthesizer Pitch */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span>Pitch</span>
          <span className="text-white font-medium">{pitch.toFixed(2)}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.05"
          value={pitch}
          onChange={(e) => setSetting('pitch', parseFloat(e.target.value))}
          className="w-full h-1 bg-dark-950 rounded-lg appearance-none cursor-pointer accent-brand-500"
        />
        <div className="flex justify-between text-[9px] text-slate-600 font-semibold tracking-wide">
          <span>Deep</span>
          <span>Normal</span>
          <span>High</span>
        </div>
      </div>

      {/* Info Warning Alert */}
      <div className="bg-dark-950/50 border border-dark-800/80 rounded-lg p-3.5 text-[10px] text-slate-500 space-y-2 leading-relaxed">
        <p className="font-semibold text-slate-400">Live Preview Tuning</p>
        <p>
          Speech rate and pitch adjustments affect duration modeling in the local ONNX model during synthesizing. Changes take effect on the next sentence chunk.
        </p>
      </div>

    </div>
  );
}
