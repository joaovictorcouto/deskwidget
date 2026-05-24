import sqlite3 from 'sqlite3';
import path from 'node:path';
import { app } from 'electron';

let db;

export function initDb() {
  try {
    const dbPath = path.join(app.getPath('userData'), 'deskwidget.db');
    // Handle both ESM and CJS imports of sqlite3 safely
    const Sqlite3 = sqlite3.Database ? sqlite3 : sqlite3.default;
    db = new Sqlite3.Database(dbPath);

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

    // Add new columns to existing tables safely
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

    // Default settings
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

export function getTasks() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM tasks ORDER BY completed ASC, position ASC, createdAt ASC", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function addTask(title) {
  return new Promise((resolve, reject) => {
    const pos = Date.now(); // use timestamp as position to put at bottom
    db.run("INSERT INTO tasks (title, completed, position) VALUES (?, 0, ?)", [title, pos], function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, title, completed: 0, position: pos });
    });
  });
}

export function toggleTask(id, completed) {
  return new Promise((resolve, reject) => {
    const pos = completed ? 0 : Date.now(); // if unchecking, send to bottom
    const query = completed 
      ? "UPDATE tasks SET completed = 1, completedAt = datetime('now', 'localtime') WHERE id = ?"
      : "UPDATE tasks SET completed = 0, completedAt = NULL, position = ? WHERE id = ?";
    
    const params = completed ? [id] : [pos, id];
    
    db.run(query, params, (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

export function updateTaskTitle(id, title) {
  return new Promise((resolve, reject) => {
    db.run("UPDATE tasks SET title = ? WHERE id = ?", [title, id], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

export function reorderTasks(taskIds) {
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

export function getReminders() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM reminders ORDER BY datetime ASC", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function addReminder(title, datetime) {
  return new Promise((resolve, reject) => {
    db.run("INSERT INTO reminders (title, datetime) VALUES (?, ?)", [title, datetime], function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, title, datetime, status: 'agendado' });
    });
  });
}

export function updateReminderStatus(id, status, newDatetime = null) {
  return new Promise((resolve, reject) => {
    if (newDatetime) {
      db.run("UPDATE reminders SET status = ?, datetime = ? WHERE id = ?", [status, newDatetime, id], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    } else {
      db.run("UPDATE reminders SET status = ? WHERE id = ?", [status, id], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    }
  });
}

export function updateReminderFull(id, title, datetime) {
  return new Promise((resolve, reject) => {
    db.run("UPDATE reminders SET title = ?, datetime = ? WHERE id = ?", [title, datetime, id], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

export function deleteReminder(id) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM reminders WHERE id = ?", [id], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

export function clearHistory() {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM reminders WHERE status != 'agendado'", (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
}

export function getSettings() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM settings", (err, rows) => {
      if (err) reject(err);
      else {
        const settings = {
          enableTasks: 'true',
          enableReminders: 'true'
        };
        rows.forEach(r => settings[r.key] = r.value);
        resolve(settings);
      }
    });
  });
}

export function updateSetting(key, value) {
  return new Promise((resolve, reject) => {
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

export function resetSettings() {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM settings", (err) => {
      if (err) {
        reject(err);
      } else {
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
