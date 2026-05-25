use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager};

mod database;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = app.emit("force-expand", ());
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .setup(|app| {
            let app_dir = app.path().app_data_dir().unwrap();
            std::fs::create_dir_all(&app_dir).unwrap();
            let db_path = app_dir.join("deskwidget.db");

            let conn =
                database::init_db(db_path.to_str().unwrap()).expect("Falha ao inicializar o banco");
            app.manage(database::AppState {
                db: std::sync::Mutex::new(conn),
                active_popups: std::sync::Mutex::new(Vec::new()),
            });

            let app_handle = app.handle().clone();

            // Setup Tray Menu
            let quit_i = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
            let settings_i =
                MenuItem::with_id(app, "settings", "Configurações", true, None::<&str>)?;
            let history_i = MenuItem::with_id(app, "history", "Lembretes", true, None::<&str>)?;
            let restart_i = MenuItem::with_id(app, "restart", "Reiniciar", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&settings_i, &history_i, &restart_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .tooltip("DeskWidget")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "restart" => {
                        app.restart();
                    }
                    "settings" => {
                        let app_clone = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = open_settings(app_clone).await;
                        });
                    }
                    "history" => {
                        let app_clone = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = open_history(app_clone).await;
                        });
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            position_window(tray.app_handle(), true, None, None, None, None, None);
                            let _ = window.show();

                            let _ = window.set_focus();
                            let _ = tray.app_handle().emit("force-expand", ());
                        }
                    }
                })
                .build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                position_window(&app_handle, false, None, None, None, None, None);
                window.show().unwrap();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            database::get_tasks,
            database::add_task,
            database::toggle_task,
            database::update_task_title,
            database::delete_task,
            database::update_task_tag,
            database::reorder_tasks,
            database::get_reminders,
            database::add_reminder,
            database::update_reminder,
            database::update_reminder_full,
            database::delete_reminder,
            database::get_settings,
            database::update_setting,
            expand_window,
            collapse_window,
            update_position,
            preview_edge,
            open_settings,
            open_history,
            close_window,
            show_popup,
            pomodoro_action,
            get_positioner_margins,
            set_positioner_margins,
            save_popup_position,
        ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

const EXPANDED_WIDTH: f64 = 350.0;
const COLLAPSED_WIDTH: f64 = 8.0;
const COLLAPSED_HEIGHT: f64 = 150.0;

fn position_window(
    app: &tauri::AppHandle,
    expanded: bool,
    temp_edge: Option<String>,
    avail_x: Option<f64>,
    avail_y: Option<f64>,
    avail_width: Option<f64>,
    avail_height: Option<f64>,
) {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(Some(monitor)) = window.current_monitor() {
            let scale_factor = monitor.scale_factor();
            let size = monitor.size(); // PhysicalSize
            let pos = monitor.position(); // PhysicalPosition

            let mut edge = "right".to_string();
            let mut y_pos = 0.0;

            if let Ok(conn) = app.state::<database::AppState>().db.lock() {
                if let Ok(e) =
                    conn.query_row("SELECT value FROM settings WHERE key = 'edge'", [], |row| {
                        row.get::<_, String>(0)
                    })
                {
                    edge = e;
                }
                if let Ok(y) = conn.query_row(
                    "SELECT value FROM settings WHERE key = 'yPosition'",
                    [],
                    |row| row.get::<_, String>(0),
                ) {
                    y_pos = y.parse().unwrap_or(0.0);
                }
            }
            if let Some(t) = temp_edge {
                edge = t;
            }

            let logical_x = avail_x.unwrap_or(pos.x as f64 / scale_factor);
            let logical_y = avail_y.unwrap_or(pos.y as f64 / scale_factor);
            let logical_width = avail_width.unwrap_or(size.width as f64 / scale_factor);
            let logical_height = avail_height.unwrap_or(size.height as f64 / scale_factor);

            if expanded {
                let x = if edge == "left" {
                    logical_x
                } else {
                    logical_x + logical_width - EXPANDED_WIDTH
                };
                let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
                    width: EXPANDED_WIDTH,
                    height: logical_height,
                }));
                let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
                    x,
                    y: logical_y,
                }));
            } else {
                let x = if edge == "left" {
                    logical_x
                } else {
                    logical_x + logical_width - COLLAPSED_WIDTH
                };

                let mut start_y = if y_pos == 0.0 {
                    (logical_y + (logical_height - COLLAPSED_HEIGHT) / 2.0).floor()
                } else {
                    y_pos
                };
                if start_y > logical_y + logical_height - COLLAPSED_HEIGHT {
                    start_y = logical_y + logical_height - COLLAPSED_HEIGHT;
                }
                if start_y < logical_y {
                    start_y = logical_y;
                }
                let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
                    width: COLLAPSED_WIDTH,
                    height: COLLAPSED_HEIGHT,
                }));
                let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
                    x,
                    y: start_y,
                }));
            }
        }
    }
}

#[tauri::command]
fn expand_window(
    app: tauri::AppHandle,
    avail_x: Option<f64>,
    avail_y: Option<f64>,
    avail_width: Option<f64>,
    avail_height: Option<f64>,
) {
    position_window(
        &app,
        true,
        None,
        avail_x,
        avail_y,
        avail_width,
        avail_height,
    );
}

#[tauri::command]
fn collapse_window(
    app: tauri::AppHandle,
    avail_x: Option<f64>,
    avail_y: Option<f64>,
    avail_width: Option<f64>,
    avail_height: Option<f64>,
) {
    position_window(
        &app,
        false,
        None,
        avail_x,
        avail_y,
        avail_width,
        avail_height,
    );
}

#[tauri::command]
fn update_position(edge: String, y_pos: f64, app: tauri::AppHandle) {
    if let Ok(conn) = app.state::<database::AppState>().db.lock() {
        let _ = conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["edge", edge],
        );
        let _ = conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["yPosition", y_pos.to_string()],
        );
    }
    let _ = app.emit("settings-updated", ());
}

#[tauri::command]
fn preview_edge(
    app: tauri::AppHandle,
    temp_edge: String,
    avail_x: Option<f64>,
    avail_y: Option<f64>,
    avail_width: Option<f64>,
    avail_height: Option<f64>,
) {
    position_window(
        &app,
        true,
        Some(temp_edge),
        avail_x,
        avail_y,
        avail_width,
        avail_height,
    );
}

#[tauri::command]
async fn open_settings(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("settings") {
        let _ = w.set_focus();
        return Ok(());
    }
    let _ = app.emit("settings-opened", ());
    let window = tauri::WebviewWindowBuilder::new(
        &app,
        "settings",
        tauri::WebviewUrl::App("index.html#/settings".into()),
    )
    .title("Configurações")
    .inner_size(560.0, 680.0)
    .min_inner_size(560.0, 680.0)
    .transparent(true)
    .decorations(false)
    .shadow(false)
    .center()
    .build();

    if let Ok(w) = window {
        let app_handle = app.clone();
        w.on_window_event(move |event| {
            if let tauri::WindowEvent::Destroyed = event {
                let _ = app_handle.emit("settings-closed", ());
            }
        });
    }
    Ok(())
}

#[tauri::command]
async fn open_history(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("history") {
        let _ = w.set_focus();
        return Ok(());
    }
    let _ = app.emit("history-opened", ());
    let window = tauri::WebviewWindowBuilder::new(
        &app,
        "history",
        tauri::WebviewUrl::App("index.html#/history".into()),
    )
    .title("Histórico")
    .inner_size(500.0, 600.0)
    .min_inner_size(500.0, 600.0)
    .transparent(true)
    .decorations(false)
    .shadow(false)
    .center()
    .build();

    if let Ok(w) = window {
        let app_handle = app.clone();
        w.on_window_event(move |event| {
            if let tauri::WindowEvent::Destroyed = event {
                let _ = app_handle.emit("history-closed", ());
            }
        });
    }
    Ok(())
}

#[tauri::command]
fn close_window(window: tauri::Window) {
    let _ = window.close();
}

#[tauri::command]
async fn show_popup(config: serde_json::Value, app: tauri::AppHandle) -> Result<(), String> {
    let id_raw = config
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("popup_default");
    let id = id_raw.replace("_", "-").replace(":", "-");

    if app.get_webview_window(&id).is_none() {
        let url = format!(
            "index.html#/popup?config={}",
            urlencoding::encode(&config.to_string())
        );
        match tauri::WebviewWindowBuilder::new(
            &app,
            id.clone(),
            tauri::WebviewUrl::App(url.into()),
        )
        .title("Popup")
        .inner_size(320.0, 210.0)
        .transparent(true)
        .decorations(false)
        .shadow(false)
        .always_on_top(true)
        .resizable(false)
        .center()
        .build()
        {
            Ok(window) => {
                let id_clone = id.clone();
                let app_handle_clone = app.clone();
                let mut margins = get_positioner_margins(app.clone());
                let mut popup_count = 0;
                
                if id != "positioner" {
                    let state = app.state::<database::AppState>();
                    let mut active_popups = state.active_popups.lock().unwrap();
                    if !active_popups.contains(&id) {
                        active_popups.push(id.clone());
                    }
                    popup_count = active_popups.len().saturating_sub(1);
                }

                if popup_count > 0 {
                    let gap = if let Ok(conn) = app.state::<database::AppState>().db.lock() {
                        conn.query_row("SELECT value FROM settings WHERE key = 'popupGap'", [], |row| row.get::<_, String>(0))
                            .unwrap_or_else(|_| "4".to_string())
                            .parse::<f64>()
                            .unwrap_or(4.0)
                    } else {
                        4.0
                    };
                    margins.bottom += (popup_count as f64 * (210.0 + gap)) as i32;
                }

                set_window_margins(&window, margins.right, margins.bottom);

                if id == "positioner" {
                    let w_clone = window.clone();
                    window.on_window_event(move |event| {
                        if let tauri::WindowEvent::Moved(_) = event {
                            if let Ok(Some(monitor)) = w_clone.current_monitor() {
                                let scale_factor = monitor.scale_factor();
                                let size = monitor.size();
                                let mon_pos = monitor.position();
                                let logical_x = mon_pos.x as f64 / scale_factor;
                                let logical_y = mon_pos.y as f64 / scale_factor;
                                let logical_width = size.width as f64 / scale_factor;
                                let logical_height = size.height as f64 / scale_factor;

                                if let Ok(win_pos) = w_clone.outer_position() {
                                    let mut win_logical = win_pos.to_logical::<f64>(scale_factor);
                                    let mut clamped = false;
                                    
                                    if win_logical.x < logical_x { win_logical.x = logical_x; clamped = true; }
                                    if win_logical.y < logical_y { win_logical.y = logical_y; clamped = true; }
                                    if win_logical.x + 320.0 > logical_x + logical_width { win_logical.x = logical_x + logical_width - 320.0; clamped = true; }
                                    if win_logical.y + 210.0 > logical_y + logical_height { win_logical.y = logical_y + logical_height - 210.0; clamped = true; }
                                    
                                    if clamped {
                                        let _ = w_clone.set_position(tauri::Position::Logical(win_logical));
                                    }

                                    let mut right = logical_x + logical_width - win_logical.x - 320.0;
                                    let mut bottom = logical_y + logical_height - win_logical.y - 210.0;
                                    if right < 0.0 { right = 0.0; }
                                    if bottom < 0.0 { bottom = 0.0; }

                                    let _ = w_clone.emit(
                                        "positioner-metrics",
                                        serde_json::json!({ "right": right, "bottom": bottom }),
                                    );
                                }
                            }
                        }
                    });
                } else {
                    window.on_window_event(move |event| {
                        if let tauri::WindowEvent::Destroyed = event {
                            let state = app_handle_clone.state::<database::AppState>();
                            let mut popups = state.active_popups.lock().unwrap();
                            popups.retain(|x| x != &id_clone);
                            
                            let margins = get_positioner_margins(app_handle_clone.clone());
                            let gap = if let Ok(conn) = app_handle_clone.state::<database::AppState>().db.lock() {
                                conn.query_row("SELECT value FROM settings WHERE key = 'popupGap'", [], |row| row.get::<_, String>(0))
                                    .unwrap_or_else(|_| "4".to_string())
                                    .parse::<f64>()
                                    .unwrap_or(4.0)
                            } else {
                                4.0
                            };
                            
                            for (index, p_id) in popups.iter().enumerate() {
                                if let Some(w) = app_handle_clone.get_webview_window(p_id) {
                                    let this_bottom = margins.bottom + (index as f64 * (210.0 + gap)) as i32;
                                    set_window_margins(&w, margins.right, this_bottom);
                                }
                            }
                        }
                    });
                }
            }
            Err(e) => {
                println!("Error building popup window: {:?}", e);
                return Err(e.to_string());
            }
        }
    }
    Ok(())
}

fn set_window_margins(window: &tauri::WebviewWindow, right: i32, bottom: i32) {
    if let Ok(Some(monitor)) = window.current_monitor() {
        let scale_factor = monitor.scale_factor();
        let size = monitor.size();
        let pos = monitor.position();
        let logical_x = pos.x as f64 / scale_factor;
        let logical_y = pos.y as f64 / scale_factor;
        let logical_width = size.width as f64 / scale_factor;
        let logical_height = size.height as f64 / scale_factor;

        let w = 320.0;
        let h = 210.0;
        let x = logical_x + logical_width - w - right as f64;
        let y = logical_y + logical_height - h - bottom as f64;
        let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }));
    }
}

#[derive(serde::Serialize)]
struct PositionerMargins {
    right: i32,
    bottom: i32,
}

#[tauri::command]
fn get_positioner_margins(app: tauri::AppHandle) -> PositionerMargins {
    let mut right = 20;
    let mut bottom = 60;
    if let Ok(conn) = app.state::<database::AppState>().db.lock() {
        if let Ok(r) = conn.query_row(
            "SELECT value FROM settings WHERE key = 'popupMarginRight'",
            [],
            |row| row.get::<_, String>(0),
        ) {
            right = r.parse().unwrap_or(20);
        }
        if let Ok(b) = conn.query_row(
            "SELECT value FROM settings WHERE key = 'popupMarginBottom'",
            [],
            |row| row.get::<_, String>(0),
        ) {
            bottom = b.parse().unwrap_or(60);
        }
    }
    PositionerMargins { right, bottom }
}

#[tauri::command]
fn set_positioner_margins(right: i32, bottom: i32, app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("positioner") {
        set_window_margins(&window, right, bottom);
    }
}

#[tauri::command]
fn save_popup_position(right: i32, bottom: i32, app: tauri::AppHandle) {
    if let Ok(conn) = app.state::<database::AppState>().db.lock() {
        let _ = conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["popupMarginRight", right.to_string()],
        );
        let _ = conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["popupMarginBottom", bottom.to_string()],
        );
    }
    let _ = app.emit("settings-updated", ());
}

#[tauri::command]
fn pomodoro_action(action: String, app: tauri::AppHandle) {
    let _ = app.emit("pomodoro-action", action);
}
