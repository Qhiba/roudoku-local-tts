// ADDED: adapter registry — per-family fingerprints and factories; supported flag gates execution

const { PiperPlusAdapter } = require('./piper-plus-adapter');
const { KokoroAdapter } = require('./kokoro-adapter');
const { StyleBertVits2Adapter } = require('./style-bert-vits2-adapter');

const hasInputs = (names, ...need) => Array.isArray(names) && need.every((n) => names.includes(n));

// Ordered: first match wins. Each `match(config, inputNames)` returns boolean.
const ARCH_REGISTRY = [
  {
    id: 'piper-plus',
    label: 'piper-plus (MB-iSTFT-VITS2)',
    supported: true,
    requiredFiles: ['config.json'],
    Adapter: PiperPlusAdapter,
    match: (config, names) =>
      !!(config && (config.piper_version || (config.phoneme_id_map && config.prosody_id_map))) ||
      hasInputs(names, 'input', 'prosody_features', 'lid', 'speaker_embedding'),
  },
  {
    id: 'kokoro',
    label: 'Kokoro-82M',
    supported: false,
    requiredFiles: ['config.json', 'voices'],
    Adapter: KokoroAdapter,
    match: (config, names) =>
      hasInputs(names, 'input_ids', 'style', 'speed') ||
      !!(config && /kokoro/i.test(JSON.stringify(config.dataset || config.istftnet || config.model || ''))),
  },
  {
    id: 'style-bert-vits2',
    label: 'Style-BERT-VITS2',
    supported: false,
    requiredFiles: ['config.json'],
    Adapter: StyleBertVits2Adapter,
    match: (config, names) => hasInputs(names, 'bert') || hasInputs(names, 'tones', 'language'),
  },
];

module.exports = { ARCH_REGISTRY };
