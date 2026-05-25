import React, { useState } from 'react';
import { useTTS } from '../../hooks/useTTS';
import { useTTSStore } from '../../store/ttsStore';
import { useSettingsStore } from '../../store/settingsStore';
import AudioQueue from './AudioQueue';

export default function PreviewPlayer() {
  const { status, currentChunkText, startPreview, stop } = useTTS();
  const setStatus = useTTSStore((state) => state.setStatus);
  const speedMultiplier = useSettingsStore((state) => state.speedMultiplier);
  const setSetting = useSettingsStore((state) => state.setSetting);

  const [text, setText] = useState('こんにちは。今日はいい天気ですね。朗読システムのテスト音声を作成しています。');

  const handlePlayPause = () => {
    if (status === 'playing') {
      setStatus('paused');
    } else if (status === 'paused') {
      setStatus('playing');
    } else {
      startPreview(text);
    }
  };

  const handleStop = () => {
    stop();
  };

  const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="flex-1 flex flex-col justify-between h-full space-y-6">
      
      {/* Audio Engine Scheduler */}
      <AudioQueue />

      {/* Input area */}
      <div className="space-y-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <label htmlFor="preview-textarea" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Japanese Preview Passage
          </label>
          <span className="text-[10px] text-slate-500 font-medium">Characters: {text.length}</span>
        </div>

        <textarea
          id="preview-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter Japanese text passage here to generate real-time preview audio..."
          className="w-full flex-1 min-h-[160px] bg-dark-900 border border-dark-800 focus:border-brand-500 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none resize-none shadow-inner leading-relaxed"
        />
      </div>

      {/* Subtitles text highlight display */}
      <div className="bg-dark-900/40 border border-dark-800/80 rounded-xl p-5 min-h-[90px] flex flex-col justify-center items-center text-center">
        {currentChunkText ? (
          <p className="text-brand-300 text-sm font-semibold leading-relaxed tracking-wide animate-pulse">
            {currentChunkText}
          </p>
        ) : (
          <p className="text-slate-500 text-xs italic">
            {status === 'playing' ? 'Synthesizing voice...' : 'Press Play Preview to speak this passage.'}
          </p>
        )}
      </div>

      {/* Controls panel */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-dark-900 border border-dark-800 rounded-xl p-4 gap-4">
        
        {/* Speed multiplier presets */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-semibold mr-1">Speed</span>
          <div className="flex rounded-lg bg-dark-950 p-1 border border-dark-800">
            {speeds.map((sp) => (
              <button
                key={sp}
                onClick={() => setSetting('speedMultiplier', sp)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded transition duration-200 focus:outline-none ${
                  speedMultiplier === sp
                    ? 'bg-brand-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sp}x
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            onClick={handleStop}
            disabled={status === 'stopped' || status === 'idle'}
            className="flex-1 sm:flex-initial bg-dark-950 hover:bg-dark-800 disabled:opacity-40 text-slate-300 disabled:text-slate-600 font-semibold text-xs border border-dark-800 px-6 py-2.5 rounded-lg transition duration-200 focus:outline-none"
          >
            Stop
          </button>
          
          <button
            onClick={handlePlayPause}
            className="flex-1 sm:flex-initial bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-xs px-8 py-2.5 rounded-lg shadow-lg transition duration-200 transform active:scale-95 focus:outline-none flex items-center justify-center"
          >
            <span>
              {status === 'playing' ? 'Pause' : status === 'paused' ? 'Resume' : 'Play Preview'}
            </span>
          </button>
        </div>

      </div>

    </div>
  );
}
