const { ipcMain } = require('electron');

function registerFileHandlers() {
  ipcMain.handle('file:openFile', async () => {
    return { success: true, fileName: 'Stub novel.epub' };
  });

  ipcMain.handle('file:listChapters', async () => {
    return [
      { title: 'Chapter 1: The Beginning', chunkCount: 3 },
      { title: 'Chapter 2: The Journey', chunkCount: 5 }
    ];
  });

  ipcMain.handle('file:readChunk', async (event, chapterIndex, chunkIndex) => {
    return { text: `This is a preview of Chapter ${chapterIndex + 1}, chunk ${chunkIndex + 1}.` };
  });
}

module.exports = { registerFileHandlers };
