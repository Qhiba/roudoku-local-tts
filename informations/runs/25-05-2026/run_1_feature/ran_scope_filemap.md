# §2 File Map — Run 1 Feature (Updated)

All files listed below will be CREATED across the full run. Files from Phase 1 and Phase 5 already exist on disk. Files from Phases 2–4 do not yet exist.

Files are organized into dedicated feature directories — no flat root dumping.

---

## Directory Layout After Run 1

```
local-tts/
│
├── src/
│   ├── main/                              ← Electron main process (Node.js)
│   │   ├── index.js                       ← Electron entry point; creates BrowserWindow, registers IPC handlers
│   │   ├── preload.js                     ← Exposes safe IPC API to renderer via contextBridge
│   │   │
│   │   ├── ipc/                           ← IPC handler modules (main ↔ renderer bridge)
│   │   │   ├── tts-handlers.js            ← Handles: start-inference, cancel, get-progress
│   │   │   ├── file-handlers.js           ← Handles: open-file, list-chapters, read-chunk
│   │   │   ├── model-handlers.js          ← Handles: load-model, list-voice-banks, detect-hardware
│   │   │   └── export-handlers.js         ← Handles: start-export, get-export-progress, cancel-export
│   │   │
│   │   └── services/                      ← Business logic services (used by IPC handlers)
│   │       ├── device-detector.js         ← Probes CUDA devices via onnxruntime-node; maps VRAM → tier recommendation
│   │       ├── model-manager.js           ← Three-tier registry (Potato/BIS/Overpowered); model file validation; voice bank listing from model metadata
│   │       ├── text-chunker.js            ← Japanese sentence-boundary splitter (。！？\n); token-count limit enforcement; secondary comma-split fallback
│   │       └── audio-encoder.js           ← Encodes raw PCM buffers → WAV (native) / MP3 / OGG (via bundled ffmpeg)
│   │
│   ├── engine/                            ← TTS inference engine (runs in main process)
│   │   ├── tts-engine.js                  ← onnxruntime-node wrapper; delegates to adapter for buildFeeds/parseOutput; manages CUDA/CPU EP selection
│   │   ├── voice-bank-loader.js           ← Reads speakers.json / config.json from model directory; returns available voice bank list and default speaker ID
│   │   ├── architecture-detector.js       ← Fingerprints model via config.json + ONNX I/O signature; routes to adapter; never guesses
│   │   │
│   │   ├── adapters/                      ← Per-architecture model adapters
│   │   │   ├── registry.js                ← ARCH_REGISTRY: ordered fingerprints + factories for piper-plus, Kokoro, SBV2
│   │   │   ├── adapter-interface.js       ← TTSAdapter base class + AdapterNotImplementedError
│   │   │   ├── piper-plus-adapter.js      ← Full impl: OpenJTalk G2P + config phoneme_id_map → 7 ONNX feeds
│   │   │   ├── kokoro-adapter.js           ← Stub: supported=false, documents requirements
│   │   │   └── style-bert-vits2-adapter.js ← Stub: supported=false, documents requirements
│   │   │
│   │   └── g2p/                           ← Grapheme-to-phoneme engine
│   │       ├── openjtalk.js               ← Singleton WASM OpenJTalk wrapper: phonemize(text) → {tokens, prosody}
│   │       └── vendor/                    ← Vendored + patched wasm_open_jtalk@0.0.1
│   │           ├── open_jtalk.js          ← Patched Emscripten glue (3 patches documented in header)
│   │           └── open_jtalk.wasm        ← 421 KB WASM binary
│   │
│   ├── parsers/                           ← File format parsers (run in main process)
│   │   ├── pdf-parser.js                  ← pdf-parse wrapper; page-by-page text extraction; paragraph grouping; vertical-text handling; image-PDF detection warning
│   │   ├── epub-parser.js                 ← JSZip + XHTML reader; content.opf spine parsing; chapter ordering; DRM detection and error message
│   │   └── txt-parser.js                  ← Plain text loader; chardet/iconv-lite for UTF-8 / Shift-JIS detection; paragraph grouping
│   │
│   └── renderer/                          ← Vite + React + Tailwind (UI, runs in renderer process)
│       ├── index.html                     ← Vite HTML entry point
│       ├── main.jsx                       ← React entry; mounts <App /> into #root (StrictMode removed — causes doubled IPC listeners)
│       ├── App.jsx                        ← Root component; layout shell; routes between views
│       │
│       ├── features/                      ← Feature-scoped components and logic
│       │   ├── model-setup/               ← Model loading, tier selection, voice bank picking
│       │   │   ├── ModelSetupView.jsx     ← Full-page view for first-time model setup
│       │   │   ├── TierSelector.jsx       ← Tier cards: CPU-only / Potato / BIS / Overpowered with VRAM labels
│       │   │   ├── VoiceBankPicker.jsx    ← Dropdown of available speakers from loaded model; persists selection
│       │   │   └── HardwareStatus.jsx     ← Detected GPU name, VRAM, recommended tier badge
│       │   │
│       │   ├── file-loader/               ← Novel file input
│       │   │   ├── FileDropZone.jsx       ← Drag-and-drop + browse button; accepts .pdf .epub .txt
│       │   │   └── ChapterList.jsx        ← Sidebar list of detected chapters/sections; click to jump
│       │   │
│       │   ├── export/                    ← Audio export (primary feature)
│       │   │   ├── ExportPanel.jsx        ← Main export UI: format picker, output path, progress bar, cancel
│       │   │   ├── FormatSelector.jsx     ← WAV / MP3 / OGG radio buttons with quality options
│       │   │   └── ExportProgress.jsx     ← Per-chapter export progress; estimated time remaining; file size
│       │   │
│       │   ├── preview/                   ← Real-time playback preview (secondary feature)
│       │   │   ├── PreviewPlayer.jsx      ← Play/pause/stop/skip controls; sentence highlighting; speed control
│       │   │   ├── ProgressBar.jsx        ← Playback position within current chapter
│       │   │   └── AudioQueue.jsx         ← Manages Web Audio API queue; receives PCM chunks from main via IPC
│       │   │
│       │   └── settings/                  ← User preferences
│       │       ├── SettingsPanel.jsx      ← Rate, pitch, volume sliders; speed presets; output format default
│       │       └── AboutPanel.jsx         ← App version, model info, hardware summary
│       │
│       ├── hooks/                         ← React custom hooks (IPC + state wrappers)
│       │   ├── useTTS.js                  ← Wraps IPC calls to tts-handlers; exposes startPreview, stop, status
│       │   ├── useExport.js               ← Wraps IPC calls to export-handlers; exposes startExport, cancel, progress
│       │   ├── useFileLoader.js           ← Wraps IPC calls to file-handlers; exposes openFile, chapters, currentChunk
│       │   └── useHardware.js             ← Wraps IPC calls to model-handlers; exposes tier, gpuName, vram, voiceBanks
│       │
│       ├── store/                         ← Global client state (Zustand)
│       │   ├── ttsStore.js                ← Preview playback state: playing, paused, currentSentence, queue
│       │   ├── exportStore.js             ← Export state: running, progress, outputPath, format
│       │   ├── fileStore.js               ← Loaded file state: fileName, chapters, currentChapter, rawText
│       │   └── settingsStore.js           ← Persisted settings: tier, voice bank ID, rate, pitch, format, outputDir
│       │
│       └── styles/
│           └── index.css                  ← Tailwind base imports (@tailwind base/components/utilities)
│
├── models/                                ← Downloaded ONNX model files (gitignored)
│   └── README.md                          ← Model placement guide; expected filenames per tier; download links
│
├── resources/                             ← Electron-bundled binaries and assets
│   └── openjtalk/                         ← Bundled OpenJTalk dictionary + HTS voice (offline G2P)
│       ├── dic/                           ← NAIST-jdic (8 files; sys.dic ~103 MB)
│       │   ├── sys.dic, char.bin, matrix.bin, unk.dic, left-id.def, right-id.def, pos-id.def, rewrite.def
│       │   └── COPYING
│       └── voice/
│           ├── nitech_jp_atr503_m001.htsvoice  ← HTS voice (~1.1 MB); only used to satisfy -m flag; wav discarded
│           └── COPYING
│
├── package.json                           ← npm scripts, Electron + Vite + Tailwind dependencies
├── vite.config.js                         ← Vite config for renderer; points output to Electron-expected paths
├── tailwind.config.js                     ← Tailwind config; content paths, theme tokens
├── postcss.config.js                      ← PostCSS for Tailwind
├── electron.config.js                     ← Electron Forge / Builder config; packaging, installer, ffmpeg resource inclusion
├── .gitignore                             ← Excludes models/*.onnx, resources/ffmpeg/*, dist/, node_modules/
└── README.md                              ← Setup guide: install, model download, voice bank setup, GPU driver requirements
```

---

## File Table (flat view for status tracking)

### Main Process — Entry & IPC

| File | Status | Owns |
|---|---|---|
| `src/main/index.js` | CREATE | Electron entry; BrowserWindow creation; IPC registration |
| `src/main/preload.js` | CREATE | contextBridge API exposed to renderer |
| `src/main/ipc/tts-handlers.js` | CREATE | IPC: start/cancel TTS inference, stream PCM chunks to renderer |
| `src/main/ipc/file-handlers.js` | CREATE | IPC: open file dialog, read chapter list, read text chunk |
| `src/main/ipc/model-handlers.js` | CREATE | IPC: load model, list voice banks, trigger hardware detection |
| `src/main/ipc/export-handlers.js` | CREATE | IPC: start export job, progress events, cancel, open output folder |

### Main Process — Services

| File | Status | Owns |
|---|---|---|
| `src/main/services/device-detector.js` | CREATE | CUDA device probe; VRAM detection; tier recommendation mapping |
| `src/main/services/model-manager.js` | CREATE | Tier registry; model file path validation; voice bank list from model metadata |
| `src/main/services/text-chunker.js` | CREATE | Japanese sentence splitter; token limit enforcement; comma/conjunction fallback |
| `src/main/services/audio-encoder.js` | CREATE | PCM → WAV (native); PCM → MP3 / OGG via bundled ffmpeg |

### TTS Engine

| File | Status | Owns |
|---|---|---|
| `src/engine/tts-engine.js` | CREATE | onnxruntime-node inference pipeline; delegates to adapter for buildFeeds/parseOutput; CUDA/CPU EP selection |
| `src/engine/voice-bank-loader.js` | CREATE | Reads speakers.json / config.json; returns speaker list and IDs |
| `src/engine/architecture-detector.js` | CREATE | Fingerprints model via config.json + ONNX I/O; routes to adapter |
| `src/engine/adapters/registry.js` | CREATE | ARCH_REGISTRY: per-family fingerprints and factories |
| `src/engine/adapters/adapter-interface.js` | CREATE | TTSAdapter base class + AdapterNotImplementedError |
| `src/engine/adapters/piper-plus-adapter.js` | CREATE | Full piper-plus impl: OpenJTalk G2P → config phoneme_id_map → 7 feeds |
| `src/engine/adapters/kokoro-adapter.js` | CREATE | Stub: supported=false; documents requirements |
| `src/engine/adapters/style-bert-vits2-adapter.js` | CREATE | Stub: supported=false; documents requirements |
| `src/engine/g2p/openjtalk.js` | CREATE | Singleton WASM OpenJTalk wrapper: phonemize(text) → {tokens, prosody} |
| `src/engine/g2p/vendor/open_jtalk.js` | CREATE | Vendored+patched Emscripten glue for wasm_open_jtalk |
| `src/engine/g2p/vendor/open_jtalk.wasm` | CREATE | 421 KB WASM binary |

### Parsers

| File | Status | Owns |
|---|---|---|
| `src/parsers/pdf-parser.js` | CREATE | pdf-parse wrapper; text extraction; vertical-text handling; image-PDF warning |
| `src/parsers/epub-parser.js` | CREATE | JSZip + XHTML; spine ordering; chapter detection; DRM detection |
| `src/parsers/txt-parser.js` | CREATE | Plain text load; encoding detection (UTF-8 / Shift-JIS); paragraph grouping |

### Renderer — Root

| File | Status | Owns |
|---|---|---|
| `src/renderer/index.html` | CREATE | Vite HTML entry |
| `src/renderer/main.jsx` | CREATE | React mount |
| `src/renderer/App.jsx` | CREATE | Layout shell, view routing |
| `src/renderer/styles/index.css` | CREATE | Tailwind base imports |

### Renderer — Features: Model Setup

| File | Status | Owns |
|---|---|---|
| `src/renderer/features/model-setup/ModelSetupView.jsx` | CREATE | First-time setup view |
| `src/renderer/features/model-setup/TierSelector.jsx` | CREATE | Tier cards with hardware labels and VRAM requirements |
| `src/renderer/features/model-setup/VoiceBankPicker.jsx` | CREATE | Speaker/voice bank dropdown; persists selection |
| `src/renderer/features/model-setup/HardwareStatus.jsx` | CREATE | Detected GPU, VRAM, recommended tier badge |

### Renderer — Features: File Loader

| File | Status | Owns |
|---|---|---|
| `src/renderer/features/file-loader/FileDropZone.jsx` | CREATE | Drag-and-drop + browse; accepts .pdf .epub .txt |
| `src/renderer/features/file-loader/ChapterList.jsx` | CREATE | Chapter sidebar; click-to-jump |

### Renderer — Features: Export (Primary)

| File | Status | Owns |
|---|---|---|
| `src/renderer/features/export/ExportPanel.jsx` | CREATE | Export main UI: format, output path, start/cancel |
| `src/renderer/features/export/FormatSelector.jsx` | CREATE | WAV / MP3 / OGG with quality options |
| `src/renderer/features/export/ExportProgress.jsx` | CREATE | Per-chapter progress, ETA, output file size |

### Renderer — Features: Preview (Secondary)

| File | Status | Owns |
|---|---|---|
| `src/renderer/features/preview/PreviewPlayer.jsx` | CREATE | Play/pause/stop/skip; sentence highlighting; speed |
| `src/renderer/features/preview/ProgressBar.jsx` | CREATE | Playback position in chapter |
| `src/renderer/features/preview/AudioQueue.jsx` | CREATE | Web Audio API queue; receives PCM chunks from main via IPC |

### Renderer — Features: Settings

| File | Status | Owns |
|---|---|---|
| `src/renderer/features/settings/SettingsPanel.jsx` | CREATE | Rate, pitch, volume, speed presets, default format |
| `src/renderer/features/settings/AboutPanel.jsx` | CREATE | App version, model info, hardware summary |

### Renderer — Hooks & Store

| File | Status | Owns |
|---|---|---|
| `src/renderer/hooks/useTTS.js` | CREATE | IPC wrapper for preview TTS |
| `src/renderer/hooks/useExport.js` | CREATE | IPC wrapper for export job |
| `src/renderer/hooks/useFileLoader.js` | CREATE | IPC wrapper for file open and chapter read |
| `src/renderer/hooks/useHardware.js` | CREATE | IPC wrapper for hardware detection and voice banks |
| `src/renderer/store/ttsStore.js` | CREATE | Preview playback state (Zustand) |
| `src/renderer/store/exportStore.js` | CREATE | Export job state (Zustand) |
| `src/renderer/store/fileStore.js` | CREATE | Loaded file and chapter state (Zustand) |
| `src/renderer/store/settingsStore.js` | CREATE | Persisted user settings (Zustand + electron-store sync) |

### Config & Documentation

| File | Status | Owns |
|---|---|---|
| `package.json` | CREATE | npm scripts; all dependencies |
| `vite.config.js` | CREATE | Vite renderer build config |
| `tailwind.config.js` | CREATE | Tailwind theme and content paths |
| `postcss.config.js` | CREATE | PostCSS for Tailwind |
| `electron.config.js` | CREATE | Electron Forge/Builder: packaging, installer, ffmpeg binary inclusion |
| `.gitignore` | CREATE | Excludes models/, resources/ffmpeg/, dist/, node_modules/ |
| `README.md` | CREATE | Full setup guide |
| `models/README.md` | CREATE | Model placement and download links |

---

## Key Dependencies (npm)

| Package | Purpose |
|---|---|
| `electron` | Desktop app shell |
| `electron-forge` or `electron-builder` | Packaging and installer |
| `onnxruntime-node` | ONNX inference with CUDA/CPU execution provider |
| `pdf-parse` | PDF text extraction (Node.js) |
| `jszip` | EPUB/ZIP decompression (Node.js) |
| `iconv-lite` | Shift-JIS / UTF-8 encoding conversion |
| `chardet` | Encoding detection |
| `fluent-ffmpeg` | MP3 / OGG audio encoding via bundled ffmpeg |
| `electron-store` | Persistent settings JSON |
| `zustand` | Lightweight React global state |
| `react` + `react-dom` | UI framework |
| `vite` + `@vitejs/plugin-react` | Frontend build tooling |
| `tailwindcss` + `postcss` + `autoprefixer` | Utility-first CSS |
| `@piper-plus/g2p` | Phoneme extraction from OpenJTalk HTS labels; phoneme→ID encoding via config phoneme_id_map |
| `wasm_open_jtalk` (vendored) | WASM OpenJTalk binary for offline Japanese G2P (vendored+patched, not an npm dep) |
