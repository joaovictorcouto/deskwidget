use chrono::Local;
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tauri_plugin_autostart::ManagerExt;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub active_popups: Mutex<Vec<String>>,
    pub start_time: std::time::Instant,
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
    pub details: Option<String>,
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
    pub originalDatetime: Option<String>,
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
    let _ = conn.execute("ALTER TABLE tasks ADD COLUMN details TEXT", []);
    conn.execute(
        "CREATE TABLE IF NOT EXISTS reminders (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, datetime DATETIME NOT NULL, status TEXT DEFAULT 'agendado', recurrence TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP)", [],
    )?;
    let _ = conn.execute("ALTER TABLE reminders ADD COLUMN originalDatetime DATETIME", []);
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
    let mut stmt = conn.prepare("SELECT id, title, completed, position, completedAt, createdAt, tag, tagColor, details FROM tasks").map_err(|e| e.to_string())?;
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
                details: row.get(8)?,
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
        details: None,
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
    new_tag: Option<String>,
    new_tag_color: Option<String>,
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
    let mut stmt = conn.prepare("SELECT id, title, datetime, status, recurrence, createdAt, originalDatetime FROM reminders ORDER BY datetime ASC").map_err(|e| e.to_string())?;
    let rems = stmt
        .query_map([], |row| {
            Ok(Reminder {
                id: row.get(0)?,
                title: row.get(1)?,
                datetime: row.get(2)?,
                status: row.get(3)?,
                recurrence: row.get(4)?,
                createdAt: row.get(5)?,
                originalDatetime: row.get(6)?,
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
        originalDatetime: None,
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
            "UPDATE reminders SET originalDatetime = COALESCE(originalDatetime, datetime), status = ?1, datetime = ?2 WHERE id = ?3",
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

#[tauri::command]
pub fn update_single_task_tag(
    task_id: i64,
    tag: Option<String>,
    tag_color: Option<String>,
    state: tauri::State<AppState>,
    app: tauri::AppHandle,
) -> Result<bool, String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "UPDATE tasks SET tag = ?1, tagColor = ?2 WHERE id = ?3",
        params![tag, tag_color, task_id],
    )
    .map_err(|e| e.to_string())?;
    let _ = app.emit("data-updated", ());
    Ok(true)
}

#[tauri::command]
pub fn update_task_details(
    id: i64,
    details: Option<String>,
    state: tauri::State<AppState>,
    app: tauri::AppHandle,
) -> Result<bool, String> {
    state
        .db
        .lock()
        .unwrap()
        .execute(
            "UPDATE tasks SET details = ?1 WHERE id = ?2",
            params![details, id],
        )
        .map_err(|e| e.to_string())?;
    let _ = app.emit("data-updated", ());
    Ok(true)
}

#[tauri::command]
pub fn get_system_hardware_info() -> (String, String) {
    #[cfg(target_os = "windows")]
    {
        let cpu_out = std::process::Command::new("cmd")
            .args(&["/C", "wmic cpu get Name"])
            .output();
        let cpu = cpu_out.ok().and_then(|o| {
            String::from_utf8(o.stdout).ok().map(|s| {
                let lines: Vec<&str> = s.lines().collect();
                if lines.len() > 1 {
                    lines[1].trim().to_string()
                } else {
                    "Desconhecido".to_string()
                }
            })
        }).unwrap_or_else(|| "Desconhecido".to_string());

        let ram_out = std::process::Command::new("cmd")
            .args(&["/C", "wmic ComputerSystem get TotalPhysicalMemory"])
            .output();
        let ram = ram_out.ok().and_then(|o| {
            String::from_utf8(o.stdout).ok().and_then(|s| {
                let lines: Vec<&str> = s.lines().collect();
                if lines.len() > 1 {
                    lines[1].trim().parse::<u64>().ok().map(|bytes| {
                        format!("{} GB", bytes / 1024 / 1024 / 1024)
                    })
                } else {
                    None
                }
            })
        }).unwrap_or_else(|| "Desconhecido".to_string());

        (cpu, ram)
    }
    #[cfg(not(target_os = "windows"))]
    {
        ("Desconhecido".to_string(), "Desconhecido".to_string())
    }
}

pub fn escape_html(s: &str) -> String {
    s.replace("&", "&amp;")
     .replace("<", "&lt;")
     .replace(">", "&gt;")
}

#[tauri::command]
pub fn send_feedback(
    feedback_type: String,
    message: String,
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
) -> Result<bool, String> {
    let token = "8904259622:AAEe_AK-7t-UILw0EIgklBT4Ba7626J1siE";
    let chat_id = "8049604881";

    if token.is_empty() || chat_id.is_empty() {
        return Err("Telegram não configurado.".to_string());
    }

    let url = format!("https://api.telegram.org/bot{}/sendMessage", token);
    
    // Diagnósticos de Hardware e Software
    let info = os_info::get();
    let os_str = format!("{} {}", info.os_type(), info.version());
    let arch_str = format!("{}", info.architecture().unwrap_or("Desconhecida"));
    
    let (cpu, ram) = get_system_hardware_info();
    
    let mut resolution = "Desconhecido".to_string();
    let mut scale = "Desconhecido".to_string();
    if let Ok(Some(monitor)) = app.primary_monitor() {
        let size = monitor.size();
        let scale_factor = monitor.scale_factor();
        resolution = format!("{}x{}", size.width, size.height);
        scale = format!("{}%", (scale_factor * 100.0) as i32);
    }

    let uptime_secs = state.start_time.elapsed().as_secs();
    let hours = uptime_secs / 3600;
    let minutes = (uptime_secs % 3600) / 60;
    let seconds = uptime_secs % 60;
    let uptime_str = format!("{}h {}m {}s", hours, minutes, seconds);

    let msg_escaped = escape_html(&message);
    let os_escaped = escape_html(&os_str);
    let arch_escaped = escape_html(&arch_str);
    let cpu_escaped = escape_html(&cpu);
    let ram_escaped = escape_html(&ram);
    let res_escaped = escape_html(&resolution);
    let scale_escaped = escape_html(&scale);
    let uptime_escaped = escape_html(&uptime_str);

    let text_content = if feedback_type == "bug" {
        format!(
            "🐛 <b>NOVO BUG RELATADO PELO USUÁRIO</b>\n\n<b>Mensagem do Usuário:</b>\n\"{}\"\n\n─── 🖥️ <b>DIAGNÓSTICO DO DISPOSITIVO</b> ───\n<b>Sistema Operacional:</b> {}\n<b>Arquitetura:</b> {}\n<b>Processador:</b> {}\n<b>Memória RAM Total:</b> {}\n<b>Resolução da Tela:</b> {}\n<b>Escala do Display:</b> {}\n\n─── ⚙️ <b>SOFTWARE</b> ───\n<b>App Versão:</b> v1.2.3 (DeskWidget)\n<b>Uptime do App:</b> {}",
            msg_escaped, os_escaped, arch_escaped, cpu_escaped, ram_escaped, res_escaped, scale_escaped, uptime_escaped
        )
    } else {
        format!(
            "💡 <b>NOVA SUGESTÃO DE MELIORIA</b>\n\n<b>Mensagem do Usuário:</b>\n\"{}\"\n\n─── ⚙️ <b>SOFTWARE</b> ───\n<b>App Versão:</b> v1.2.3 (DeskWidget)\n<b>Uptime do App:</b> {}",
            msg_escaped, uptime_escaped
        )
    };

    let payload = serde_json::json!({
        "chat_id": chat_id,
        "text": text_content,
        "parse_mode": "HTML"
    });

    let json_str = serde_json::to_string(&payload).map_err(|e| e.to_string())?;

    let _res = ureq::post(&url)
        .set("Content-Type", "application/json")
        .send_string(&json_str)
        .map_err(|e| format!("Falha ao enviar para o Telegram: {}", e))?;

    Ok(true)
}

#[tauri::command]
pub fn report_js_error(
    error_msg: String,
    location: String,
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
) -> Result<bool, String> {
    let token = "8904259622:AAEe_AK-7t-UILw0EIgklBT4Ba7626J1siE";
    let chat_id = "8049604881";

    if token.is_empty() || chat_id.is_empty() {
        return Ok(false);
    }

    let url = format!("https://api.telegram.org/bot{}/sendMessage", token);

    // OS & Hardware info
    let info = os_info::get();
    let os_str = format!("{} {}", info.os_type(), info.version());
    let arch_str = format!("{}", info.architecture().unwrap_or("Desconhecida"));
    let (cpu, ram) = get_system_hardware_info();

    let mut resolution = "Desconhecido".to_string();
    let mut scale = "Desconhecido".to_string();
    if let Ok(Some(monitor)) = app.primary_monitor() {
        let size = monitor.size();
        let scale_factor = monitor.scale_factor();
        resolution = format!("{}x{}", size.width, size.height);
        scale = format!("{}%", (scale_factor * 100.0) as i32);
    }

    let uptime_secs = state.start_time.elapsed().as_secs();
    let hours = uptime_secs / 3600;
    let minutes = (uptime_secs % 3600) / 60;
    let seconds = uptime_secs % 60;
    let uptime_str = format!("{}h {}m {}s", hours, minutes, seconds);

    let error_escaped = escape_html(&error_msg);
    let loc_escaped = escape_html(&location);
    let os_escaped = escape_html(&os_str);
    let arch_escaped = escape_html(&arch_str);
    let cpu_escaped = escape_html(&cpu);
    let ram_escaped = escape_html(&ram);
    let res_escaped = escape_html(&resolution);
    let scale_escaped = escape_html(&scale);
    let uptime_escaped = escape_html(&uptime_str);

    let text_content = format!(
        "⚠️ <b>CRASH / ERRO TÉCNICO DETECTADO</b>\n\n<b>Origem:</b> 🌐 Frontend React (JS Error)\n<b>Detalhes do Erro:</b>\n<code>{}</code>\n<b>Localização:</b> <code>{}</code>\n\n─── 🖥️ <b>DIAGNÓSTICO DO SISTEMA</b> ───\n<b>Sistema Operacional:</b> {}\n<b>Arquitetura:</b> {}\n<b>Processador:</b> {}\n<b>Memória RAM Total:</b> {}\n<b>Resolução da Tela:</b> {}\n<b>Escala do Display:</b> {}\n\n─── ⚙️ <b>SOFTWARE & STATUS</b> ───\n<b>App Versão:</b> v1.2.3 (DeskWidget)\n<b>Uptime do App:</b> {}",
        error_escaped, loc_escaped, os_escaped, arch_escaped, cpu_escaped, ram_escaped, res_escaped, scale_escaped, uptime_escaped
    );

    let payload = serde_json::json!({
        "chat_id": chat_id,
        "text": text_content,
        "parse_mode": "HTML"
    });

    let json_str = serde_json::to_string(&payload).map_err(|e| e.to_string())?;

    let _ = ureq::post(&url)
        .set("Content-Type", "application/json")
        .send_string(&json_str);

    Ok(true)
}
