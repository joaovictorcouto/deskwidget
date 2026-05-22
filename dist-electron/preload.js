let electron = require("electron");
//#region electron/preload.js
electron.contextBridge.exposeInMainWorld("api", {
	expandWindow: () => electron.ipcRenderer.send("expand-window"),
	collapseWindow: () => electron.ipcRenderer.send("collapse-window"),
	previewEdge: (tempEdge) => electron.ipcRenderer.send("preview-edge", tempEdge),
	updatePosition: (edge, yPos) => electron.ipcRenderer.send("update-position", edge, yPos),
	openSettings: () => electron.ipcRenderer.send("open-settings"),
	openHistory: () => electron.ipcRenderer.send("open-history"),
	showPopup: (reminder) => electron.ipcRenderer.send("show-popup", reminder),
	closeWindow: () => electron.ipcRenderer.send("close-window"),
	getTasks: () => electron.ipcRenderer.invoke("get-tasks"),
	addTask: (title) => electron.ipcRenderer.invoke("add-task", title),
	toggleTask: (id, completed) => electron.ipcRenderer.invoke("toggle-task", id, completed),
	reorderTasks: (taskIds) => electron.ipcRenderer.invoke("reorder-tasks", taskIds),
	getReminders: () => electron.ipcRenderer.invoke("get-reminders"),
	addReminder: (title, datetime) => electron.ipcRenderer.invoke("add-reminder", title, datetime),
	updateReminder: (id, status, newDatetime) => electron.ipcRenderer.invoke("update-reminder", id, status, newDatetime),
	clearHistory: () => electron.ipcRenderer.invoke("clear-history"),
	getSettings: () => electron.ipcRenderer.invoke("get-settings"),
	updateSetting: (key, value) => electron.ipcRenderer.invoke("update-setting", key, value),
	resetSettings: () => electron.ipcRenderer.invoke("reset-settings"),
	onSettingsUpdated: (callback) => {
		electron.ipcRenderer.on("settings-updated", callback);
		return () => electron.ipcRenderer.removeListener("settings-updated", callback);
	}
});
//#endregion
