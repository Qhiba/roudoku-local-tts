// ADDED: Kokoro adapter STUB — recognized but not yet supported (fails loudly, never emits noise)
//
// To implement: Kokoro uses the `misaki` G2P (not OpenJTalk) and per-voice
// style vectors shipped as voices/*.bin. ONNX inputs: input_ids, style, speed.
// This is its own future phase.

const { TTSAdapter, AdapterNotImplementedError } = require('./adapter-interface');

class KokoroAdapter extends TTSAdapter {
  get id() { return 'kokoro'; }
  get label() { return 'Kokoro-82M'; }
  get requiredFiles() { return ['config.json', 'voices']; }

  async init() {
    throw new AdapterNotImplementedError(
      'Kokoro-82M is recognized but not yet supported. Its front-end (misaki G2P + voices/*.bin style vectors) is planned for a later phase.'
    );
  }
}

module.exports = { KokoroAdapter };
