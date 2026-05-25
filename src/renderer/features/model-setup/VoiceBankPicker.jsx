import React, { useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';

export default function VoiceBankPicker({ voiceBanks }) {
  const voiceBankId = useSettingsStore((state) => state.voiceBankId);
  const setSetting = useSettingsStore((state) => state.setSetting);

  const hasMultiple = voiceBanks && voiceBanks.length > 1;

  useEffect(() => {
    if (voiceBanks && voiceBanks.length > 0) {
      const exists = voiceBanks.some(vb => vb.id === voiceBankId);
      if (!exists) {
        setSetting('voiceBankId', voiceBanks[0].id);
      }
    }
  }, [voiceBanks, voiceBankId, setSetting]);

  if (!hasMultiple) {
    return null;
  }

  return (
    <div className="space-y-2 text-left">
      <label htmlFor="voice-bank-select" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Select Japanese Voice Bank (Speaker)
      </label>
      <div className="relative">
        <select
          id="voice-bank-select"
          value={voiceBankId}
          onChange={(e) => setSetting('voiceBankId', parseInt(e.target.value, 10))}
          className="w-full bg-dark-950 border border-dark-800 hover:border-dark-700 text-slate-200 text-xs rounded-lg px-4 py-2.5 shadow focus:outline-none focus:border-brand-500 transition duration-200 appearance-none cursor-pointer"
        >
          {voiceBanks.map((speaker) => (
            <option key={speaker.id} value={speaker.id}>
              {speaker.name} (ID: {speaker.id})
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 text-[10px]">
          ▼
        </div>
      </div>
    </div>
  );
}
