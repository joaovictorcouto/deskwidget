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
const iconPath = process.env.VITE_DEV_SERVER_URL ? path.join(__dirname, '../public/logo-icon.png') : path.join(__dirname, '../dist/logo-icon.png');
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
    icon: iconPath,
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

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.webContents.send('force-expand');
    }
  });

  app.commandLine.appendSwitch('disable-site-isolation-trials');

  app.whenReady().then(() => {
    createWindow();

  // Create Tray
  
    
  tray = new Tray(nativeImage.createFromPath(iconPath));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Configurações', click: openSettingsWindow },
    { label: 'Lembretes', click: openHistoryWindow },
    { type: 'separator' },
    { label: 'Reiniciar', click: () => { 
        if (process.env.VITE_DEV_SERVER_URL) {
          app.quit(); // Em dev mode, o Vite precisa ser reiniciado via terminal
        } else {
          app.relaunch(); 
          app.exit(); 
        }
      } 
    },
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

ipcMain.on('pomodoro-action', (event, action) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('pomodoro-action', action);
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
ipcMain.handle('add-task', async (event, title, tag, tagColor) => { const r = await db.addTask(title, tag, tagColor); broadcastDataUpdate(); return r; });
ipcMain.handle('toggle-task', async (event, id, completed) => { const r = await db.toggleTask(id, completed); broadcastDataUpdate(); return r; });

ipcMain.handle('update-task-title', async (event, id, title) => {
  const res = await db.updateTaskTitle(id, title);
  broadcastDataUpdate();
  return res;
});

ipcMain.handle('delete-task', async (event, id) => {
  const res = await db.deleteTask(id);
  broadcastDataUpdate();
  return res;
});

ipcMain.handle('update-task-tag', async (event, oldTag, newTag, newTagColor) => {
  const res = await db.updateTaskTag(oldTag, newTag, newTagColor);
  broadcastDataUpdate();
  return res;
});

ipcMain.handle('reorder-tasks', async (event, ids) => { const r = await db.reorderTasks(ids); broadcastDataUpdate(); return r; });

ipcMain.handle('get-reminders', async () => await db.getReminders());
ipcMain.handle('add-reminder', async (event, title, datetime, recurrence) => { const r = await db.addReminder(title, datetime, recurrence); broadcastDataUpdate(); return r; });
ipcMain.handle('update-reminder', async (event, id, status, newDatetime) => { const r = await db.updateReminderStatus(id, status, newDatetime); broadcastDataUpdate(); return r; });
ipcMain.handle('update-reminder-full', async (event, id, title, datetime, recurrence) => { const r = await db.updateReminderFull(id, title, datetime, recurrence); broadcastDataUpdate(); return r; });
ipcMain.handle('reagendar-perdido', async (event, id, title, datetime, recurrence) => { const r = await db.reagendarPerdido(id, title, datetime, recurrence); broadcastDataUpdate(); return r; });
ipcMain.handle('delete-reminder', async (event, id) => { const r = await db.deleteReminder(id); broadcastDataUpdate(); return r; });
ipcMain.handle('clear-history', async () => { const r = await db.clearHistory(); broadcastDataUpdate(); return r; });

ipcMain.handle('get-settings', async () => await db.getSettings());
ipcMain.handle('update-setting', async (event, key, value) => {
  await db.updateSetting(key, value);
  if (key === 'popupGap') recalculatePopupPositions();
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
    const settings = await db.getSettings();
    mainWindow.webContents.send('settings-updated', settings);
  }
  return true;
});

ipcMain.handle('reset-settings-tab', async (event, tab) => {
  await db.resetSettingsTab(tab);
  if (mainWindow) {
    const settings = await db.getSettings();
    mainWindow.webContents.send('settings-updated', settings);
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
    icon: iconPath,
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
    icon: iconPath,
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

const POPUP_WIDTH = 320;

// Refatora show-popup para suportar qualquer tipo de popup dinâmico
ipcMain.on('show-popup', async (event, config) => {
  // config: { id: string (unique), type: string, data: any, height: number }
  if (popupWindows.find(pw => pw.id === config.id)) return;
  
  const settings = await db.getSettings();
  const marginRight = parseInt(settings.popupMarginRight) || 20;
  const marginBottom = parseInt(settings.popupMarginBottom) || 20;
  const popupGap = settings.popupGap !== undefined ? parseInt(settings.popupGap) : 4;

  const primaryDisplay = screen.getPrimaryDisplay();
  // Usa bounds totais para corresponder ao que o positioner salva
  const { x, y, width, height } = primaryDisplay.bounds;
  
  const pWidth = POPUP_WIDTH;
  // PADRONIZAÇÃO GLOBAL: Todos os popups agora têm exatamente o mesmo tamanho.
  const pHeight = 210;

  // Calcula a posição Y baseada na altura acumulada dos popups já abertos
  let accumulatedHeight = 0;
  popupWindows.forEach(pw => {
    accumulatedHeight += pw.height + popupGap;
  });

  const pY = y + height - marginBottom - pHeight - accumulatedHeight;
  const pX = x + width - pWidth - marginRight;

  let newPopupWindow = new BrowserWindow({
    icon: iconPath,
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
  
  const popupObj = { window: newPopupWindow, id: config.id, height: pHeight };
  popupWindows.push(popupObj);
  
  const encodedData = encodeURIComponent(JSON.stringify(config));
  const url = process.env.VITE_DEV_SERVER_URL 
    ? `${process.env.VITE_DEV_SERVER_URL}#/popup?config=${encodedData}` 
    : `file://${path.join(__dirname, '../dist/index.html')}#/popup?config=${encodedData}`;
  
  newPopupWindow.loadURL(url);
  newPopupWindow.on('closed', () => {
    popupWindows = popupWindows.filter(pw => pw.id !== config.id);
    recalculatePopupPositions();
  });
});

function recalculatePopupPositions() {
  db.getSettings().then(settings => {
    const marginRight = parseInt(settings.popupMarginRight) || 20;
    const marginBottom = parseInt(settings.popupMarginBottom) || 20;
    const popupGap = settings.popupGap !== undefined ? parseInt(settings.popupGap) : 4;
    const primaryDisplay = screen.getPrimaryDisplay();
    // Usa bounds totais para corresponder ao que o positioner salva
    const { x, y, width, height } = primaryDisplay.bounds;
    
    let accumulatedHeight = 0;
    popupWindows.forEach(pw => {
      const pY = y + height - marginBottom - pw.height - accumulatedHeight;
      const pX = x + width - POPUP_WIDTH - marginRight;
      if (!pw.window.isDestroyed()) {
        pw.window.setBounds({ x: pX, y: pY, width: POPUP_WIDTH, height: pw.height });
      }
      accumulatedHeight += pw.height + popupGap;
    });
  });
}

// Inicia o modo de posicionamento interativo
ipcMain.on('start-popup-positioner', async () => {
  if (popupWindows.find(pw => pw.id === 'positioner')) return;

  const settings = await db.getSettings();
  const marginRight = parseInt(settings.popupMarginRight) || 20;
  const marginBottom = parseInt(settings.popupMarginBottom) || 20;
  
  const primaryDisplay = screen.getPrimaryDisplay();
  // bounds = tela total (inclui barra de tarefas)
  const { x: sx, y: sy, width: sw, height: sh } = primaryDisplay.bounds;
  const pWidth = POPUP_WIDTH;
  const pHeight = 210;
  
  // Posiciona a janela com base nos margens salvas (canto inferior direito como âncora)
  const pX = Math.min(sx + sw - pWidth - marginRight, sx + sw - pWidth);
  const pY = Math.min(sy + sh - pHeight - marginBottom, sy + sh - pHeight);

  let positionerWin = new BrowserWindow({
    icon: iconPath,
    width: pWidth,
    height: pHeight,
    x: Math.max(sx, pX),
    y: Math.max(sy, pY),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const config = { id: 'positioner', type: 'positioner', height: pHeight };
  const encodedData = encodeURIComponent(JSON.stringify(config));
  const url = process.env.VITE_DEV_SERVER_URL 
    ? `${process.env.VITE_DEV_SERVER_URL}#/popup?config=${encodedData}` 
    : `file://${path.join(__dirname, '../dist/index.html')}#/popup?config=${encodedData}`;

  positionerWin.loadURL(url);

  // Atualiza métricas e garante que a janela não saia dos limites da tela total
  let isClamping = false;
  positionerWin.on('move', () => {
    if (positionerWin.isDestroyed() || isClamping) return;
    const b = positionerWin.getBounds();
    
    // Clamp dentro dos limites totais da tela
    const clampedX = Math.max(sx, Math.min(b.x, sx + sw - b.width));
    const clampedY = Math.max(sy, Math.min(b.y, sy + sh - b.height));
    
    if (clampedX !== b.x || clampedY !== b.y) {
      isClamping = true;
      positionerWin.setBounds({ x: clampedX, y: clampedY, width: b.width, height: b.height });
      isClamping = false;
    }

    // Métricas baseadas na tela total (incluindo barra de tarefas)
    const finalBounds = positionerWin.getBounds();
    const mRight = Math.max(0, (sx + sw) - (finalBounds.x + finalBounds.width));
    const mBottom = Math.max(0, (sy + sh) - (finalBounds.y + finalBounds.height));
    const maxRight = sw - pWidth;
    const maxBottom = sh - pHeight;
    positionerWin.webContents.send('positioner-metrics', { right: mRight, bottom: mBottom, maxRight, maxBottom });
  });

  positionerWin.on('closed', () => {
    // Não precisa filtrar de popupWindows pois não está na lista
  });
  
  // Envia margins atuais ao popup
  positionerWin.webContents.on('did-finish-load', () => {
    const maxRight = sw - pWidth;
    const maxBottom = sh - pHeight;
    positionerWin.webContents.send('positioner-metrics', { right: marginRight, bottom: marginBottom, maxRight, maxBottom });
  });
});

// Move o positioner em tempo real baseado nos valores dos inputs
ipcMain.on('set-positioner-margins', (event, right, bottom) => {
  const pw = popupWindows.find(p => p.id === 'positioner');
  if (!pw || pw.window.isDestroyed()) return;
  const primaryDisplay = screen.getPrimaryDisplay();
  // Usa bounds totais (inclui barra de tarefas) para posicionar via inputs
  const { x: sx, y: sy, width: sw, height: sh } = primaryDisplay.bounds;
  const pWidth = POPUP_WIDTH;
  const pHeight = pw.height;
  // Clamp: nunca ultrapassa nenhuma borda
  const safeRight = Math.max(0, Math.min(right, sw - pWidth));
  const safeBottom = Math.max(0, Math.min(bottom, sh - pHeight));
  const newX = sx + sw - pWidth - safeRight;
  const newY = sy + sh - pHeight - safeBottom;
  pw.window.setBounds({ x: newX, y: newY, width: pWidth, height: pHeight });
});

ipcMain.handle('get-positioner-margins', async () => {
  const settings = await db.getSettings();
  return {
    right: parseInt(settings.popupMarginRight) || 20,
    bottom: parseInt(settings.popupMarginBottom) || 20,
  };
});

ipcMain.on('save-popup-position', async (event, margins) => {
  // margins = { right, bottom } — ponto de âncora é sempre o canto inferior direito do popup
  const mRight = Math.max(0, Math.round(margins.right));
  const mBottom = Math.max(0, Math.round(margins.bottom));
  
  await db.updateSetting('popupMarginRight', mRight.toString());
  await db.updateSetting('popupMarginBottom', mBottom.toString());
  
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();

  // Reposiciona popups já abertos
  recalculatePopupPositions();
});


ipcMain.on('close-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if(win) win.close();
});
}
