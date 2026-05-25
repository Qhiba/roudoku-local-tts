### Phase 1 — Execute Report

TYPE: Feature

**Files Written:**
| File | Action | Summary |
|---|---|---|
| package.json | CREATE | Declares scripts and npm dependencies (electron, onnxruntime-node, zustand, tailwind). |
| vite.config.js | CREATE | Sets up Vite to build the React renderer process into the correct distribution path. |
| tailwind.config.js | CREATE | Tailors Tailwind styles with Outfit/Inter/Noto Jp typography and dark theme. |
| postcss.config.js | CREATE | Configures PostCSS to compile Tailwind CSS and apply prefix autoprefixing. |
| electron.config.js | CREATE | Configures Electron Builder packaging metrics and extra resources templates. |
| src/main/index.js | CREATE | Establishes the main Electron process BrowserWindow lifecycle, shell helpers, and settings sync. |
| src/main/preload.js | CREATE | Exposes safe IPC wrappers to the React frontend in context isolation mode. |
| src/main/ipc/tts-handlers.js | CREATE | Handlers for chunking text, launching inference, and streaming PCM buffers. |
| src/main/ipc/model-handlers.js | CREATE | Routes hardware scanning, model loading, speaker lists, and native file selections. |
| src/main/ipc/file-handlers.js | CREATE | Stub handler registered for novel file reading, to be implemented in Phase 2. |
| src/main/services/device-detector.js | CREATE | Probes available GPU hardware and VRAM sizes on Windows via PowerShell. |
| src/main/services/model-manager.js | CREATE | Parses model_recommendation.md dynamically on boot; falls back to static list. |
| src/main/services/text-chunker.js | CREATE | Partitions long Japanese sentences on punctuation markers with length limits. |
| src/engine/tts-engine.js | CREATE | Core ONNX session wrapper performing text-to-speech inference, dynamically mapping VITS/VITS2/Kokoro. |
| src/engine/voice-bank-loader.js | CREATE | Reads speakers/config JSON next to ONNX weights to populate voice bank IDs. |
| src/renderer/index.html | CREATE | Scaffolds Vite HTML template setting Japanese language metadata, CSP restrictions, and Web fonts. |
| src/renderer/main.jsx | CREATE | Mounts the React component tree into the index HTML document. |
| src/renderer/App.jsx | CREATE | Establishes the visual grid layout shell, sidebar space, and conditional views. |
| src/renderer/styles/index.css | CREATE | Imports Tailwind components and styles sleek, customized dark scrollbars. |
| src/renderer/store/ttsStore.js | CREATE | Zustand store for the preview player's playback state and PCM buffer queue. |
| src/renderer/store/settingsStore.js | CREATE | Zustand store syncing active speech parameters (pitch, volume, speed) to disk. |
| src/renderer/hooks/useTTS.js | CREATE | Coordinates preview synthesis start, stop, and incoming IPC PCM subscriptions. |
| src/renderer/hooks/useHardware.js | CREATE | Manages hardware tier status checks, model loads, and speaker configurations. |
| src/renderer/features/model-setup/ModelSetupView.jsx | CREATE | Setup wizard guiding users through GPU diagnostics, downloads, and load triggers. |
| src/renderer/features/model-setup/TierSelector.jsx | CREATE | Cards displaying hardware specs, default model targets, and VRAM mismatch warnings. |
| src/renderer/features/model-setup/VoiceBankPicker.jsx | CREATE | Multi-speaker dropdown menu, hidden if only a single default speaker exists. |
| src/renderer/features/model-setup/HardwareStatus.jsx | CREATE | Dashboard displaying GPU brand, VRAM size, and CPU fallback notifications. |
| src/renderer/features/preview/PreviewPlayer.jsx | CREATE | Main area containing textareas, playback triggers, speed presets, and subtitles. |
| src/renderer/features/preview/AudioQueue.jsx | CREATE | Schedules and buffers Float32Array PCM chunks gaplessly using the Web Audio API. |
| src/renderer/features/settings/SettingsPanel.jsx | CREATE | Precise controls for speech speed rate, audio volume, and synthesiser pitch. |

**Flags Raised:**
- Type: AMBIGUOUS
  Where: src/engine/tts-engine.js (inference inputs)
  What: The exact tokenization, shape, and tensor input names depend on the model. The engine was designed as an adaptive key mapper to dynamically satisfy varying inputs.
- Type: AMBIGUOUS
  Where: src/renderer/store/settingsStore.js and src/main/preload.js
  What: Persisting user configurations across restarts required exposing `electron-store` settings read/write methods securely inside `preload.js` and the main process.
- Type: CONFLICT
  Where: src/main/services/device-detector.js (GPU/VRAM extraction)
  What: Windows 11 disables `wmic` by default. Replaced with native PowerShell `Get-CimInstance` to ensure robust GPU/VRAM query.
- Type: CONFLICT
  Where: src/main/preload.js (shell openExternal)
  What: Exposing `shell` directly in preload causes uncaught errors under sandboxing. Moved to a main process IPC handler `shell:openExternal`.
- Type: CONFLICT
  Where: src/main/services/model-manager.js (model recommendations)
  What: Hardcoded model recommendations do not sync with edits to `model_recommendation.md`. Added a runtime markdown parser on boot to fetch current recommendation tables dynamically.

**Migration Executed:**
None.
