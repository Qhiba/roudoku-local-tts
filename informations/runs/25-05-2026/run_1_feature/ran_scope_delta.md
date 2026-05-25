# §1 Delta — Run 1 Feature (Updated)

## What this project is

A fully offline **desktop application** that converts Japanese novels into natural, human-like narrated audio using a locally-downloaded AI voice model. The user installs the app, downloads a voice model once, loads a PDF or EPUB novel, selects their voice bank and hardware tier, and exports the result to an audio file (WAV / MP3 / OGG). Real-time preview playback is available as a secondary feature to verify the model sounds correct before a full export run.

---

## Platform Decision: Electron (not a browser app)

A pure browser app was considered and rejected for the following reasons:

| Factor | Pure Browser | Electron (chosen) |
|---|---|---|
| GPU acceleration | WebGPU only (~50% of CUDA speed) | Native CUDA via `onnxruntime-node` |
| File system access | Sandboxed, clunky (File System Access API) | Full Node.js `fs` — read any path |
| Model loading | `fetch()` from `file://` — blocked by browser security | Direct `fs.readFileSync` — no restriction |
| Audio encoding | Manual WAV only (no MP3/OGG in browser) | `ffmpeg` / `fluent-ffmpeg` — all formats |
| Distribution | User must serve files manually | Single installer `.exe` — double-click to run |
| UI | React + Vite + Tailwind ✅ | React + Vite + Tailwind ✅ (same) |

**Electron is the correct platform.** It gives the user a native desktop app experience with the same Vite + React + Tailwind frontend, while the Electron main process handles TTS inference with real CUDA support, full file system access, and proper audio encoding.

---

## What it does for the user

1. User installs the app (standard Windows installer `.exe`).
2. On first use: they download a voice model from Hugging Face (one-time setup) and place it in the `models/` folder inside the app data directory.
3. They open the app — it auto-detects their GPU and recommends the appropriate hardware tier.
4. They load a PDF or EPUB Japanese novel via drag-and-drop or file picker.
5. They pick a **Japanese voice bank** (speaker) from the voices available in their loaded model.
6. They configure export settings (format: WAV / MP3 / OGG, quality, output path).
7. They click **Export** — the app runs TTS inference on the full novel and saves the audio file.
8. Optionally, they use **Preview** (real-time playback) to hear a passage and confirm the voice sounds correct before committing to a full export run.

---

## What it explicitly does NOT do

- Makes no internet requests at runtime. The model download from Hugging Face is a one-time setup step.
- Does not translate, summarise, or modify the text in any way.
- Does not support languages other than Japanese in this run.
- Does not use the browser's built-in Web Speech API (`window.speechSynthesis`).
- Real-time playback is **not** the primary workflow — it is a preview/check feature only.

---

## Who uses it and how

A passive Japanese listener — someone who can understand spoken Japanese by ear but finds it hard to read kanji-heavy Japanese novel text. Their hardware ranges from a CPU-only machine up to a high-end gaming desktop. The app must serve all of them without requiring them to know what VRAM is. They are not developers; the setup guide must be clear enough for a non-technical user. They install it like any Windows program.

---

## Stack and format decisions

### Application Shell
**Electron** — wraps the Vite + React frontend in a native desktop window. The Electron main process runs in Node.js and handles all heavy work (TTS inference, file I/O, audio encoding). The renderer process is the React UI, isolated from the main process via IPC.

### Frontend (Renderer Process)
**Vite + React + Tailwind CSS** — modern, fast build tooling. Tailwind provides utility-first styling. React handles all UI state. Communication with the main process happens via Electron IPC (preload script exposes a safe API).

### TTS Engine (Main Process)
**`onnxruntime-node`** — the Node.js native binding for ONNX Runtime. Runs inference in the Electron main process with full access to the **CUDA Execution Provider** (GPU) or CPU Execution Provider (CPU fallback). This gives true CUDA acceleration for all GPU tiers without any browser API limitation.

Models are pre-converted to ONNX format, downloaded once from Hugging Face, and loaded directly from the file system.

### Japanese Voice Banks
Each TTS model may contain multiple **speaker embeddings** (voice banks). The user can select which voice bank to use from a list populated dynamically when a model is loaded. Voice bank names are read from the model's metadata (e.g. `config.json` or `speakers.json` bundled with the ONNX model). The selection is persisted per model in the app's settings store.

### Hardware Tiers

There are three named tiers plus a CPU-only fallback sub-tier for machines with no discrete GPU.

| Level | Label | GPU Range | VRAM Range | CPU-only? | Model candidate |
|---|---|---|---|---|---|
| Sub-tier | **CPU-only** | None | System RAM | Yes (only mode) | Piper-ja tiny (ONNX) |
| **B** | **Potato** | GTX 1660 | 4GB VRAM | No (too slow) | VITS small / Piper-ja (ONNX) |
| **A** | **BIS (Balanced)** | RTX 2060 · RTX 3060 8GB · RTX 3060 12GB | 6GB – 12GB VRAM | No | Style-BERT-VITS2 (small) / Kokoro-82M (ONNX) |
| **C** | **Overpowered** | RTX 3080 16GB / 4080 / 4090 | 16GB+ VRAM | No | Style-BERT-VITS2 (large) / XTTS-v2 fine-tuned |

> **CPU-only** is a functional fallback — inference will be slow (3–5× real-time). A clear warning is shown.
> **Tier B (Potato)** — GTX 1660 4GB. Entry GPU. Acceptable quality, usable speed on budget gaming hardware.
> **Tier A (BIS)** — RTX 2060 (6GB) · RTX 3060 (8GB) · RTX 3060 (12GB). The recommended default. Best quality-to-performance ratio across the most common mid-range cards.
> **Tier C (Overpowered)** — RTX 3080 16GB / 4080 / 4090. Highest quality models. Only offered when CUDA device probe confirms 16GB+ VRAM.

### Compute Selection
- **CPU path:** `onnxruntime-node` CPU Execution Provider. Works on all machines. Used for CPU-only sub-tier and as automatic fallback if no CUDA device is found.
- **GPU path:** `onnxruntime-node` CUDA Execution Provider. Requires an NVIDIA GPU with a compatible CUDA driver. Full CUDA acceleration — not limited to WebGPU.
- The app probes for CUDA devices on startup using `onnxruntime-node`. It maps detected VRAM to the correct tier: `<4GB` → CPU-only warning; `4GB` → Tier B; `6–12GB` → Tier A; `16GB+` → Tier C.

### Input Formats
- **Primary:** PDF (`.pdf`) and EPUB (`.epub`).
- **Fallback:** Plain text (`.txt`).
- PDF parsing: `pdf-parse` (Node.js library, runs in main process).
- EPUB parsing: `epub2` or `JSZip` + custom XHTML reader (runs in main process).
- Encoding detection: `chardet` or `iconv-lite` for Shift-JIS / UTF-8 detection.

### Audio Output — Primary Feature
Export is the **primary workflow**. The TTS engine outputs raw PCM buffers. These are encoded to the user's chosen format and saved to disk:

| Format | Encoder | Notes |
|---|---|---|
| WAV | Native PCM header construction | Lossless, always available |
| MP3 | `fluent-ffmpeg` + bundled `ffmpeg` binary | Lossy, smallest file size |
| OGG | `fluent-ffmpeg` + bundled `ffmpeg` binary | Lossy, open format |

`ffmpeg` is bundled inside the Electron app — no separate install required.

### Audio Output — Preview (Secondary Feature)
Real-time playback uses Electron's renderer process Web Audio API (`AudioContext`). PCM chunks from the main process are sent via IPC to the renderer and queued for gapless playback. This is used to **verify the voice sounds correct** before committing to a full export run. It is not intended for full novel listening sessions.

### Persistence
Electron `electron-store` (JSON file in app data directory) for user preferences: selected tier, CUDA/CPU choice, last voice bank per model, rate, pitch, output format, last output path, last opened file.

---

## Definition of done

- User installs the app and it opens without errors.
- User loads a ONNX model file and the app lists available Japanese voice banks from that model.
- User loads a PDF or EPUB Japanese novel and the app extracts its text correctly.
- All three named tiers (Potato / BIS / Overpowered) plus CPU-only fallback are available, labeled with GPU and VRAM requirements.
- The app auto-detects CUDA devices on startup and recommends the appropriate tier.
- User can export the full novel (or a chapter) to WAV, MP3, or OGG.
- User can use real-time preview to hear any passage before exporting.
- Everything works fully offline after the one-time model download and app install.
