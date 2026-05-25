# §3 Risks — Run 1 Feature (Updated)

---

## Risk 1 — onnxruntime-node CUDA Execution Provider requires exact CUDA version match

**What could go wrong:** `onnxruntime-node` ships with a specific CUDA runtime version baked in (e.g. CUDA 11.8 or 12.x). If the user's NVIDIA driver does not support that CUDA version, the CUDA EP will fail to initialize at runtime with a cryptic native error.

**Likelihood:** Medium. Many users have older drivers (CUDA 11.x) while newer onnxruntime builds target CUDA 12.x.

**What to watch for:**
- Document the exact CUDA version required for each `onnxruntime-node` release in `README.md`.
- `device-detector.js` must catch the CUDA EP initialization error gracefully and fall back to CPU EP — never crash.
- Surface a user-friendly message: "GPU acceleration unavailable — CUDA driver mismatch. Running on CPU. See README for driver requirements."
- Test on CUDA 11.8 and CUDA 12.x drivers during Phase 1.

---

## Risk 2 — Inference speed on CPU-only and Tier B (GTX 1660) may be too slow for usable preview

**What could go wrong:** On CPU-only or GTX 1660 hardware, inference may be slower than real-time (RTF > 1). Preview playback will stutter. Since export (not preview) is the primary feature, this is tolerable — but must be clearly communicated to the user.

**Likelihood:** Medium for CPU-only. Low-to-medium for GTX 1660 with CUDA EP.

**What to watch for:**
- Implement a sentence-ahead buffer: generate the next chunk while the current one is playing — hides latency for preview.
- Display RTF in `PreviewPlayer.jsx` so the user understands their hardware's speed.
- If RTF > 1.5× on Tier B (GTX 1660), surface a recommendation to drop to CPU-only preview and do a full export run instead (export does not need real-time speed).
- If RTF > 1.5× on CPU-only, recommend the user upgrade to a GPU tier.
- Remind users that **export does not require real-time speed** — even a 3× RTF export run is acceptable.

---

## Risk 3 — PDF text extraction quality from Japanese novels

**What could go wrong:** Japanese PDF novels — especially those scanned or generated from word processors — may have: (a) text rendered as images (no extractable text), (b) garbled character order due to vertical writing (`縦書き`), (c) inconsistent paragraph breaks.

**Likelihood:** High for scanned PDFs; Medium for typeset digital PDFs. Vertical writing is extremely common in Japanese novels.

**What to watch for:**
- `src/parsers/pdf-parser.js` must handle vertical text directionality — `pdf-parse` may get column order wrong for vertical layouts. Consider post-processing the extracted text to detect and correct common vertical-text artifacts.
- Clearly warn the user if a page appears to contain no extractable text (image-based PDF).
- Do not attempt OCR in this run — it is out of scope. Document this limitation in `README.md`.
- Recommend EPUB format to users when possible, as EPUB text is always machine-readable.

---

## Risk 4 — EPUB format variants and DRM

**What could go wrong:** EPUBs from commercial sources often have DRM (Digital Rights Management) encryption that prevents reading the internal HTML files. `epub-parser.js` would see an encrypted payload and fail to extract any text.

**Likelihood:** High for purchased ebooks; Low for DRM-free sources (青空文庫, Project Gutenberg).

**What to watch for:**
- Detect DRM-encrypted EPUBs early (check for `encryption.xml` in the ZIP) and show a clear error message rather than silently failing.
- Document in `README.md` that only DRM-free EPUBs are supported — this is a legal and technical constraint, not a bug.
- Do not implement DRM removal — it is out of scope and legally problematic.

---

## Risk 5 — Japanese TTS model token / character limits

**What could go wrong:** Neural TTS models have a maximum input length (typically 150–512 tokens). A single Japanese sentence can be very long (especially in novels with elaborate descriptions). Sending an oversized chunk to the model will cause an error or garbled output.

**Likelihood:** Medium. Long sentences are common in literary Japanese.

**What to watch for:**
- `src/main/services/text-chunker.js` must enforce a hard token-count limit per chunk (not just character count — Japanese characters map to multiple tokens in most tokenizers).
- Implement a secondary split on commas (、) and conjunctions if a sentence exceeds the limit.
- Log a warning when a chunk is forcibly split mid-sentence so the user can inspect the output.

---

## Risk 6 — VRAM ceiling for Tier C (RTX 3080 10GB variants)

**What could go wrong:** The Overpowered (Tier C) model targets 16GB+ VRAM. If a user selects Tier C on a card with less VRAM (e.g. RTX 3080 10GB variant), the model may OOM (out-of-memory) crash or fail to load silently.

**Likelihood:** Medium. There are 8GB, 10GB, and 16GB+ variants within the RTX 3080/4080 family.

**What to watch for:**
- `device-detector.js` must query CUDA device VRAM via `onnxruntime-node` and surface the detected VRAM in the UI.
- Display an explicit VRAM requirement label in `TierSelector.jsx`: **"Requires 16GB+ VRAM (RTX 3080 16GB / 4080 / 4090 or equivalent)"**.
- If the model fails to load due to OOM, catch the error and prompt the user to switch to Tier A (BIS).
- Document in `README.md` that 10GB GPU variants may not be sufficient for all Tier C models.

---

## Risk 7 — GTX 1660 CUDA support is present but limited (no Tensor Cores)

**What could go wrong:** The GTX 1660 (Turing, no Tensor Cores) has CUDA support but no hardware-accelerated FP16 (half-precision) inference. Some ONNX TTS models are optimized for FP16 on Tensor Core GPUs (RTX 20xx+). Running FP16 models on GTX 1660 falls back to FP32 emulation — significantly slower.

**Likelihood:** Medium. Depends on the exact ONNX model's precision requirements.

**What to watch for:**
- Tier B model must be validated in FP32 precision on GTX 1660 to confirm acceptable speed.
- `model-manager.js` should track the precision of each model and warn if a FP16-optimized model is selected on Tier B hardware.
- If inference is too slow on GTX 1660 with FP32, recommend the user switch to the CPU-only fallback for preview and use export mode (which is not time-constrained).

---

## Risk 8 — Shift-JIS encoded TXT files from older Japanese novel archives

**What could go wrong:** Japanese `.txt` files from older sources (especially 青空文庫 raw downloads) may be encoded in Shift-JIS or EUC-JP rather than UTF-8. `fs.readFileSync` with `utf8` encoding will produce garbled text.

**Likelihood:** Medium. Modern distributions are UTF-8 but classic archives are often Shift-JIS.

**What to watch for:**
- `src/parsers/txt-parser.js` must use `chardet` to detect encoding before reading and `iconv-lite` to transcode to UTF-8.
- Provide an encoding override dropdown in the file loader UI for cases where auto-detection fails.

---

## Risk 9 — ffmpeg binary not found or antivirus flags it

**What could go wrong:** The bundled `ffmpeg.exe` inside the Electron app may be flagged by Windows Defender or third-party antivirus as a suspicious executable, preventing MP3/OGG export.

**Likelihood:** Low-to-medium. ffmpeg is a well-known binary but is sometimes heuristically flagged.

**What to watch for:**
- Use a reputable, signed ffmpeg build (e.g. from `@ffmpeg-installer/ffmpeg` or the official gyan.dev Windows build).
- Document in `README.md` that the ffmpeg binary is used for audio encoding and may require an antivirus exception.
- If ffmpeg fails to execute, catch the error and fall back to WAV-only export with a clear message: "MP3/OGG encoding unavailable. Exporting as WAV."

---

## Risk 10 — Electron app size may be large for first-time install

**What could go wrong:** Electron bundles Chromium + Node.js + the app itself. The installer may be 150–300MB before model files are added. Users on limited storage may struggle.

**Likelihood:** Low. This is a known Electron trade-off, not a bug.

**What to watch for:**
- Use `electron-builder` with compression enabled to minimize installer size.
- Document clearly in `README.md` that the app itself is ~200MB and models add 1–10GB depending on tier.
- Separate the model download from the app install — models are never bundled in the installer.
