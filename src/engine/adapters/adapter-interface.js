// ADDED: adapter interface — the ONLY place that knows a family's tensor names and side-inputs
//
// Each model family (piper-plus, Kokoro, Style-BERT-VITS2 …) implements this
// contract. tts-engine.js owns the onnxruntime session and delegates the
// architecture-specific work (text -> feeds, output -> PCM) to an adapter.

class TTSAdapter {
  /**
   * @param {string} modelDir - directory containing the .onnx and its sidecars
   * @param {object} config - parsed config.json (may be {})
   */
  constructor(modelDir, config) {
    this.modelDir = modelDir;
    this.config = config || {};
  }

  get id() { return 'base'; }
  get label() { return 'Base adapter'; }
  /** Files that must exist next to the model for this adapter to work. */
  get requiredFiles() { return []; }

  /** Load any per-family resources (G2P, encoders, etc.). */
  async init() {}

  /**
   * Build the onnxruntime feed dict for one text chunk.
   * @returns {Promise<Record<string, import('onnxruntime-node').Tensor>>}
   */
  async buildFeeds(/* chunkText, opts, ort */) {
    throw new Error(`${this.id} adapter does not implement buildFeeds`);
  }

  /** Extract Float32Array PCM from the inference results. */
  parseOutput(results) {
    const tensor = results.output || results[Object.keys(results)[0]];
    if (!tensor) throw new Error('Inference produced no output tensor');
    return tensor.data;
  }

  getSampleRate() {
    return (this.config.audio && this.config.audio.sample_rate) || 22050;
  }

  async listSpeakers() {
    return [{ id: 0, name: 'Default' }];
  }
}

// Thrown by stub adapters for recognized-but-unsupported families.
class AdapterNotImplementedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AdapterNotImplementedError';
  }
}

module.exports = { TTSAdapter, AdapterNotImplementedError };
