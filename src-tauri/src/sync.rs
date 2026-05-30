use crate::database::{Task, Reminder, AppState};
use crate::security;
use serde::{Serialize, Deserialize};
use tauri::{State, Emitter};

// ==========================================
// CONFIGURAÇÕES GLOBAIS DO SUPABASE (SAAS)
// ==========================================
// Insira aqui os dados do seu Supabase de produção.
// A sincronização em nuvem funcionará automaticamente e invisivelmente para todos os clientes licenciados.
// Configurações globais ocultas e ofuscadas para blindagem do SaaS.

// ------------------------------------------
// ESTRUTURAS DE DADOS DA NUVEM (CLOUD MODELS)
// ------------------------------------------

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CloudTask {
    pub id: i64,
    pub title: String,
    pub completed: bool,
    pub tag: Option<String>,
    pub tag_color: Option<String>,
    pub details: Option<String>,
    pub position: i64,
    pub license_hash: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CloudReminder {
    pub id: i64,
    pub title: String,
    pub datetime: String,
    pub status: String,
    pub recurrence: Option<String>,
    pub original_datetime: Option<String>,
    pub license_hash: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CloudNote {
    pub license_hash: String,
    pub note_text: String,
    pub updated_at: String,
}

// ------------------------------------------
// MÓDULO 1: SINCRONIZAÇÃO DE TAREFAS (TASKS)
// ------------------------------------------

pub fn sync_tasks_to_cloud(
    tasks: Vec<Task>,
    license_key: &str,
    supabase_url: &str,
    supabase_key: &str,
) -> Result<(), String> {
    if supabase_url.is_empty() || supabase_key.is_empty() {
        return Err("Credenciais do Supabase não configuradas.".to_string());
    }

    let license_hash = security::get_sync_hash(license_key);
    
    // Fail-Closed: Erro de SSL Pinning aborta a conexão para segurança do usuário
    let agent = security::get_pinned_agent()
        .map_err(|e| format!("Falha de segurança no SSL Pinning: {}", e))?;
        
    let url = format!("{}/rest/v1/cloud_tasks", supabase_url);

    for task in tasks {
        let cloud_task = CloudTask {
            id: task.id,
            title: task.title,
            completed: task.completed,
            tag: task.tag,
            tag_color: task.tagColor,
            details: task.details,
            position: task.position,
            license_hash: license_hash.clone(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        };

        let payload = serde_json::to_string(&cloud_task)
            .map_err(|e| format!("Erro ao serializar tarefa: {}", e))?;

        let _ = agent.post(&url)
            .set("apikey", supabase_key)
            .set("Authorization", &format!("Bearer {}", supabase_key))
            .set("Content-Type", "application/json")
            .set("x-license-hash", &license_hash) // Cabeçalho de isolamento seguro RLS
            .set("Prefer", "resolution=merge-duplicates")
            .send_string(&payload);
    }
    Ok(())
}

pub fn fetch_tasks_from_cloud(
    license_key: &str,
    supabase_url: &str,
    supabase_key: &str,
) -> Result<Vec<CloudTask>, String> {
    if supabase_url.is_empty() || supabase_key.is_empty() {
        return Err("Credenciais do Supabase não configuradas.".to_string());
    }

    let license_hash = security::get_sync_hash(license_key);
    
    // Fail-Closed
    let agent = security::get_pinned_agent()
        .map_err(|e| format!("Falha de segurança no SSL Pinning: {}", e))?;
        
    let url = format!("{}/rest/v1/cloud_tasks?license_hash=eq.{}", supabase_url, license_hash);

    let response = agent.get(&url)
        .set("apikey", supabase_key)
        .set("Authorization", &format!("Bearer {}", supabase_key))
        .set("x-license-hash", &license_hash) // Cabeçalho de isolamento seguro RLS
        .call();

    match response {
        Ok(resp) => {
            let body = resp.into_string().map_err(|e| e.to_string())?;
            let cloud_tasks: Vec<CloudTask> = serde_json::from_str(&body).map_err(|e| e.to_string())?;
            Ok(cloud_tasks)
        }
        Err(e) => Err(format!("Erro na consulta de tarefas: {}", e)),
    }
}

// ------------------------------------------
// MÓDULO 2: SINCRONIZAÇÃO DE LEMBRETES (REMINDERS)
// ------------------------------------------

pub fn sync_reminders_to_cloud(
    reminders: Vec<Reminder>,
    license_key: &str,
    supabase_url: &str,
    supabase_key: &str,
) -> Result<(), String> {
    if supabase_url.is_empty() || supabase_key.is_empty() {
        return Ok(());
    }

    let license_hash = security::get_sync_hash(license_key);
    
    // Fail-Closed
    let agent = security::get_pinned_agent()
        .map_err(|e| format!("Falha de segurança no SSL Pinning: {}", e))?;
        
    let url = format!("{}/rest/v1/cloud_reminders", supabase_url);

    for r in reminders {
        let cr = CloudReminder {
            id: r.id,
            title: r.title,
            datetime: r.datetime,
            status: r.status,
            recurrence: r.recurrence,
            original_datetime: r.originalDatetime,
            license_hash: license_hash.clone(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        };

        let payload = serde_json::to_string(&cr).map_err(|e| e.to_string())?;
        let _ = agent.post(&url)
            .set("apikey", supabase_key)
            .set("Authorization", &format!("Bearer {}", supabase_key))
            .set("Content-Type", "application/json")
            .set("x-license-hash", &license_hash) // Cabeçalho de isolamento seguro RLS
            .set("Prefer", "resolution=merge-duplicates")
            .send_string(&payload);
    }
    Ok(())
}

pub fn fetch_reminders_from_cloud(
    license_key: &str,
    supabase_url: &str,
    supabase_key: &str,
) -> Result<Vec<CloudReminder>, String> {
    let license_hash = security::get_sync_hash(license_key);
    
    // Fail-Closed
    let agent = security::get_pinned_agent()
        .map_err(|e| format!("Falha de segurança no SSL Pinning: {}", e))?;
        
    let url = format!("{}/rest/v1/cloud_reminders?license_hash=eq.{}", supabase_url, license_hash);

    let response = agent.get(&url)
        .set("apikey", supabase_key)
        .set("Authorization", &format!("Bearer {}", supabase_key))
        .set("x-license-hash", &license_hash) // Cabeçalho de isolamento seguro RLS
        .call();

    match response {
        Ok(resp) => {
            let body = resp.into_string().map_err(|e| e.to_string())?;
            let cloud_reminders: Vec<CloudReminder> = serde_json::from_str(&body).map_err(|e| e.to_string())?;
            Ok(cloud_reminders)
        }
        Err(e) => Err(format!("Erro na consulta de lembretes: {}", e)),
    }
}

// ------------------------------------------
// MÓDULO 3: SINCRONIZAÇÃO DE NOTAS (QUICK NOTES)
// ------------------------------------------

pub fn sync_notes_to_cloud(
    note_text: &str,
    license_key: &str,
    supabase_url: &str,
    supabase_key: &str,
) -> Result<(), String> {
    if supabase_url.is_empty() || supabase_key.is_empty() {
        return Ok(());
    }

    let license_hash = security::get_sync_hash(license_key);
    
    // Fail-Closed
    let agent = security::get_pinned_agent()
        .map_err(|e| format!("Falha de segurança no SSL Pinning: {}", e))?;
        
    let url = format!("{}/rest/v1/cloud_notes", supabase_url);

    let cn = CloudNote {
        license_hash: license_hash.clone(),
        note_text: note_text.to_string(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };

    let payload = serde_json::to_string(&cn).map_err(|e| e.to_string())?;
    let _ = agent.post(&url)
        .set("apikey", supabase_key)
        .set("Authorization", &format!("Bearer {}", supabase_key))
        .set("Content-Type", "application/json")
        .set("x-license-hash", &license_hash) // Cabeçalho de isolamento seguro RLS
        .set("Prefer", "resolution=merge-duplicates")
        .send_string(&payload);
    Ok(())
}

pub fn fetch_notes_from_cloud(
    license_key: &str,
    supabase_url: &str,
    supabase_key: &str,
) -> Result<String, String> {
    let license_hash = security::get_sync_hash(license_key);
    
    // Fail-Closed
    let agent = security::get_pinned_agent()
        .map_err(|e| format!("Falha de segurança no SSL Pinning: {}", e))?;
        
    let url = format!("{}/rest/v1/cloud_notes?license_hash=eq.{}", supabase_url, license_hash);

    let response = agent.get(&url)
        .set("apikey", supabase_key)
        .set("Authorization", &format!("Bearer {}", supabase_key))
        .set("x-license-hash", &license_hash) // Cabeçalho de isolamento seguro RLS
        .call();

    match response {
        Ok(resp) => {
            let body = resp.into_string().map_err(|e| e.to_string())?;
            let cloud_notes: Vec<CloudNote> = serde_json::from_str(&body).map_err(|e| e.to_string())?;
            if let Some(note) = cloud_notes.first() {
                Ok(note.note_text.clone())
            } else {
                Ok("".to_string())
            }
        }
        Err(e) => Err(format!("Erro na consulta de notas: {}", e)),
    }
}

// ------------------------------------------
// MÓDULO 4: COMANDOS TAURI (ENTRYPOINTS SEGUROS)
// ------------------------------------------

#[tauri::command]
pub async fn sync_to_cloud(state: State<'_, AppState>) -> Result<bool, String> {
    // 1. Defesa Ativa contra Análise Dinâmica e Depuradores em Tempo de Execução
    security::detect_debugger();

    let (license_key, supabase_url, supabase_key) = {
        let conn = state.db.lock().unwrap();
        let lic = conn.query_row("SELECT value FROM settings WHERE key = 'license_key'", [], |row| row.get::<_, String>(0)).unwrap_or_default();
        let mut url = conn.query_row("SELECT value FROM settings WHERE key = 'supabase_url'", [], |row| row.get::<_, String>(0)).unwrap_or_default();
        let mut key = conn.query_row("SELECT value FROM settings WHERE key = 'supabase_anon_key'", [], |row| row.get::<_, String>(0)).unwrap_or_default();
        
        if url.is_empty() {
            url = security::get_supabase_url();
        }
        if key.is_empty() {
            key = security::get_supabase_key();
        }
        (lic, url, key)
    };

    if license_key.is_empty() {
        return Err("Licença Pro não ativada. Sincronização em nuvem é um recurso Premium.".to_string());
    }
    
    // 2. Validação Criptográfica Militar offline antes de liberar a transmissão dos dados (Anti-Fake/Bypass)
    security::verify_license(license_key.clone())
        .map_err(|e| format!("Chave de licença inválida ou violada: {}", e))?;

    if supabase_url.is_empty() || supabase_url.contains("seu-projeto-supabase-url") || supabase_key.is_empty() || supabase_key.contains("seu-token-anon") {
        return Err("Sincronização indisponível. Credenciais globais do Supabase não configuradas.".to_string());
    }

    // 1. Sincroniza Tarefas
    let tasks = {
        let conn = state.db.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, title, completed, position, tag, tagColor, details FROM tasks").map_err(|e| e.to_string())?;
        let task_iter = stmt.query_map([], |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                completed: row.get::<_, i32>(2)? == 1,
                position: row.get(3)?,
                completedAt: None,
                createdAt: "".to_string(),
                tag: row.get(4)?,
                tagColor: row.get(5)?,
                details: row.get(6)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for t in task_iter {
            if let Ok(task) = t {
                list.push(task);
            }
        }
        list
    };
    sync_tasks_to_cloud(tasks, &license_key, &supabase_url, &supabase_key)?;

    // 2. Sincroniza Lembretes
    let reminders = {
        let conn = state.db.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, title, datetime, status, recurrence, originalDatetime FROM reminders").map_err(|e| e.to_string())?;
        let r_iter = stmt.query_map([], |row| {
            Ok(Reminder {
                id: row.get(0)?,
                title: row.get(1)?,
                datetime: row.get(2)?,
                status: row.get(3)?,
                recurrence: row.get(4)?,
                createdAt: "".to_string(),
                originalDatetime: row.get(5)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for r in r_iter {
            if let Ok(rem) = r {
                list.push(rem);
            }
        }
        list
    };
    sync_reminders_to_cloud(reminders, &license_key, &supabase_url, &supabase_key)?;

    // 3. Sincroniza Notas Rápidas
    let note_text = {
        let conn = state.db.lock().unwrap();
        conn.query_row("SELECT value FROM settings WHERE key = 'quickNote'", [], |row| row.get::<_, String>(0)).unwrap_or_default()
    };
    sync_notes_to_cloud(&note_text, &license_key, &supabase_url, &supabase_key)?;

    Ok(true)
}

#[tauri::command]
pub async fn sync_from_cloud(state: State<'_, AppState>, app: tauri::AppHandle) -> Result<bool, String> {
    // 1. Defesa Ativa contra Análise Dinâmica e Depuradores em Tempo de Execução
    security::detect_debugger();

    let (license_key, supabase_url, supabase_key) = {
        let conn = state.db.lock().unwrap();
        let lic = conn.query_row("SELECT value FROM settings WHERE key = 'license_key'", [], |row| row.get::<_, String>(0)).unwrap_or_default();
        let mut url = conn.query_row("SELECT value FROM settings WHERE key = 'supabase_url'", [], |row| row.get::<_, String>(0)).unwrap_or_default();
        let mut key = conn.query_row("SELECT value FROM settings WHERE key = 'supabase_anon_key'", [], |row| row.get::<_, String>(0)).unwrap_or_default();
        
        if url.is_empty() {
            url = security::get_supabase_url();
        }
        if key.is_empty() {
            key = security::get_supabase_key();
        }
        (lic, url, key)
    };

    if license_key.is_empty() {
        return Err("Licença Pro não ativada. Sincronização em nuvem é um recurso Premium.".to_string());
    }

    // 2. Validação Criptográfica Militar offline antes de liberar a transmissão dos dados (Anti-Fake/Bypass)
    security::verify_license(license_key.clone())
        .map_err(|e| format!("Chave de licença inválida ou violada: {}", e))?;

    if supabase_url.is_empty() || supabase_url.contains("seu-projeto-supabase-url") || supabase_key.is_empty() || supabase_key.contains("seu-token-anon") {
        return Err("Sincronização indisponível. Credenciais globais do Supabase não configuradas.".to_string());
    }

    // 1. Puxa Tarefas da Nuvem
    let cloud_tasks = fetch_tasks_from_cloud(&license_key, &supabase_url, &supabase_key)?;

    // 2. Puxa Lembretes da Nuvem
    let cloud_reminders = fetch_reminders_from_cloud(&license_key, &supabase_url, &supabase_key)?;

    // 3. Puxa Nota da Nuvem
    let cloud_note = fetch_notes_from_cloud(&license_key, &supabase_url, &supabase_key)?;

    let mut conn = state.db.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Atualiza Tarefas localmente
    for ct in cloud_tasks {
        let completed_val = if ct.completed { 1 } else { 0 };
        tx.execute(
            "INSERT OR REPLACE INTO tasks (id, title, completed, position, tag, tagColor, details) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![ct.id, ct.title, completed_val, ct.position, ct.tag, ct.tag_color, ct.details],
        ).map_err(|e| e.to_string())?;
    }

    // Atualiza Lembretes localmente
    for cr in cloud_reminders {
        tx.execute(
            "INSERT OR REPLACE INTO reminders (id, title, datetime, status, recurrence, originalDatetime) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![cr.id, cr.title, cr.datetime, cr.status, cr.recurrence, cr.original_datetime],
        ).map_err(|e| e.to_string())?;
    }

    // Atualiza Nota localmente
    if !cloud_note.is_empty() {
        tx.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('quickNote', ?1)",
            rusqlite::params![cloud_note],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    let _ = app.emit("data-updated", ());
    Ok(true)
}
