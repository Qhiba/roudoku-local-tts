# Phase 1 — Electron Foundation, Model Loading & Basic TTS

TYPE: Feature

## Goal

This phase establishes the entire project skeleton and proves the core TTS pipeline end-to-end. By the end of Phase 1, a developer can launch the Electron app, point it at a local ONNX model file, select a hardware tier and voice bank, type any Japanese text, and hear it spoken via real-time preview. Everything built in later phases plugs into the infrastructure created here. Nothing else can be built until this phase is solid.

## Produces

| File | Action | What changes |
|---|---|---|
| `package.json` | CREATE | All npm dependencies declared; scripts for `dev` (Vite + Electron), `build` (Vite renderer build), `start` (launch Electron), `package` (Electron Builder) |
| `vite.config.js` | CREATE | Vite config for renderer process only; output dir points to `dist/renderer`; React plugin enabled |
| `tailwind.config.js` | CREATE | Tailwind content paths cover all `src/renderer/**/*.{jsx,js}`; base theme only in Phase 1 |
| `postcss.config.js` | CREATE | PostCSS config: tailwindcss + autoprefixer |
| `electron.config.js` | CREATE | Electron Builder config: appId, productName, Windows NSIS installer target; `extraResources` placeholder for ffmpeg (wired in Phase 3); `asar: true` |
| `src/main/index.js` | CREATE | Creates `BrowserWindow` (1280×800, frame, nodeIntegration off, contextIsolation on); loads renderer URL; registers IPC handlers from all `ipc/` modules; handles app lifecycle (ready, window-all-closed, activate) |
| `src/main/preload.js` | CREATE | Exposes `window.electronAPI` via `contextBridge`: `tts.*`, `model.*`, `file.*`, `export.*` namespaces; each method wraps `ipcRenderer.invoke` or `ipcRenderer.on`; also exposes `electronAPI.shell.openExternal(url)` which calls `shell.openExternal` from Electron's `shell` module — used to open Hugging Face model pages in the system browser |
| `src/main/ipc/tts-handlers.js` | CREATE | Registers: `tts:startPreview(text, speakerId, rate)` → starts chunked inference, streams PCM buffers back via `tts:pcm-chunk` event; `tts:stopPreview` → cancels active inference |
| `src/main/ipc/model-handlers.js` | CREATE | Registers: `model:loadModel(modelPath)` → loads ONNX session, returns success/error; `model:listVoiceBanks()` → returns speaker array from loaded model metadata; `model:detectHardware()` → returns `{ gpuName, vramMB, recommendedTier, cudaAvailable }` |
| `src/main/services/device-detector.js` | CREATE | Attempts to create a CUDA EP test session with onnxruntime-node; catches error for graceful CPU fallback; reads GPU name and VRAM from `cuda.deviceProperties` if available; maps VRAM: <4GB→CPU-only, 4GB→B, 6–12GB→A, 16GB+→C; returns structured result object |
| `src/main/services/model-manager.js` | CREATE | Defines tier registry as a constant object. Each tier has: `id`, `label`, `minVramMB`, `precision` (fp32/fp16), and `recommendedModels: Array<{ name, huggingFaceUrl, sizeLabel, vramLabel, onnxNative, notes }>`. The full list of recommended models per tier is sourced from `/informations/runs/25-05-2026/model_recommendation.md`. The **first** entry in each tier's `recommendedModels` array is treated as the default. Defaults: CPU-only → piper-plus Tsukuyomi-chan (`https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan`); Potato → Kokoro-82M (`https://huggingface.co/hexgrad/Kokoro-82M`); BIS → Kokoro-82M FP16 (`https://huggingface.co/hexgrad/Kokoro-82M`); Overpowered → Style-BERT-VITS2 large (`https://huggingface.co/litagin/style_bert_vits2`). Validates that a loaded model path exists and is a `.onnx` file. Tracks currently loaded model path and tier. |
| `src/main/services/text-chunker.js` | CREATE | `chunkText(text, maxTokens=256)`: splits on 。！？\n; if a chunk exceeds maxTokens, secondary split on 、; if still too long, hard-cuts at maxTokens with a warning flag; returns `Array<{ text, isForcedSplit }>` |
| `src/engine/tts-engine.js` | CREATE | `loadModel(modelPath, executionProvider)`: creates `ort.InferenceSession` with specified EP (cuda or cpu); `inferChunk(chunkText, speakerId, rate)`: runs model forward pass, returns Float32Array PCM at model's native sample rate; `dispose()`: releases session |
| `src/engine/voice-bank-loader.js` | CREATE | `loadVoiceBanks(modelDir)`: looks for `speakers.json` or `config.json` in the same directory as the ONNX file; parses speaker id→name map; returns `Array<{ id, name }>`; returns `[{ id: 0, name: 'Default' }]` if no metadata found |
| `src/renderer/index.html` | CREATE | Vite HTML entry; `<div id="root">`; references `main.jsx`; sets `lang="ja"` on `<html>` |
| `src/renderer/main.jsx` | CREATE | Mounts `<App />` into `#root`; imports `./styles/index.css` |
| `src/renderer/App.jsx` | CREATE | Layout shell: persistent top navigation bar; renders `ModelSetupView` if no model loaded, otherwise renders main two-column layout (left: chapter list placeholder, center: `PreviewPlayer`, right: `SettingsPanel`); reads model-loaded state from `settingsStore` |
| `src/renderer/styles/index.css` | CREATE | `@tailwind base; @tailwind components; @tailwind utilities;`; sets `body` background and default font via Tailwind config |
| `src/renderer/features/model-setup/ModelSetupView.jsx` | CREATE | Full-page first-time setup; three steps: (1) `HardwareStatus` shows detection result and tier recommendation; (2) `TierSelector` for tier choice — each card shows a "Download model" link; (3) browse to downloaded `.onnx` file via `electronAPI.model.loadModel`; (4) `VoiceBankPicker` for speaker; "Done" button writes to settingsStore and transitions to main view. When no model file is loaded yet, a prominent callout is shown above the browse button: "No model yet? Pick your tier above and click its Download link to get the model file from Hugging Face, then come back here to load it." |
| `src/renderer/features/model-setup/TierSelector.jsx` | CREATE | Renders four tier cards (CPU-only / Potato / BIS / Overpowered). Each card shows: label, GPU range, VRAM range, recommended badge (if it matches detected hardware), and a warning icon for tiers above detected VRAM. Below the tier label, each card contains a collapsible **"Recommended Models"** section listing all models from `model-manager` for that tier. Each model entry shows: model name, size, ONNX-native badge or ⚠️ conversion warning, and a **"Download ↗"** link button that calls `electronAPI.shell.openExternal(model.huggingFaceUrl)`. The first model in the list is labelled "Recommended". Selected card highlighted. Collapsible section is open by default on the recommended tier card, collapsed on others. |
| `src/renderer/features/model-setup/VoiceBankPicker.jsx` | CREATE | Dropdown populated from `useHardware().voiceBanks`; shows speaker name and id; selection written to `settingsStore.voiceBankId`; if only one voice bank, auto-selects and hides the dropdown |
| `src/renderer/features/model-setup/HardwareStatus.jsx` | CREATE | Displays: GPU name (or "No GPU detected"), detected VRAM, CUDA available yes/no, recommended tier badge; if CUDA unavailable shows warning: "Running on CPU — export will be slow" |
| `src/renderer/features/preview/PreviewPlayer.jsx` | CREATE | Text input `<textarea>` for Japanese test text; Play button calls `useTTS().startPreview(text)`; Pause/Stop buttons; speed selector (0.75× / 1× / 1.25× / 1.5× / 2×); sentence display area shows current chunk being spoken; placeholder for RTF display (wired in Phase 4) |
| `src/renderer/features/preview/AudioQueue.jsx` | CREATE | Non-rendering component; subscribes to `tts:pcm-chunk` IPC events via `useTTS`; feeds Float32Array PCM buffers into `AudioContext`; manages gapless playback by scheduling buffers ahead of current play position; exposes `play()`, `pause()`, `stop()` |
| `src/renderer/features/settings/SettingsPanel.jsx` | CREATE | Rate slider (0.5–2.0, step 0.05); pitch slider (0.5–2.0, step 0.05); volume slider (0–1); five speed preset buttons; all values from/to `settingsStore`; changes take effect on next preview chunk |
| `src/renderer/hooks/useTTS.js` | CREATE | `startPreview(text)`: calls `electronAPI.tts.startPreview`, subscribes to PCM chunk events, updates `ttsStore`; `stop()`: calls `electronAPI.tts.stopPreview`, clears queue; returns `{ status, currentChunk, startPreview, stop }` |
| `src/renderer/hooks/useHardware.js` | CREATE | On mount: calls `electronAPI.model.detectHardware()` and `electronAPI.model.listVoiceBanks()`; stores results in component state; returns `{ gpuName, vramMB, recommendedTier, cudaAvailable, voiceBanks, loadModel }` |
| `src/renderer/store/ttsStore.js` | CREATE | Zustand store: `{ status: 'idle'|'playing'|'paused'|'stopped', currentChunkText: '', queue: [] }`; actions: `setStatus`, `setCurrentChunk`, `enqueueChunk`, `clearQueue` |
| `src/renderer/store/settingsStore.js` | CREATE | Zustand store with `electron-store` persistence sync: `{ modelPath, tier, voiceBankId, rate, pitch, volume, speedMultiplier }`; initial values loaded from electron-store on app start; writes back to electron-store on every change |

## Reference Files Needed

None — this is the first phase. All scope files are sufficient.

> **Execute note:** Before writing `model-manager.js`, read `/informations/runs/25-05-2026/model_recommendation.md` to copy the correct model names, HuggingFace URLs, size labels, VRAM labels, and ONNX-native flags into the tier registry constant. Do not invent model entries.

## Comments to Use

```
// ADDED: Electron main process entry — creates BrowserWindow and registers all IPC handlers
// ADDED: contextBridge preload — exposes safe electronAPI to renderer without nodeIntegration
// ADDED: CUDA EP probe — attempts GPU session; falls back to CPU on any error; never throws to caller
// ADDED: tier registry — defines Potato/BIS/Overpowered VRAM thresholds and model candidates
// ADDED: Japanese sentence chunker — splits on 。！？\n with comma fallback and token-count hard cap
// ADDED: onnxruntime-node inference session — CUDA or CPU execution provider selected at load time
// ADDED: voice bank loader — reads speakers.json/config.json; returns [{id, name}] array
// ADDED: PCM streaming IPC — main sends Float32Array chunks; renderer AudioQueue schedules via AudioContext
// ADDED: settingsStore electron-store sync — all user prefs persisted to JSON on disk on every change
// ADDED: shell.openExternal via preload — opens Hugging Face tier URLs in system browser; not navigated inside Electron window
// ADDED: huggingFaceUrl per tier in model-manager — each tier registry entry carries the direct HF page URL for its recommended model
```

## Flags to Raise

- `PLAN GAP` — if the chosen ONNX model format does not match `onnxruntime-node`'s expected input schema, the inference call signature in `tts-engine.js` will need to be adapted. Flag which input/output tensor names differ from the plan's assumption.
- `AMBIGUOUS` — the exact ONNX model input schema (tensor names, shape, dtype) depends on which specific model is downloaded. The plan assumes a standard VITS/StyleBERT input: `text_ids` (int64), `speaker_id` (int64), output `audio` (float32). If different, state what was found and what was assumed.
- `AMBIGUOUS` — `electron-store` v9+ is ESM-only, which conflicts with Electron's CommonJS main process. If this conflict occurs, state that `electron-store` v8 (CommonJS-compatible) was used instead.

## Temporarily Inconsistent State

- On first launch, no model file exists — `ModelSetupView` must show the tier cards with download links as the primary action, and the browse/load button as the secondary action (after the user has downloaded a model). The setup view must never show a broken or empty state.
- `AudioQueue.jsx` requires a working `tts-engine.js` to receive chunks. If the model is not loaded, the Play button must be disabled.
- `ProgressBar.jsx` and `ChapterList.jsx` are not built until Phase 2 — the main layout has placeholder space for them in Phase 1.

## Handoff to Next Phase

Phase 2 requires:
- `tts-engine.js` is loaded and producing PCM output for any text input
- `text-chunker.js` is splitting Japanese text correctly
- `AudioQueue.jsx` is playing PCM chunks gaplessly
- `file-handlers.js` IPC channel is registered (stub is acceptable — full implementation in Phase 2)
- `App.jsx` layout shell has slots for `FileDropZone` and `ChapterList` (can be empty divs)

## Rollback Cost

LOW — no existing code exists; all files are new. Reverting means deleting the entire project directory.

## Acceptance Criteria

1. Running `npm run dev` launches the Electron window without errors.
2. The app opens to the Model Setup screen on first launch.
3. The user can browse to a `.onnx` model file and the app loads it without crashing.
4. The hardware detection panel shows the correct GPU name and VRAM (or "No GPU" if none present).
5. The tier cards display all four options (CPU-only / Potato / BIS / Overpowered) with VRAM labels; the detected hardware tier is highlighted.
6. Each tier card has a visible "Download model ↗" link. Clicking it opens the correct Hugging Face page in the system browser (not inside the Electron window).
7. When no model is loaded, a callout above the file browse button explains that the user should pick a tier, click its download link, then load the file.
8. The voice bank dropdown lists the speakers from the loaded model (or "Default" if no metadata).
9. The user can type Japanese text into the preview text area, press Play, and hear it spoken.
10. Play, Pause, and Stop controls work correctly.
11. Speed presets change the playback rate of the next chunk.
12. Settings (rate, pitch, volume) survive an app restart.
13. If no CUDA device is found, the app falls back to CPU without crashing and shows a clear warning.

## Verification

1. **App launches:** Double-click the app (or run `npm run dev`). A window titled with the app name appears. No error dialog.
2. **Model Setup screen:** On first launch, the screen shows the hardware status panel, four tier cards, a callout explaining how to download a model, and a file browse button — not a blank screen.
3. **Hardware detection:** The hardware panel shows your GPU name (e.g. "NVIDIA GeForce RTX 2060") and VRAM amount. One tier card has a "Recommended" badge.
4. **Download links:** Each tier card has a "Download model ↗" link. Click the link on the BIS tier card — your system browser opens to the correct Hugging Face page for that model. The Electron app window stays open and unchanged.
5. **No-model callout:** Before loading any model, a message above the browse button reads something like "No model loaded yet — pick your tier above and click Download to get the model file, then load it here."
6. **Load a model:** After downloading a model, click the file browse button. Navigate to the `.onnx` file. Click Open. The app shows "Model loaded" status without any error message appearing.
7. **Voice banks:** If your model has a `speakers.json`, the dropdown lists all speaker names. If not, it shows "Default".
8. **Preview playback:** Click "Done" on setup, then type `こんにちは、今日はいい天気ですね。` into the preview text box. Click Play. You hear Japanese speech within a few seconds (CPU) or under 1 second (GPU).
9. **Controls:** While speaking, click Pause — audio stops. Click Play again — audio resumes. Click Stop — audio ends and position resets.
10. **Speed:** Select "1.5×" from the speed buttons. Press Play again. Speech is noticeably faster.
11. **Settings persistence:** Change the volume slider to minimum. Close the app. Reopen it. The volume slider is still at minimum.
12. **CPU fallback (if no GPU):** If no NVIDIA GPU is present, the hardware panel shows "No GPU detected — Running on CPU" and playback still works (slower).
