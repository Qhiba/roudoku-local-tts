// ADDED: Electron main process entry — creates BrowserWindow and registers all IPC handlers

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { registerTTSHandlers } = require('./ipc/tts-handlers');
const { registerModelHandlers } = require('./ipc/model-handlers');
const { registerFileHandlers } = require('./ipc/file-handlers');

const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Register IPC handlers
  registerTTSHandlers();
  registerModelHandlers();
  registerFileHandlers();

  // Settings persistence handlers
  ipcMain.handle('settings:getStore', () => store.store);
  ipcMain.handle('settings:set', (event, key, val) => store.set(key, val));
  
  // Shell integration handlers
  ipcMain.handle('shell:openExternal', async (event, url) => {
    const { shell } = require('electron');
    await shell.openExternal(url);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
