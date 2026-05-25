// ADDED: architecture detector — fingerprints model via config.json + ONNX I/O signature; routes to adapter; never guesses

const fs = require('fs');
const path = require('path');
const { ARCH_REGISTRY } = require('./adapters/registry');

function readConfig(modelDir) {
  const p = path.join(modelDir, 'config.json');
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { /* malformed */ }
  }
  return null;
}

async function readInputNames(modelPath, ort) {
  try {
    const s = await ort.InferenceSession.create(modelPath, { executionProviders: ['cpu'] });
    return s.inputNames;
  } catch (e) {
    return null;
  }
}

/**
 * Identify a model's architecture and whether we can run it.
 * @param {string} modelPath - absolute path to the .onnx
 * @param {object} [opts]
 * @param {object} [opts.ort] - onnxruntime-node, used to read input names if needed
 * @param {string[]} [opts.inputNames] - already-known ONNX input names (avoids reloading)
 */
async function detectArchitecture(modelPath, opts = {}) {
  const { ort, inputNames } = opts;
  const modelDir = path.dirname(modelPath);
  const config = readConfig(modelDir);

  let names = inputNames || null;
  let entry = ARCH_REGISTRY.find((e) => e.match(config, names));

  // Inconclusive on config alone — read the ONNX input layout and retry.
  if (!entry && !names && ort) {
    names = await readInputNames(modelPath, ort);
    entry = ARCH_REGISTRY.find((e) => e.match(config, names));
  }

  const sampleRate = (config && config.audio && config.audio.sample_rate) || 22050;

  if (!entry) {
    return {
      family: 'unknown', adapterId: null, label: 'Unknown', supported: false,
      sampleRate, requiredFiles: [], missingFiles: [],
      reason: 'Unrecognized model architecture — no matching config.json signature or ONNX input layout.',
      config, inputNames: names, _entry: null,
    };
  }

  const requiredFiles = entry.requiredFiles || [];
  const missingFiles = requiredFiles.filter((f) => !fs.existsSync(path.join(modelDir, f)));

  let reason = '';
  if (!entry.supported) {
    reason = `${entry.label} is recognized but not yet supported.`;
  } else if (missingFiles.length) {
    reason = `Missing required file(s) next to the model: ${missingFiles.join(', ')}.`;
  }

  return {
    family: entry.id, adapterId: entry.id, label: entry.label,
    supported: entry.supported && missingFiles.length === 0,
    sampleRate, requiredFiles, missingFiles, reason,
    config, inputNames: names, _entry: entry,
  };
}

/** Instantiate the adapter for a detection result (returns null if unknown). */
function createAdapter(detection, modelDir) {
  if (!detection || !detection._entry) return null;
  return new detection._entry.Adapter(modelDir, detection.config);
}

/** Strip internal/bulky fields before sending a detection result over IPC. */
function publicDetection(d) {
  if (!d) return null;
  return {
    family: d.family, adapterId: d.adapterId, label: d.label,
    supported: d.supported, sampleRate: d.sampleRate,
    requiredFiles: d.requiredFiles, missingFiles: d.missingFiles, reason: d.reason,
  };
}

module.exports = { detectArchitecture, createAdapter, publicDetection };
