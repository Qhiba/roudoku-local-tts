// ADDED: PCM streaming IPC — main sends Float32Array chunks; renderer AudioQueue schedules via AudioContext

const { ipcMain } = require('electron');
const textChunker = require('../services/text-chunker');
const ttsEngine = require('../../engine/tts-engine');

let activeJobId = 0;

function registerTTSHandlers() {
  ipcMain.handle('tts:startPreview', async (event, text, speakerId, rate) => {
    activeJobId += 1;
    const jobId = activeJobId;
    
    try {
      const chunks = textChunker.chunkText(text);
      
      for (const chunk of chunks) {
        if (jobId !== activeJobId) {
          break;
        }
        
        // Run inference for this chunk
        const pcm = await ttsEngine.inferChunk(chunk.text, speakerId, rate);
        
        if (jobId !== activeJobId) {
          break;
        }
        
        // Clone the Float32Array to standard V8-owned heap memory to ensure contextBridge serialization succeeds.
        const pcmCopy = Float32Array.from(pcm);
        
        // Stream PCM buffer and chunk text back to the renderer
        event.sender.send('tts:pcm-chunk', {
          text: chunk.text,
          pcm: pcmCopy,
          sampleRate: ttsEngine.getSampleRate()
        });
      }
      return { success: true };
    } catch (error) {
      console.error('TTS Preview inference error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tts:stopPreview', async () => {
    activeJobId = 0;
    return { success: true };
  });
}

module.exports = { registerTTSHandlers };
