import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import * as db from './database.js';

let mainWindow;
let tray = null;

const EXPANDED_WIDTH = 350;
const COLLAPSED_WIDTH = 8;
const COLLAPSED_HEIGHT = 150;

let currentEdge = 'right';
let currentYPos = 0;

async function createWindow() {
  db.initDb();
  
  // Wait a little for DB to be ready, then read settings
  const settings = await new Promise(res => setTimeout(async () => res(await db.getSettings()), 200));
  currentEdge = settings.edge || 'right';
  currentYPos = parseInt(settings.yPosition) || 0;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  let startY = currentYPos === 0 ? Math.floor((height - COLLAPSED_HEIGHT) / 2) : currentYPos;

  mainWindow = new BrowserWindow({
    width: COLLAPSED_WIDTH,
    height: COLLAPSED_HEIGHT,
    x: currentEdge === 'left' ? 0 : width - COLLAPSED_WIDTH,
    y: startY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    type: 'toolbar',
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // Create Tray
  const iconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZUlEQVQ4T2NkoBAwUqifYdQAyDBGAQp/YGRk/E+W5gOMjIw/CQo+o4rGqAEwozEaQDSgQJ0gQ9jAABsYw2Qwg9GAITwAYWJAGDQQFwYDBuLCYMBAXBgMGIgLgwEDcWEwYCAuEEYHAAJ/OQsx3XpBAAAAAElFTkSuQmCC';
  tray = new Tray(nativeImage.createFromDataURL(iconBase64));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Configurações', click: openSettingsWindow },
    { label: 'Lembretes', click: openHistoryWindow },
    { type: 'separator' },
    { label: 'Sair', click: () => app.quit() }
  ]);
  tray.setToolTip('DeskWidget');
  tray.setContextMenu(contextMenu);

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

// IPC Handlers for Window Management
ipcMain.on('update-position', (e, edge, yPos) => {
  currentEdge = edge;
  currentYPos = yPos;
  db.updateSetting('edge', edge);
  db.updateSetting('yPosition', yPos.toString());
});

ipcMain.on('expand-window', () => {
  if (mainWindow) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    mainWindow.setBounds({
      x: currentEdge === 'left' ? 0 : width - EXPANDED_WIDTH,
      y: 0,
      width: EXPANDED_WIDTH,
      height: height
    });
  }
});

ipcMain.on('preview-edge', (e, tempEdge) => {
  if (mainWindow) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    mainWindow.setBounds({
      x: tempEdge === 'left' ? 0 : width - EXPANDED_WIDTH,
      y: 0,
      width: EXPANDED_WIDTH,
      height: height
    });
  }
});

ipcMain.on('collapse-window', () => {
  if (mainWindow) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    let finalY = currentYPos === 0 ? Math.floor((height - COLLAPSED_HEIGHT) / 2) : currentYPos;
    mainWindow.setBounds({
      x: currentEdge === 'left' ? 0 : width - COLLAPSED_WIDTH,
      y: finalY,
      width: COLLAPSED_WIDTH,
      height: COLLAPSED_HEIGHT
    });
  }
});

// IPC Handlers for Database
ipcMain.handle('get-tasks', async () => await db.getTasks());
ipcMain.handle('add-task', async (event, title) => await db.addTask(title));
ipcMain.handle('toggle-task', async (event, id, completed) => await db.toggleTask(id, completed));

ipcMain.handle('get-reminders', async () => await db.getReminders());
ipcMain.handle('add-reminder', async (event, title, datetime) => await db.addReminder(title, datetime));
ipcMain.handle('update-reminder', async (event, id, status, newDatetime) => await db.updateReminderStatus(id, status, newDatetime));
ipcMain.handle('clear-history', async () => await db.clearHistory());

ipcMain.handle('get-settings', async () => await db.getSettings());
ipcMain.handle('update-setting', async (event, key, value) => {
  await db.updateSetting(key, value);
  if (key === 'startOnWindows') {
    app.setLoginItemSettings({
      openAtLogin: value === 'true',
      path: app.getPath('exe')
    });
  }
  if (key === 'edge') {
    currentEdge = value;
    if (mainWindow) {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;
      const finalY = currentYPos === 0 ? Math.floor((height - COLLAPSED_HEIGHT) / 2) : currentYPos;
      // When changing from settings, it's safer to collapse to the new edge to avoid unexpected visual shifts
      mainWindow.setBounds({
        x: currentEdge === 'left' ? 0 : width - COLLAPSED_WIDTH,
        y: finalY,
        width: COLLAPSED_WIDTH,
        height: COLLAPSED_HEIGHT
      });
    }
  }
  if (mainWindow) {
    mainWindow.webContents.send('settings-updated');
  }
  return true;
});
ipcMain.handle('reset-settings', async () => {
  await db.resetSettings();
  if (mainWindow) {
    mainWindow.webContents.send('settings-updated');
  }
  return true;
});
ipcMain.handle('reorder-tasks', async (event, taskIds) => {
  return await db.reorderTasks(taskIds);
});

// Additional windows
let settingsWindow = null;
function openSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 400,
    height: 700,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  const url = process.env.VITE_DEV_SERVER_URL 
    ? `${process.env.VITE_DEV_SERVER_URL}#/settings` 
    : `file://${path.join(__dirname, '../dist/index.html')}#/settings`;
  settingsWindow.loadURL(url);
  settingsWindow.on('closed', () => settingsWindow = null);
}
ipcMain.on('open-settings', openSettingsWindow);

let historyWindow = null;
function openHistoryWindow() {
  if (historyWindow) {
    historyWindow.focus();
    return;
  }
  historyWindow = new BrowserWindow({
    width: 450,
    height: 500,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  const url = process.env.VITE_DEV_SERVER_URL 
    ? `${process.env.VITE_DEV_SERVER_URL}#/history` 
    : `file://${path.join(__dirname, '../dist/index.html')}#/history`;
  historyWindow.loadURL(url);
  historyWindow.on('closed', () => historyWindow = null);
}
ipcMain.on('open-history', openHistoryWindow);

let popupWindow = null;
ipcMain.on('show-popup', (event, reminder) => {
  if (popupWindow) popupWindow.close();
  
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const pWidth = 320;
  const pHeight = 150;

  popupWindow = new BrowserWindow({
    width: pWidth,
    height: pHeight,
    x: width - pWidth - 20,
    y: height - pHeight - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  
  const encodedReminder = encodeURIComponent(JSON.stringify(reminder));
  const url = process.env.VITE_DEV_SERVER_URL 
    ? `${process.env.VITE_DEV_SERVER_URL}#/popup?data=${encodedReminder}` 
    : `file://${path.join(__dirname, '../dist/index.html')}#/popup?data=${encodedReminder}`;
  
  popupWindow.loadURL(url);
  popupWindow.on('closed', () => popupWindow = null);
});

ipcMain.on('close-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if(win) win.close();
});
