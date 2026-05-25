// ADDED: piper-plus adapter — OpenJTalk phonemes + A1/A2/A3 accent + config phoneme_id_map; reads kanji, fills prosody (not zeros)
//
// Replaces the old hand-rolled phoneme table. Text -> OpenJTalk full-context
// labels -> @piper-plus/g2p tokens+prosody -> encode via the model's own
// phoneme_id_map -> the 7 MB-iSTFT-VITS2 input tensors.

const { TTSAdapter } = require('./adapter-interface');
const openjtalk = require('../g2p/openjtalk');

class PiperPlusAdapter extends TTSAdapter {
  get id() { return 'piper-plus'; }
  get label() { return 'piper-plus (MB-iSTFT-VITS2)'; }
  get requiredFiles() { return ['config.json']; }

  async init() {
    if (!this.config.phoneme_id_map) {
      throw new Error('piper-plus requires config.json with a phoneme_id_map next to the .onnx file');
    }
    // @piper-plus/g2p is ESM-only; load via dynamic import from CommonJS.
    const { Encoder } = await import('@piper-plus/g2p/encode');
    this.encoder = new Encoder(this.config.phoneme_id_map);

    const inf = this.config.inference || {};
    this.noiseScale = inf.noise_scale ?? 0.667;
    this.baseLengthScale = (inf.length_scale ?? 1.0) * 1.15; // Slow down by default for natural Japanese reading speed
    this.noiseW = inf.noise_w ?? 0.8;
    this.langId = (this.config.language_id_map && this.config.language_id_map['ja']) ?? 0;

    await openjtalk.init(); // warm the WASM engine + mount the dictionary once
  }

  async buildFeeds(chunkText, opts, ort) {
    const rate = opts && opts.rate ? parseFloat(opts.rate) : 1.0;
    // Higher rate => shorter duration => smaller length_scale.
    const lengthScale = rate > 0 ? this.baseLengthScale / rate : this.baseLengthScale;

    const { tokens, prosody } = await openjtalk.phonemize(chunkText);
    // INVARIANT: prosody_features carries real A1/A2/A3 accent — never zeros.
    const { phonemeIds, prosodyFlat } = this.encoder.encodeWithProsody(tokens, prosody);
    const N = phonemeIds.length;

    return {
      input: new ort.Tensor('int64', BigInt64Array.from(phonemeIds.map(BigInt)), [1, N]),
      input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(N)]), [1]),
      scales: new ort.Tensor('float32', Float32Array.from([this.noiseScale, lengthScale, this.noiseW]), [3]),
      lid: new ort.Tensor('int64', BigInt64Array.from([BigInt(this.langId)]), [1]),
      prosody_features: new ort.Tensor('int64', BigInt64Array.from(prosodyFlat.map(BigInt)), [1, N, 3]),
      // Single-speaker model: a zero embedding selects the only voice. (mask=1)
      speaker_embedding: new ort.Tensor('float32', new Float32Array(256).fill(0), [1, 256]),
      speaker_embedding_mask: new ort.Tensor('int64', BigInt64Array.from([1n]), [1, 1]),
    };
  }

  async listSpeakers() {
    const map = this.config.speaker_id_map;
    if (map && Object.keys(map).length > 1) {
      return Object.entries(map).map(([name, id]) => ({ id: Number(id), name }));
    }
    return [{ id: 0, name: 'Default' }];
  }
}

module.exports = { PiperPlusAdapter };
