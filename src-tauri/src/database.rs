use chrono::Local;
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tauri_plugin_autostart::ManagerExt;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub active_popups: Mutex<Vec<String>>,
}

#[derive(Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub completed: bool,
    pub position: i64,
    pub completedAt: Option<String>,
    pub createdAt: String,
    pub tag: Option<String>,
    pub tagColor: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct Reminder {
    pub id: i64,
    pub title: String,
    pub datetime: String,
    pub status: String,
    pub recurrence: Option<String>,
    pub createdAt: String,
}

pub fn get_dynamic_default_bottom(app: &tauri::AppHandle) -> i32 {
    if let Ok(Some(monitor)) = app.primary_monitor() {
        let scale_factor = monitor.scale_factor();
        let size = monitor.size();
        let work_area = monitor.work_area();
        
        let screen_height = size.height as f64 / scale_factor;
        let work_height = work_area.size.height as f64 / scale_factor;
        let work_y = work_area.position.y as f64 / scale_factor;
        
        let occupied_bottom = screen_height - (work_height + work_y);
        let margin = (occupied_bottom.max(0.0) + 15.0) as i32;
        return margin;
    }
    85 // fallback
}

pub fn init_db(db_path: &str, app: &tauri::AppHandle) -> Result<Connection> {
    let conn = Connection::open(db_path)?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, completed BOOLEAN DEFAULT 0, position INTEGER DEFAULT 0, completedAt DATETIME, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, tag TEXT, tagColor TEXT)", [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS reminders (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, datetime DATETIME NOT NULL, status TEXT DEFAULT 'agendado', recurrence TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP)", [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)",
        [],
    )?;
    
    let default_bottom = get_dynamic_default_bottom(app);
    let default_settings = vec![
        ("opacity", "90".to_string()),
        ("theme", "escuro".to_string()),
        ("themeColor", "#5c85ff".to_string()),
        ("delay", "1000".to_string()),
        ("startOnWindows", "true".to_string()),
        ("enablePomodoro", "false".to_string()),
        ("enableNotes", "false".to_string()),
        ("enableTasks", "true".to_string()),
        ("enableReminders", "true".to_string()),
        ("enableProgressBar", "true".to_string()),
        ("enableTags", "true".to_string()),
        ("pomodoroFocus", "25".to_string()),
        ("pomodoroBreak", "5".to_string()),
        ("pomodoroSound", "suave".to_string()),
        ("soundEnabled", "true".to_string()),
        ("soundVolume", "40".to_string()),
        ("soundType", "suave".to_string()),
        ("popupMarginRight", "15".to_string()),
        ("popupMarginBottom", default_bottom.to_string()),
        ("popupGap", "10".to_string()),
        ("edge", "right".to_string()),
        ("yPosition", "115".to_string()),
    ];
    for (k, v) in default_settings {
        let exists: Result<String, _> =
            conn.query_row("SELECT value FROM settings WHERE key = ?1", [k], |row| {
                row.get(0)
            });
        if exists.is_err() {
            conn.execute(
                "INSERT INTO settings (key, value) VALUES (?1, ?2)",
                params![k, v],
            )?;
        }
    }
    Ok(conn)
}

#[tauri::command]
pub fn get_tasks(state: tauri::State<AppState>) -> Result<Vec<Task>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, title, completed, position, completedAt, createdAt, tag, tagColor FROM tasks").map_err(|e| e.to_string())?;
    let task_iter = stmt
        .query_map([], |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                completed: row.get::<_, i32>(2)? == 1,
                position: row.get(3)?,
                completedAt: row.get(4)?,
                createdAt: row.get(5)?,
                tag: row.get(6)?,
                tagColor: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let (mut pending, mut completed) = (Vec::new(), Vec::new());
    for task in task_iter {
        if let Ok(t) = task {
            if t.completed {
                completed.push(t);
            } else {
                pending.push(t);
            }
        }
    }
    pending.sort_by(|a, b| a.position.cmp(&b.position));
    completed.sort_by(|a, b| b.completedAt.cmp(&a.completedAt));
    pending.extend(completed);
    Ok(pending)
}

#[tauri::command]
pub fn add_task(
    title: String,
    tag: Option<String>,
    tag_color: Option<String>,
    state: tauri::State<AppState>,
    app: tauri::AppHandle,
) -> Result<Task, String> {
    let conn = state.db.lock().unwrap();
    let pos = Local::now().timestamp_millis();
    conn.execute(
        "INSERT INTO tasks (title, completed, position, tag, tagColor) VALUES (?1, 0, ?2, ?3, ?4)",
        params![title, pos, tag, tag_color],
    )
    .map_err(|e| e.to_string())?;
    let _ = app.emit("data-updated", ());
    Ok(Task {
        id: conn.last_insert_rowid(),
        title,
        completed: false,
        position: pos,
        completedAt: None,
        createdAt: Local::now().to_rfc3339(),
        tag,
        tagColor: tag_color,
    })
}

#[tauri::command]
pub fn toggle_task(
    id: i64,
    completed: bool,
    state: tauri::State<AppState>,
    app: tauri::AppHandle,
) -> Result<bool, String> {
    let conn = state.db.lock().unwrap();
    if completed {
        let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        conn.execute(
            "UPDATE tasks SET completed = 1, completedAt = ?1 WHERE id = ?2",
            params![now, id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE tasks SET completed = 0, completedAt = NULL, position = ?1 WHERE id = ?2",
            params![Local::now().timestamp_millis(), id],
        )
        .map_err(|e| e.to_string())?;
    }
    let _ = app.emit("data-updated", ());
    Ok(true)
}

#[tauri::command]
pub fn update_task_title(
    id: i64,
    title: String,
    state: tauri::State<AppState>,
    app: tauri::AppHandle,
) -> Result<bool, String> {
    state
        .db
        .lock()
        .unwrap()
        .execute(
            "UPDATE tasks SET title = ?1 WHERE id = ?2",
            params![title, id],
        )
        .map_err(|e| e.to_string())?;
    let _ = app.emit("data-updated", ());
    Ok(true)
}

#[tauri::command]
pub fn delete_task(
    id: i64,
    state: tauri::State<AppState>,
    app: tauri::AppHandle,
) -> Result<bool, String> {
    state
        .db
        .lock()
        .unwrap()
        .execute("DELETE FROM tasks WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    let _ = app.emit("data-updated", ());
    Ok(true)
}

#[tauri::command]
pub fn update_task_tag(
    old_tag: String,
    new_tag: String,
    new_tag_color: String,
    state: tauri::State<AppState>,
    app: tauri::AppHandle,
) -> Result<bool, String> {
    state
        .db
        .lock()
        .unwrap()
        .execute(
            "UPDATE tasks SET tag = ?1, tagColor = ?2 WHERE tag = ?3",
            params![new_tag, new_tag_color, old_tag],
        )
        .map_err(|e| e.to_string())?;
    let _ = app.emit("data-updated", ());
    Ok(true)
}

#[tauri::command]
pub fn reorder_tasks(
    ids: Vec<i64>,
    state: tauri::State<AppState>,
    app: tauri::AppHandle,
) -> Result<bool, String> {
    let mut conn = state.db.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for (index, id) in ids.iter().enumerate() {
        tx.execute(
            "UPDATE tasks SET position = ?1 WHERE id = ?2",
            params![index as i64, id],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    let _ = app.emit("data-updated", ());
    Ok(true)
}

#[tauri::command]
pub fn get_reminders(state: tauri::State<AppState>) -> Result<Vec<Reminder>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, title, datetime, status, recurrence, createdAt FROM reminders ORDER BY datetime ASC").map_err(|e| e.to_string())?;
    let rems = stmt
        .query_map([], |row| {
            Ok(Reminder {
                id: row.get(0)?,
                title: row.get(1)?,
                datetime: row.get(2)?,
                status: row.get(3)?,
                recurrence: row.get(4)?,
                createdAt: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();
    Ok(rems)
}

#[tauri::command]
pub fn add_reminder(
    title: String,
    datetime: String,
    recurrence: String,
    state: tauri::State<AppState>,
    app: tauri::AppHandle,
) -> Result<Reminder, String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO reminders (title, datetime, recurrence) VALUES (?1, ?2, ?3)",
        params![title, datetime, recurrence],
    )
    .map_err(|e| e.to_string())?;
    let _ = app.emit("data-updated", ());
    Ok(Reminder {
        id: conn.last_insert_rowid(),
        title,
        datetime,
        status: "agendado".into(),
        recurrence: Some(recurrence),
        createdAt: Local::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn update_reminder(
    id: i64,
    status: String,
    new_datetime: Option<String>,
    state: tauri::State<AppState>,
    app: tauri::AppHandle,
) -> Result<bool, String> {
    let conn = state.db.lock().unwrap();
    if let Some(nd) = new_datetime {
        conn.execute(
            "UPDATE reminders SET status = ?1, datetime = ?2 WHERE id = ?3",
            params![status, nd, id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE reminders SET status = ?1 WHERE id = ?2",
            params![status, id],
        )
        .map_err(|e| e.to_string())?;
    }
    let _ = app.emit("data-updated", ());
    Ok(true)
}

#[tauri::command]
pub fn update_reminder_full(
    id: i64,
    title: String,
    datetime: String,
    state: tauri::State<AppState>,
    app: tauri::AppHandle,
) -> Result<bool, String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "UPDATE reminders SET title = ?1, datetime = ?2 WHERE id = ?3",
        params![title, datetime, id],
    )
    .map_err(|e| e.to_string())?;
    let _ = app.emit("data-updated", ());
    Ok(true)
}

#[tauri::command]
pub fn delete_reminder(
    id: i64,
    state: tauri::State<AppState>,
    app: tauri::AppHandle,
) -> Result<bool, String> {
    state
        .db
        .lock()
        .unwrap()
        .execute("DELETE FROM reminders WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    let _ = app.emit("data-updated", ());
    Ok(true)
}

#[tauri::command]
pub fn get_settings(
    state: tauri::State<AppState>,
) -> Result<std::collections::HashMap<String, String>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;
    let mut settings = std::collections::HashMap::new();
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;
    for row in rows {
        if let Ok((k, v)) = row {
            settings.insert(k, v);
        }
    }
    Ok(settings)
}

#[tauri::command]
pub fn update_setting(
    key: String,
    value: String,
    state: tauri::State<AppState>,
    app: tauri::AppHandle,
) -> Result<bool, String> {
    state
        .db
        .lock()
        .unwrap()
        .execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )
        .map_err(|e| e.to_string())?;

    if key == "startOnWindows" {
        let autostart_manager = app.autolaunch();
        if value == "true" {
            let _ = autostart_manager.enable();
        } else {
            let _ = autostart_manager.disable();
        }
    }

    let _ = app.emit("settings-updated", ());
    Ok(true)
}

#[tauri::command]
pub fn reset_settings(app: tauri::AppHandle, state: tauri::State<AppState>) -> Result<bool, String> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM settings", []).map_err(|e| e.to_string())?;
    
    let default_bottom = get_dynamic_default_bottom(&app);
    let default_settings = vec![
        ("opacity", "90".to_string()),
        ("theme", "escuro".to_string()),
        ("themeColor", "#5c85ff".to_string()),
        ("delay", "1000".to_string()),
        ("startOnWindows", "true".to_string()),
        ("enablePomodoro", "false".to_string()),
        ("enableNotes", "false".to_string()),
        ("enableTasks", "true".to_string()),
        ("enableReminders", "true".to_string()),
        ("enableProgressBar", "true".to_string()),
        ("enableTags", "true".to_string()),
        ("pomodoroFocus", "25".to_string()),
        ("pomodoroBreak", "5".to_string()),
        ("pomodoroSound", "suave".to_string()),
        ("soundEnabled", "true".to_string()),
        ("soundVolume", "40".to_string()),
        ("soundType", "suave".to_string()),
        ("popupMarginRight", "15".to_string()),
        ("popupMarginBottom", default_bottom.to_string()),
        ("popupGap", "10".to_string()),
        ("edge", "right".to_string()),
        ("yPosition", "115".to_string()),
    ];
    
    for (k, v) in default_settings {
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![k, v],
        ).map_err(|e| e.to_string())?;
    }
    
    let app_dir = app.path().app_data_dir().unwrap();
    let state_path = app_dir.join("window-state.json");
    if state_path.exists() {
        let _ = std::fs::remove_file(state_path);
    }
    
    if let Some(w) = app.get_webview_window("settings") {
        let _ = w.set_size(tauri::Size::Logical(tauri::LogicalSize { width: 560.0, height: 735.0 }));
        let _ = w.center();
    }
    if let Some(w) = app.get_webview_window("history") {
        let _ = w.set_size(tauri::Size::Logical(tauri::LogicalSize { width: 500.0, height: 600.0 }));
        let _ = w.center();
    }
    
    let autostart_manager = app.autolaunch();
    let _ = autostart_manager.enable();

    let _ = app.emit("settings-updated", ());
    Ok(true)
}

#[tauri::command]
pub fn reset_settings_tab(tab: String, app: tauri::AppHandle, state: tauri::State<AppState>) -> Result<bool, String> {
    let conn = state.db.lock().unwrap();
    let default_bottom = get_dynamic_default_bottom(&app);
    let bottom_str = default_bottom.to_string();
    
    let keys_to_reset = match tab.as_str() {
        "geral" => vec![
            ("enableProgressBar", "true"),
            ("enablePomodoro", "false"),
            ("pomodoroFocus", "25"),
            ("pomodoroBreak", "5"),
            ("enableTasks", "true"),
            ("enableReminders", "true"),
            ("enableNotes", "false"),
            ("enableTags", "true"),
            ("startOnWindows", "true"),
        ],
        "aparencia" => vec![
            ("theme", "escuro"),
            ("themeColor", "#5c85ff"),
            ("opacity", "90"),
            ("expandedOpacity", "100"),
        ],
        "audio" => vec![
            ("soundEnabled", "true"),
            ("soundVolume", "40"),
            ("soundType", "suave"),
            ("pomodoroSound", "suave"),
        ],
        "posicao" => vec![
            ("edge", "right"),
            ("delay", "1000"),
            ("popupMarginRight", "15"),
            ("popupMarginBottom", bottom_str.as_str()),
            ("popupGap", "10"),
        ],
        _ => return Err("Aba desconhecida".to_string()),
    };
    
    for (k, v) in keys_to_reset {
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![k, v],
        ).map_err(|e| e.to_string())?;
    }
    
    if tab == "geral" {
        let autostart_manager = app.autolaunch();
        let _ = autostart_manager.enable();
    }

    let _ = app.emit("settings-updated", ());
    Ok(true)
}
