# Phase 4 — Polish, Hardening & Documentation

TYPE: Feature

## Goal

This phase hardens every risk identified in the scope, adds the sentence-ahead buffer to make preview usable on slower hardware, implements RTF display and tier downgrade recommendations, adds keyboard shortcuts, completes the About panel, and produces all documentation so a non-technical user can set up the app from scratch. By the end of Phase 4, the app is production-ready: it handles all known edge cases gracefully, communicates errors clearly, and ships with complete user-facing documentation. No new features are introduced — everything in this phase either reinforces or polishes what exists.

## Produces

| File | Action | What changes |
|---|---|---|
| `src/engine/tts-engine.js` | MODIFY | Adds sentence-ahead buffer: begins inferring chunk N+1 while chunk N is playing; uses a two-slot PCM buffer (`current`, `next`); `inferChunk` is called speculatively after each chunk starts playing; if playback catches up to inference, plays silence for one chunk length rather than stuttering |
| `src/renderer/features/preview/PreviewPlayer.jsx` | MODIFY | Adds RTF display: shows real-time factor calculated as `inferenceMs / audioDurationMs` (e.g. "RTF: 0.8×" = faster than real-time, "RTF: 2.3×" = slower); if RTF > 1.5× for three consecutive chunks, shows a yellow advisory banner: "This model is running slower than real-time on your hardware. Consider switching to a lighter tier or using Export mode." |
| `src/renderer/features/settings/AboutPanel.jsx` | CREATE | Shows: app name and version (from `package.json`); currently loaded model path and tier; detected GPU name and VRAM; CUDA available yes/no; onnxruntime-node version; a link to `README.md` opened via `shell.openExternal` |
| `src/renderer/App.jsx` | MODIFY | Registers keyboard shortcuts via `useEffect` + `window.addEventListener('keydown')`: Space = play/pause preview (if no export running), Escape = stop preview, E = focus export panel, S = open settings panel; all shortcuts no-op if a text input is focused |
| `src/main/services/model-manager.js` | MODIFY | Adds `precision` field to each model tier registry entry (fp32 / fp16); adds warning: if a FP16-optimised model is loaded on Tier B (GTX 1660), emits a `model:precision-warning` IPC event with message: "This model is optimised for FP16 GPUs. Performance on GTX 1660 may be reduced." |
| `src/main/services/audio-encoder.js` | MODIFY | Wraps ffmpeg spawn in a try-catch with explicit error codes; on `ENOENT` (binary not found), falls back to WAV; on `EACCES` (antivirus block), emits a specific error message: "ffmpeg was blocked by security software. Try adding an exclusion for the app folder, or export as WAV." |
| `src/parsers/pdf-parser.js` | MODIFY | Improves vertical-text handling: detects columns by comparing x-coordinates of text items; reorders items top-to-bottom within each column before joining; adds configurable `maxBlankPages` threshold before warning user |
| `src/parsers/epub-parser.js` | MODIFY | Adds EPUB3 `nav.xhtml` support alongside EPUB2 `toc.ncx`; tries nav.xhtml first, falls back to toc.ncx |
| `src/parsers/txt-parser.js` | MODIFY | Adds encoding override: if `fileStore.encodingOverride` is set, uses that encoding instead of chardet detection; the encoding override dropdown in `FileDropZone` writes to `fileStore.encodingOverride` |
| `src/renderer/features/file-loader/FileDropZone.jsx` | MODIFY | Adds encoding override dropdown (hidden by default; shown as "⚙ Encoding" link): options UTF-8, Shift-JIS, EUC-JP; visible only after a file is loaded; changing encoding re-parses the current file |
| `README.md` | CREATE | Sections: (1) What this app does; (2) System requirements (Windows 10+, NVIDIA GPU optional, CUDA driver links per version); (3) Installation (download installer, double-click); (4) Model download guide with Hugging Face links for each tier (Potato/BIS/Overpowered); (5) Where to place model files (`models/` folder path); (6) How to set up ffmpeg for MP3/OGG export (download link, placement path); (7) Voice bank setup; (8) VRAM table; (9) FAQ: DRM error / scanned PDF / garbled text / slow export / GPU not detected |
| `models/README.md` | CREATE | Exact folder structure expected; filename conventions per tier; download links for each recommended model; note that model files are not included in the app and must be downloaded separately |
| `.gitignore` | CREATE | Excludes: `models/`, `resources/ffmpeg/`, `dist/`, `node_modules/`, `*.onnx`, `*.bin`, `*.exe` (in resources only) |

## Reference Files Needed

- `src/engine/tts-engine.js` — must be read before modifying to understand current PCM output flow and where to insert the look-ahead buffer
- `src/renderer/features/preview/PreviewPlayer.jsx` — must be read before modifying to understand current chunk tracking and where to add RTF display
- `src/renderer/App.jsx` — must be read before modifying to understand current event handler registration
- `src/main/services/model-manager.js` — must be read before modifying to understand current tier registry structure
- `src/main/services/audio-encoder.js` — must be read before modifying to understand current ffmpeg spawn call
- `src/parsers/pdf-parser.js`, `epub-parser.js`, `txt-parser.js` — must be read before modifying
- `src/renderer/features/file-loader/FileDropZone.jsx` — must be read before modifying

## Comments to Use

```
// MODIFIED: tts-engine — adds two-slot look-ahead buffer; chunk N+1 begins inference while chunk N plays
// MODIFIED: PreviewPlayer — RTF display; advisory banner when RTF > 1.5× for 3+ consecutive chunks
// ADDED: AboutPanel — app version, model info, hardware summary, link to README
// MODIFIED: App.jsx — keyboard shortcuts: Space/Escape/E/S; no-op when text input focused
// MODIFIED: model-manager — precision field per tier; FP16-on-Tier-B warning event
// MODIFIED: audio-encoder — ENOENT→WAV fallback; EACCES→antivirus-specific error message
// MODIFIED: pdf-parser — x-coordinate column detection for vertical text reordering
// MODIFIED: epub-parser — EPUB3 nav.xhtml support alongside EPUB2 toc.ncx fallback
// MODIFIED: txt-parser — encoding override from fileStore.encodingOverride
// MODIFIED: FileDropZone — encoding override dropdown; re-parses on change
```

## Flags to Raise

- `PLAN GAP` — if the two-slot look-ahead buffer in `tts-engine.js` requires a significant architectural change to the inference pipeline (e.g. because inference is synchronous and blocks the IPC thread), flag this. A worker thread or separate Node.js child process may be needed.
- `AMBIGUOUS` — RTF calculation requires knowing the audio duration of each chunk before it finishes playing. If the model's sample rate is not accessible from outside `tts-engine.js`, state what was assumed.
- `PLAN GAP` — keyboard shortcuts using `window.addEventListener` in the renderer may conflict with Electron's built-in `globalShortcut` if those are registered in Phase 1 `index.js`. Check and resolve the conflict; flag which approach was used.

## Temporarily Inconsistent State

None — this phase only modifies existing files and adds documentation. All modifications are additive (new code paths, not replacements of existing ones). Each modification can be completed and tested independently.

## Handoff to Next Phase

Final phase — no handoff needed.

## Rollback Cost

LOW — all changes in this phase are additive modifications to existing files plus new documentation files. Reverting means removing the new files and undoing the targeted changes to the modified files. No structural changes.

## Acceptance Criteria

1. Preview playback on CPU-only hardware no longer stutters between sentences (the look-ahead buffer fills the gap).
2. The RTF display shows a number during playback (e.g. "RTF: 1.2×").
3. If playback runs at RTF > 1.5× for three or more sentences in a row, a yellow advisory appears recommending a lighter tier or export mode.
4. The About panel shows the correct app version, GPU name, VRAM, and loaded model path.
5. Space bar plays/pauses the preview when no text field is focused.
6. Escape stops the preview.
7. E key opens/focuses the export panel.
8. S key opens/focuses the settings panel.
9. If a FP16-optimised model is loaded on Tier B hardware, a warning is shown.
10. If ffmpeg is blocked by antivirus, the error message specifically mentions antivirus — not a generic error.
11. Vertical-text Japanese PDFs are extracted with correct top-to-bottom reading order (not garbled columns).
12. EPUB3 nav.xhtml chapter titles are detected correctly.
13. The encoding override dropdown appears after loading a TXT file; switching to Shift-JIS re-parses correctly.
14. The README opens from the About panel and contains all seven documented sections.
15. All three GPU tiers (plus CPU-only) have been end-to-end tested: a full chapter exported to WAV, MP3, and OGG on at least the CPU path.

## Verification

1. **Look-ahead buffer:** On a CPU-only machine (or with a large model), play a chapter via preview. Sentences should transition without a noticeable gap (less than 0.5 seconds of silence between sentences).
2. **RTF display:** During any preview playback, check the player panel. A label like "RTF: 0.9×" or "RTF: 3.1×" is visible and updates each sentence.
3. **RTF advisory:** If using a slow model (CPU-only with a large model), play several sentences. After 3+ slow sentences, a yellow banner appears with advice. Switch to a lighter model — the banner disappears.
4. **About panel:** Open Settings → About. The panel shows the app version number, your GPU (or "No GPU"), VRAM, and the path to the loaded model file.
5. **Keyboard shortcuts:** Click somewhere on the app background (not in a text field). Press Space — preview plays/pauses. Press Escape — preview stops. Press E — the export panel comes into focus. Press S — the settings panel opens. Click into the preview text field — pressing Space now types a space character (not play/pause).
6. **FP16 warning:** If you have a Tier B model marked as FP16, load it while on Tier B. A warning message appears in the model setup panel.
7. **Antivirus ffmpeg message:** Temporarily block ffmpeg.exe in Windows Defender. Attempt MP3 export. The error message mentions "security software" specifically, not just "export failed".
8. **Vertical PDF test:** Find a Japanese PDF with vertical (`縦書き`) text layout. Load it. Read the extracted text in the preview area — it should flow correctly from top to bottom, right to left column, not appear as a scrambled mix of characters.
9. **EPUB3 chapters:** Load an EPUB3 file (one with `nav.xhtml`). Confirm chapter titles appear in the chapter list.
10. **Encoding override:** Load a Shift-JIS `.txt` file. If the text appears garbled, find the encoding dropdown ("⚙ Encoding"), switch to "Shift-JIS". The text immediately re-displays correctly.
11. **Full end-to-end export:** Load a full novel chapter (at least 2000 characters). Export to WAV. Open the output file in any media player — a complete audio file plays without interruption, covering all text in the chapter.
