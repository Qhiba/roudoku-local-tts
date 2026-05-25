const { ipcMain } = require('electron');
const modelManager = require('../services/model-manager');
const deviceDetector = require('../services/device-detector');
const { detectArchitecture, publicDetection } = require('../../engine/architecture-detector');
const ort = require('onnxruntime-node');

function registerModelHandlers() {
  ipcMain.handle('model:loadModel', async (event, modelPath) => {
    try {
      const result = await modelManager.loadModel(modelPath);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('model:detectArchitecture', async (event, modelPath) => {
    try {
      const det = await detectArchitecture(modelPath, { ort });
      return publicDetection(det);
    } catch (error) {
      console.error('Error in detectArchitecture handler:', error);
      return {
        family: 'unknown',
        adapterId: null,
        label: 'Unknown',
        supported: false,
        requiredFiles: [],
        missingFiles: [],
        reason: error.message
      };
    }
  });

  ipcMain.handle('model:listVoiceBanks', async () => {
    try {
      const speakers = await modelManager.listVoiceBanks();
      return speakers;
    } catch (error) {
      console.error('Error listing voice banks:', error);
      return [];
    }
  });

  ipcMain.handle('model:getTierRegistry', async () => {
    try {
      return modelManager.getTierRegistry();
    } catch (error) {
      console.error('Error getting tier registry:', error);
      return {};
    }
  });

  ipcMain.handle('model:detectHardware', async () => {
    try {
      const hardware = await deviceDetector.detectHardware();
      return hardware;
    } catch (error) {
      console.error('Error detecting hardware:', error);
      return { 
        gpuName: 'Error detecting GPU', 
        vramMB: 0, 
        recommendedTier: 'Potato', 
        cudaAvailable: false 
      };
    }
  });

  ipcMain.handle('model:selectFile', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      title: 'Select ONNX Model File',
      filters: [{ name: 'ONNX Models', extensions: ['onnx'] }],
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });
}

module.exports = { registerModelHandlers };
