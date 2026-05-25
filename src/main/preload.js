// ADDED: contextBridge preload — exposes safe electronAPI to renderer without nodeIntegration
// ADDED: shell.openExternal via preload — opens Hugging Face tier URLs in system browser; not navigated inside Electron window

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  tts: {
    startPreview: (text, speakerId, rate) => ipcRenderer.invoke('tts:startPreview', text, speakerId, rate),
    stopPreview: () => ipcRenderer.invoke('tts:stopPreview'),
    onPcmChunk: (callback) => {
      const subscription = (event, chunk) => callback(chunk);
      ipcRenderer.on('tts:pcm-chunk', subscription);
      // Return unregister function
      return () => {
        ipcRenderer.removeListener('tts:pcm-chunk', subscription);
      };
    }
  },
  model: {
    loadModel: (modelPath) => ipcRenderer.invoke('model:loadModel', modelPath),
    listVoiceBanks: () => ipcRenderer.invoke('model:listVoiceBanks'),
    detectHardware: () => ipcRenderer.invoke('model:detectHardware'),
    selectFile: () => ipcRenderer.invoke('model:selectFile'),
    getTierRegistry: () => ipcRenderer.invoke('model:getTierRegistry'),
    detectArchitecture: (modelPath) => ipcRenderer.invoke('model:detectArchitecture', modelPath),
  },
  file: {
    openFile: () => ipcRenderer.invoke('file:openFile'),
    listChapters: () => ipcRenderer.invoke('file:listChapters'),
    readChunk: (chapterIndex, chunkIndex) => ipcRenderer.invoke('file:readChunk', chapterIndex, chunkIndex),
  },
  export: {
    startExport: (options) => ipcRenderer.invoke('export:startExport', options),
    getExportProgress: () => ipcRenderer.invoke('export:getExportProgress'),
    cancelExport: () => ipcRenderer.invoke('export:cancelExport'),
  },
  settings: {
    getStore: () => ipcRenderer.invoke('settings:getStore'),
    set: (key, val) => ipcRenderer.invoke('settings:set', key, val),
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
  }
});
