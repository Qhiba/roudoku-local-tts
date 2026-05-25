# Phase 2 — File Loading: PDF & EPUB Support

TYPE: Feature

## Goal

This phase connects real novel files to the TTS pipeline built in Phase 1. The user can drag-and-drop or browse for a PDF, EPUB, or TXT file; the main process extracts and organises the text into chapters; the chapter list appears in the sidebar; and the preview player highlights the current sentence as speech progresses. After this phase, the full pipeline from file → text → speech is working end-to-end through the preview path. Phase 3 will then add export on top of this foundation.

## Produces

| File | Action | What changes |
|---|---|---|
| `src/parsers/pdf-parser.js` | CREATE | Wraps `pdf-parse`; extracts text page-by-page; groups pages into chapters by detecting `第N章` / `Chapter N` / form-feed patterns; detects image-only pages (zero extractable characters) and flags them; applies vertical-text post-processing heuristic (re-joins lines that end mid-sentence) |
| `src/parsers/epub-parser.js` | CREATE | Uses `jszip` to unzip EPUB; reads `META-INF/container.xml` → `content.opf`; parses spine item order; checks for `encryption.xml` (DRM detection); for each spine item, strips HTML tags from XHTML content; groups items into chapters by NCX/nav `<navPoint>` labels |
| `src/parsers/txt-parser.js` | CREATE | Reads file buffer; uses `chardet` to detect encoding; uses `iconv-lite` to decode to UTF-8; splits into paragraphs on double newlines; groups paragraphs into pseudo-chapters every 5000 characters if no chapter markers found; detects `第N章` markers for chapter splits |
| `src/main/ipc/file-handlers.js` | CREATE | Registers: `file:openDialog()` → opens Electron `dialog.showOpenDialog` filtered to `.pdf .epub .txt`, returns chosen path; `file:loadFile(filePath)` → dispatches to correct parser, returns `{ chapters: Array<{ title, text }>, fileName, format, pageCount? }`; `file:getChapterText(chapterIndex)` → returns plain text of one chapter |
| `src/renderer/features/file-loader/FileDropZone.jsx` | CREATE | Renders a drag-and-drop zone (full left-panel area); accepts `.pdf`, `.epub`, `.txt` via `dragover`/`drop` events; also has a "Browse file" button that calls `electronAPI.file.openDialog()`; on file selected: calls `electronAPI.file.loadFile(path)`, stores result in `fileStore`; shows file name and chapter count after load; shows spinner during parse; shows error message if DRM detected or parse fails |
| `src/renderer/features/file-loader/ChapterList.jsx` | CREATE | Renders scrollable list of chapter titles from `fileStore.chapters`; clicking a chapter sets `fileStore.currentChapter`; current chapter highlighted; chapter count shown in header |
| `src/renderer/features/preview/ProgressBar.jsx` | CREATE | Horizontal bar showing playback position within the current chapter (chunk index / total chunks); updates on every `tts:pcm-chunk` event; shows chunk number and total e.g. "Sentence 12 / 47" |
| `src/renderer/hooks/useFileLoader.js` | CREATE | `openFile()`: calls `electronAPI.file.openDialog()` then `electronAPI.file.loadFile(path)`, writes to `fileStore`; `loadChapter(index)`: calls `electronAPI.file.getChapterText(index)`, returns plain text; returns `{ fileName, chapters, currentChapter, loading, error, openFile, loadChapter }` |
| `src/renderer/store/fileStore.js` | CREATE | Zustand store: `{ fileName, format, chapters: [], currentChapterIndex: 0, currentChapterText: '', loading: false, error: null }`; actions: `setFile`, `setCurrentChapter`, `setLoading`, `setError` |
| `src/renderer/App.jsx` | MODIFY | Adds `FileDropZone` to left panel; adds `ChapterList` below drop zone; adds `ProgressBar` below `PreviewPlayer`; wires `useFileLoader` so selecting a chapter auto-loads text into `PreviewPlayer`'s text area |

## Reference Files Needed

- `src/renderer/App.jsx` — must be read before modifying to understand current layout slots
- `src/renderer/features/preview/PreviewPlayer.jsx` — must be read to understand how to pass loaded chapter text into the preview text input

## Comments to Use

```
// ADDED: PDF parser — page-by-page extraction with vertical-text heuristic post-processing
// ADDED: EPUB parser — JSZip spine traversal; encryption.xml DRM detection guard
// ADDED: TXT parser — chardet encoding detection; iconv-lite transcoding; chapter marker splitting
// ADDED: file IPC handler — dialog.showOpenDialog filtered to .pdf .epub .txt
// ADDED: FileDropZone — drag-and-drop + browse; dispatches to file-handlers IPC
// ADDED: ChapterList — renders chapter titles from fileStore; click-to-jump
// ADDED: ProgressBar — chunk progress display within current chapter
// MODIFIED: App.jsx — integrates FileDropZone, ChapterList, ProgressBar into layout
```

## Flags to Raise

- `PLAN GAP` — if a PDF uses a non-standard chapter detection pattern (e.g. no `第N章` markers and no form-feeds), the parser will produce a single chapter containing the entire book. Flag this and document the limitation; do not invent a new chunking strategy without raising the gap.
- `AMBIGUOUS` — `pdf-parse` v1.x may not handle some encrypted-but-not-DRM PDFs (password-protected files). If this case is encountered, treat it the same as DRM: show an error message and document the limitation.
- `AMBIGUOUS` — EPUB `nav.xhtml` (EPUB3) vs `toc.ncx` (EPUB2) differ in structure. If the EPUB uses one format, state which was handled. If both were handled, state that.

## Temporarily Inconsistent State

- During this phase, `App.jsx` will be modified to add the left panel. The right-panel `SettingsPanel` and centre `PreviewPlayer` from Phase 1 must remain fully functional after this modification.
- `ProgressBar` requires an active preview session to show meaningful data. Before a chapter is loaded and playback started, it shows "0 / 0 sentences" — this is correct and expected.
- The Export panel does not exist yet (Phase 3). The main layout should have a visible but disabled "Export" button as a placeholder to make the UI complete.

## Handoff to Next Phase

Phase 3 requires:
- `file-handlers.js` is registered and returns `{ chapters }` correctly for PDF, EPUB, and TXT
- `fileStore` holds the current chapter's plain text
- `App.jsx` passes the current chapter text into the TTS pipeline
- Full preview playback works end-to-end for a loaded file chapter

## Rollback Cost

MEDIUM — Phase 1 files are untouched. Reverting Phase 2 means deleting the 8 new files and reverting `App.jsx` to its Phase 1 state, which can be done cleanly.

## Acceptance Criteria

1. Dragging a `.txt` file onto the drop zone loads it and shows the file name and chapter count.
2. Dragging a `.epub` file (DRM-free) loads it, shows chapters extracted from the spine.
3. Dragging a DRM-encrypted `.epub` file shows a clear error message: "This EPUB is DRM-protected and cannot be opened."
4. Dragging a `.pdf` file loads it and shows the extracted chapter list.
5. Dragging an image-only PDF shows a warning: "This PDF appears to contain scanned images. Text extraction may be incomplete."
6. Clicking a chapter in the chapter list loads its text into the preview area.
7. Pressing Play on a loaded chapter plays the text with sentences highlighted as each is spoken.
8. The progress bar advances as each sentence is spoken, showing correct sentence count.
9. A Shift-JIS encoded `.txt` file loads correctly without garbled characters.
10. If a file fails to load for any reason, an error message appears in the drop zone — the app does not crash.

## Verification

1. **TXT load:** Drag any Japanese `.txt` file onto the drop zone. The file name appears above the chapter list. The chapter list shows at least one entry.
2. **EPUB load:** Drag a DRM-free Japanese `.epub` file (e.g. from 青空文庫) onto the drop zone. The chapter list shows the book's chapters by name.
3. **DRM EPUB:** Drag a DRM-protected EPUB onto the drop zone. A red error message appears saying the file is DRM-protected. The app remains usable.
4. **PDF load:** Drag a digital Japanese PDF onto the drop zone. Chapters appear. Click one — its text loads into the preview area.
5. **Chapter navigation:** Click different chapters in the list. The preview text area updates to show each chapter's content.
6. **Preview with loaded file:** With a chapter loaded, press Play. Japanese speech begins. As each sentence is spoken, it is visually highlighted in the preview area. The progress bar advances.
7. **Progress bar:** Confirm the progress bar shows something like "Sentence 3 / 28" and updates every few seconds during playback.
8. **Shift-JIS TXT:** If you have an older Japanese `.txt` file, drag it in. The Japanese text shows correctly without garbled symbols (□ or ??? characters).
9. **Error recovery:** Drag a non-supported file (e.g. a `.jpg`) onto the drop zone. An error message appears. Then drag a valid `.txt` — it loads correctly. The app never freezes.
