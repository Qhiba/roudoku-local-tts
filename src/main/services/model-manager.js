// ADDED: tier registry — defines Potato/BIS/Overpowered VRAM thresholds and model candidates
// ADDED: huggingFaceUrl per tier in model-manager — each tier registry entry carries the direct HF page URL for its recommended model

const fs = require('fs');
const path = require('path');
const voiceBankLoader = require('../../engine/voice-bank-loader');
const ttsEngine = require('../../engine/tts-engine');
const deviceDetector = require('./device-detector');

const FALLBACK_TIER_REGISTRY = {
  'CPU-only': {
    id: 'CPU-only',
    label: 'CPU-Only Fallback',
    minVramMB: 0,
    precision: 'fp32',
    gpuRange: 'No discrete GPU',
    vramRange: 'System RAM',
    maxVram: 0,
    recommendedModels: [
      {
        name: 'piper-plus Tsukuyomi-chan (multilingual)',
        huggingFaceUrl: 'https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan',
        sizeLabel: '~80 MB',
        vramLabel: 'System RAM',
        onnxNative: true,
        notes: 'Female voice. MB-iSTFT-VITS2 architecture. Requires piper-plus runtime (not standard Piper). Supports Japanese natively via OpenJTalk. Recommended CPU-only default.'
      },
      {
        name: 'piper-plus multilingual-6lang',
        huggingFaceUrl: 'https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan',
        sizeLabel: '~80 MB',
        vramLabel: 'System RAM',
        onnxNative: true,
        notes: 'Same repo — FP16 variant (tsukuyomi-chan-6lang-fp16.onnx). Faster on CPU.'
      },
      {
        name: 'Kokoro-82M (CPU mode)',
        huggingFaceUrl: 'https://huggingface.co/hexgrad/Kokoro-82M',
        sizeLabel: '~330 MB',
        vramLabel: 'System RAM',
        onnxNative: true,
        notes: 'Multi-speaker including Japanese (ja locale). Runs on CPU but slower than piper-plus. Better voice quality trade-off if speed is acceptable.'
      },
      {
        name: 'ESPnet JSUT VITS (small, CPU export)',
        huggingFaceUrl: 'https://huggingface.co/espnet/kan-bayashi_jsut_vits',
        sizeLabel: '~80 MB',
        vramLabel: 'System RAM',
        onnxNative: false,
        notes: 'Single female speaker (JSUT corpus). Natural intonation. Requires ONNX export from ESPnet checkpoint using espnet_onnx.'
      }
    ]
  },
  'Potato': {
    id: 'Potato',
    label: 'Potato Tier (B)',
    minVramMB: 4000,
    precision: 'fp32',
    gpuRange: 'GTX 1060 / GTX 1660',
    vramRange: '4GB VRAM',
    maxVram: 4000,
    recommendedModels: [
      {
        name: 'Kokoro-82M',
        huggingFaceUrl: 'https://huggingface.co/hexgrad/Kokoro-82M',
        sizeLabel: '~330 MB',
        vramLabel: '~2 GB',
        onnxNative: true,
        notes: 'Multi-speaker Japanese. ONNX files in repo. Runs well on GTX 1660 in FP32. Recommended Tier B default.'
      },
      {
        name: 'piper-plus Tsukuyomi-chan',
        huggingFaceUrl: 'https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan',
        sizeLabel: '~80 MB',
        vramLabel: '<1 GB',
        onnxNative: true,
        notes: 'Even faster on GPU. Very low VRAM usage — leaves headroom on 4GB card.'
      },
      {
        name: 'ESPnet JSUT VITS (small)',
        huggingFaceUrl: 'https://huggingface.co/espnet/kan-bayashi_jsut_vits',
        sizeLabel: '~80 MB',
        vramLabel: '~1 GB',
        onnxNative: false,
        notes: 'Single female speaker. Requires espnet_onnx export.'
      },
      {
        name: 'ESPnet JSUT full-band VITS',
        huggingFaceUrl: 'https://huggingface.co/espnet/kan-bayashi_jsut_full_band_vits',
        sizeLabel: '~100 MB',
        vramLabel: '~1.5 GB',
        onnxNative: false,
        notes: 'Full-band 48kHz output. Better audio quality than standard JSUT VITS.'
      },
      {
        name: 'ESPnet JSUT JETS',
        huggingFaceUrl: 'https://huggingface.co/espnet/kan-bayashi_jsut_jets',
        sizeLabel: '~180 MB',
        vramLabel: '~2 GB',
        onnxNative: false,
        notes: 'Joint End-to-end TTS. Faster inference than VITS at similar quality.'
      }
    ]
  },
  'BIS': {
    id: 'BIS',
    label: 'BIS Tier (A) - Recommended',
    minVramMB: 6000,
    precision: 'fp16',
    gpuRange: 'RTX 2060 / 3060 / 4060',
    vramRange: '6GB - 12GB VRAM',
    maxVram: 12000,
    recommendedModels: [
      {
        name: 'Kokoro-82M (FP16)',
        huggingFaceUrl: 'https://huggingface.co/hexgrad/Kokoro-82M',
        sizeLabel: '~330 MB',
        vramLabel: '~2 GB',
        onnxNative: true,
        notes: 'Same model as Tier B — runs faster with FP16 on RTX cards. Multiple Japanese speakers. Recommended BIS default.'
      },
      {
        name: 'Style-BERT-VITS2 (small/medium)',
        huggingFaceUrl: 'https://huggingface.co/litagin/style_bert_vits2',
        sizeLabel: '~400 MB',
        vramLabel: '~3 GB',
        onnxNative: false,
        notes: 'Multi-speaker, emotional style vectors. Export script (export_onnx.py) provided in repo.'
      },
      {
        name: 'Style-BERT-VITS2 — character fine-tunes',
        huggingFaceUrl: 'https://huggingface.co/models?search=style_bert_vits2',
        sizeLabel: '~400 MB',
        vramLabel: '~3 GB',
        onnxNative: false,
        notes: 'Many community character voice fine-tunes. Search HuggingFace for the voice style needed.'
      },
      {
        name: 'ESPnet JSUT full-band VITS (FP16)',
        huggingFaceUrl: 'https://huggingface.co/espnet/kan-bayashi_jsut_full_band_vits',
        sizeLabel: '~100 MB',
        vramLabel: '~2 GB',
        onnxNative: false,
        notes: 'Full-band 48kHz. FP16 inference on RTX is noticeably faster than Tier B FP32.'
      },
      {
        name: 'ESPnet JSUT VITS2',
        huggingFaceUrl: 'https://huggingface.co/espnet',
        sizeLabel: '~200 MB',
        vramLabel: '~3 GB',
        onnxNative: false,
        notes: 'VITS2 variant with improved duration modelling. More expressive prosody.'
      },
      {
        name: 'OpenVoice v2 Japanese',
        huggingFaceUrl: 'https://huggingface.co/myshell-ai/OpenVoice',
        sizeLabel: '~200 MB',
        vramLabel: '~2 GB',
        onnxNative: false,
        notes: 'Supports voice cloning with a 3-second reference clip. Japanese supported. ONNX export via MyShell repo scripts.'
      },
      {
        name: 'piper-plus Tsukuyomi-chan (GPU fast)',
        huggingFaceUrl: 'https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan',
        sizeLabel: '~80 MB',
        vramLabel: '<1 GB',
        onnxNative: true,
        notes: 'Extremely fast on RTX. Use when speed matters more than expressiveness (e.g. real-time preview).'
      }
    ]
  },
  'Overpowered': {
    id: 'Overpowered',
    label: 'Overpowered Tier (C)',
    minVramMB: 16000,
    precision: 'fp16',
    gpuRange: 'RTX 3080 / 4080 / 4090',
    vramRange: '16GB+ VRAM',
    maxVram: 16000,
    recommendedModels: [
      {
        name: 'Style-BERT-VITS2 (large)',
        huggingFaceUrl: 'https://huggingface.co/litagin/style_bert_vits2',
        sizeLabel: '~1–2 GB',
        vramLabel: '6–8 GB',
        onnxNative: false,
        notes: 'Full-size multi-speaker. Emotional style vectors. Best naturalness in the Style-BERT-VITS2 family. Recommended Tier C default.'
      },
      {
        name: 'XTTS-v2 Japanese',
        huggingFaceUrl: 'https://huggingface.co/coqui/XTTS-v2',
        sizeLabel: '1.8 GB',
        vramLabel: '8 GB',
        onnxNative: false,
        notes: 'Multilingual including Japanese. Voice cloning with 3-second reference audio. ONNX export via CoquiTTS export scripts.'
      },
      {
        name: 'Style-BERT-VITS2 — large character fine-tunes',
        huggingFaceUrl: 'https://huggingface.co/models?search=style_bert_vits2',
        sizeLabel: '~1–3 GB',
        vramLabel: '8–12 GB',
        onnxNative: false,
        notes: 'Community fine-tunes on specific Japanese voices/characters. Search HuggingFace for the target voice style.'
      },
      {
        name: 'VALL-E X Japanese',
        huggingFaceUrl: 'https://huggingface.co/search/full-text?q=valle+japanese',
        sizeLabel: '2–4 GB',
        vramLabel: '12 GB',
        onnxNative: false,
        notes: 'Zero-shot voice cloning. Highest expressiveness ceiling. Requires significant VRAM. Search HF for community Japanese ports.'
      },
      {
        name: 'ESPnet NaturalSpeech2 Japanese',
        huggingFaceUrl: 'https://huggingface.co/espnet',
        sizeLabel: '500 MB–1 GB',
        vramLabel: '6 GB',
        onnxNative: false,
        notes: 'Higher naturalness than VITS. Search ESPnet org for Japanese NS2 checkpoints.'
      },
      {
        name: 'Kokoro-82M (all speakers, batched)',
        huggingFaceUrl: 'https://huggingface.co/hexgrad/Kokoro-82M',
        sizeLabel: '~330 MB',
        vramLabel: '~4 GB',
        onnxNative: true,
        notes: 'On Tier C VRAM, load all speaker embeddings simultaneously and enable per-character voice switching mid-novel.'
      }
    ]
  }
};

let loadedModelPath = '';
let currentModelDirectory = '';
let detectedArchitecture = null;

function parseModelRecommendations() {
  const filePath = path.join(__dirname, '../../../informations/runs/25-05-2026/model_recommendation.md');
  if (!fs.existsSync(filePath)) {
    return FALLBACK_TIER_REGISTRY;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const sections = content.split(/##\s+/);
    const registry = {};

    sections.forEach(section => {
      const lines = section.split('\n');
      const header = lines[0].trim();
      
      let tierId = '';
      let label = '';
      let minVramMB = 0;
      let precision = 'fp32';
      let gpuRange = '';
      let vramRange = '';

      if (header.toLowerCase().includes('cpu-only')) {
        tierId = 'CPU-only';
        label = 'CPU-Only Fallback';
        minVramMB = 0;
        precision = 'fp32';
        gpuRange = 'No discrete GPU';
        vramRange = 'System RAM';
      } else if (header.toLowerCase().includes('potato')) {
        tierId = 'Potato';
        label = 'Potato Tier (B)';
        minVramMB = 4000;
        precision = 'fp32';
        gpuRange = 'GTX 1060 / GTX 1660';
        vramRange = '4GB VRAM';
      } else if (header.toLowerCase().includes('bis')) {
        tierId = 'BIS';
        label = 'BIS Tier (A) - Recommended';
        minVramMB = 6000;
        precision = 'fp16';
        gpuRange = 'RTX 2060 / 3060 / 4060';
        vramRange = '6GB - 12GB VRAM';
      } else if (header.toLowerCase().includes('overpowered')) {
        tierId = 'Overpowered';
        label = 'Overpowered Tier (C)';
        minVramMB = 16000;
        precision = 'fp16';
        gpuRange = 'RTX 3080 / 4080 / 4090';
        vramRange = '16GB+ VRAM';
      }

      if (!tierId) return;

      const recommendedModels = [];
      let inTable = false;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|')) {
          if (line.includes('Model Name') || line.includes('---')) {
            inTable = true;
            continue;
          }
          if (inTable) {
            const cells = line.split('|').map(c => c.trim()).filter(Boolean);
            if (cells.length >= 4) {
              const name = cells[1].replace(/\*\*/g, '').trim();
              const url = cells[2];
              const size = cells[3];
              const onnx = cells[4];
              const notes = cells[cells.length - 1];
              
              recommendedModels.push({
                name,
                huggingFaceUrl: url,
                sizeLabel: size,
                vramLabel: tierId === 'CPU-only' ? 'System RAM' : cells[5] || '',
                onnxNative: onnx.toLowerCase().includes('native') || onnx.includes('✅'),
                notes
              });
            }
          }
        } else if (inTable) {
          inTable = false;
        }
      }

      registry[tierId] = {
        id: tierId,
        label,
        minVramMB,
        precision,
        gpuRange,
        vramRange,
        maxVram: minVramMB,
        recommendedModels
      };
    });

    return Object.keys(registry).length > 0 ? registry : FALLBACK_TIER_REGISTRY;
  } catch (error) {
    console.error('Failed to parse model_recommendation.md:', error);
    return FALLBACK_TIER_REGISTRY;
  }
}

async function loadModel(modelPath) {
  if (!modelPath || !fs.existsSync(modelPath)) {
    return { success: false, error: 'Model file does not exist.' };
  }
  if (path.extname(modelPath).toLowerCase() !== '.onnx') {
    return { success: false, error: 'File is not a valid .onnx file.' };
  }

  try {
    const hardware = await deviceDetector.detectHardware();
    const executionProvider = hardware.cudaAvailable ? 'cuda' : 'cpu';

    const detection = await ttsEngine.loadModel(modelPath, executionProvider);

    loadedModelPath = modelPath;
    currentModelDirectory = path.dirname(modelPath);
    detectedArchitecture = detection;

    return {
      success: true,
      family: detection.family,
      label: detection.label,
      supported: detection.supported,
      missingFiles: detection.missingFiles,
      reason: detection.reason
    };
  } catch (error) {
    console.error('Failed to load ONNX model:', error);
    if (error.detection) {
      detectedArchitecture = error.detection;
      loadedModelPath = '';
      currentModelDirectory = path.dirname(modelPath);
      return {
        success: false,
        family: error.detection.family,
        label: error.detection.label,
        supported: error.detection.supported,
        missingFiles: error.detection.missingFiles,
        reason: error.message || error.detection.reason
      };
    }
    loadedModelPath = '';
    currentModelDirectory = '';
    detectedArchitecture = null;
    return { success: false, error: `ONNX loading failed: ${error.message}` };
  }
}

async function listVoiceBanks() {
  if (!currentModelDirectory) {
    return [{ id: 0, name: 'Default' }];
  }
  return voiceBankLoader.loadVoiceBanks(currentModelDirectory);
}

function getTierRegistry() {
  return parseModelRecommendations();
}

module.exports = {
  loadModel,
  listVoiceBanks,
  getTierRegistry,
  loadedModelPath: () => loadedModelPath,
  getDetectedArchitecture: () => detectedArchitecture
};
