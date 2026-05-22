import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Window Management
  expandWindow: () => ipcRenderer.send('expand-window'),
  collapseWindow: () => ipcRenderer.send('collapse-window'),
  previewEdge: (tempEdge) => ipcRenderer.send('preview-edge', tempEdge),
  updatePosition: (edge, yPos) => ipcRenderer.send('update-position', edge, yPos),
  openSettings: () => ipcRenderer.send('open-settings'),
  openHistory: () => ipcRenderer.send('open-history'),
  showPopup: (reminder) => ipcRenderer.send('show-popup', reminder),
  closeWindow: () => ipcRenderer.send('close-window'),

  // Tasks
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  addTask: (title) => ipcRenderer.invoke('add-task', title),
  toggleTask: (id, completed) => ipcRenderer.invoke('toggle-task', id, completed),
  reorderTasks: (taskIds) => ipcRenderer.invoke('reorder-tasks', taskIds),

  // Reminders
  getReminders: () => ipcRenderer.invoke('get-reminders'),
  addReminder: (title, datetime) => ipcRenderer.invoke('add-reminder', title, datetime),
  updateReminder: (id, status, newDatetime) => ipcRenderer.invoke('update-reminder', id, status, newDatetime),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSetting: (key, value) => ipcRenderer.invoke('update-setting', key, value),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
  onSettingsUpdated: (callback) => {
    ipcRenderer.on('settings-updated', callback);
    return () => ipcRenderer.removeListener('settings-updated', callback);
  },
});
