import React, { useEffect } from 'react';
import { useSettingsStore } from './store/settingsStore';
import ModelSetupView from './features/model-setup/ModelSetupView';
import PreviewPlayer from './features/preview/PreviewPlayer';
import SettingsPanel from './features/settings/SettingsPanel';

export default function App() {
  const modelPath = useSettingsStore((state) => state.modelPath);
  const initSettings = useSettingsStore((state) => state.init);

  useEffect(() => {
    initSettings();
  }, []); // [] = run once on mount only; initSettings is a stable Zustand action reference

  const hasModel = !!modelPath;

  return (
    <div className="flex flex-col h-screen w-screen bg-dark-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Persistent Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-dark-900 border-b border-dark-800 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg">
            <span className="font-bold text-white text-sm">朗</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">朗読 - Roudoku</h1>
            <p className="text-xs text-slate-400">Offline Japanese Audiobook Converter</p>
          </div>
        </div>
        {hasModel && (
          <div className="flex items-center space-x-4">
            <span className="text-xs px-2.5 py-1 rounded bg-brand-500/10 border border-brand-500/20 text-brand-300 font-medium">
              Model Active
            </span>
            <button
              onClick={() => useSettingsStore.getState().setSetting('modelPath', '')}
              className="text-xs text-slate-400 hover:text-white hover:underline transition duration-200"
            >
              Change Model
            </button>
          </div>
        )}
      </header>

      {/* Main App Content */}
      <main className="flex-1 overflow-hidden">
        {!hasModel ? (
          <ModelSetupView />
        ) : (
          <div className="flex h-full w-full divide-x divide-dark-800">
            {/* Left Column: Chapter List (Placeholder - Wired in Phase 2) */}
            <aside className="w-80 bg-dark-900/40 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-xl">
                📖
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-400 text-sm">Chapter Navigator</p>
                <p className="text-xs text-slate-500 max-w-[220px] leading-relaxed">
                  Novel files (.epub, .pdf, .txt) and parsed chapters will display here in Phase 2.
                </p>
              </div>
            </aside>

            {/* Center Column: Preview Player */}
            <section className="flex-1 bg-dark-950 p-8 overflow-y-auto flex flex-col justify-between">
              <PreviewPlayer />
            </section>

            {/* Right Column: Settings Panel */}
            <aside className="w-80 bg-dark-900 p-6 overflow-y-auto">
              <SettingsPanel />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
