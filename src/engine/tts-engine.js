// ADDED: onnxruntime-node inference session — CUDA or CPU execution provider selected at load time
// ADDED: unsupported-architecture guard — detected-but-unimplemented families fail loudly, never emit noise

const ort = require('onnxruntime-node');
const path = require('path');
const { detectArchitecture, createAdapter } = require('./architecture-detector');

let session = null;
let adapter = null;
let detection = null;

function getSampleRate() {
  return adapter ? adapter.getSampleRate() : 22050;
}

function getDetection() {
  return detection;
}

async function loadModel(modelPath, executionProvider) {
  // PROTECTED: CUDA/CPU execution-provider selection preserved from original loadModel
  const tempSession = await ort.InferenceSession.create(modelPath, {
    executionProviders: [executionProvider, 'cpu'],
  });
  
  const det = await detectArchitecture(modelPath, { inputNames: tempSession.inputNames });
  
  if (!det.supported) {
    // ADDED: unsupported-architecture guard — fail loudly, never emit noise
    try { tempSession.release && tempSession.release(); } catch (e) {}
    const err = new Error(det.reason || `Model architecture "${det.family}" is not supported.`);
    err.detection = det;
    throw err;
  }
  
  const ad = createAdapter(det, path.dirname(modelPath));
  await ad.init();
  
  session = tempSession;
  adapter = ad;
  detection = det;
  
  console.log(`Model loaded: ${det.label}; sampleRate ${getSampleRate()}`);
  return det;
}

async function inferChunk(chunkText, speakerId, rate) {
  if (!session || !adapter) {
    throw new Error('TTS model is not loaded.');
  }
  
  const feeds = await adapter.buildFeeds(chunkText, { speakerId, rate }, ort);
  
  // PROTECTED: PCM Float32Array output contract + sampleRate IPC payload preserved for tts-handlers/AudioQueue
  const allowed = new Set(session.inputNames); // only pass declared inputs
  const filtered = {};
  for (const k of Object.keys(feeds)) {
    if (allowed.has(k)) {
      filtered[k] = feeds[k];
    }
  }
  
  const results = await session.run(filtered);
  return adapter.parseOutput(results); // Float32Array PCM
}

function dispose() {
  try {
    if (session && session.release) {
      session.release();
    }
  } catch (e) {}
  session = null;
  adapter = null;
  detection = null;
}

module.exports = {
  loadModel,
  inferChunk,
  dispose,
  getSampleRate,
  getDetection
};
