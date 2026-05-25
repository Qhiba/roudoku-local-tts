# Phase 5 — Architecture Detector & Pluggable TTS Front-End (Real Phonemization)

TYPE: Feature

## Goal

Replace the hand-rolled "universal" phonemizer in `tts-engine.js` — which feeds invented phoneme IDs, zeroed prosody, and a 9-word kanji dictionary to every model regardless of architecture — with a **pluggable, per-architecture front-end** chosen automatically by a model **architecture detector**.

The detector fingerprints a loaded model (its companion `config.json` plus its ONNX input/output signature) and routes to the matching **adapter**. Each adapter owns the real text→model-input pipeline for its model family: a proper grapheme-to-phoneme (G2P) engine, the model's own `phoneme_id_map`, and the side-inputs that family needs (pitch-accent prosody, style vectors, speaker embeddings, etc.).

By the end of this phase, the **piper-plus** family (the CPU-tier default, and the model already present in `models/`) produces natural, intelligible Japanese — including arbitrary kanji from real novels — because it is driven by OpenJTalk-derived phonemes and A1/A2/A3 accent features rather than a guessed table. Other families (Kokoro, Style-BERT-VITS2) are **detected but cleanly reported as not-yet-supported** rather than silently producing noise. On the surface the app stays "load any model" — under the hood it knows what it loaded and refuses to fake it.

> **Why this phase exists (diagnosis):** the current pipeline is a *system* defect, not a model limitation. The loaded Tsukuyomi-chan model is a capable MB-iSTFT-VITS2 neural TTS. The app sabotages every inference by (1) having no real G2P — kanji not in a 9-word dict become the silence token `_`, so novels are unreadable; (2) hardcoding `prosody_features` (the model's A1/A2/A3 OpenJTalk pitch-accent input) to all zeros → flat, robotic delivery; (3) never downloading the model's `config.json`, so `phoneme_id_map`, `sample_rate`, and inference scales were reinvented by hand. See the model card: inference uses `piper_train.infer_onnx --config config.json` with OpenJTalk-backed phonemization.

## Produces

| File | Action | What changes |
|---|---|---|
| `src/engine/architecture-detector.js` | CREATE | `detectArchitecture(modelPath)`: reads any sidecar `config.json` in the model directory and the ONNX input/output names+shapes (via a lightweight metadata read); matches against the registry; returns `{ family, adapterId, supported, sampleRate, requiredFiles: string[], missingFiles: string[], reason }`. Returns `{ family: 'unknown', supported: false, reason }` when nothing matches — never guesses. |
| `src/engine/adapters/registry.js` | CREATE | `ARCH_REGISTRY`: ordered list of architecture fingerprints. Each entry: `{ id, label, supported, match(configJson, onnxSignature) → boolean, adapterFactory, requiredFiles }`. Piper-plus fingerprint: `config.piper_version` present OR ONNX inputs include `prosody_features` + `lid` + `speaker_embedding`. Kokoro fingerprint: inputs `input_ids` + `style` + `speed`. Style-BERT-VITS2 fingerprint: inputs include tone/language/bert tensors. |
| `src/engine/adapters/adapter-interface.js` | CREATE | Documents and provides the adapter contract as JSDoc + a base/no-op class: `init(modelDir, configJson)`, `buildFeeds(chunkText, { speakerId, rate, languageId }, ort, session) → feeds`, `parseOutput(results, session) → Float32Array`, `getSampleRate()`, `listSpeakers() → [{id,name}]`, `requiredFiles`. Adapters are the only place that knows tensor names. |
| `src/engine/adapters/piper-plus-adapter.js` | CREATE | Full implementation for piper-plus / MB-iSTFT-VITS2. Loads `phoneme_id_map`, `sample_rate`, `inference` scales, and `espeak.voice` from the model's `config.json`. Calls the OpenJTalk G2P module to convert arbitrary Japanese (kanji + kana) → phoneme string sequence **and** per-phoneme A1/A2/A3 accent features. Maps phonemes through `phoneme_id_map` (with the `^ _ … $` boundary tokens piper uses), fills `input`, `input_lengths`, `scales` (noise/length/noise_w from config, length adjusted by `rate`), `lid` (Japanese id from config language map), `prosody_features` (A1/A2/A3, **not zeros**), and `speaker_embedding` + `speaker_embedding_mask` per what the single-speaker model expects (see Flags). Reads output `output` tensor → Float32Array. |
| `src/engine/adapters/kokoro-adapter.js` | CREATE | **Stub only.** `supported = false`. `buildFeeds`/`parseOutput` throw `AdapterNotImplementedError` with a clear message. Present so the detector can name the family and the UI can say "recognized: Kokoro-82M — adapter coming in a later phase." Documents the real requirements (misaki G2P, `voices/*.bin` style vectors, `input_ids`/`style`/`speed` inputs) for whoever implements it. |
| `src/engine/adapters/style-bert-vits2-adapter.js` | CREATE | **Stub only.** Same pattern as Kokoro stub. Documents requirements (OpenJTalk + bundled Japanese BERT, tone/language/bert/style inputs). |
| `src/engine/g2p/openjtalk.js` | CREATE | Wrapper around the bundled OpenJTalk runtime (WASM or bundled binary — see Flags / decision step). Exposes `phonemize(text) → { phonemes: string[], a1: number[], a2: number[], a3: number[] }` derived from OpenJTalk full-context labels. Loads the OpenJTalk dictionary from bundled resources. Fully offline — no network, no user-installed Python. This is the component that finally lets the app read kanji. |
| `src/engine/tts-engine.js` | MODIFY | Remove the hand-rolled `phonemeMap`, `kanaToPhonemes`, `digraphs`, `textToPhonemeIds`, the 9-word kanji `replacements`, and the generic tensor-name guessing in `inferChunk`. `loadModel` now runs `detectArchitecture`, instantiates the matching adapter (or records unsupported/unknown and surfaces it), and stores the active adapter + detected `sampleRate`. `inferChunk` delegates entirely to `adapter.buildFeeds` / `adapter.parseOutput`. If no supported adapter: throw a clear, surfaced error instead of emitting a quiet buffer of noise. `getSampleRate` reads from the active adapter. |
| `src/engine/voice-bank-loader.js` | MODIFY | Speaker enumeration delegates to the active adapter's `listSpeakers()` when available; falls back to existing `speakers.json`/`config.json` scan; still returns `[{ id: 0, name: 'Default' }]` for single-speaker models. |
| `src/main/ipc/model-handlers.js` | MODIFY | `model:loadModel` returns the detection result to the renderer: `{ ok, family, label, supported, missingFiles, reason }`. Add `model:detectArchitecture(modelPath)` so the setup UI can show what a folder contains **before** committing to load. |
| `src/main/services/model-manager.js` | MODIFY | Validation accepts and inspects a **model bundle directory** (the `.onnx` plus its required sidecars) rather than only checking a lone `.onnx`. Tracks detected architecture + required/missing files alongside the loaded path and tier. |
| `src/renderer/features/model-setup/ModelSetupView.jsx` | MODIFY | Setup flow points at the model **folder/bundle**; after detection it shows the recognized architecture, lists any missing companion files (e.g. "config.json not found next to the .onnx"), and blocks "Done" with a clear message when the detected family is unsupported or files are missing — instead of loading something that will produce noise. |
| `package.json` | MODIFY | Add the chosen OpenJTalk G2P dependency (WASM package or native binding) and any build helper. No new runtime requirement for the end user. |
| `electron.config.js` | MODIFY | Add `extraResources` for the OpenJTalk dictionary/runtime assets so they ship inside the packaged app and resolve correctly under `asar`. |
| `resources/openjtalk/` | CREATE | Bundled OpenJTalk dictionary / WASM assets (gitignored if large; documented in `models/README.md`). Exact contents depend on the chosen G2P delivery. |

## Reference Files Needed

- `/informations/runs/25-05-2026/model_recommendation.md` — per-architecture notes; confirms piper-plus uses OpenJTalk and lists the other tier defaults whose adapters are stubbed here.
- `src/engine/tts-engine.js` — current implementation being replaced; preserve the CUDA/CPU execution-provider selection and the PCM-output contract that `tts-handlers.js` depends on.
- `src/main/ipc/tts-handlers.js` — confirm the PCM-chunk IPC payload shape (it already carries `sampleRate`) so the engine refactor keeps it intact.
- The loaded model's companion `config.json` from `https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan` — source of `phoneme_id_map`, `sample_rate` (22050), language map (`ja:0 … pt:5`), and inference scales (noise 0.667 / length 1.0 / noise_w 0.8). **Must be present in `models/` next to the `.onnx` for the piper-plus adapter to work.**

> **Execute note — decision/spike step first:** Before writing `openjtalk.js`, confirm a concrete **offline, no-user-Python** way to run OpenJTalk inside Electron/Node on Windows (WASM build vs. bundled native binary + dictionary). If none is viable, raise `PLAN GAP` immediately and stop the G2P work — the piper-plus adapter cannot be completed without it, and Kokoro may become the better first real adapter. Do not ship an approximate kana-only fallback; that recreates the bug this phase exists to remove.

## Comments to Use

```
// ADDED: architecture detector — fingerprints model via config.json + ONNX I/O signature; routes to adapter; never guesses
// ADDED: adapter registry — per-family fingerprints and factories; supported flag gates execution
// ADDED: adapter interface — the ONLY place that knows a family's tensor names and side-inputs
// ADDED: piper-plus adapter — OpenJTalk phonemes + A1/A2/A3 accent + config phoneme_id_map; reads kanji, fills prosody (not zeros)
// ADDED: OpenJTalk G2P wrapper — offline kanji+kana -> phonemes + full-context A1/A2/A3; no user-installed Python
// ADDED: unsupported-architecture guard — detected-but-unimplemented families fail loudly, never emit noise
// PROTECTED: CUDA/CPU execution-provider selection preserved from original tts-engine loadModel
// PROTECTED: PCM Float32Array output contract + sampleRate IPC payload preserved for tts-handlers/AudioQueue
// PROTECTED: single-speaker fallback [{id:0,name:'Default'}] preserved in voice-bank-loader
```

## Flags to Raise

- `PLAN GAP` — ✅ RESOLVED: WASM OpenJTalk (`wasm_open_jtalk@0.0.1`) was viable. Vendored + patched Emscripten glue runs in Node.js main process, fully offline, no user Python install needed. Dict loads in ~110ms.
- `AMBIGUOUS` — ✅ RESOLVED: `speaker_embedding` [1,256] — all-zeros produces healthy audio. Single-speaker model. `speaker_embedding_mask` set to 1.
- `AMBIGUOUS` — ✅ RESOLVED: `prosody_features` encoding — A1/A2/A3 from OpenJTalk full-context labels, stored as int64 BigInt. A1 can be negative (e.g. -4). Working.
- `AMBIGUOUS` — ✅ RESOLVED: boundary tokens — `^` (BOS), `$` (EOS), `_` (pad/silence between phonemes). Confirmed against `phoneme_id_map` from config.json.
- `SCOPE EXPANSION` — ✅ No scope expansion needed beyond the Produces list.
- `DISCOVERED` — OpenJTalk's `-ot` trace dumps the full HTS label sequence **twice** (analysis pass + synthesis pass). `extractLabelLines()` initially captured all labels, doubling the phoneme tokens (22 instead of 11 for "こんにちは。"). Fixed with deduplication logic that detects the repeat boundary.
- `DISCOVERED` — React StrictMode double-invokes effects in dev, causing IPC listeners to register twice → doubled PCM enqueue. Removed StrictMode from `main.jsx`.

## Temporarily Inconsistent State

- Until the piper-plus adapter is complete, the detector exists but only one family runs end-to-end; Kokoro and Style-BERT-VITS2 detect as "recognized, not yet supported." This is intended, not a regression.
- `ModelSetupView` may show a "config.json missing — place it next to the .onnx" state for users who downloaded only the `.onnx`. The setup view must guide, not break.
- The bundled OpenJTalk dictionary may be large; if gitignored, document retrieval in `models/README.md` so the app is reproducible.

## Handoff to Next Phase

- A clean `ModelAdapter` interface other phases can implement without touching `tts-engine.js` internals.
- `tts-engine.js` reduced to: detect → adapter → infer; no architecture-specific logic remains inside it.
- Detection result available over IPC for any future setup/diagnostics UI.
- Documented requirements for the Kokoro and Style-BERT-VITS2 adapters (their stubs name exactly what's needed), so each can become its own follow-up phase.

## Rollback Cost

MEDIUM — adds new `engine/adapters/` and `engine/g2p/` modules plus a bundled G2P runtime, and rewrites the core of `tts-engine.js`. Reverting means restoring `tts-engine.js` to its current state, removing the new modules, and dropping the OpenJTalk dependency/resources. No persisted user data is affected. The bundled-binary/WASM packaging is the only non-trivial part to unwind.

## Acceptance Criteria

1. Loading the present `tsukuyomi-chan-6lang-fp16.onnx` (with its `config.json` beside it) is detected as the piper-plus family and routed to the piper-plus adapter.
2. Typing `こんにちは、今日はいい天気ですね。` and pressing Play produces **intelligible, natural-sounding** Japanese — clearly better than the current murmur — with audible pitch accent.
3. A sentence containing kanji **not** in any hardcoded list (e.g. a real novel line) is read correctly, proving real G2P rather than a lookup table.
4. `prosody_features` fed to the model are real A1/A2/A3 values from OpenJTalk, never all zeros (verifiable in the adapter / a debug log).
5. `phoneme_id_map`, `sample_rate`, and inference scales are read from the model's `config.json`, not hardcoded in `tts-engine.js`.
6. Loading a model whose architecture has no implemented adapter shows a clear "recognized but not yet supported" message and does **not** play noise.
7. Loading a model with no recognizable fingerprint shows an "unknown architecture" message and does not crash.
8. If the model's `config.json` is missing, setup tells the user exactly what file to place and where.
9. CUDA/CPU execution-provider selection and CPU fallback still work (no regression from Phase 1).
10. Preview Play/Pause/Stop, speed presets, and settings persistence still work (no regression).
11. The whole pipeline runs fully offline with no user-installed Python or developer tools.

## Verification

1. **Detection:** Load the Tsukuyomi-chan model folder. A diagnostics/setup line reports "piper-plus (MB-iSTFT-VITS2)" and "supported".
2. **Naturalness (the core fix):** Play `こんにちは、今日はいい天気ですね。`. Compare against a recording of the current build — the new output is clearly more natural and not a flat murmur.
3. **Kanji reading:** Paste a real Japanese novel paragraph (heavy kanji). It is read aloud coherently; no long silent gaps where kanji used to map to `_`.
4. **Accent present:** Confirm via debug output that `prosody_features` contains non-zero A1/A2/A3 sequences for the spoken chunk.
5. **Config-driven:** Temporarily edit `config.json`'s `sample_rate` and confirm playback pitch/tempo follows it (proves the value is read from config, not hardcoded).
6. **Unsupported family:** Point the app at a Kokoro `.onnx`. It says "recognized: Kokoro — not yet supported" and Play is blocked; no audio noise is produced.
7. **Missing config:** Remove `config.json` from the folder and load. Setup shows a "place config.json next to the model" message.
8. **No regressions:** Repeat Phase 1 verification steps 8–11 (preview controls, speed, settings persistence, CPU fallback) — all still pass.
