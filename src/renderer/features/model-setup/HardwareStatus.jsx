import React from 'react';

export default function HardwareStatus({ gpuName, vramMB, cudaAvailable, recommendedTier }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
      
      <div className="bg-dark-950/40 p-4 rounded-lg border border-dark-800 flex flex-col justify-between space-y-2">
        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Detected GPU</span>
        <span className="text-slate-200 font-semibold truncate leading-tight" title={gpuName}>
          {gpuName || 'No GPU detected'}
        </span>
      </div>

      <div className="bg-dark-950/40 p-4 rounded-lg border border-dark-800 flex flex-col justify-between space-y-2">
        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Video RAM</span>
        <span className="text-slate-200 font-semibold">
          {vramMB ? `${(vramMB / 1024).toFixed(1)} GB` : '0.0 GB'} <span className="text-slate-500 font-normal">({vramMB} MB)</span>
        </span>
      </div>

      <div className="bg-dark-950/40 p-4 rounded-lg border border-dark-800 flex flex-col justify-between space-y-2">
        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">CUDA Acceleration</span>
        <div className="flex items-center space-x-1.5">
          <span className={`w-2 h-2 rounded-full ${cudaAvailable ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
          <span className="text-slate-200 font-semibold">
            {cudaAvailable ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="bg-dark-950/40 p-4 rounded-lg border border-dark-800 flex flex-col justify-between space-y-2">
        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Hardware recommendation</span>
        <div>
          <span className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-brand-300 font-bold text-[10px] tracking-wide uppercase">
            {recommendedTier}
          </span>
        </div>
      </div>

      {!cudaAvailable && (
        <div className="col-span-1 sm:col-span-2 md:col-span-4 mt-2 bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 text-amber-400 text-xs flex items-center space-x-2">
          <span>⚠️</span>
          <span>Running on CPU — export will be slow. Ensure compatible NVIDIA drivers are installed to enable CUDA hardware acceleration.</span>
        </div>
      )}
    </div>
  );
}
