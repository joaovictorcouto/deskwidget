import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// Desabilita o menu de clique direito do navegador
document.addEventListener('contextmenu', e => e.preventDefault());

// Polyfill para compatibilidade com o código React original do Electron
window.api = {
  getTasks: () => invoke('get_tasks'),
  addTask: (title, tag, tagColor) => invoke('add_task', { title, tag, tagColor }),
  toggleTask: (id, completed) => invoke('toggle_task', { id, completed }),
  updateTaskTitle: (id, title) => invoke('update_task_title', { id, title }),
  deleteTask: (id) => invoke('delete_task', { id }),
  updateTaskTag: (oldTag, newTag, newTagColor) => invoke('update_task_tag', { oldTag, newTag, newTagColor }),
  reorderTasks: (ids) => invoke('reorder_tasks', { ids }),
  getReminders: () => invoke('get_reminders'),
  addReminder: (title, datetime, recurrence) => invoke('add_reminder', { title, datetime, recurrence }),
  updateReminder: (id, status, newDatetime) => invoke('update_reminder', { id, status, newDatetime }),
  updateReminderFull: (id, title, datetime) => invoke('update_reminder_full', { id, title, datetime }),
  deleteReminder: (id) => invoke('delete_reminder', { id }),
  getSettings: () => invoke('get_settings'),
  updateSetting: (key, value) => invoke('update_setting', { key, value }),
  resetSettings: () => invoke('reset_settings'),
  resetSettingsTab: (tab) => invoke('reset_settings_tab', { tab }),
  previewAppearance: (settings) => invoke('preview_appearance', { settings }),
  
  openSettings: () => invoke('open_settings'),
  openHistory: () => invoke('open_history'),
  showPopup: (config) => invoke('show_popup', { config }),
  closeWindow: () => invoke('close_window'),
  updatePosition: (edge, yPos) => invoke('update_position', { edge, yPos }),
  startPopupPositioner: () => invoke('show_popup', { config: { type: 'positioner', id: 'positioner' } }),
  getPositionerMargins: () => invoke('get_positioner_margins'),
  setPositionerMargins: (right, bottom) => invoke('set_positioner_margins', { right, bottom }),
  savePopupPosition: ({ right, bottom }) => invoke('save_popup_position', { right, bottom }),
  sendPomodoroAction: (action) => invoke('pomodoro_action', { action }),
  expandWindow: () => invoke('expand_window', { availX: window.screen.availLeft || 0, availY: window.screen.availTop || 0, availWidth: window.screen.availWidth, availHeight: window.screen.availHeight }),
  collapseWindow: () => invoke('collapse_window', { availX: window.screen.availLeft || 0, availY: window.screen.availTop || 0, availWidth: window.screen.availWidth, availHeight: window.screen.availHeight }),
  previewEdge: (tempEdge) => invoke('preview_edge', { tempEdge, availX: window.screen.availLeft || 0, availY: window.screen.availTop || 0, availWidth: window.screen.availWidth, availHeight: window.screen.availHeight }),
  writeUpdateChunk: (chunk, isStart) => invoke('write_update_chunk', { chunk, isStart }),
  executeUpdate: () => invoke('execute_update'),
  
  // Event Listeners simulados (ainda precisam do backend emitindo)
  onSettingsUpdated: (cb) => { const u = listen('settings-updated', cb); return () => u.then(f => f()); },
  onPreviewAppearance: (cb) => { const u = listen('preview-appearance', (ev) => cb(ev.payload)); return () => u.then(f => f()); },
  onDataUpdated: (cb) => { const u = listen('data-updated', cb); return () => u.then(f => f()); },
  onSettingsOpened: (cb) => { const u = listen('settings-opened', cb); return () => u.then(f => f()); },
  onSettingsClosed: (cb) => { const u = listen('settings-closed', cb); return () => u.then(f => f()); },
  onHistoryOpened: (cb) => { const u = listen('history-opened', cb); return () => u.then(f => f()); },
  onHistoryClosed: (cb) => { const u = listen('history-closed', cb); return () => u.then(f => f()); },
  onForceExpand: (cb) => { const u = listen('force-expand', cb); return () => u.then(f => f()); },
  onPomodoroAction: (cb) => { const u = listen('pomodoro-action', (ev) => cb(ev.payload)); return () => u.then(f => f()); },
  onPositionerMetrics: (cb) => { const u = listen('positioner-metrics', (ev) => cb(ev.payload)); return () => u.then(f => f()); },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
