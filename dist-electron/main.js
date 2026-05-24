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
			db.run(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        datetime DATETIME NOT NULL,
        status TEXT DEFAULT 'agendado', -- 'agendado', 'concluido', 'cancelado'
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
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
				}
			});
		});
	} catch (error) {
		console.error("FATAL ERROR IN INITDB:", error);
	}
}
function getTasks() {
	return new Promise((resolve, reject) => {
		db.all("SELECT * FROM tasks ORDER BY completed ASC, position ASC, createdAt ASC", (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
	});
}
function addTask(title) {
	return new Promise((resolve, reject) => {
		const pos = Date.now();
		db.run("INSERT INTO tasks (title, completed, position) VALUES (?, 0, ?)", [title, pos], function(err) {
			if (err) reject(err);
			else resolve({
				id: this.lastID,
				title,
				completed: 0,
				position: pos
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
function addReminder(title, datetime) {
	return new Promise((resolve, reject) => {
		db.run("INSERT INTO reminders (title, datetime) VALUES (?, ?)", [title, datetime], function(err) {
			if (err) reject(err);
			else resolve({
				id: this.lastID,
				title,
				datetime,
				status: "agendado"
			});
		});
	});
}
function updateReminderStatus(id, status, newDatetime = null) {
	return new Promise((resolve, reject) => {
		if (newDatetime) db.run("UPDATE reminders SET status = ?, datetime = ? WHERE id = ?", [
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
function updateReminderFull(id, title, datetime) {
	return new Promise((resolve, reject) => {
		db.run("UPDATE reminders SET title = ?, datetime = ? WHERE id = ?", [
			title,
			datetime,
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
electron.ipcMain.handle("get-tasks", async () => await getTasks());
electron.ipcMain.handle("add-task", async (event, title) => await addTask(title));
electron.ipcMain.handle("toggle-task", async (event, id, completed) => await toggleTask(id, completed));
electron.ipcMain.handle("update-task-title", async (event, id, title) => await updateTaskTitle(id, title));
electron.ipcMain.handle("reorder-tasks", async (event, ids) => await reorderTasks(ids));
electron.ipcMain.handle("get-reminders", async () => await getReminders());
electron.ipcMain.handle("add-reminder", async (event, title, datetime) => await addReminder(title, datetime));
electron.ipcMain.handle("update-reminder", async (event, id, status, newDatetime) => await updateReminderStatus(id, status, newDatetime));
electron.ipcMain.handle("update-reminder-full", async (event, id, title, datetime) => await updateReminderFull(id, title, datetime));
electron.ipcMain.handle("delete-reminder", async (event, id) => await deleteReminder(id));
electron.ipcMain.handle("clear-history", async () => await clearHistory());
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
	settingsWindow = new electron.BrowserWindow({
		width: 400,
		height: 630,
		frame: false,
		transparent: true,
		webPreferences: { preload: node_path.default.join(__dirname, "preload.js") }
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
	historyWindow = new electron.BrowserWindow({
		width: 450,
		height: 500,
		frame: false,
		transparent: true,
		webPreferences: { preload: node_path.default.join(__dirname, "preload.js") }
	});
	const url = process.env.VITE_DEV_SERVER_URL ? `${process.env.VITE_DEV_SERVER_URL}#/history` : `file://${node_path.default.join(__dirname, "../dist/index.html")}#/history`;
	historyWindow.loadURL(url);
	historyWindow.on("closed", () => {
		historyWindow = null;
		if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("history-closed");
	});
}
electron.ipcMain.on("open-history", openHistoryWindow);
var popupWindow = null;
electron.ipcMain.on("show-popup", (event, reminder) => {
	if (popupWindow) popupWindow.close();
	const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
	const pWidth = 320;
	const pHeight = 150;
	popupWindow = new electron.BrowserWindow({
		width: pWidth,
		height: pHeight,
		x: width - pWidth - 20,
		y: height - pHeight - 20,
		frame: false,
		transparent: true,
		alwaysOnTop: true,
		webPreferences: { preload: node_path.default.join(__dirname, "preload.js") }
	});
	const encodedReminder = encodeURIComponent(JSON.stringify(reminder));
	const url = process.env.VITE_DEV_SERVER_URL ? `${process.env.VITE_DEV_SERVER_URL}#/popup?data=${encodedReminder}` : `file://${node_path.default.join(__dirname, "../dist/index.html")}#/popup?data=${encodedReminder}`;
	popupWindow.loadURL(url);
	popupWindow.on("closed", () => popupWindow = null);
});
electron.ipcMain.on("close-window", (event) => {
	const win = electron.BrowserWindow.fromWebContents(event.sender);
	if (win) win.close();
});
//#endregion
