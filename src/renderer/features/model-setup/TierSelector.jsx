import React, { useState } from 'react';

export default function TierSelector({ selectedTier, onSelectTier, recommendedTier, vramMB, tierRegistry }) {
  const [openSections, setOpenSections] = useState({});

  // Synchronize when recommendedTier loads
  React.useEffect(() => {
    if (recommendedTier) {
      setOpenSections({
        'CPU-only': recommendedTier === 'CPU-only',
        'Potato': recommendedTier === 'Potato',
        'BIS': recommendedTier === 'BIS',
        'Overpowered': recommendedTier === 'Overpowered'
      });
    }
  }, [recommendedTier]);

  const toggleSection = (id, e) => {
    e.stopPropagation();
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDownloadClick = (url, e) => {
    e.stopPropagation();
    window.electronAPI.shell.openExternal(url);
  };

  if (!tierRegistry || Object.keys(tierRegistry).length === 0) {
    return <div className="text-slate-500 text-xs py-4 text-center">Loading model candidates...</div>;
  }

  const tierCards = Object.values(tierRegistry);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tierCards.map((tier) => {
        const isSelected = selectedTier === tier.id;
        const isRecommended = recommendedTier === tier.id;
        const showVramWarning = tier.maxVram > 0 && vramMB > 0 && vramMB < tier.maxVram; 

        return (
          <div
            key={tier.id}
            onClick={() => onSelectTier(tier.id)}
            className={`cursor-pointer rounded-xl p-5 border text-left flex flex-col justify-between transition duration-300 relative group overflow-hidden ${
              isSelected
                ? 'bg-brand-500/5 border-brand-500 shadow-brand-500/5 shadow-lg'
                : 'bg-dark-950/40 border-dark-800 hover:border-dark-700'
            }`}
          >
            {isSelected && (
              <div className="absolute top-0 right-0 w-12 h-12 bg-brand-500/10 rounded-bl-full flex items-center justify-center pointer-events-none">
                <span className="text-brand-300 font-bold text-xs transform translate-x-1.5 -translate-y-1.5">✓</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white group-hover:text-brand-300 transition duration-200">
                  {tier.label}
                </h4>
                <div className="flex items-center space-x-1.5">
                  {isRecommended && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold tracking-wide uppercase">
                      Recommended
                    </span>
                  )}
                  {showVramWarning && (
                    <span 
                      title="Tier requires more VRAM than detected!" 
                      className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 font-bold flex items-center"
                    >
                      ⚠️ High VRAM
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-b border-dark-800/60 pb-3">
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Graphics range</p>
                  <p className="text-slate-300 font-medium">{tier.gpuRange}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Memory</p>
                  <p className="text-slate-300 font-medium">{tier.vramRange}</p>
                </div>
              </div>

              <div className="mt-2 text-xs">
                <button
                  onClick={(e) => toggleSection(tier.id, e)}
                  className="flex items-center justify-between w-full py-1 text-slate-400 hover:text-slate-200 transition duration-200 focus:outline-none"
                >
                  <span className="font-semibold text-[11px] uppercase tracking-wider">Recommended Models</span>
                  <span className="transform transition-transform duration-200 text-xs">
                    {openSections[tier.id] ? '▲' : '▼'}
                  </span>
                </button>

                {openSections[tier.id] && (
                  <div className="mt-2 space-y-2 border-t border-dark-800/40 pt-2 transition duration-300">
                    {tier.recommendedModels.map((model, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-dark-900/60 p-2 rounded border border-dark-800/40">
                        <div className="space-y-0.5 max-w-[70%]">
                          <p className="font-semibold text-slate-200 text-[11px] truncate flex items-center" title={model.name}>
                            {idx === 0 && (
                              <span className="text-[9px] bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded px-1 mr-1 font-bold">
                                Default
                              </span>
                            )}
                            {model.name}
                          </p>
                          <div className="flex items-center space-x-1.5 text-[10px]">
                            <span className="text-slate-500">{model.sizeLabel}</span>
                            {model.onnxNative ? (
                              <span className="text-emerald-500/90 font-medium">[ONNX Native]</span>
                            ) : (
                              <span className="text-amber-500/90 font-medium" title="Requires conversion before loading">
                                ⚠️ Needs Conversion
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDownloadClick(model.huggingFaceUrl, e)}
                          className="text-[10px] bg-dark-800 hover:bg-brand-600 border border-dark-700 hover:border-brand-500 text-slate-300 hover:text-white px-2 py-1 rounded transition duration-200 focus:outline-none"
                        >
                          Download ↗
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}
