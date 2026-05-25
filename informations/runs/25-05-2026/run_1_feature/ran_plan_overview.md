# Plan Overview — Run 1 Feature

**Run type:** Feature
**Total phases:** 5
**Migration steps:** None

---

## Phase Summary

| # | Goal | TYPE | Key files produced | Rollback cost |
|---|---|---|---|---|
| 1 | Stand up Electron + Vite + React + Tailwind skeleton; wire ONNX TTS engine with CUDA/CPU support; hardware detection; voice bank selection; basic preview playback | Feature | `package.json`, `electron.config.js`, `src/main/index.js`, `src/main/preload.js`, `src/main/ipc/tts-handlers.js`, `src/main/ipc/model-handlers.js`, `src/main/services/device-detector.js`, `src/main/services/model-manager.js`, `src/main/services/text-chunker.js`, `src/engine/tts-engine.js`, `src/engine/voice-bank-loader.js`, all renderer root files, all `model-setup/` components, `PreviewPlayer.jsx`, `AudioQueue.jsx`, `SettingsPanel.jsx`, hooks, stores | LOW |
| 2 | File loading pipeline: PDF, EPUB, TXT parsers; chapter extraction; chapter sidebar; sentence highlighting and progress bar during preview | Feature | `src/parsers/pdf-parser.js`, `src/parsers/epub-parser.js`, `src/parsers/txt-parser.js`, `src/main/ipc/file-handlers.js`, `FileDropZone.jsx`, `ChapterList.jsx`, `ProgressBar.jsx`, `useFileLoader.js`, `fileStore.js`; modifies `App.jsx` | MEDIUM |
| 3 | Audio export (primary feature): WAV/MP3/OGG encoding via bundled ffmpeg; export UI with scope selector, format picker, progress display, cancel, and open-folder | Feature | `src/main/services/audio-encoder.js`, `src/main/ipc/export-handlers.js`, `ExportPanel.jsx`, `FormatSelector.jsx`, `ExportProgress.jsx`, `useExport.js`, `exportStore.js`, `resources/ffmpeg/ffmpeg.exe`; modifies `electron.config.js`, `settingsStore.js` | MEDIUM |
| 4 | Polish and hardening: look-ahead buffer, RTF display and advisory, keyboard shortcuts, About panel, FP16 tier warning, ffmpeg antivirus error handling, vertical-PDF fix, EPUB3 support, encoding override; full documentation | Feature | Modifies `tts-engine.js`, `PreviewPlayer.jsx`, `App.jsx`, `model-manager.js`, `audio-encoder.js`, `pdf-parser.js`, `epub-parser.js`, `txt-parser.js`, `FileDropZone.jsx`; creates `AboutPanel.jsx`, `README.md`, `models/README.md`, `.gitignore` | LOW |
| 5 | Architecture detector + pluggable TTS front-end: real per-family phonemization. Detect model architecture (config.json + ONNX I/O signature) → route to adapter. Implement piper-plus adapter with offline OpenJTalk G2P + A1/A2/A3 pitch-accent prosody, replacing the hand-rolled phoneme table. Kokoro & Style-BERT-VITS2 detected-but-stubbed. Fixes unnatural/unintelligible audio at its root. | Feature | Creates `src/engine/architecture-detector.js`, `src/engine/adapters/{registry,adapter-interface,piper-plus-adapter,kokoro-adapter,style-bert-vits2-adapter}.js`, `src/engine/g2p/openjtalk.js`, `resources/openjtalk/`; modifies `tts-engine.js`, `voice-bank-loader.js`, `model-handlers.js`, `model-manager.js`, `ModelSetupView.jsx`, `package.json`, `electron.config.js` | MEDIUM |

---

## Migration Steps

None — this is a brand-new project with no existing data.

---

## Overall Rollback Cost

**MEDIUM** — Phases 1 and 4 are LOW cost (all new files or additive changes). Phases 2 and 3 are MEDIUM cost because they modify `App.jsx`, `electron.config.js`, and `settingsStore.js`. Fully reverting the entire run means deleting all created files and restoring those three files to their Phase 1 state; no database or user data is affected since no prior app state exists.

---

## Phase Dependencies

```
Phase 1 → Phase 2 → Phase 3 → Phase 4
                                  └→ Phase 5
```

Phases 1–4 are strictly sequential. **Phase 5 is independent of Phases 2–4** — it reworks the TTS front-end and depends only on Phase 1's engine/IPC/setup scaffolding. It can be implemented at any point after Phase 1; sequencing it before Phases 2–4 is reasonable since natural audio is the product's core value. No phases run in parallel.

> **Status:** Phase 1 ✅ COMPLETE, Phase 5 ✅ COMPLETE. Phases 2–4 ⬜ NOT STARTED. The `ran_scope_filemap.md` containment list has been extended to cover the Phase 5 additions (`engine/adapters/`, `engine/g2p/`, `resources/openjtalk/`).

---

## Flags Legend (for Execute)

| Flag | Meaning |
|---|---|
| `PLAN GAP` | Completing this phase requires touching something not specified in the plan — must be flagged |
| `AMBIGUOUS` | The plan left something unspecified; state what assumption was made |
| `CONFLICT` | Existing code contradicts the plan; plan was followed, old code removed or overridden |
| `SCOPE EXPANSION` | A file not in `ran_scope_filemap.md` was created — must be flagged |
