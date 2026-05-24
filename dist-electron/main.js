//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let electron = require("electron");
let node_path = require("node:path");
node_path = __toESM(node_path);
let node_fs = require("node:fs");
node_fs = __toESM(node_fs);
let sqlite3 = require("sqlite3");
sqlite3 = __toESM(sqlite3);
//#region electron/database.js
var db;
function initDb() {
	try {
		const dbPath = node_path.default.join(electron.app.getPath("userData"), "deskwidget.db");
		db = new (sqlite3.default.Database ? sqlite3.default : sqlite3.default.default).Database(dbPath);
		db.serialize(() => {
			db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT 0,
        position INTEGER DEFAULT 0,
        completedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
			db.run(`ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0`, (err) => {});
			db.run(`ALTER TABLE tasks ADD COLUMN completedAt DATETIME`, (err) => {});
			db.run(`ALTER TABLE tasks ADD COLUMN tag TEXT`, (err) => {});
			db.run(`ALTER TABLE tasks ADD COLUMN tagColor TEXT`, (err) => {});
			db.run(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        datetime DATETIME NOT NULL,
        status TEXT DEFAULT 'agendado', -- 'agendado', 'concluido', 'cancelado', 'perdido'
        recurrence TEXT, -- 'none', 'daily', 'weekly', 'monthly', 'yearly'
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
			db.run(`ALTER TABLE reminders ADD COLUMN recurrence TEXT`, (err) => {});
			db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
			db.get("SELECT value FROM settings WHERE key = 'opacity'", (err, row) => {
				if (!row) {
					db.run("INSERT INTO settings (key, value) VALUES ('opacity', '90')");
					db.run("INSERT INTO settings (key, value) VALUES ('position', 'direita')");
					db.run("INSERT INTO settings (key, value) VALUES ('theme', 'escuro')");
					db.run("INSERT INTO settings (key, value) VALUES ('delay', '1000')");
					db.run("INSERT INTO settings (key, value) VALUES ('startOnWindows', 'false')");
					db.run("INSERT INTO settings (key, value) VALUES ('enablePomodoro', 'false')");
					db.run("INSERT INTO settings (key, value) VALUES ('enableNotes', 'false')");
					db.run("INSERT INTO settings (key, value) VALUES ('enableProgressBar', 'false')");
					db.run("INSERT INTO settings (key, value) VALUES ('enableTags', 'false')");
					db.run("INSERT INTO settings (key, value) VALUES ('pomodoroFocus', '25')");
					db.run("INSERT INTO settings (key, value) VALUES ('pomodoroBreak', '5')");
					db.run("INSERT INTO settings (key, value) VALUES ('pomodoroSound', 'sino')");
				}
			});
		});
	} catch (error) {
		console.error("FATAL ERROR IN INITDB:", error);
	}
}
function getTasks() {
	return new Promise((resolve, reject) => {
		db.all("SELECT * FROM tasks", (err, rows) => {
			if (err) reject(err);
			else {
				const pending = rows.filter((r) => !r.completed).sort((a, b) => a.position - b.position);
				const completed = rows.filter((r) => r.completed).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
				resolve([...pending, ...completed]);
			}
		});
	});
}
function addTask(title, tag = null, tagColor = null) {
	return new Promise((resolve, reject) => {
		const pos = Date.now();
		db.run("INSERT INTO tasks (title, completed, position, tag, tagColor) VALUES (?, 0, ?, ?, ?)", [
			title,
			pos,
			tag,
			tagColor
		], function(err) {
			if (err) reject(err);
			else resolve({
				id: this.lastID,
				title,
				completed: 0,
				position: pos,
				tag,
				tagColor
			});
		});
	});
}
function toggleTask(id, completed) {
	return new Promise((resolve, reject) => {
		const pos = completed ? 0 : Date.now();
		const query = completed ? "UPDATE tasks SET completed = 1, completedAt = datetime('now', 'localtime') WHERE id = ?" : "UPDATE tasks SET completed = 0, completedAt = NULL, position = ? WHERE id = ?";
		const params = completed ? [id] : [pos, id];
		db.run(query, params, (err) => {
			if (err) reject(err);
			else resolve(true);
		});
	});
}
function updateTaskTitle(id, title) {
	return new Promise((resolve, reject) => {
		db.run("UPDATE tasks SET title = ? WHERE id = ?", [title, id], (err) => {
			if (err) reject(err);
			else resolve(true);
		});
	});
}
function deleteTask(id) {
	return new Promise((resolve, reject) => {
		db.run("DELETE FROM tasks WHERE id = ?", [id], (err) => {
			if (err) reject(err);
			else resolve(true);
		});
	});
}
function updateTaskTag(oldTag, newTag, newTagColor) {
	return new Promise((resolve, reject) => {
		db.run("UPDATE tasks SET tag = ?, tagColor = ? WHERE tag = ?", [
			newTag,
			newTagColor,
			oldTag
		], (err) => {
			if (err) reject(err);
			else resolve(true);
		});
	});
}
function reorderTasks(taskIds) {
	return new Promise((resolve, reject) => {
		db.serialize(() => {
			db.run("BEGIN TRANSACTION");
			const stmt = db.prepare("UPDATE tasks SET position = ? WHERE id = ?");
			taskIds.forEach((id, index) => {
				stmt.run(index, id);
			});
			stmt.finalize();
			db.run("COMMIT", (err) => {
				if (err) reject(err);
				else resolve(true);
			});
		});
	});
}
function getReminders() {
	return new Promise((resolve, reject) => {
		db.all("SELECT * FROM reminders ORDER BY datetime ASC", (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
	});
}
function addReminder(title, datetime, recurrence = "none") {
	return new Promise((resolve, reject) => {
		db.run("INSERT INTO reminders (title, datetime, recurrence) VALUES (?, ?, ?)", [
			title,
			datetime,
			recurrence
		], function(err) {
			if (err) reject(err);
			else resolve({
				id: this.lastID,
				title,
				datetime,
				status: "agendado",
				recurrence
			});
		});
	});
}
function updateReminderStatus(id, status, newDatetime = null) {
	return new Promise((resolve, reject) => {
		if (status === "concluido") db.get("SELECT * FROM reminders WHERE id = ?", [id], (err, row) => {
			if (err || !row) {
				db.run("UPDATE reminders SET status = ? WHERE id = ?", [status, id], (e) => e ? reject(e) : resolve(true));
				return;
			}
			if (row.recurrence && row.recurrence !== "none") {
				const nextDate = new Date(row.datetime);
				if (row.recurrence === "daily") nextDate.setDate(nextDate.getDate() + 1);
				if (row.recurrence === "weekly") nextDate.setDate(nextDate.getDate() + 7);
				if (row.recurrence === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
				if (row.recurrence === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);
				db.run("INSERT INTO reminders (title, datetime, recurrence) VALUES (?, ?, ?)", [
					row.title,
					nextDate.toISOString(),
					row.recurrence
				], (e) => {
					db.run("UPDATE reminders SET status = 'concluido', recurrence = 'none' WHERE id = ?", [id], (e2) => e2 ? reject(e2) : resolve(true));
				});
			} else db.run("UPDATE reminders SET status = 'concluido' WHERE id = ?", [id], (e) => e ? reject(e) : resolve(true));
		});
		else if (newDatetime) db.run("UPDATE reminders SET status = ?, datetime = ? WHERE id = ?", [
			status,
			newDatetime,
			id
		], (err) => {
			if (err) reject(err);
			else resolve(true);
		});
		else db.run("UPDATE reminders SET status = ? WHERE id = ?", [status, id], (err) => {
			if (err) reject(err);
			else resolve(true);
		});
	});
}
function updateReminderFull(id, title, datetime, recurrence = "none") {
	return new Promise((resolve, reject) => {
		db.run("UPDATE reminders SET title = ?, datetime = ?, recurrence = ? WHERE id = ?", [
			title,
			datetime,
			recurrence,
			id
		], (err) => {
			if (err) reject(err);
			else resolve(true);
		});
	});
}
function reagendarPerdido(id, title, datetime, recurrence = "none") {
	return new Promise((resolve, reject) => {
		db.run("UPDATE reminders SET title = ?, datetime = ?, recurrence = ?, status = 'agendado' WHERE id = ?", [
			title,
			datetime,
			recurrence,
			id
		], (err) => {
			if (err) reject(err);
			else resolve(true);
		});
	});
}
function deleteReminder(id) {
	return new Promise((resolve, reject) => {
		db.run("DELETE FROM reminders WHERE id = ?", [id], (err) => {
			if (err) reject(err);
			else resolve(true);
		});
	});
}
function clearHistory() {
	return new Promise((resolve, reject) => {
		db.run("DELETE FROM reminders WHERE status != 'agendado'", (err) => {
			if (err) reject(err);
			else resolve(true);
		});
	});
}
function getSettings() {
	return new Promise((resolve, reject) => {
		db.all("SELECT * FROM settings", (err, rows) => {
			if (err) reject(err);
			else {
				const settings = {
					enableTasks: "true",
					enableReminders: "true"
				};
				rows.forEach((r) => settings[r.key] = r.value);
				resolve(settings);
			}
		});
	});
}
function updateSetting(key, value) {
	return new Promise((resolve, reject) => {
		db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value], (err) => {
			if (err) reject(err);
			else resolve(true);
		});
	});
}
function resetSettings() {
	return new Promise((resolve, reject) => {
		db.run("DELETE FROM settings", (err) => {
			if (err) reject(err);
			else {
				db.run("INSERT INTO settings (key, value) VALUES ('opacity', '90')");
				db.run("INSERT INTO settings (key, value) VALUES ('position', 'direita')");
				db.run("INSERT INTO settings (key, value) VALUES ('theme', 'escuro')");
				db.run("INSERT INTO settings (key, value) VALUES ('delay', '1000')");
				db.run("INSERT INTO settings (key, value) VALUES ('startOnWindows', 'false')");
				db.run("INSERT INTO settings (key, value) VALUES ('enableTasks', 'true')");
				db.run("INSERT INTO settings (key, value) VALUES ('enableReminders', 'true')");
				resolve(true);
			}
		});
	});
}
//#endregion
//#region electron/main.js
var configPath = node_path.default.join(electron.app.getPath("userData"), "window-config.json");
function getWindowConfig() {
	try {
		if (node_fs.default.existsSync(configPath)) return JSON.parse(node_fs.default.readFileSync(configPath, "utf8"));
	} catch (e) {
		console.error("Error reading window config", e);
	}
	return {};
}
function saveWindowConfig(name, bounds) {
	const config = getWindowConfig();
	config[name] = bounds;
	try {
		node_fs.default.writeFileSync(configPath, JSON.stringify(config, null, 2));
	} catch (e) {
		console.error("Error saving window config", e);
	}
}
var mainWindow;
var tray = null;
var EXPANDED_WIDTH = 350;
var COLLAPSED_WIDTH = 8;
var COLLAPSED_HEIGHT = 150;
var currentEdge = "right";
var currentYPos = 0;
async function createWindow() {
	initDb();
	const settings = await new Promise((res) => setTimeout(async () => res(await getSettings()), 200));
	currentEdge = settings.edge || "right";
	currentYPos = parseInt(settings.yPosition) || 0;
	const { x, y, width, height } = electron.screen.getPrimaryDisplay().workArea;
	let startY = currentYPos === 0 ? Math.floor(y + (height - COLLAPSED_HEIGHT) / 2) : currentYPos;
	mainWindow = new electron.BrowserWindow({
		width: COLLAPSED_WIDTH,
		height: COLLAPSED_HEIGHT,
		x: currentEdge === "left" ? x : x + width - COLLAPSED_WIDTH,
		y: startY,
		frame: false,
		transparent: true,
		alwaysOnTop: true,
		skipTaskbar: true,
		type: "toolbar",
		resizable: false,
		webPreferences: {
			preload: node_path.default.join(__dirname, "preload.js"),
			nodeIntegration: false,
			contextIsolation: true
		}
	});
	if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
	else mainWindow.loadFile(node_path.default.join(__dirname, "../dist/index.html"));
}
electron.app.whenReady().then(() => {
	createWindow();
	const iconPath = process.env.VITE_DEV_SERVER_URL ? node_path.default.join(__dirname, "../public/logo-icon.png") : node_path.default.join(__dirname, "../dist/logo-icon.png");
	tray = new electron.Tray(electron.nativeImage.createFromPath(iconPath));
	const contextMenu = electron.Menu.buildFromTemplate([
		{
			label: "Configurações",
			click: openSettingsWindow
		},
		{
			label: "Lembretes",
			click: openHistoryWindow
		},
		{ type: "separator" },
		{
			label: "Sair",
			click: () => electron.app.quit()
		}
	]);
	tray.setToolTip("DeskWidget");
	tray.setContextMenu(contextMenu);
	tray.on("double-click", () => {
		if (mainWindow) mainWindow.webContents.send("force-expand");
	});
	electron.app.on("activate", () => {
		if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
	});
	electron.screen.on("display-metrics-changed", (event, display, changedMetrics) => {
		if (mainWindow && display.id === electron.screen.getPrimaryDisplay().id) {
			const isExpanded = mainWindow.getBounds().width > COLLAPSED_WIDTH;
			const { x, y, width, height } = display.workArea;
			if (isExpanded) mainWindow.setBounds({
				x: currentEdge === "left" ? x : x + width - EXPANDED_WIDTH,
				y,
				width: EXPANDED_WIDTH,
				height
			});
			else {
				let finalY = currentYPos === 0 ? Math.floor(y + (height - COLLAPSED_HEIGHT) / 2) : currentYPos;
				if (finalY > y + height - COLLAPSED_HEIGHT) finalY = y + height - COLLAPSED_HEIGHT;
				if (finalY < y) finalY = y;
				mainWindow.setBounds({
					x: currentEdge === "left" ? x : x + width - COLLAPSED_WIDTH,
					y: finalY,
					width: COLLAPSED_WIDTH,
					height: COLLAPSED_HEIGHT
				});
			}
		}
	});
});
electron.app.on("window-all-closed", () => {
	if (process.platform !== "darwin") electron.app.quit();
});
electron.ipcMain.on("update-position", (e, edge, yPos) => {
	currentEdge = edge;
	currentYPos = yPos;
	updateSetting("edge", edge);
	updateSetting("yPosition", yPos.toString());
});
electron.ipcMain.on("expand-window", () => {
	if (mainWindow) {
		const { x, y, width, height } = electron.screen.getPrimaryDisplay().workArea;
		mainWindow.setBounds({
			x: currentEdge === "left" ? x : x + width - EXPANDED_WIDTH,
			y,
			width: EXPANDED_WIDTH,
			height
		});
	}
});
electron.ipcMain.on("preview-edge", (e, tempEdge) => {
	if (mainWindow) {
		const { x, y, width, height } = electron.screen.getPrimaryDisplay().workArea;
		mainWindow.setBounds({
			x: tempEdge === "left" ? x : x + width - EXPANDED_WIDTH,
			y,
			width: EXPANDED_WIDTH,
			height
		});
	}
});
electron.ipcMain.on("collapse-window", () => {
	if (settingsWindow) return;
	if (mainWindow) {
		const { x, y, width, height } = electron.screen.getPrimaryDisplay().workArea;
		let finalY = currentYPos === 0 ? Math.floor(y + (height - COLLAPSED_HEIGHT) / 2) : currentYPos;
		mainWindow.setBounds({
			x: currentEdge === "left" ? x : x + width - COLLAPSED_WIDTH,
			y: finalY,
			width: COLLAPSED_WIDTH,
			height: COLLAPSED_HEIGHT
		});
	}
});
function broadcastDataUpdate() {
	if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("data-updated");
	if (historyWindow && !historyWindow.isDestroyed()) historyWindow.webContents.send("data-updated");
}
electron.ipcMain.handle("get-tasks", async () => await getTasks());
electron.ipcMain.handle("add-task", async (event, title, tag, tagColor) => {
	const r = await addTask(title, tag, tagColor);
	broadcastDataUpdate();
	return r;
});
electron.ipcMain.handle("toggle-task", async (event, id, completed) => {
	const r = await toggleTask(id, completed);
	broadcastDataUpdate();
	return r;
});
electron.ipcMain.handle("update-task-title", async (event, id, title) => {
	const res = await updateTaskTitle(id, title);
	broadcastDataUpdate();
	return res;
});
electron.ipcMain.handle("delete-task", async (event, id) => {
	const res = await deleteTask(id);
	broadcastDataUpdate();
	return res;
});
electron.ipcMain.handle("update-task-tag", async (event, oldTag, newTag, newTagColor) => {
	const res = await updateTaskTag(oldTag, newTag, newTagColor);
	broadcastDataUpdate();
	return res;
});
electron.ipcMain.handle("reorder-tasks", async (event, ids) => {
	const r = await reorderTasks(ids);
	broadcastDataUpdate();
	return r;
});
electron.ipcMain.handle("get-reminders", async () => await getReminders());
electron.ipcMain.handle("add-reminder", async (event, title, datetime, recurrence) => {
	const r = await addReminder(title, datetime, recurrence);
	broadcastDataUpdate();
	return r;
});
electron.ipcMain.handle("update-reminder", async (event, id, status, newDatetime) => {
	const r = await updateReminderStatus(id, status, newDatetime);
	broadcastDataUpdate();
	return r;
});
electron.ipcMain.handle("update-reminder-full", async (event, id, title, datetime, recurrence) => {
	const r = await updateReminderFull(id, title, datetime, recurrence);
	broadcastDataUpdate();
	return r;
});
electron.ipcMain.handle("reagendar-perdido", async (event, id, title, datetime, recurrence) => {
	const r = await reagendarPerdido(id, title, datetime, recurrence);
	broadcastDataUpdate();
	return r;
});
electron.ipcMain.handle("delete-reminder", async (event, id) => {
	const r = await deleteReminder(id);
	broadcastDataUpdate();
	return r;
});
electron.ipcMain.handle("clear-history", async () => {
	const r = await clearHistory();
	broadcastDataUpdate();
	return r;
});
electron.ipcMain.handle("get-settings", async () => await getSettings());
electron.ipcMain.handle("update-setting", async (event, key, value) => {
	await updateSetting(key, value);
	if (key === "startOnWindows") electron.app.setLoginItemSettings({
		openAtLogin: value === "true",
		path: electron.app.getPath("exe")
	});
	if (key === "edge") {
		currentEdge = value;
		if (mainWindow) {
			const { x, y, width, height } = electron.screen.getPrimaryDisplay().workArea;
			const isCurrentlyExpanded = mainWindow.getBounds().width > COLLAPSED_WIDTH;
			const targetWidth = isCurrentlyExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;
			const targetHeight = isCurrentlyExpanded ? height : COLLAPSED_HEIGHT;
			const finalY = currentYPos === 0 || isCurrentlyExpanded ? isCurrentlyExpanded ? y : Math.floor(y + (height - COLLAPSED_HEIGHT) / 2) : currentYPos;
			mainWindow.setBounds({
				x: currentEdge === "left" ? x : x + width - targetWidth,
				y: finalY,
				width: targetWidth,
				height: targetHeight
			});
		}
	}
	if (mainWindow) mainWindow.webContents.send("settings-updated");
	return true;
});
electron.ipcMain.handle("reset-settings", async () => {
	await resetSettings();
	try {
		if (node_fs.default.existsSync(configPath)) node_fs.default.unlinkSync(configPath);
	} catch (e) {}
	if (mainWindow) mainWindow.webContents.send("settings-updated");
	return true;
});
var settingsWindow = null;
function openSettingsWindow() {
	if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("settings-opened");
	if (settingsWindow) {
		settingsWindow.focus();
		return;
	}
	const savedSettings = getWindowConfig().settingsWindow || {};
	settingsWindow = new electron.BrowserWindow({
		width: savedSettings.width || 400,
		height: savedSettings.height || 630,
		minWidth: 350,
		minHeight: 500,
		frame: false,
		transparent: true,
		webPreferences: { preload: node_path.default.join(__dirname, "preload.js") }
	});
	settingsWindow.on("resized", () => {
		if (!settingsWindow) return;
		const { width, height } = settingsWindow.getBounds();
		saveWindowConfig("settingsWindow", {
			width,
			height
		});
	});
	const url = process.env.VITE_DEV_SERVER_URL ? `${process.env.VITE_DEV_SERVER_URL}#/settings` : `file://${node_path.default.join(__dirname, "../dist/index.html")}#/settings`;
	settingsWindow.loadURL(url);
	settingsWindow.on("closed", () => {
		settingsWindow = null;
		if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("settings-closed");
	});
}
electron.ipcMain.on("open-settings", openSettingsWindow);
var historyWindow = null;
function openHistoryWindow() {
	if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("history-opened");
	if (historyWindow) {
		historyWindow.focus();
		return;
	}
	const savedHistory = getWindowConfig().historyWindow || {};
	historyWindow = new electron.BrowserWindow({
		width: savedHistory.width || 450,
		height: savedHistory.height || 500,
		minWidth: 400,
		minHeight: 400,
		frame: false,
		transparent: true,
		webPreferences: { preload: node_path.default.join(__dirname, "preload.js") }
	});
	historyWindow.on("resized", () => {
		if (!historyWindow) return;
		const { width, height } = historyWindow.getBounds();
		saveWindowConfig("historyWindow", {
			width,
			height
		});
	});
	const url = process.env.VITE_DEV_SERVER_URL ? `${process.env.VITE_DEV_SERVER_URL}#/history` : `file://${node_path.default.join(__dirname, "../dist/index.html")}#/history`;
	historyWindow.loadURL(url);
	historyWindow.on("closed", () => {
		historyWindow = null;
		if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("history-closed");
	});
}
electron.ipcMain.on("open-history", openHistoryWindow);
electron.ipcMain.on("show-history-tab", (event, tab) => {
	openHistoryWindow();
	if (historyWindow) {
		historyWindow.webContents.on("did-finish-load", () => {
			historyWindow.webContents.send("set-history-tab", tab);
		});
		historyWindow.webContents.send("set-history-tab", tab);
	}
});
var popupWindows = [];
electron.ipcMain.on("show-popup", (event, reminder) => {
	if (popupWindows.find((pw) => pw.reminderId === reminder.id)) return;
	const { x, y, width, height } = electron.screen.getPrimaryDisplay().workArea;
	const pWidth = 320;
	const pHeight = 210;
	const gap = 10;
	const margin = 20;
	const index = popupWindows.length;
	const pY = y + height - margin - 220 * (index + 1) + gap;
	const pX = x + width - pWidth - margin;
	let newPopupWindow = new electron.BrowserWindow({
		width: pWidth,
		height: pHeight,
		x: pX,
		y: pY,
		frame: false,
		transparent: true,
		alwaysOnTop: true,
		resizable: false,
		hasShadow: false,
		webPreferences: { preload: node_path.default.join(__dirname, "preload.js") }
	});
	newPopupWindow.reminderId = reminder.id;
	const encodedReminder = encodeURIComponent(JSON.stringify(reminder));
	const url = process.env.VITE_DEV_SERVER_URL ? `${process.env.VITE_DEV_SERVER_URL}#/popup?data=${encodedReminder}` : `file://${node_path.default.join(__dirname, "../dist/index.html")}#/popup?data=${encodedReminder}`;
	newPopupWindow.loadURL(url);
	newPopupWindow.on("closed", () => {
		popupWindows = popupWindows.filter((pw) => pw !== newPopupWindow);
		popupWindows.forEach((pw, i) => {
			const newY = y + height - margin - 220 * (i + 1) + gap;
			pw.setBounds({
				x: pX,
				y: newY,
				width: pWidth,
				height: pHeight
			});
		});
	});
	popupWindows.push(newPopupWindow);
});
electron.ipcMain.on("close-window", (event) => {
	const win = electron.BrowserWindow.fromWebContents(event.sender);
	if (win) win.close();
});
//#endregion
