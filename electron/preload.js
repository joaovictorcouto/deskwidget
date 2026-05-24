import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Window Management
  expandWindow: () => ipcRenderer.send('expand-window'),
  collapseWindow: () => ipcRenderer.send('collapse-window'),
  previewEdge: (tempEdge) => ipcRenderer.send('preview-edge', tempEdge),
  updatePosition: (edge, yPos) => ipcRenderer.send('update-position', edge, yPos),
  openSettings: () => ipcRenderer.send('open-settings'),
  openHistory: () => ipcRenderer.send('open-history'),
  showHistoryTab: (tab) => ipcRenderer.send('show-history-tab', tab),
  onHistoryTab: (callback) => ipcRenderer.on('set-history-tab', (event, tab) => callback(tab)),
  showPopup: (reminder) => ipcRenderer.send('show-popup', reminder),
  closeWindow: () => ipcRenderer.send('close-window'),

  // Tasks
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  addTask: (title, tag, tagColor) => ipcRenderer.invoke('add-task', title, tag, tagColor),
  toggleTask: (id, completed) => ipcRenderer.invoke('toggle-task', id, completed),
  updateTaskTitle: (id, title) => ipcRenderer.invoke('update-task-title', id, title),
  deleteTask: (id) => ipcRenderer.invoke('delete-task', id),
  updateTaskTag: (oldTag, newTag, newTagColor) => ipcRenderer.invoke('update-task-tag', oldTag, newTag, newTagColor),
  reorderTasks: (taskIds) => ipcRenderer.invoke('reorder-tasks', taskIds),

  // Reminders
  getReminders: () => ipcRenderer.invoke('get-reminders'),
  addReminder: (title, datetime, recurrence) => ipcRenderer.invoke('add-reminder', title, datetime, recurrence),
  updateReminder: (id, status, newDatetime) => ipcRenderer.invoke('update-reminder', id, status, newDatetime),
  updateReminderFull: (id, title, datetime, recurrence) => ipcRenderer.invoke('update-reminder-full', id, title, datetime, recurrence),
  reagendarPerdido: (id, title, datetime, recurrence) => ipcRenderer.invoke('reagendar-perdido', id, title, datetime, recurrence),
  deleteReminder: (id) => ipcRenderer.invoke('delete-reminder', id),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  onDataUpdated: (callback) => {
    ipcRenderer.on('data-updated', callback);
    return () => ipcRenderer.removeListener('data-updated', callback);
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSetting: (key, value) => ipcRenderer.invoke('update-setting', key, value),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
  onSettingsUpdated: (callback) => {
    ipcRenderer.on('settings-updated', callback);
    return () => ipcRenderer.removeListener('settings-updated', callback);
  },
  onSettingsOpened: (callback) => {
    ipcRenderer.on('settings-opened', callback);
    return () => ipcRenderer.removeListener('settings-opened', callback);
  },
  onSettingsClosed: (callback) => {
    ipcRenderer.on('settings-closed', callback);
    return () => ipcRenderer.removeListener('settings-closed', callback);
  },
  onHistoryOpened: (callback) => {
    ipcRenderer.on('history-opened', callback);
    return () => ipcRenderer.removeListener('history-opened', callback);
  },
  onHistoryClosed: (callback) => {
    ipcRenderer.on('history-closed', callback);
    return () => ipcRenderer.removeListener('history-closed', callback);
  },
  onForceExpand: (callback) => {
    ipcRenderer.on('force-expand', callback);
    return () => ipcRenderer.removeListener('force-expand', callback);
  },
});
