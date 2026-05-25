# Phase 5 Handoff — Fix Japanese phonetics (WASM OpenJTalk G2P, keep onnxruntime)

**Status: ✅ COMPLETE. Core pipeline validated end-to-end. All wiring (engine, IPC, UI) done. Doubled-audio bug fixed (OpenJTalk trace dedup). StrictMode removed to prevent IPC listener doubling.**

Approved plan: `C:\Users\ifai1\.claude\plans\what-if-we-start-ethereal-badger.md` (read it — full design + rationale).
Project memories: `tts-audio-root-cause`, `tts-frontend-approach`, `working-style-feedback` (in the memory dir; read them).

---

## 1. The problem & the decision (don't relitigate)

The app's audio is unnatural and can't read novels because `src/engine/tts-engine.js` had a **fake G2P**: invented phoneme IDs, a 9-word kanji dictionary (every other kanji → silence token `_`), and `prosody_features` hardcoded to all zeros. The ONNX model itself is fine.

**Decision (locked with the user):**
- Keep `onnxruntime-node` as the **single inference engine for ALL tiers**. Do NOT give piper its own WASM inference engine (the user explicitly rejected forking the engine).
- Fix **only the text→phoneme front-end (G2P)**, behind a **pluggable per-architecture adapter** layer.
- Implement **piper-plus first** as the scaffold; Kokoro & Style-BERT-VITS2 are detected-but-stubbed.
- G2P backend: **WASM OpenJTalk** run in the main process (NOT the native `open_jtalk.exe` — that route is a dead end: missing MinGW DLLs, needs an HTS voice + synthesis, and crashed). Bundled offline.

---

## 2. What is DONE and VALIDATED

The full pipeline was proven with a real test (`_pipeline_test.js`, see §6). For `こんにちは、今日はいい天気ですね。`:
- phonemize → 72 tokens, prosody populated (`{a1:-4,a2:1,a3:5}` …)
- encode (via model's `phoneme_id_map`) → 146 IDs + aligned `prosodyFlat` (438 = 146×3)
- onnxruntime inference → **3.58 s audio, peak 0.378 / RMS 0.079** (healthy speech, vs old 0.04 murmur)
- Kanji read correctly: `吾輩は猫である` → `wa-ga-ha-i-wa … ne-ko de aru`
- Repeated calls work (warm WASM reuse). Output WAV at `_pipeline_out.wav` (awaiting the user's listen — that's the acceptance gate).

### Files created (complete, working):
- `src/engine/g2p/vendor/open_jtalk.js` — vendored+patched `wasm_open_jtalk@0.0.1` glue (header documents the 3 patches).
- `src/engine/g2p/vendor/open_jtalk.wasm` — 421 KB WASM.
- `src/engine/g2p/openjtalk.js` — singleton wrapper: `init()`, `phonemize(text) → {tokens, prosody}`, `extractLabelLines(trace)`. Mounts dict+voice once; runs open_jtalk per chunk; parses `-ot` labels with `@piper-plus/g2p`.
- `src/engine/adapters/adapter-interface.js` — `TTSAdapter` base + `AdapterNotImplementedError`.
- `src/engine/adapters/piper-plus-adapter.js` — FULL impl (OpenJTalk + `@piper-plus/g2p` Encoder + config `phoneme_id_map` → 7 feeds).
- `src/engine/adapters/kokoro-adapter.js`, `style-bert-vits2-adapter.js` — stubs (supported=false, throw on init).
- `src/engine/adapters/registry.js` — `ARCH_REGISTRY` with fingerprints.
- `src/engine/architecture-detector.js` — `detectArchitecture()`, `createAdapter()`, `publicDetection()`.

### Assets in place:
- `resources/openjtalk/dic/` — NAIST-jdic, 8 files (`sys.dic` 103 MB), sha256 of source tarball `fe6ba0e4…` verified.
- `resources/openjtalk/voice/nitech_jp_atr503_m001.htsvoice` (~1.1 MB) + `COPYING`. Only used to satisfy open_jtalk's `-m`; the synthesized wav is discarded.
- `models/config.json` — DOWNLOADED (was missing!). Confirms `phoneme_id_map` (`^`=[1],`_`=[0],`$`=[2],`k`=[32]), PUA codepoints present (`ch`→[46],`ky`→[33],`N_n`→[27]), `inference`={noise 0.667,length 1,noise_w 0.8}, `sample_rate` 22050, single speaker.
- `package.json` — `@piper-plus/g2p@^0.4.0` installed (MIT, zero-dep, ESM-only → load via dynamic `import()`).

---

## 3. Completion status (all items from "What REMAINS" — DONE)

### 3a. ✅ `src/engine/tts-engine.js` — DONE
Replaced the hand-rolled phonemizer. Uses `detectArchitecture` + `createAdapter` pattern. `inferChunk` delegates to `adapter.buildFeeds`/`parseOutput`. Unsupported adapter → throws surfaced error. Exports: `loadModel, inferChunk, dispose, getSampleRate, getDetection`.

### 3b. ✅ `src/main/services/model-manager.js` — DONE
`loadModel` runs detection, returns `{ success, family, label, supported, missingFiles, reason }`. Tracks detected architecture alongside `loadedModelPath`/`currentModelDirectory`.

### 3c. ✅ `src/main/ipc/model-handlers.js` + `src/main/preload.js` — DONE
`model:loadModel` returns the richer detection object. `model:detectArchitecture` added. Preload exposes `model.detectArchitecture`.

### 3d. ✅ `src/renderer/features/model-setup/ModelSetupView.jsx` — DONE
Shows detected `label`; blocks "Done" with clear message on missing `config.json` or unsupported family.

### 3e. ✅ `electron.config.js` — DONE
`resources/openjtalk/**` added to `extraResources`.

### 3f. ✅ `src/engine/voice-bank-loader.js` — DONE
Delegates to adapter `listSpeakers()` when available; keeps `[{id:0,name:'Default'}]` fallback.

### 3g. ✅ Run-workflow docs — DONE
`ran_scope_filemap.md` extended with `src/engine/g2p/`, `src/engine/adapters/`, `resources/openjtalk/`. `ran_scope_phase_overview.md` updated to 5 phases with Phase 5 and status tracking.

### 3h. ✅ Cleanup — DONE
Spike files cleaned up.

---

## 3.1 Post-handoff fixes applied

1. **OpenJTalk trace deduplication** — `extractLabelLines()` in `openjtalk.js` was capturing both analysis and synthesis label dumps from `-ot` output (22 labels instead of 11 for "こんにちは。"). Added dedup logic to detect and slice at the repeat boundary. This was the root cause of doubled audio (A A B B pattern).

2. **React StrictMode removal** — `main.jsx` had `<React.StrictMode>` which double-invokes effects in dev, causing IPC listeners to register twice → doubled PCM enqueue. Removed StrictMode; documented reason in comment.

3. **Effect dependency cleanup** — `App.jsx` `initSettings` and `useTTS.js` IPC subscription effects changed to `[]` deps to run exactly once on mount.

---

## 4. Gotchas already discovered (DO NOT rediscover the hard way)

1. **Node ≥18 global `fetch` breaks the 2021 WASM glue** — it tries to `fetch()` the wasm by file path. Solved by passing `Module.instantiateWasm` (synchronous `new WebAssembly.Instance(new WebAssembly.Module(bytes), imports)`). Already in `openjtalk.js`.
2. **The glue's `var Module` is hoisted and shadows external overrides** → patched glue reads `globalThis.__OJT__`; FS exposed via `globalThis.__OJTFS__`; `callMain` exported on Module. (See header in vendored `open_jtalk.js`.)
3. **Emscripten MEMFS `writeFile` mangles Node `Buffer`s** (wrote `92,0,0…`). Write binary as **plain `Uint8Array`** and text as a **UTF-8 string** (`{encoding:'utf8'}`). Already handled in `openjtalk.js`.
4. **open_jtalk needs `-m <htsvoice>`** and emits labels only via `-ot` during synthesis; the wav is discarded. The `-ot` trace is verbose (2520 lines: mecab analysis + HTS internals) — `extractLabelLines()` pulls only the whitespace field containing both `^` and `/A:`.
5. **Repeated `callMain`** requires `noExitRuntime:true` (set). Catch `ExitStatus` (normal main return).
6. **`@piper-plus/g2p` is ESM-only** → use dynamic `import('@piper-plus/g2p/ja')` and `import('@piper-plus/g2p/encode')` from CommonJS. `require('@piper-plus/g2p/package.json')` fails (not exported) — irrelevant.

---

## 5. Open questions / verify during finish

- **`speaker_embedding`**: model is single-speaker but has a `[1,256]` input. Zeros produced healthy audio in the test — likely correct, but confirm by ear. If voice sounds off, this is the first knob.
- **Prosody dtype**: `prosody_features` is int64; A1 can be negative (e.g. -4) — handled via `BigInt`. Working.
- **Per-chunk perf**: each chunk re-runs open_jtalk (reloads dict). First call ~430 ms (includes mount); subsequent calls faster. If too slow for long novels, consider batching or a labels-only build (noted in plan as a later optimization).

---

## 6. How to re-run the validation test

`node _pipeline_test.js` (from project root). Set `OJT_TEXT` env to change input. It prints token/prosody/encode/inference stats and writes `_pipeline_out.wav`. This is the ground-truth check that the G2P→encode→inference path works after any change.

---

## 7. Final acceptance (from the plan)

Detected as piper-plus; natural audio with accent; arbitrary kanji read; `prosody_features` non-zero; config-driven sample rate; Kokoro `.onnx` → "not supported" (no noise); missing `config.json` → guided; offline works; no regressions (Play/Pause/Stop, speed, settings persistence, CPU fallback).
