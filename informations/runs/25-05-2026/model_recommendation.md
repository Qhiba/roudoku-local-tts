# Model Recommendation — Japanese TTS ONNX Models

Reference document for the tier registry in `src/main/services/model-manager.js`.
Each tier lists recommended models with their Hugging Face URLs, approximate size, and notes.

> **What Piper is:** Piper is a complete standalone TTS model — not a voicebank system.
> Each Piper voice is its own ONNX neural network (one `.onnx` file + one `.onnx.json` config file).
> There is no "select a voicebank inside Piper" — you download a different `.onnx` file per voice.
>
> ⚠️ **Important:** The official `rhasspy/piper-voices` repository does NOT contain Japanese voices.
> Standard Piper uses `espeak-ng` for phonemisation, which does not handle Japanese correctly.
> Japanese Piper models come from the **piper-plus** fork (uses OpenJTalk for Japanese G2P).

---

## ONNX Status Legend

| Badge | Meaning |
|---|---|
| ✅ ONNX Native | Ships `.onnx` file directly from the repo — no conversion step needed |
| ⚠️ Conversion Required | Must run an export script before use — document in `README.md` |
| 🔒 Proprietary | Model is ONNX internally but not distributable as a standalone file |

---

## Sub-tier — CPU-only

**Target:** No discrete GPU. System RAM only. Must run acceptably on a mid-range CPU (Intel i5 / Ryzen 5).
Prioritise tiny model size and fast inference. Voice quality is secondary.

| # | Model Name | HuggingFace URL | Size | ONNX | Notes |
|---|---|---|---|---|---|
| 1 | **piper-plus Tsukuyomi-chan (multilingual)** | https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan | ~80 MB | ✅ Native | Female voice. MB-iSTFT-VITS2 architecture. Requires piper-plus runtime (not standard Piper). Supports Japanese natively via OpenJTalk. **Recommended CPU-only default.** |
| 2 | **piper-plus multilingual-6lang** | https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan | ~80 MB | ✅ Native | Same repo — FP16 variant (`tsukuyomi-chan-6lang-fp16.onnx`). Faster on CPU. |
| 3 | **Kokoro-82M (CPU mode)** | https://huggingface.co/hexgrad/Kokoro-82M | ~330 MB | ✅ Native | Multi-speaker including Japanese (`ja` locale). Runs on CPU but slower than piper-plus. Better voice quality trade-off if speed is acceptable. |
| 4 | **ESPnet JSUT VITS (small, CPU export)** | https://huggingface.co/espnet/kan-bayashi_jsut_vits | ~80 MB | ⚠️ Conversion | Single female speaker (JSUT corpus). Natural intonation. Requires ONNX export from ESPnet checkpoint using `espnet_onnx`. |

> **piper-plus note:** piper-plus uses the MB-iSTFT-VITS2 architecture. The runtime needed is
> `piper-plus` (the fork by ayousanz), not the original `rhasspy/piper` binary.
> The ONNX file can still be loaded directly with `onnxruntime-node` if the input/output tensor
> schema is handled manually — document this in the app's README.

---

## Tier B — Potato (GTX 1660, 4GB VRAM)

**Target:** Entry-level GPU. CUDA FP32 inference (GTX 1660 has no Tensor Cores — no FP16).
Model must fit comfortably in 4GB VRAM in FP32. Noticeably better quality than CPU-only.

| # | Model Name | HuggingFace URL | Size | ONNX | VRAM | Notes |
|---|---|---|---|---|---|---|
| 1 | **Kokoro-82M** | https://huggingface.co/hexgrad/Kokoro-82M | ~330 MB | ✅ Native | ~2 GB | Multi-speaker Japanese. ONNX files in repo. Runs well on GTX 1660 in FP32. **Recommended Tier B default.** |
| 2 | **piper-plus Tsukuyomi-chan** | https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan | ~80 MB | ✅ Native | <1 GB | Even faster on GPU. Very low VRAM usage — leaves headroom on 4GB card. |
| 3 | **ESPnet JSUT VITS (small)** | https://huggingface.co/espnet/kan-bayashi_jsut_vits | ~80 MB | ⚠️ Conversion | ~1 GB | Single female speaker. Requires `espnet_onnx` export. |
| 4 | **ESPnet JSUT full-band VITS** | https://huggingface.co/espnet/kan-bayashi_jsut_full_band_vits | ~100 MB | ⚠️ Conversion | ~1.5 GB | Full-band 48kHz output. Better audio quality than standard JSUT VITS. |
| 5 | **ESPnet JSUT JETS** | https://huggingface.co/espnet/kan-bayashi_jsut_jets | ~180 MB | ⚠️ Conversion | ~2 GB | Joint End-to-end TTS. Faster inference than VITS at similar quality. |

---

## Tier A — BIS / Balanced (RTX 2060 6GB · RTX 3060 8GB · RTX 3060 12GB)

**Target:** Mid-range GPU with 6–12GB VRAM. FP16 inference available (RTX 20xx+ has Tensor Cores).
Significantly better voice naturalness and expressiveness. This is the recommended default tier.

| # | Model Name | HuggingFace URL | Size | ONNX | VRAM | Notes |
|---|---|---|---|---|---|---|
| 1 | **Kokoro-82M (FP16)** | https://huggingface.co/hexgrad/Kokoro-82M | ~330 MB | ✅ Native | ~2 GB | Same model as Tier B — runs faster with FP16 on RTX cards. Multiple Japanese speakers. **Recommended BIS default.** |
| 2 | **Style-BERT-VITS2 (small/medium)** | https://huggingface.co/litagin/style_bert_vits2 | ~400 MB | ⚠️ Conversion | ~3 GB | Multi-speaker, emotional style vectors. Export script (`export_onnx.py`) provided in repo. |
| 3 | **Style-BERT-VITS2 — character fine-tunes** | https://huggingface.co/models?search=style_bert_vits2 | ~400 MB | ⚠️ Conversion | ~3 GB | Many community character voice fine-tunes. Search HuggingFace for the voice style needed. |
| 4 | **ESPnet JSUT full-band VITS (FP16)** | https://huggingface.co/espnet/kan-bayashi_jsut_full_band_vits | ~100 MB | ⚠️ Conversion | ~2 GB | Full-band 48kHz. FP16 inference on RTX is noticeably faster than Tier B FP32. |
| 5 | **ESPnet JSUT VITS2** | https://huggingface.co/espnet | ~200 MB | ⚠️ Conversion | ~3 GB | VITS2 variant with improved duration modelling. More expressive prosody. Search ESPnet org for ja VITS2 checkpoints. |
| 6 | **OpenVoice v2 Japanese** | https://huggingface.co/myshell-ai/OpenVoice | ~200 MB | ⚠️ Conversion | ~2 GB | Supports voice cloning with a 3-second reference clip. Japanese supported. ONNX export via MyShell repo scripts. |
| 7 | **piper-plus Tsukuyomi-chan (GPU fast)** | https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan | ~80 MB | ✅ Native | <1 GB | Extremely fast on RTX. Use when speed matters more than expressiveness (e.g. real-time preview). |

---

## Tier C — Overpowered (RTX 3080 16GB · RTX 4080 · RTX 4090)

**Target:** High-end GPU, 16GB+ VRAM. Largest, highest-quality Japanese TTS models.
Studio-grade voice quality, multi-speaker, emotional control.

| # | Model Name | HuggingFace URL | Size | ONNX | VRAM | Notes |
|---|---|---|---|---|---|---|
| 1 | **Style-BERT-VITS2 (large)** | https://huggingface.co/litagin/style_bert_vits2 | ~1–2 GB | ⚠️ Conversion | ~6–8 GB | Full-size multi-speaker. Emotional style vectors. Best naturalness in the Style-BERT-VITS2 family. **Recommended Tier C default.** |
| 2 | **XTTS-v2 Japanese** | https://huggingface.co/coqui/XTTS-v2 | ~1.8 GB | ⚠️ Conversion | ~8 GB | Multilingual including Japanese. Voice cloning with 3-second reference audio. ONNX export via CoquiTTS export scripts. |
| 3 | **Style-BERT-VITS2 — large character fine-tunes** | https://huggingface.co/models?search=style_bert_vits2 | ~1–3 GB | ⚠️ Conversion | ~8–12 GB | Community fine-tunes on specific Japanese voices/characters. Search HuggingFace for the target voice style. |
| 4 | **VALL-E X Japanese** | https://huggingface.co/search/full-text?q=valle+japanese | ~2–4 GB | ⚠️ Conversion | ~12 GB | Zero-shot voice cloning. Highest expressiveness ceiling. Requires significant VRAM. Search HF for community Japanese ports. |
| 5 | **ESPnet NaturalSpeech2 Japanese** | https://huggingface.co/espnet | ~500 MB–1 GB | ⚠️ Conversion | ~6 GB | Higher naturalness than VITS. Search ESPnet org for Japanese NS2 checkpoints. |
| 6 | **Kokoro-82M (all speakers, batched)** | https://huggingface.co/hexgrad/Kokoro-82M | ~330 MB | ✅ Native | ~4 GB | On Tier C VRAM, load all speaker embeddings simultaneously and enable per-character voice switching mid-novel. |

---

## Important Clarification: Piper vs Voicebank Models

| Type | Examples | How voices work |
|---|---|---|
| **One model = one voice** | piper-plus Tsukuyomi-chan, ESPnet JSUT VITS | Download a separate `.onnx` per voice. No in-app voice switching within the same model file. |
| **One model = many voices** (multi-speaker) | Kokoro-82M, Style-BERT-VITS2 | Single `.onnx` file contains all speakers. User picks a speaker ID at inference time — this is the **voice bank** the app's `VoiceBankPicker` reads from `speakers.json`. |

> The `VoiceBankPicker` component only applies to **multi-speaker models**.
> For single-speaker models (piper-plus, ESPnet single-speaker), the picker is hidden and speaker ID is hardcoded to 0.
> `voice-bank-loader.js` handles this by returning `[{ id: 0, name: 'Default' }]` when no `speakers.json` is found.

---

## ONNX Conversion Reference

For models marked ⚠️ Conversion Required:

| Source | Tool | Command / Script |
|---|---|---|
| ESPnet checkpoint (`.pth`) | `espnet_onnx` pip package | `espnet_onnx export --config config.yaml --checkpoint model.pth --out onnx/` |
| Style-BERT-VITS2 | Repo's own `export_onnx.py` | `python export_onnx.py --model path/to/model.safetensors` |
| CoquiTTS / XTTS-v2 | CoquiTTS export tools | See CoquiTTS repo ONNX export documentation |
| Generic PyTorch VITS | `torch.onnx.export` | Requires dummy input tensors matching the model's expected input schema |

> Conversion is a one-time setup step. Document the exact command per model in `README.md`.
> The app itself only needs the final `.onnx` file — it never runs conversion at runtime.

---

## Recommended Defaults Per Tier (for `model-manager.js` initial registry)

| Tier | Default model | HuggingFace URL | ONNX Status |
|---|---|---|---|
| CPU-only | piper-plus Tsukuyomi-chan | https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan | ✅ Native |
| Potato (B) | Kokoro-82M | https://huggingface.co/hexgrad/Kokoro-82M | ✅ Native |
| BIS (A) | Kokoro-82M (FP16) | https://huggingface.co/hexgrad/Kokoro-82M | ✅ Native |
| Overpowered (C) | Style-BERT-VITS2 large | https://huggingface.co/litagin/style_bert_vits2 | ⚠️ Conversion |
