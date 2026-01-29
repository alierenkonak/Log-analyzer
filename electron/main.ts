import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { getDashboardStats, insertLogs, getLogs, getFilterOptions, getImportedFiles, getFolders, createFolder, renameFolder, deleteFolder, assignFileToFolder, deleteFile, getExportLogs, LogFilters } from './database/service'
import { parseLogFile } from './utils/logParser'
import { getDb } from './database/init'

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import ExcelJS from 'exceljs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  // Veritabanını başlat
  try {
    getDb();
    console.log('Database initialized');
  } catch (err) {
    console.error('Failed to init DB:', err);
  }

  // IPC Handlers
  ipcMain.handle('db:stats', (_, selectedFiles?: string[]) => {
    return Promise.resolve(getDashboardStats(selectedFiles));
  });

  ipcMain.handle('db:logs', (_, page: number, pageSize: number, filters?: LogFilters) => {
    return Promise.resolve(getLogs(page, pageSize, filters));
  });

  ipcMain.handle('db:filterOptions', () => {
    return Promise.resolve(getFilterOptions());
  });

  ipcMain.handle('db:importedFiles', () => {
    return Promise.resolve(getImportedFiles());
  });

  // Folder operations
  ipcMain.handle('db:getFolders', () => {
    return Promise.resolve(getFolders());
  });

  ipcMain.handle('db:createFolder', (_, name: string) => {
    return Promise.resolve(createFolder(name));
  });

  ipcMain.handle('db:renameFolder', (_, id: number, name: string) => {
    return Promise.resolve(renameFolder(id, name));
  });

  ipcMain.handle('db:deleteFolder', (_, id: number) => {
    return Promise.resolve(deleteFolder(id));
  });

  ipcMain.handle('db:assignFileToFolder', (_, fileSource: string, folderId: number | null) => {
    return Promise.resolve(assignFileToFolder(fileSource, folderId));
  });

  ipcMain.handle('db:deleteFile', (_, fileSource: string) => {
    return Promise.resolve(deleteFile(fileSource));
  });

  ipcMain.handle('db:import', async (_, filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const entries = parseLogFile(content);
      const count = insertLogs(entries, path.basename(filePath));
      return { success: true, count };
    } catch (error) {
      console.error('Import error:', error);
      return { success: false, error: String(error) };
    }
  });

  // Dialog handler for file selection
  ipcMain.handle('dialog:openLog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Log Files', extensions: ['log', 'Log', 'LOG'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Excel Export Handler
  ipcMain.handle('export:excel', async (_, filters: LogFilters) => {
    try {
      const logs = getExportLogs(filters);

      if (logs.length === 0) {
        return { success: false, error: 'No logs found to export with current filters.' };
      }

      const { filePath } = await dialog.showSaveDialog({
        title: 'Export Logs to Excel',
        defaultPath: `logs_export_${new Date().toISOString().split('T')[0]}.xlsx`,
        filters: [{ name: 'Excel File', extensions: ['xlsx'] }]
      });

      if (!filePath) {
        return { success: false, cancelled: true };
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Logs');

      worksheet.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Time', key: 'time', width: 12 },
        { header: 'Measurement ID', key: 'measurement_id', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Group', key: 'measurement_group', width: 15 },
        { header: 'Style', key: 'measurement_style', width: 15 },
        { header: 'Color Model', key: 'color_model', width: 15 },
        { header: 'ID1', key: 'id1', width: 10 },
        { header: 'ID2', key: 'id2', width: 10 },
        { header: 'ID3', key: 'id3', width: 10 },
        { header: 'X', key: 'x', width: 10 },
        { header: 'Y', key: 'y', width: 10 },
        { header: 'Z', key: 'z', width: 10 },
        { header: 'RX', key: 'rx', width: 10 },
        { header: 'RY', key: 'ry', width: 10 },
        { header: 'RZ', key: 'rz', width: 10 },
        { header: 'Uncertainty', key: 'uncertainty', width: 12 },
        { header: 'Msmt Time', key: 'measurement_time', width: 12 },
        { header: 'Features OK', key: 'features_ok', width: 12 },
        { header: 'Error Description', key: 'error_desc', width: 40 },
        { header: 'Source File', key: 'file_source', width: 30 }
      ];

      // Add rows
      worksheet.addRows(logs);

      // Style header
      worksheet.getRow(1).font = { bold: true };

      await workbook.xlsx.writeFile(filePath);

      return { success: true, filePath, count: logs.length };

    } catch (error) {
      console.error('Export excel error:', error);
      return { success: false, error: String(error) };
    }
  });

  createWindow();
});
