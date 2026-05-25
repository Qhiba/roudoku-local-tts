// ADDED: Style-BERT-VITS2 adapter STUB — recognized but not yet supported (fails loudly, never emits noise)
//
// To implement: SBV2 needs OpenJTalk phonemes + tones AND a bundled Japanese
// BERT model for style/emotion features, plus style_vectors. ONNX inputs
// include tones, language, bert, and a style vector. Its own future phase.

const { TTSAdapter, AdapterNotImplementedError } = require('./adapter-interface');

class StyleBertVits2Adapter extends TTSAdapter {
  get id() { return 'style-bert-vits2'; }
  get label() { return 'Style-BERT-VITS2'; }
  get requiredFiles() { return ['config.json']; }

  async init() {
    throw new AdapterNotImplementedError(
      'Style-BERT-VITS2 is recognized but not yet supported. Its front-end (OpenJTalk + a bundled Japanese BERT + style vectors) is planned for a later phase.'
    );
  }
}

module.exports = { StyleBertVits2Adapter };
