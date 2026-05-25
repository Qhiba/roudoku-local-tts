// ADDED: OpenJTalk G2P wrapper — offline kanji+kana -> phonemes + A1/A2/A3 prosody; no user-installed Python
//
// Runs the vendored WASM build of OpenJTalk (src/engine/g2p/vendor) entirely in
// the Electron main process. OpenJTalk does the Japanese text analysis (kanji
// readings + pitch-accent) and emits HTS full-context labels via its -ot trace;
// @piper-plus/g2p then parses those labels into phoneme tokens + A1/A2/A3 prosody.
//
// A small HTS voice is bundled only because open_jtalk requires -m to run; the
// synthesized waveform (/out.wav) is discarded — we only consume the labels.

const fs = require('fs');
const path = require('path');

const VENDOR_DIR = path.join(__dirname, 'vendor');

// Resolve the bundled dict/voice: packaged app puts them under resourcesPath,
// dev keeps them in the repo's resources/ folder.
function resolveAssetDir() {
  const candidates = [];
  if (process.resourcesPath) candidates.push(path.join(process.resourcesPath, 'openjtalk'));
  candidates.push(path.resolve(__dirname, '..', '..', '..', 'resources', 'openjtalk'));
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'dic', 'sys.dic'))) return c;
  }
  // Fall back to the repo path even if missing, so the error message is clear.
  return candidates[candidates.length - 1];
}

let readyPromise = null;
let g2pJa = null; // dynamically imported ESM namespace from @piper-plus/g2p/ja

// Boot the WASM module once and keep it warm (the 103 MB dictionary is mounted
// into the WASM filesystem a single time and reused for every chunk).
function init() {
  if (readyPromise) return readyPromise;

  readyPromise = new Promise((resolve, reject) => {
    let wasmBytes, dicDir, voicePath;
    try {
      const assetDir = resolveAssetDir();
      dicDir = path.join(assetDir, 'dic');
      const voiceDir = path.join(assetDir, 'voice');
      const voiceFile = fs.readdirSync(voiceDir).find((f) => f.endsWith('.htsvoice'));
      if (!voiceFile) throw new Error(`No .htsvoice found in ${voiceDir}`);
      voicePath = path.join(voiceDir, voiceFile);
      wasmBytes = fs.readFileSync(path.join(VENDOR_DIR, 'open_jtalk.wasm'));
    } catch (e) {
      reject(new Error('OpenJTalk assets missing: ' + e.message));
      return;
    }

    // Overrides are read by the patched glue via globalThis.__OJT__ (the glue's
    // hoisted `var Module` shadows ordinary external overrides).
    globalThis.__OJT__ = {
      noInitialRun: true,   // we call main() ourselves, per chunk
      noExitRuntime: true,  // keep the runtime alive for repeated callMain()
      // Node >=18 has a global fetch, which the 2021 glue would wrongly use to
      // load the wasm by file path. Instantiate synchronously from bytes instead.
      instantiateWasm: (imports, success) => {
        const inst = new WebAssembly.Instance(new WebAssembly.Module(wasmBytes), imports);
        success(inst);
        return inst.exports;
      },
      preRun: [
        function mountAssets() {
          const FS = globalThis.__OJTFS__;
          try { FS.mkdir('/dic'); } catch (e) { /* exists */ }
          for (const f of fs.readdirSync(dicDir)) {
            // Binary files must be plain Uint8Array — this old Emscripten FS
            // mangles Node Buffers.
            FS.writeFile('/dic/' + f, new Uint8Array(fs.readFileSync(path.join(dicDir, f))));
          }
          FS.writeFile('/voice.htsvoice', new Uint8Array(fs.readFileSync(voicePath)));
        },
      ],
      onRuntimeInitialized: function () {
        resolve(globalThis.__OJT__);
      },
    };

    try {
      // The patched glue auto-runs on require and triggers preRun +
      // onRuntimeInitialized. require() caches, so this happens once.
      require('./vendor/open_jtalk.js');
    } catch (e) {
      reject(e);
    }
  });

  return readyPromise;
}

// Pull the clean HTS label strings out of the verbose -ot trace.
// Each label line looks like "<start> <end> xx^xx-sil+k=o/A:.../K:...";
// the label is the whitespace-separated field containing both '^' and '/A:'.
//
// IMPORTANT: OpenJTalk's -ot trace dumps the full label sequence TWICE —
// once from the analysis pass and once from the synthesis pass. Both copies
// are identical. We detect the repeat by finding where the first label's
// pattern recurs and return only the first copy.
function extractLabelLines(trace) {
  const labels = [];
  for (const line of trace.split('\n')) {
    const field = line.trim().split(/\s+/).find((f) => f.includes('^') && f.includes('/A:'));
    if (field) labels.push(field);
  }

  // Deduplicate: the second copy starts with the same label as labels[0].
  // Find the first recurrence of labels[0] after index 0.
  if (labels.length >= 2) {
    const first = labels[0];
    for (let i = 1; i < labels.length; i++) {
      if (labels[i] === first) {
        // Verify it's a true repeat (not just a coincidental match)
        // by checking that the remaining length equals the first half.
        const half = i;
        if (labels.length >= half * 2) {
          return labels.slice(0, half);
        }
      }
    }
  }

  return labels;
}

/**
 * Convert Japanese text to phoneme tokens + per-token A1/A2/A3 prosody.
 * @param {string} text
 * @returns {Promise<{ tokens: string[], prosody: Array<{a1:number,a2:number,a3:number}|null> }>}
 */
async function phonemize(text) {
  const M = await init();
  const FS = globalThis.__OJTFS__;

  FS.writeFile('/in.txt', String(text), { encoding: 'utf8' });
  try {
    M.callMain(['-x', '/dic', '-m', '/voice.htsvoice', '-ot', '/trace.txt', '-ow', '/out.wav', '/in.txt']);
  } catch (e) {
    if (e && e.name !== 'ExitStatus') throw e; // ExitStatus is the normal main() return
  }

  let trace = '';
  try { trace = FS.readFile('/trace.txt', { encoding: 'utf8' }); } catch (e) { /* none */ }
  const labels = extractLabelLines(trace);

  if (!g2pJa) g2pJa = await import('@piper-plus/g2p/ja');
  const { tokens, prosody } = g2pJa.extractPhonemesFromLabels(labels.join('\n'));
  return { tokens, prosody };
}

module.exports = { init, phonemize, extractLabelLines };
