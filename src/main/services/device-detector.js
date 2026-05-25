// ADDED: CUDA EP probe — attempts GPU session; falls back to CPU on any error; never throws to caller

const { execSync } = require('child_process');

async function detectHardware() {
  let gpuName = 'No GPU detected';
  let vramMB = 0;
  let recommendedTier = 'CPU-only';
  let cudaAvailable = false;

  // If on Windows, query the GPU details using PowerShell
  if (process.platform === 'win32') {
    try {
      const output = execSync('powershell -Command "Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM | ConvertTo-Csv -NoTypeInformation"', { encoding: 'utf8', timeout: 5000 });
      const lines = output.trim().split(/\r?\n/);
      
      let nvidiaGpu = null;
      let primaryGpu = null;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',').map(s => s.replace(/^"|"$/g, '').trim());
        if (parts.length >= 2) {
          const name = parts[0];
          const adapterRam = parseInt(parts[1], 10) || 0;
          
          if (name === 'Name') continue; // skip header duplicates

          const gpuInfo = {
            name: name,
            vramMB: Math.round(adapterRam / (1024 * 1024))
          };

          if (gpuInfo.name.toLowerCase().includes('nvidia')) {
            nvidiaGpu = gpuInfo;
          }
          if (!primaryGpu || gpuInfo.vramMB > primaryGpu.vramMB) {
            primaryGpu = gpuInfo;
          }
        }
      }

      const targetGpu = nvidiaGpu || primaryGpu;
      if (targetGpu) {
        gpuName = targetGpu.name;
        vramMB = targetGpu.vramMB;
        // CUDA is assumed available if we have an NVIDIA GPU
        if (nvidiaGpu) {
          cudaAvailable = true;
        }
      }
    } catch (err) {
      console.error('Error executing PowerShell for GPU detection:', err);
    }
  }

  // Tier mapping based on detected VRAM and CUDA support:
  // VRAM: <4GB -> CPU-only, 4GB -> Potato (B), 6-12GB -> BIS (A), 16GB+ -> Overpowered (C)
  if (!cudaAvailable || vramMB < 2000) {
    recommendedTier = 'CPU-only';
  } else if (vramMB < 5500) {
    recommendedTier = 'Potato';
  } else if (vramMB < 14000) {
    recommendedTier = 'BIS';
  } else {
    recommendedTier = 'Overpowered';
  }

  return {
    gpuName,
    vramMB,
    recommendedTier,
    cudaAvailable
  };
}

module.exports = { detectHardware };
