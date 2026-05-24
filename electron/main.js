import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import * as db from './database.js';

const configPath = path.join(app.getPath('userData'), 'window-config.json');

function getWindowConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading window config', e);
  }
  return {};
}

function saveWindowConfig(name, bounds) {
  const config = getWindowConfig();
  config[name] = bounds;
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Error saving window config', e);
  }
}


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
  const { x, y, width, height } = primaryDisplay.workArea;

  let startY = currentYPos === 0 ? Math.floor(y + (height - COLLAPSED_HEIGHT) / 2) : currentYPos;

  mainWindow = new BrowserWindow({
    width: COLLAPSED_WIDTH,
    height: COLLAPSED_HEIGHT,
    x: currentEdge === 'left' ? x : x + width - COLLAPSED_WIDTH,
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
    // mainWindow.webContents.openDevTools({ mode: 'detach' }); // Removido a pedido do usuário
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // Create Tray
  const iconPath = process.env.VITE_DEV_SERVER_URL
    ? path.join(__dirname, '../public/logo-icon.png')
    : path.join(__dirname, '../dist/logo-icon.png');
    
  tray = new Tray(nativeImage.createFromPath(iconPath));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Configurações', click: openSettingsWindow },
    { label: 'Lembretes', click: openHistoryWindow },
    { type: 'separator' },
    { label: 'Sair', click: () => app.quit() }
  ]);
  tray.setToolTip('DeskWidget');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.webContents.send('force-expand');
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Reage a mudanças de tela (como ocultar barra de tarefas ou ativar paleta de comandos)
  screen.on('display-metrics-changed', (event, display, changedMetrics) => {
    if (mainWindow && display.id === screen.getPrimaryDisplay().id) {
      const bounds = mainWindow.getBounds();
      const isExpanded = bounds.width > COLLAPSED_WIDTH;
      const { x, y, width, height } = display.workArea;
      
      if (isExpanded) {
        mainWindow.setBounds({
          x: currentEdge === 'left' ? x : x + width - EXPANDED_WIDTH,
          y: y,
          width: EXPANDED_WIDTH,
          height: height
        });
      } else {
        let finalY = currentYPos === 0 ? Math.floor(y + (height - COLLAPSED_HEIGHT) / 2) : currentYPos;
        // Se a posição Y estática for maior que a tela disponível, ajusta para dentro
        if (finalY > y + height - COLLAPSED_HEIGHT) finalY = y + height - COLLAPSED_HEIGHT;
        if (finalY < y) finalY = y;
        
        mainWindow.setBounds({
          x: currentEdge === 'left' ? x : x + width - COLLAPSED_WIDTH,
          y: finalY,
          width: COLLAPSED_WIDTH,
          height: COLLAPSED_HEIGHT
        });
      }
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
    const { x, y, width, height } = primaryDisplay.workArea;
    mainWindow.setBounds({
      x: currentEdge === 'left' ? x : x + width - EXPANDED_WIDTH,
      y: y,
      width: EXPANDED_WIDTH,
      height: height
    });
  }
});

ipcMain.on('preview-edge', (e, tempEdge) => {
  if (mainWindow) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x, y, width, height } = primaryDisplay.workArea;
    mainWindow.setBounds({
      x: tempEdge === 'left' ? x : x + width - EXPANDED_WIDTH,
      y: y,
      width: EXPANDED_WIDTH,
      height: height
    });
  }
});

ipcMain.on('collapse-window', () => {
  if (settingsWindow) return; // Não recolher se as configurações estiverem abertas
  if (mainWindow) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x, y, width, height } = primaryDisplay.workArea;
    let finalY = currentYPos === 0 ? Math.floor(y + (height - COLLAPSED_HEIGHT) / 2) : currentYPos;
    mainWindow.setBounds({
      x: currentEdge === 'left' ? x : x + width - COLLAPSED_WIDTH,
      y: finalY,
      width: COLLAPSED_WIDTH,
      height: COLLAPSED_HEIGHT
    });
  }
});

function broadcastDataUpdate() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('data-updated');
  if (historyWindow && !historyWindow.isDestroyed()) historyWindow.webContents.send('data-updated');
}

// IPC Handlers for Database
ipcMain.handle('get-tasks', async () => await db.getTasks());
ipcMain.handle('add-task', async (event, title) => { const r = await db.addTask(title); broadcastDataUpdate(); return r; });
ipcMain.handle('toggle-task', async (event, id, completed) => { const r = await db.toggleTask(id, completed); broadcastDataUpdate(); return r; });

ipcMain.handle('update-task-title', async (event, id, title) => { const r = await db.updateTaskTitle(id, title); broadcastDataUpdate(); return r; });
ipcMain.handle('reorder-tasks', async (event, ids) => { const r = await db.reorderTasks(ids); broadcastDataUpdate(); return r; });

ipcMain.handle('get-reminders', async () => await db.getReminders());
ipcMain.handle('add-reminder', async (event, title, datetime) => { const r = await db.addReminder(title, datetime); broadcastDataUpdate(); return r; });
ipcMain.handle('update-reminder', async (event, id, status, newDatetime) => { const r = await db.updateReminderStatus(id, status, newDatetime); broadcastDataUpdate(); return r; });
ipcMain.handle('update-reminder-full', async (event, id, title, datetime) => { const r = await db.updateReminderFull(id, title, datetime); broadcastDataUpdate(); return r; });
ipcMain.handle('reagendar-perdido', async (event, id, title, datetime) => { const r = await db.reagendarPerdido(id, title, datetime); broadcastDataUpdate(); return r; });
ipcMain.handle('delete-reminder', async (event, id) => { const r = await db.deleteReminder(id); broadcastDataUpdate(); return r; });
ipcMain.handle('clear-history', async () => { const r = await db.clearHistory(); broadcastDataUpdate(); return r; });

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
      const { x, y, width, height } = primaryDisplay.workArea;
      const bounds = mainWindow.getBounds();
      const isCurrentlyExpanded = bounds.width > COLLAPSED_WIDTH;
      
      const targetWidth = isCurrentlyExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;
      const targetHeight = isCurrentlyExpanded ? height : COLLAPSED_HEIGHT;
      const finalY = (currentYPos === 0 || isCurrentlyExpanded) ? (isCurrentlyExpanded ? y : Math.floor(y + (height - COLLAPSED_HEIGHT) / 2)) : currentYPos;
      
      mainWindow.setBounds({
        x: currentEdge === 'left' ? x : x + width - targetWidth,
        y: finalY,
        width: targetWidth,
        height: targetHeight
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
  try {
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
  } catch (e) {}
  if (mainWindow) {
    mainWindow.webContents.send('settings-updated');
  }
  return true;
});

// Additional windows
let settingsWindow = null;
function openSettingsWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('settings-opened');
  }
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  const winConfig = getWindowConfig();
  const savedSettings = winConfig.settingsWindow || {};
  
  settingsWindow = new BrowserWindow({
    width: savedSettings.width || 400,
    height: savedSettings.height || 630,
    minWidth: 350,
    minHeight: 500,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  
  settingsWindow.on('resized', () => {
    if (!settingsWindow) return;
    const { width, height } = settingsWindow.getBounds();
    saveWindowConfig('settingsWindow', { width, height });
  });

  const url = process.env.VITE_DEV_SERVER_URL 
    ? `${process.env.VITE_DEV_SERVER_URL}#/settings` 
    : `file://${path.join(__dirname, '../dist/index.html')}#/settings`;
  settingsWindow.loadURL(url);
  settingsWindow.on('closed', () => {
    settingsWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings-closed');
    }
  });
}
ipcMain.on('open-settings', openSettingsWindow);

let historyWindow = null;
function openHistoryWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('history-opened');
  }
  if (historyWindow) {
    historyWindow.focus();
    return;
  }
  const winConfig = getWindowConfig();
  const savedHistory = winConfig.historyWindow || {};

  historyWindow = new BrowserWindow({
    width: savedHistory.width || 450,
    height: savedHistory.height || 500,
    minWidth: 400,
    minHeight: 400,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  historyWindow.on('resized', () => {
    if (!historyWindow) return;
    const { width, height } = historyWindow.getBounds();
    saveWindowConfig('historyWindow', { width, height });
  });

  const url = process.env.VITE_DEV_SERVER_URL 
    ? `${process.env.VITE_DEV_SERVER_URL}#/history` 
    : `file://${path.join(__dirname, '../dist/index.html')}#/history`;
  historyWindow.loadURL(url);
  historyWindow.on('closed', () => {
    historyWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('history-closed');
    }
  });
}
ipcMain.on('open-history', openHistoryWindow);
ipcMain.on('show-history-tab', (event, tab) => {
  openHistoryWindow();
  if (historyWindow) {
    // Send immediately if ready, or wait for did-finish-load
    historyWindow.webContents.on('did-finish-load', () => {
      historyWindow.webContents.send('set-history-tab', tab);
    });
    historyWindow.webContents.send('set-history-tab', tab);
  }
});

let popupWindows = [];
ipcMain.on('show-popup', (event, reminder) => {
  // Prevent duplicate popups for the exact same reminder
  if (popupWindows.find(pw => pw.reminderId === reminder.id)) return;
  
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;
  const pWidth = 320;
  const pHeight = 210;
  const gap = 10;
  const margin = 20;

  const index = popupWindows.length;
  // Position stacked vertically from bottom up
  const pY = y + height - margin - (pHeight + gap) * (index + 1) + gap;
  const pX = x + width - pWidth - margin;

  let newPopupWindow = new BrowserWindow({
    width: pWidth,
    height: pHeight,
    x: pX,
    y: pY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  
  newPopupWindow.reminderId = reminder.id;
  
  const encodedReminder = encodeURIComponent(JSON.stringify(reminder));
  const url = process.env.VITE_DEV_SERVER_URL 
    ? `${process.env.VITE_DEV_SERVER_URL}#/popup?data=${encodedReminder}` 
    : `file://${path.join(__dirname, '../dist/index.html')}#/popup?data=${encodedReminder}`;
  
  newPopupWindow.loadURL(url);
  newPopupWindow.on('closed', () => {
    popupWindows = popupWindows.filter(pw => pw !== newPopupWindow);
    // Recalculate positions for remaining popups to slide down
    popupWindows.forEach((pw, i) => {
      const newY = y + height - margin - (pHeight + gap) * (i + 1) + gap;
      pw.setBounds({ x: pX, y: newY, width: pWidth, height: pHeight });
    });
  });

  popupWindows.push(newPopupWindow);
});

ipcMain.on('close-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if(win) win.close();
});
