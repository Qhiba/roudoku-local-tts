# §4 Phase Overview — Run 1 Feature (Updated)

This run requires **5 phases**.

---

## Phase 1 — Electron Foundation, Model Loading & Basic TTS

- **Phase number:** 1
- **TYPE:** Feature
- **Goal:** Stand up the Electron + Vite + React + Tailwind project skeleton. Get the ONNX TTS engine running in the main process with CUDA/CPU support. User can select a model tier, pick a voice bank, type test text, and hear it spoken via real-time preview. Hardware auto-detection works.
- **What it produces:**
  - `package.json` — all dependencies (Electron, onnxruntime-node, Vite, React, Tailwind, electron-store, Zustand)
  - `vite.config.js`, `tailwind.config.js`, `postcss.config.js` — build tooling config
  - `electron.config.js` — Electron Forge/Builder packaging config
  - `src/main/index.js` — Electron entry; BrowserWindow; IPC registration
  - `src/main/preload.js` — contextBridge IPC API
  - `src/main/ipc/tts-handlers.js` — start/cancel inference, stream PCM to renderer
  - `src/main/ipc/model-handlers.js` — load model, list voice banks, hardware detection
  - `src/main/services/device-detector.js` — CUDA probe via onnxruntime-node; VRAM detection; tier mapping
  - `src/main/services/model-manager.js` — tier registry (Potato/BIS/Overpowered); model file validation
  - `src/main/services/text-chunker.js` — Japanese sentence splitter; token limit; comma fallback
  - `src/engine/tts-engine.js` — onnxruntime-node inference pipeline; CUDA/CPU EP selection; PCM output
  - `src/engine/voice-bank-loader.js` — reads speakers.json/config.json; returns speaker list
  - `src/renderer/index.html`, `main.jsx`, `App.jsx` — React entry and root
  - `src/renderer/styles/index.css` — Tailwind imports
  - `src/renderer/features/model-setup/ModelSetupView.jsx` — first-time setup view
  - `src/renderer/features/model-setup/TierSelector.jsx` — tier cards with GPU/VRAM labels
  - `src/renderer/features/model-setup/VoiceBankPicker.jsx` — speaker dropdown; persisted selection
  - `src/renderer/features/model-setup/HardwareStatus.jsx` — detected GPU, VRAM, recommended tier
  - `src/renderer/features/preview/PreviewPlayer.jsx` — play/pause/stop/skip; sentence highlighting
  - `src/renderer/features/preview/AudioQueue.jsx` — Web Audio API queue for PCM chunks
  - `src/renderer/features/settings/SettingsPanel.jsx` — rate, pitch, volume, speed presets
  - `src/renderer/hooks/useTTS.js`, `useHardware.js` — IPC wrappers
  - `src/renderer/store/ttsStore.js`, `settingsStore.js` — Zustand state
- **Depends on:** Nothing (this is the first phase).
- **Status:** ✅ COMPLETE (executed + fixed)

---

## Phase 2 — File Loading: PDF & EPUB Support

- **Phase number:** 2
- **TYPE:** Feature
- **Goal:** Allow the user to load a PDF or EPUB Japanese novel file. The main process extracts the text, organises it by chapter, feeds it to the Phase 1 TTS engine, and the UI shows the chapter list with sentence highlighting during preview.
- **What it produces:**
  - `src/parsers/pdf-parser.js` — pdf-parse wrapper; text extraction; vertical-text handling; image-PDF warning
  - `src/parsers/epub-parser.js` — JSZip + XHTML reader; spine ordering; chapter detection; DRM detection and error
  - `src/parsers/txt-parser.js` — plain text load; encoding detection (UTF-8/Shift-JIS); paragraph grouping
  - `src/main/ipc/file-handlers.js` — IPC: open file dialog, read chapter list, read text chunk
  - `src/renderer/features/file-loader/FileDropZone.jsx` — drag-and-drop + browse; accepts .pdf .epub .txt
  - `src/renderer/features/file-loader/ChapterList.jsx` — chapter sidebar; click-to-jump
  - `src/renderer/features/preview/ProgressBar.jsx` — playback position within current chapter
  - `src/renderer/hooks/useFileLoader.js` — IPC wrapper for file open and chapter read
  - `src/renderer/store/fileStore.js` — loaded file and chapter state (Zustand)
  - Updates to `App.jsx` — wires file loader → chunker → TTS engine → preview player → chapter list
- **Depends on:** Phase 1 (model loading, TTS engine, preview player must be working).
- **Status:** ⬜ NOT STARTED

---

## Phase 3 — Audio Export (Primary Feature)

- **Phase number:** 3
- **TYPE:** Feature
- **Goal:** Implement audio export as the primary user workflow. The user selects a format (WAV / MP3 / OGG), an output path, and exports the full novel or a specific chapter. The main process runs TTS inference on all chunks and encodes the output using the bundled ffmpeg binary.
- **What it produces:**
  - `src/main/services/audio-encoder.js` — PCM → WAV (native header); PCM → MP3 / OGG via fluent-ffmpeg + bundled ffmpeg
  - `src/main/ipc/export-handlers.js` — IPC: start export job, progress events per chapter, cancel, open output folder
  - `src/renderer/features/export/ExportPanel.jsx` — main export UI: format, output path, start/cancel button
  - `src/renderer/features/export/FormatSelector.jsx` — WAV / MP3 / OGG radio buttons with quality options
  - `src/renderer/features/export/ExportProgress.jsx` — per-chapter progress bar, ETA, output file size
  - `src/renderer/hooks/useExport.js` — IPC wrapper for export job
  - `src/renderer/store/exportStore.js` — export job state (Zustand)
  - `resources/ffmpeg/ffmpeg.exe` — bundled ffmpeg binary (Windows); added to Electron packaging config
  - Updates to `electron.config.js` — include ffmpeg binary as extraResource in installer
  - Updates to `settingsStore.js` — persist default export format and output directory
- **Depends on:** Phase 2 (file loading and full TTS pipeline must be working end-to-end).
- **Status:** ⬜ NOT STARTED

---

## Phase 4 — Polish, Hardening & Documentation

- **Phase number:** 4
- **TYPE:** Feature
- **Goal:** Harden all edge cases from the Risks section, add export-first UX polish, sentence-ahead buffer for preview, RTF display, keyboard shortcuts, and finalise all documentation so a non-technical user can set the app up from scratch.
- **What it produces:**
  - Sentence-ahead buffer in `tts-engine.js` — generates next chunk during current playback to hide inference latency
  - Real-time factor (RTF) display in `PreviewPlayer.jsx`
  - Automatic tier downgrade recommendation when RTF > 1.5× (Tier B → CPU-only; CPU-only → hardware upgrade warning)
  - Keyboard shortcuts: Space = play/pause preview, Esc = stop, E = open export panel, S = open settings
  - `src/renderer/features/settings/AboutPanel.jsx` — app version, model info, hardware summary
  - `README.md` — complete setup guide: installer download, model download links per tier, voice bank setup, VRAM table, FAQ for DRM/scanned-PDF errors, CUDA driver requirements
  - `models/README.md` — model placement guide with expected filenames and Hugging Face download links
  - `.gitignore` — excludes models/, resources/ffmpeg/, dist/, node_modules/
  - End-to-end validation: full chapter exported to WAV, MP3, and OGG on all three GPU tiers (CPU path minimum)
- **Depends on:** Phase 3 (full pipeline including export must be working).
- **Status:** ⬜ NOT STARTED

---

## Phase 5 — Architecture Detector & Pluggable TTS Front-End (Real Phonemization)

- **Phase number:** 5
- **TYPE:** Feature
- **Goal:** Replace the hand-rolled phonemizer with a pluggable, per-architecture adapter system. Detect model architecture via config.json + ONNX I/O signature, route to the correct adapter. Implement the piper-plus adapter with offline WASM OpenJTalk G2P and real A1/A2/A3 pitch-accent prosody. Kokoro & Style-BERT-VITS2 detected-but-stubbed. Fixes unintelligible audio at its root.
- **What it produces:**
  - `src/engine/architecture-detector.js` — model fingerprinting via config.json + ONNX I/O
  - `src/engine/adapters/registry.js` — ARCH_REGISTRY with fingerprints for piper-plus, Kokoro, SBV2
  - `src/engine/adapters/adapter-interface.js` — TTSAdapter base class + AdapterNotImplementedError
  - `src/engine/adapters/piper-plus-adapter.js` — full impl: OpenJTalk G2P + config phoneme_id_map → 7 feeds
  - `src/engine/adapters/kokoro-adapter.js`, `style-bert-vits2-adapter.js` — stubs (supported=false)
  - `src/engine/g2p/openjtalk.js` — singleton WASM OpenJTalk wrapper: phonemize(text) → {tokens, prosody}
  - `src/engine/g2p/vendor/open_jtalk.js` + `open_jtalk.wasm` — vendored+patched wasm_open_jtalk
  - `resources/openjtalk/dic/` — NAIST-jdic dictionary (8 files)
  - `resources/openjtalk/voice/` — HTS voice for OpenJTalk's -m flag
  - Modifies `tts-engine.js`, `voice-bank-loader.js`, `model-handlers.js`, `model-manager.js`, `ModelSetupView.jsx`, `package.json`, `electron.config.js`
- **Depends on:** Phase 1 (engine scaffolding, IPC, setup UI must exist). Independent of Phases 2–4.
- **Status:** ✅ COMPLETE (executed + fixed — doubled audio from OpenJTalk trace dedup resolved)



