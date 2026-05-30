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
  updateSingleTaskTag: (taskId, tag, tagColor) => invoke('update_single_task_tag', { taskId, tag, tagColor }),
  updateTaskDetails: (id, details) => invoke('update_task_details', { id, details }),
  sendFeedback: (feedbackType, message) => invoke('send_feedback', { feedbackType, message }),
  reportJsError: (errorMsg, location) => invoke('report_js_error', { errorMsg, location }),
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
  downloadUpdate: (url) => invoke('download_update', { url }),
  executeUpdate: () => invoke('execute_update'),
  getHwid: () => invoke('get_hwid'),
  verifyLicense: (licenseData) => invoke('verify_license', { licenseData }),
  requestActivationOtp: (licenseData) => invoke('request_activation_otp', { licenseData }),
  verifyAndActivate: (code, licenseData) => invoke('verify_and_activate', { code, licenseData }),
  requestOtpByEmail: (email) => invoke('request_otp_by_email', { email }),
  verifyEmailOtpAndActivate: (email, code) => invoke('verify_email_otp_and_activate', { email, code }),
  getAppVersionInfo: () => invoke('get_app_version_info'),
  openPaywall: () => invoke('open_paywall'),
  syncToCloud: () => invoke('sync_to_cloud'),
  syncFromCloud: () => invoke('sync_from_cloud'),
  triggerMediaCommand: (command) => invoke('trigger_media_command', { command }),
  openActiveMediaApp: (appName) => invoke('open_active_media_app', { appName }),
  setMediaVolume: (level) => invoke('set_media_volume', { level }),
  getMediaVolume: () => invoke('get_media_volume'),
  
  
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
  onUpdateDownloadProgress: (cb) => { const u = listen('update-download-progress', (ev) => cb(ev.payload)); return () => u.then(f => f()); },
  onPopupOpened: (cb) => { const u = listen('popup-opened', (ev) => cb(ev.payload)); return () => u.then(f => f()); },
  onMediaStateUpdated: (cb) => { const u = listen('media-state-updated', (ev) => cb(ev.payload)); return () => u.then(f => f()); },
};

// Capturador automático de exceções globais do JavaScript
window.onerror = function (message, source, lineno, colno, error) {
  const location = `${source || 'desconhecido'}:${lineno || 0}:${colno || 0}`;
  const errorMsg = error ? error.stack || error.message || String(error) : String(message);
  if (window.api && window.api.reportJsError) {
    window.api.reportJsError(errorMsg, location).catch(console.error);
  }
  return false;
};

// Capturador automático de Rejeições de Promises não tratadas
window.addEventListener('unhandledrejection', function (event) {
  const errorMsg = event.reason ? event.reason.stack || event.reason.message || String(event.reason) : 'Promise rejeitada sem tratamento';
  const location = 'Unhandled Promise Rejection';
  if (window.api && window.api.reportJsError) {
    window.api.reportJsError(errorMsg, location).catch(console.error);
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
