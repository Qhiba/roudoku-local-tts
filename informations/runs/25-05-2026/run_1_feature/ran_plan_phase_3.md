# Phase 3 — Audio Export (Primary Feature)

TYPE: Feature

## Goal

This phase implements the primary user workflow: exporting a full novel chapter (or the entire book) to an audio file on disk. The TTS engine runs inference over all text chunks, collects the PCM output, and encodes it to WAV, MP3, or OGG using the bundled ffmpeg binary. A dedicated export UI shows per-chapter progress, estimated time remaining, and the output file size. Export does not require real-time speed — even a 3× RTF run produces a complete audio file. After this phase, the app fulfils its core promise: a Japanese novel goes in, an audio file comes out.

## Produces

| File | Action | What changes |
|---|---|---|
| `src/main/services/audio-encoder.js` | CREATE | `encodeWAV(pcmBuffer, sampleRate)`: constructs WAV file header (RIFF, 44-byte standard), concatenates header + PCM data, returns `Buffer`; `encodeToFile(pcmBuffers, format, quality, outputPath)`: for WAV writes buffer directly; for MP3/OGG spawns ffmpeg via `fluent-ffmpeg` using a PCM pipe input at the correct sample rate, writes to `outputPath`; resolves with `{ outputPath, fileSizeBytes }` on success; rejects on ffmpeg error |
| `src/main/ipc/export-handlers.js` | CREATE | Registers: `export:start({ chapterIndices, format, quality, outputDir })` → iterates chapters, runs `tts-engine.inferChunk` on all chunks, collects PCM, calls `audio-encoder.encodeToFile`, emits `export:chapter-progress` events with `{ chapterIndex, chunksCompleted, totalChunks, elapsedMs }` after each chapter; `export:cancel` → sets cancellation flag, stops inference loop after current chunk; `export:openOutputFolder(path)` → calls `shell.openPath(outputDir)` |
| `src/renderer/features/export/ExportPanel.jsx` | CREATE | Main export control panel; shows: scope selector ("Current chapter" / "Full book"); `FormatSelector`; output path display with "Change" button (calls `electronAPI.file.openDialog` in directory mode); "Export" button (disabled if no file loaded or no model loaded); calls `useExport().startExport()`; renders `ExportProgress` when export is running |
| `src/renderer/features/export/FormatSelector.jsx` | CREATE | Three radio buttons: WAV (Lossless), MP3 (Compressed), OGG (Open format); MP3 shows quality sub-options: 128kbps / 192kbps / 320kbps; OGG shows quality 0–10 slider; WAV has no sub-options; selection written to `exportStore.format` and `exportStore.quality` |
| `src/renderer/features/export/ExportProgress.jsx` | CREATE | Shows: overall progress bar (chapters done / total chapters); current chapter name; chunks progress within current chapter ("Chunk 14 / 52"); elapsed time; estimated time remaining (calculated from elapsed / completed chunks × remaining chunks); output file size so far (updated per chapter); "Cancel" button calls `useExport().cancel()`; "Open output folder" button (shown on completion) calls `electronAPI.export.openOutputFolder` |
| `src/renderer/hooks/useExport.js` | CREATE | `startExport(params)`: calls `electronAPI.export.start(params)`, subscribes to `export:chapter-progress` events, updates `exportStore`; `cancel()`: calls `electronAPI.export.cancel()`; returns `{ status, progress, startExport, cancel }` |
| `src/renderer/store/exportStore.js` | CREATE | Zustand store: `{ status: 'idle'|'running'|'cancelled'|'done'|'error', format: 'wav', quality: '192k', outputDir: '', progress: { currentChapter, chunksCompleted, totalChunks, elapsedMs }, error: null }`; actions: `setStatus`, `setFormat`, `setQuality`, `setOutputDir`, `setProgress`, `setError` |
| `resources/ffmpeg/ffmpeg.exe` | CREATE | Downloaded ffmpeg Windows binary (gyan.dev full build or @ffmpeg-installer/ffmpeg); placed in `resources/ffmpeg/`; not committed to git (listed in `.gitignore`); `README.md` instructs how to download and place it |
| `electron.config.js` | MODIFY | Adds `extraResources: [{ from: 'resources/ffmpeg/', to: 'ffmpeg/' }]` so ffmpeg binary is included in packaged app; adds `asarUnpack: ['**/ffmpeg/**']` so the binary is accessible outside asar |
| `src/renderer/store/settingsStore.js` | MODIFY | Adds `defaultFormat: 'wav'`, `defaultQuality: '192k'`, `defaultOutputDir: ''`; these initialise `exportStore` defaults on app start |

## Reference Files Needed

- `src/engine/tts-engine.js` — must be read to understand `inferChunk` return type (Float32Array, sample rate) before writing `audio-encoder.js`
- `src/main/services/text-chunker.js` — must be read to understand chunk array structure before writing the export loop in `export-handlers.js`
- `src/main/ipc/file-handlers.js` — must be read to understand how `getChapterText(index)` returns text before writing the chapter iteration in `export-handlers.js`
- `electron.config.js` — must be read before modifying to understand current structure
- `src/renderer/store/settingsStore.js` — must be read before modifying

## Comments to Use

```
// ADDED: WAV encoder — 44-byte RIFF header construction; direct PCM concatenation; no external dependency
// ADDED: ffmpeg pipe encoder — spawns bundled ffmpeg; PCM piped via stdin at correct sample rate; output written to disk
// ADDED: export loop — iterates chapter text → chunk → infer → collect PCM; cancellable between chunks
// ADDED: export:chapter-progress IPC event — emits after each chunk with elapsed and ETA data
// ADDED: ExportPanel — scope selector, FormatSelector, output path picker, Export button
// ADDED: FormatSelector — WAV/MP3/OGG with quality sub-options
// ADDED: ExportProgress — per-chapter bar, ETA, file size, cancel, open folder
// ADDED: exportStore — Zustand store for export job state
// MODIFIED: electron.config.js — extraResources for ffmpeg binary; asarUnpack for binary accessibility
// MODIFIED: settingsStore — adds defaultFormat, defaultQuality, defaultOutputDir
```

## Flags to Raise

- `PLAN GAP` — if `fluent-ffmpeg` cannot locate the bundled `ffmpeg.exe` path in the packaged Electron app (because `process.resourcesPath` differs between dev and prod), the ffmpeg path resolution logic must be added to `audio-encoder.js`. Flag the exact path used and whether it differs between `npm run dev` and the packaged app.
- `AMBIGUOUS` — the sample rate of the ONNX model output is model-dependent (commonly 22050 Hz for VITS, 24000 Hz for StyleBERT-VITS2). `audio-encoder.js` must read the sample rate from `tts-engine` and pass it correctly to both the WAV header and the ffmpeg `-ar` flag. If the sample rate cannot be determined from the model, state what default was assumed.
- `PLAN GAP` — multi-chapter export produces one audio file per chapter. If the user wants a single merged audio file for the whole book, this is not in scope for this phase. Raise this as a future enhancement candidate.

## Temporarily Inconsistent State

- During export, preview playback must be disabled (the TTS engine cannot run two inference sessions simultaneously). The Play button in `PreviewPlayer` must be disabled while `exportStore.status === 'running'`.
- The Cancel button stops inference after the current chunk completes — not mid-chunk. A chunk may take several seconds. The UI must show "Cancelling…" state during this gap.
- `resources/ffmpeg/ffmpeg.exe` must be placed manually before running the app for the first time (documented in README). If it is missing, MP3/OGG export must fall back to WAV with a clear message — the app must never crash.

## Handoff to Next Phase

Phase 4 requires:
- `export-handlers.js` produces valid WAV, MP3, and OGG files on disk
- `ExportProgress` accurately shows chapter progress and ETA
- Cancel works reliably (stops within one chunk)
- Preview is correctly disabled during export

## Rollback Cost

MEDIUM — Phase 1 and Phase 2 files are untouched except `electron.config.js` and `settingsStore.js`. Reverting means deleting the 7 new files and reverting those 2 files to their Phase 2 state.

## Acceptance Criteria

1. The Export panel is visible in the main layout and shows the scope selector, format picker, output path, and Export button.
2. The Export button is disabled if no file is loaded or no model is loaded; it is enabled once both are ready.
3. Selecting WAV and clicking Export produces a `.wav` file in the chosen output folder within a reasonable time.
4. Selecting MP3 and clicking Export produces an `.mp3` file. The file plays correctly in any media player.
5. Selecting OGG and clicking Export produces an `.ogg` file. The file plays correctly in any media player.
6. The progress display shows chapter progress, chunk progress within the chapter, elapsed time, and estimated time remaining during export.
7. Clicking Cancel stops the export. Partially generated output files are deleted or clearly marked as incomplete.
8. After export completes, "Open output folder" opens the folder in Windows Explorer.
9. If ffmpeg is missing (not placed in resources/), exporting MP3/OGG shows a clear message: "MP3/OGG encoding unavailable — ffmpeg not found. Exporting as WAV." and produces a WAV file instead.
10. Preview playback is disabled (Play button greyed out) while an export is running.

## Verification

1. **Export button state:** Open the app with no file loaded. The Export button shows as disabled (visually greyed). Load a file and a model — the button becomes active.
2. **WAV export:** Load a chapter, choose WAV format, set an output folder, click Export. Wait for completion. Open the output folder in Windows Explorer — a `.wav` file is present. Open it in Windows Media Player or VLC — Japanese speech plays correctly.
3. **MP3 export:** Repeat with MP3 selected. A `.mp3` file appears. Open in any player — speech plays correctly with no corruption.
4. **OGG export:** Repeat with OGG. A `.ogg` file appears and plays correctly.
5. **Progress display:** During a long export (e.g. a full chapter), watch the progress panel — it shows a moving progress bar, the current chunk number (e.g. "Chunk 7 / 34"), elapsed time (e.g. "0:32"), and an estimated remaining time. These numbers update every few seconds.
6. **Cancel:** Start an export, then click Cancel. Within a few seconds, the export stops and the status returns to idle. No partial file is left open.
7. **Open folder:** After a successful export, click "Open output folder" — Windows Explorer opens to the folder containing the exported file.
8. **No ffmpeg scenario:** Temporarily rename `resources/ffmpeg/ffmpeg.exe` to something else. Choose MP3, click Export. The app shows a message about ffmpeg being unavailable and exports WAV instead. Restore the file name — MP3 export works again.
9. **Preview blocked during export:** Start a long export. Try clicking Play in the preview area — the button is greyed or shows "Export in progress".
