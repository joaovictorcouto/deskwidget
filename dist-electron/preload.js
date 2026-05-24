let electron = require("electron");
//#region electron/preload.js
electron.contextBridge.exposeInMainWorld("api", {
	expandWindow: () => electron.ipcRenderer.send("expand-window"),
	collapseWindow: () => electron.ipcRenderer.send("collapse-window"),
	previewEdge: (tempEdge) => electron.ipcRenderer.send("preview-edge", tempEdge),
	updatePosition: (edge, yPos) => electron.ipcRenderer.send("update-position", edge, yPos),
	openSettings: () => electron.ipcRenderer.send("open-settings"),
	openHistory: () => electron.ipcRenderer.send("open-history"),
	showHistoryTab: (tab) => electron.ipcRenderer.send("show-history-tab", tab),
	onHistoryTab: (callback) => electron.ipcRenderer.on("set-history-tab", (event, tab) => callback(tab)),
	showPopup: (reminder) => electron.ipcRenderer.send("show-popup", reminder),
	closeWindow: () => electron.ipcRenderer.send("close-window"),
	getTasks: () => electron.ipcRenderer.invoke("get-tasks"),
	addTask: (title, tag, tagColor) => electron.ipcRenderer.invoke("add-task", title, tag, tagColor),
	toggleTask: (id, completed) => electron.ipcRenderer.invoke("toggle-task", id, completed),
	updateTaskTitle: (id, title) => electron.ipcRenderer.invoke("update-task-title", id, title),
	deleteTask: (id) => electron.ipcRenderer.invoke("delete-task", id),
	updateTaskTag: (oldTag, newTag, newTagColor) => electron.ipcRenderer.invoke("update-task-tag", oldTag, newTag, newTagColor),
	reorderTasks: (taskIds) => electron.ipcRenderer.invoke("reorder-tasks", taskIds),
	getReminders: () => electron.ipcRenderer.invoke("get-reminders"),
	addReminder: (title, datetime, recurrence) => electron.ipcRenderer.invoke("add-reminder", title, datetime, recurrence),
	updateReminder: (id, status, newDatetime) => electron.ipcRenderer.invoke("update-reminder", id, status, newDatetime),
	updateReminderFull: (id, title, datetime, recurrence) => electron.ipcRenderer.invoke("update-reminder-full", id, title, datetime, recurrence),
	reagendarPerdido: (id, title, datetime, recurrence) => electron.ipcRenderer.invoke("reagendar-perdido", id, title, datetime, recurrence),
	deleteReminder: (id) => electron.ipcRenderer.invoke("delete-reminder", id),
	clearHistory: () => electron.ipcRenderer.invoke("clear-history"),
	onDataUpdated: (callback) => {
		electron.ipcRenderer.on("data-updated", callback);
		return () => electron.ipcRenderer.removeListener("data-updated", callback);
	},
	getSettings: () => electron.ipcRenderer.invoke("get-settings"),
	updateSetting: (key, value) => electron.ipcRenderer.invoke("update-setting", key, value),
	resetSettings: () => electron.ipcRenderer.invoke("reset-settings"),
	onSettingsUpdated: (callback) => {
		electron.ipcRenderer.on("settings-updated", callback);
		return () => electron.ipcRenderer.removeListener("settings-updated", callback);
	},
	onSettingsOpened: (callback) => {
		electron.ipcRenderer.on("settings-opened", callback);
		return () => electron.ipcRenderer.removeListener("settings-opened", callback);
	},
	onSettingsClosed: (callback) => {
		electron.ipcRenderer.on("settings-closed", callback);
		return () => electron.ipcRenderer.removeListener("settings-closed", callback);
	},
	onHistoryOpened: (callback) => {
		electron.ipcRenderer.on("history-opened", callback);
		return () => electron.ipcRenderer.removeListener("history-opened", callback);
	},
	onHistoryClosed: (callback) => {
		electron.ipcRenderer.on("history-closed", callback);
		return () => electron.ipcRenderer.removeListener("history-closed", callback);
	},
	onForceExpand: (callback) => {
		electron.ipcRenderer.on("force-expand", callback);
		return () => electron.ipcRenderer.removeListener("force-expand", callback);
	}
});
//#endregion
