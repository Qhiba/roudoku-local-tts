### Phase 1 — Fix Report

TYPE: Feature

**Fixes Applied:**
- Issue: COMMENT MISSING: Preload script lacked comments explaining contextBridge and shell.openExternal.
  File: `e:\Projects\web\local-tts\src\main\preload.js`
  Section: Lines 1-4
  Change: Added the required inline comments.

- Issue: The sound does not play despite visualization running because the raw ONNX Float32Array cannot serialize directly across contextBridge.
  File: `e:\Projects\web\local-tts\src\main\ipc\tts-handlers.js`
  Section: registerTTSHandlers inside preview stream loop
  Change: Clone the Float32Array to V8-owned heap memory via `Float32Array.from(pcm)`.

- Issue: AudioContext closing errors during remount or re-initialization.
  File: `e:\Projects\web\local-tts\src\renderer\features\preview\AudioQueue.jsx`
  Section: getAudioContext initialization and mount/cleanup useEffect
  Change: Guard `getAudioContext` to recreate if closed; properly close and null-out in cleanup.

- Issue: Initial gain volume is not set, and raw PCM deserialization fails or gets muted in AudioQueue.
  File: `e:\Projects\web\local-tts\src\renderer\features\preview\AudioQueue.jsx`
  Section: playback useEffect
  Change: Robustly convert Float32Array from various IPC serialization formats.

- Issue: Speech rate mismatch due to hardcoded 24000 Hz sample rate for a 22050 Hz model.
  File: `src/engine/tts-engine.js`, `src/main/ipc/tts-handlers.js`, `src/renderer/hooks/useTTS.js`, `src/renderer/features/preview/AudioQueue.jsx`
  Change: Dynamically read sample_rate from config.json and propagate through IPC.

- Issue: Model not auto-loaded on restart.
  File: `e:\Projects\web\local-tts\src\renderer\store\settingsStore.js`
  Section: init action
  Change: Auto-load persisted model path on startup.

- Issue (Human Note): **Synthesized audio plays every sentence twice in order (A A B B C C).**
  Root Cause: OpenJTalk's `-ot` trace output dumps the full HTS label sequence **TWICE** — once from the text analysis pass and once from the synthesis pass. The `extractLabelLines()` function in `openjtalk.js` was extracting ALL matching label lines from the trace without distinguishing between the two passes. This produced doubled phoneme tokens (22 instead of 11 for "こんにちは。"), which fed doubled phoneme IDs into the ONNX model, causing it to synthesize the speech twice within a single audio output.
  File: `e:\Projects\web\local-tts\src\engine\g2p\openjtalk.js`
  Section: `extractLabelLines()` function
  Change: After extracting all label lines, detect the repeat by finding where `labels[0]` recurs at index `i > 0`, and return only `labels.slice(0, i)` (the first copy). Verified: "こんにちは。" now produces 12 tokens (correct) instead of 22 (doubled).
  ```javascript
  // Before (buggy — captures both analysis and synthesis label dumps):
  function extractLabelLines(trace) {
    const labels = [];
    for (const line of trace.split('\n')) {
      const field = line.trim().split(/\s+/).find((f) => f.includes('^') && f.includes('/A:'));
      if (field) labels.push(field);
    }
    return labels;  // ← 22 labels for "こんにちは。" — doubled!
  }

  // After (fixed — deduplicates by detecting the repeated first label):
  function extractLabelLines(trace) {
    const labels = [];
    for (const line of trace.split('\n')) {
      const field = line.trim().split(/\s+/).find((f) => f.includes('^') && f.includes('/A:'));
      if (field) labels.push(field);
    }
    if (labels.length >= 2) {
      const first = labels[0];
      for (let i = 1; i < labels.length; i++) {
        if (labels[i] === first && labels.length >= i * 2) {
          return labels.slice(0, i);  // ← 11 labels — correct single copy
        }
      }
    }
    return labels;
  }
  ```

- Issue: React StrictMode double-invokes effects causing potential duplicate IPC listener registration and init() calls.
  Files: `src/renderer/main.jsx`, `src/renderer/App.jsx`, `src/renderer/hooks/useTTS.js`
  Change: Removed React.StrictMode wrapper; changed effect deps to `[]` for both the init effect and the IPC subscription effect; switched to `useTTSStore.getState().enqueueChunk()` to avoid closure-stale risk.

**Files Modified:**
- `e:\Projects\web\local-tts\src\main\preload.js`
- `e:\Projects\web\local-tts\src\main\ipc\tts-handlers.js`
- `e:\Projects\web\local-tts\src\renderer\features\preview\AudioQueue.jsx`
- `e:\Projects\web\local-tts\src\engine\tts-engine.js`
- `e:\Projects\web\local-tts\src\renderer\hooks\useTTS.js`
- `e:\Projects\web\local-tts\src\renderer\store\settingsStore.js`
- `e:\Projects\web\local-tts\src\engine\g2p\openjtalk.js`
- `e:\Projects\web\local-tts\src\renderer\main.jsx`
- `e:\Projects\web\local-tts\src\renderer\App.jsx`

**Flags Raised:**
None.
