use std::process::Command;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use sha2::{Sha256, Digest};
use ed25519_dalek::{VerifyingKey, Signature};
use ed25519_dalek::Verifier;
use std::sync::{Mutex, OnceLock};
use std::collections::HashMap;

// Chave Pública Ed25519 Oficial (32 bytes em Hexadecimal)
const PUBLIC_KEY_HEX: &str = "cdb88da1f1703f98c1e549ab073f74d799c0ded793586ae3d6861ef6de8b1edf";



pub fn detect_debugger() {}

pub fn get_telegram_token() -> String {
    "8904259622:AAEe_AK-7t-UILw0EIgklBT4Ba7626J1siE".to_string()
}

pub fn get_telegram_chat_id() -> String {
    "8049604881".to_string()
}

pub fn get_supabase_url() -> String {
    "https://zpawkjebkogozdfhqubp.supabase.co".to_string()
}

pub fn get_supabase_key() -> String {
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYXdramVia29nb3pkZmhxdWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NjUzNTYsImV4cCI6MjA5NTQ0MTM1Nn0.DD6AEdm8qD65NjCOV987FutoAm8VEhdBdR-SK1aBQVM".to_string()
}

pub fn validate_update_url(url: &str) -> Result<(), String> {
    let normalized = url.to_lowercase();
    if normalized.starts_with("https://github.com/joaovictorcouto/deskwidget/") || 
       normalized.starts_with("https://api.github.com/repos/joaovictorcouto/deskwidget/") {
        Ok(())
    } else {
        Err("Acesso negado: URL de atualização não autorizada ou insegura!".to_string())
    }
}


#[tauri::command]
pub fn get_hwid() -> String {
    detect_debugger();
    let mut raw_id = String::new();

    // 1. UUID da Placa-Mãe
    if let Ok(uuid) = get_cmd_output("wmic", &["csproduct", "get", "uuid"]) {
        raw_id.push_str(&uuid);
    }

    // 2. ID do Processador (CPU)
    if let Ok(cpu_id) = get_cmd_output("wmic", &["cpu", "get", "processorid"]) {
        raw_id.push_str(&cpu_id);
    }

    // 3. Serial do Disco principal
    if let Ok(disk_serial) = get_cmd_output("wmic", &["diskdrive", "get", "serialnumber"]) {
        raw_id.push_str(&disk_serial);
    }

    // Limpeza secundária para evitar falsos vazios
    let cleaned = raw_id.replace(" ", "").replace("\r", "").replace("\n", "");

    // Fallback de segurança se tudo falhar
    if cleaned.trim().is_empty() || cleaned.to_lowercase().contains("to-be-filled-by-o.e.m.") {
        let comp_name = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "UNKNOWN_COMP".to_string());
        let user_name = std::env::var("USERNAME").unwrap_or_else(|_| "UNKNOWN_USER".to_string());
        raw_id.push_str(&format!("{}_{}", comp_name, user_name));
    }

    // Gerar Hash SHA-256 em formato Hexadecimal (64 caracteres)
    let mut hasher = Sha256::new();
    hasher.update(raw_id.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct ActivationRecord {
    license_id: String,
    hwid: String,
    device_name: Option<String>,
}

fn active_otps() -> &'static Mutex<HashMap<String, (String, std::time::Instant)>> {
    static OTPS: OnceLock<Mutex<HashMap<String, (String, std::time::Instant)>>> = OnceLock::new();
    OTPS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn generate_otp_code() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let mut hasher = Sha256::new();
    hasher.update(&now.to_be_bytes());
    let result = hasher.finalize();
    let val = u32::from_be_bytes([result[0], result[1], result[2], result[3]]);
    let code = (val % 900_000) + 100_000;
    format!("{}", code)
}

#[tauri::command]
pub async fn request_activation_otp(license_data: String) -> Result<String, String> {
    detect_debugger();
    
    // 1. Validação Criptográfica Offline (Ed25519)
    let parts: Vec<&str> = license_data.split('.').collect();
    if parts.len() != 2 {
        return Err("Formato de licença inválido.".to_string());
    }

    let payload_hex = parts[0];
    let signature_hex = parts[1];

    let payload_bytes = decode_hex(payload_hex)
        .map_err(|_| "Formato de payload corrompido.".to_string())?;
    
    let signature_bytes = decode_hex(signature_hex)
        .map_err(|_| "Formato de assinatura corrompido.".to_string())?;

    let pub_key_bytes = decode_hex(PUBLIC_KEY_HEX)
        .map_err(|_| "Erro interno de verificação.".to_string())?;
    
    let public_key_arr: [u8; 32] = pub_key_bytes.try_into()
        .map_err(|_| "Tamanho incorreto da chave de verificação.".to_string())?;
    
    let verifying_key = VerifyingKey::from_bytes(&public_key_arr)
        .map_err(|e| format!("Erro na chave Ed25519: {}", e))?;

    let signature_arr: [u8; 64] = signature_bytes.try_into()
        .map_err(|_| "Assinatura com tamanho inválido.".to_string())?;
    
    let signature = Signature::from_bytes(&signature_arr);

    // Valida a assinatura Ed25519 da CoutoApps
    verifying_key.verify(&payload_bytes, &signature)
        .map_err(|_| "Chave de licença inválida ou violada!".to_string())?;

    // Decodifica JSON
    let payload_str = String::from_utf8(payload_bytes)
        .map_err(|_| "UTF-8 inválido.".to_string())?;
    
    let license_json: serde_json::Value = serde_json::from_str(&payload_str)
        .map_err(|_| "JSON inválido.".to_string())?;

    let license_id = license_json.get("license_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "O campo 'license_id' está ausente na licença".to_string())?;

    let email = license_json.get("email")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "O campo 'email' está ausente na licença".to_string())?;

    // 2. Gera o código OTP de 6 dígitos
    let code = generate_otp_code();
    
    // Salva na memória RAM associado ao license_id com validade de 10 minutos
    {
        let mut otps = active_otps().lock().unwrap();
        otps.insert(license_id.to_string(), (code.clone(), std::time::Instant::now()));
    }

    // 3. Notifica o Telegram de logs do desenvolvedor (para testes rápidos no Beta!)
    let token = get_telegram_token();
    let chat_id = get_telegram_chat_id();
    if !token.is_empty() && !chat_id.is_empty() {
        let url = format!("https://api.telegram.org/bot{}/sendMessage", token);
        let text_content = format!(
            "🔑 <b>CÓDIGO DE CONFIRMAÇÃO OTP GERADO</b>\n\n<b>E-mail:</b> <code>{}</code>\n<b>Código de Acesso:</b> <code>{}</code>\n\n*(Este código expira em 10 minutos)*",
            email, code
        );
        let payload_tel = serde_json::json!({
            "chat_id": chat_id,
            "text": text_content,
            "parse_mode": "HTML"
        });
        if let Ok(json_str) = serde_json::to_string(&payload_tel) {
            let _ = ureq::post(&url)
                .set("Content-Type", "application/json")
                .send_string(&json_str);
        }
    }

    // Retorna o e-mail para exibição visual (exibindo parcialmente o e-mail para privacidade)
    let parts_email: Vec<&str> = email.split('@').collect();
    if parts_email.len() == 2 {
        let name = parts_email[0];
        let domain = parts_email[1];
        let masked = if name.len() > 3 {
            format!("{}***@{}", &name[0..3], domain)
        } else {
            format!("***@{}", domain)
        };
        Ok(masked)
    } else {
        Ok(email.to_string())
    }
}

#[tauri::command]
pub async fn verify_and_activate(code: String, license_data: String) -> Result<bool, String> {
    detect_debugger();

    // 1. Validação Criptográfica Offline (Ed25519)
    let parts: Vec<&str> = license_data.split('.').collect();
    if parts.len() != 2 {
        return Err("Formato de licença inválido.".to_string());
    }

    let payload_hex = parts[0];
    let signature_hex = parts[1];

    let payload_bytes = decode_hex(payload_hex)
        .map_err(|_| "Formato de payload corrompido.".to_string())?;
    
    let signature_bytes = decode_hex(signature_hex)
        .map_err(|_| "Formato de assinatura corrompido.".to_string())?;

    let pub_key_bytes = decode_hex(PUBLIC_KEY_HEX)
        .map_err(|_| "Erro interno de verificação.".to_string())?;
    
    let public_key_arr: [u8; 32] = pub_key_bytes.try_into()
        .map_err(|_| "Tamanho incorreto da chave de verificação.".to_string())?;
    
    let verifying_key = VerifyingKey::from_bytes(&public_key_arr)
        .map_err(|e| format!("Erro na chave Ed25519: {}", e))?;

    let signature_arr: [u8; 64] = signature_bytes.try_into()
        .map_err(|_| "Assinatura com tamanho inválido.".to_string())?;
    
    let signature = Signature::from_bytes(&signature_arr);

    // Valida assinatura Ed25519
    verifying_key.verify(&payload_bytes, &signature)
        .map_err(|_| "Chave de licença inválida ou violada!".to_string())?;

    // Decodifica JSON
    let payload_str = String::from_utf8(payload_bytes)
        .map_err(|_| "UTF-8 inválido.".to_string())?;
    
    let license_json: serde_json::Value = serde_json::from_str(&payload_str)
        .map_err(|_| "JSON inválido.".to_string())?;

    let license_id = license_json.get("license_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "O campo 'license_id' está ausente na licença".to_string())?;

    let email = license_json.get("email")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "O campo 'email' está ausente na licença".to_string())?;

    let device_limit = license_json.get("device_limit")
        .and_then(|v| v.as_i64())
        .unwrap_or(2);

    // 2. Valida o código OTP na memória RAM temporária
    {
        let mut otps = active_otps().lock().unwrap();
        if let Some((saved_code, timestamp)) = otps.get(license_id) {
            // Verifica expiração de 10 minutos (600 segundos)
            if timestamp.elapsed().as_secs() > 600 {
                otps.remove(license_id);
                return Err("O código de ativação expirou! Solicite um novo código.".to_string());
            }
            if saved_code != &code.trim() {
                return Err("Código de confirmação incorreto! Verifique seu e-mail.".to_string());
            }
            // Código correto! Remove da memória
            otps.remove(license_id);
        } else {
            return Err("Nenhum código OTP solicitado para esta chave. Solicite o envio primeiro.".to_string());
        }
    }

    // 3. Processo de Registro no Supabase (Ativação Online)
    let current_hwid = get_hwid();
    let supabase_url = get_supabase_url();
    let supabase_key = get_supabase_key();

    let agent = get_pinned_agent()
        .map_err(|e| format!("Falha de SSL Pinning: {}", e))?;

    // Se o e-mail for o seu pessoal de desenvolvedor, ignora limite máximo de ativações
    let is_dev_email = email == "jv.santos.couto@gmail.com";

    if !is_dev_email {
        // Consulta se este computador já está ativado ou se bateu no limite
        let query_url = format!(
            "{}/rest/v1/license_activations?license_id=eq.{}&select=hwid",
            supabase_url, license_id
        );

        let response = agent.get(&query_url)
            .set("apikey", &supabase_key)
            .set("Authorization", &format!("Bearer {}", supabase_key))
            .call()
            .map_err(|e| format!("Erro ao consultar servidor de ativação: {}", e))?;

        let body = response.into_string()
            .map_err(|_| "Resposta do servidor corrompida.".to_string())?;

        let activations: Vec<serde_json::Value> = serde_json::from_str(&body)
            .map_err(|_| "Dados do servidor com formato inválido.".to_string())?;

        let mut already_activated = false;
        for act in &activations {
            if let Some(h) = act.get("hwid").and_then(|v| v.as_str()) {
                if h == current_hwid {
                    already_activated = true;
                    break;
                }
            }
        }

        if already_activated {
            return Ok(true);
        }

        let active_count = activations.len() as i64;
        if active_count >= device_limit {
            return Err(format!(
                "Esta chave de licença atingiu o limite máximo de {} dispositivo(s) ativos. Adquira mais vagas no painel comercial!",
                device_limit
            ));
        }
    }

    // Insere o registro de HWID na tabela do Supabase
    let insert_url = format!("{}/rest/v1/license_activations", supabase_url);
    let comp_name = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "Windows Device".to_string());

    let record = ActivationRecord {
        license_id: license_id.to_string(),
        hwid: current_hwid,
        device_name: Some(comp_name),
    };

    let payload_insert = serde_json::to_string(&record)
        .map_err(|_| "Erro ao serializar registro.".to_string())?;

    let insert_response = agent.post(&insert_url)
        .set("apikey", &supabase_key)
        .set("Authorization", &format!("Bearer {}", supabase_key))
        .set("Content-Type", "application/json")
        .send_string(&payload_insert);

    match insert_response {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("Falha ao registrar ativação no servidor: {}", e)),
    }
}

#[tauri::command]
pub fn verify_license(license_data: String) -> Result<bool, String> {
    detect_debugger();
    let parts: Vec<&str> = license_data.split('.').collect();
    if parts.len() != 2 {
        return Err("Formato de licença inválido.".to_string());
    }

    let payload_hex = parts[0];
    let signature_hex = parts[1];

    let payload_bytes = decode_hex(payload_hex)
        .map_err(|_| "Formato de payload corrompido.".to_string())?;
    
    let signature_bytes = decode_hex(signature_hex)
        .map_err(|_| "Formato de assinatura corrompido.".to_string())?;

    let pub_key_bytes = decode_hex(PUBLIC_KEY_HEX)
        .map_err(|_| "Erro interno de verificação.".to_string())?;
    
    let public_key_arr: [u8; 32] = pub_key_bytes.try_into()
        .map_err(|_| "Tamanho incorreto da chave de verificação.".to_string())?;
    
    let verifying_key = VerifyingKey::from_bytes(&public_key_arr)
        .map_err(|e| format!("Erro na chave Ed25519: {}", e))?;

    let signature_arr: [u8; 64] = signature_bytes.try_into()
        .map_err(|_| "Assinatura com tamanho inválido.".to_string())?;
    
    let signature = Signature::from_bytes(&signature_arr);

    // Validação estrita offline da assinatura Ed25519
    verifying_key.verify(&payload_bytes, &signature)
        .map_err(|_| "Chave de licença inválida ou violada!".to_string())?;

    Ok(true)
}

#[allow(dead_code)]
pub fn get_pinned_agent() -> Result<ureq::Agent, String> {
    // Retorna o agente padrão do ureq que valida certificados utilizando o repositório nativo do SO
    Ok(ureq::agent())
}

fn get_cmd_output(cmd: &str, args: &[&str]) -> Result<String, std::io::Error> {
    let mut command = Command::new(cmd);
    command.args(args);
    
    #[cfg(target_os = "windows")]
    {
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW: impede qualquer piscar de janela do prompt de comando
    }

    let output = command.output()?;
    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout);
        // Filtra para remover cabeçalhos do wmic e linhas vazias
        let lines: Vec<&str> = text.lines()
            .map(|l| l.trim())
            .filter(|l| {
                let lower = l.to_lowercase();
                !l.is_empty() && 
                lower != "uuid" && 
                lower != "processorid" && 
                lower != "serialnumber" && 
                lower != "to be filled by o.e.m."
            })
            .collect();
        Ok(lines.join(""))
    } else {
        Err(std::io::Error::new(std::io::ErrorKind::Other, "Command failed"))
    }
}

#[derive(Clone)]
struct EmailOtpSession {
    code: String,
    license_key: String,
    timestamp: std::time::Instant,
}

fn email_otp_sessions() -> &'static Mutex<HashMap<String, EmailOtpSession>> {
    static SESSIONS: OnceLock<Mutex<HashMap<String, EmailOtpSession>>> = OnceLock::new();
    SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

#[tauri::command]
pub async fn request_otp_by_email(email: String) -> Result<String, String> {
    detect_debugger();
    let cleaned_email = email.trim().to_lowercase();
    if cleaned_email.is_empty() {
        return Err("Por favor, informe seu e-mail.".to_string());
    }

    let supabase_url = get_supabase_url();
    let supabase_key = get_supabase_key();

    let agent = get_pinned_agent()
        .map_err(|e| format!("Falha de SSL Pinning: {}", e))?;

    let query_url = format!(
        "{}/rest/v1/licenses?email=eq.{}&select=id,license_key,device_limit",
        supabase_url, urlencoding::encode(&cleaned_email)
    );

    let response = agent.get(&query_url)
        .set("apikey", &supabase_key)
        .set("Authorization", &format!("Bearer {}", supabase_key))
        .call()
        .map_err(|e| format!("Erro ao consultar licença: {}", e))?;

    let body = response.into_string()
        .map_err(|_| "Resposta do servidor corrompida.".to_string())?;

    let licenses: Vec<serde_json::Value> = serde_json::from_str(&body)
        .map_err(|_| "Formato inválido de resposta do servidor.".to_string())?;

    if licenses.is_empty() {
        return Err("Nenhuma licença Pro ativa foi encontrada para este e-mail. Verifique se digitou o e-mail correto da compra!".to_string());
    }

    let license_obj = &licenses[0];
    let license_key = license_obj.get("license_key")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Chave de licença ausente no servidor.".to_string())?;

    // Gera o código OTP de 6 dígitos
    let code = generate_otp_code();

    // Salva na memória RAM associado ao e-mail
    {
        let mut sessions = email_otp_sessions().lock().unwrap();
        sessions.insert(cleaned_email.clone(), EmailOtpSession {
            code: code.clone(),
            license_key: license_key.to_string(),
            timestamp: std::time::Instant::now(),
        });
    }

    // Notifica o Telegram de logs do desenvolvedor (para testes rápidos no Beta!)
    let token = get_telegram_token();
    let chat_id = get_telegram_chat_id();
    if !token.is_empty() && !chat_id.is_empty() {
        let url = format!("https://api.telegram.org/bot{}/sendMessage", token);
        let text_content = format!(
            "🔑 <b>NOVA SOLICITAÇÃO POR E-MAIL</b>\n\n<b>E-mail:</b> <code>{}</code>\n<b>Código de Acesso:</b> <code>{}</code>\n\n*(Este código expira em 10 minutos)*",
            cleaned_email, code
        );
        let payload_tel = serde_json::json!({
            "chat_id": chat_id,
            "text": text_content,
            "parse_mode": "HTML"
        });
        if let Ok(json_str) = serde_json::to_string(&payload_tel) {
            let _ = ureq::post(&url)
                .set("Content-Type", "application/json")
                .send_string(&json_str);
        }
    }

    // Retorna o e-mail mascarado
    let parts_email: Vec<&str> = cleaned_email.split('@').collect();
    if parts_email.len() == 2 {
        let name = parts_email[0];
        let domain = parts_email[1];
        let masked = if name.len() > 3 {
            format!("{}***@{}", &name[0..3], domain)
        } else {
            format!("***@{}", domain)
        };
        Ok(masked)
    } else {
        Ok(cleaned_email)
    }
}

#[tauri::command]
pub async fn verify_email_otp_and_activate(email: String, code: String) -> Result<String, String> {
    detect_debugger();
    let cleaned_email = email.trim().to_lowercase();
    let code_trimmed = code.trim();

    // 1. Valida o código OTP na memória RAM temporária
    let license_key = {
        let mut sessions = email_otp_sessions().lock().unwrap();
        if let Some(session) = sessions.get(&cleaned_email) {
            if session.timestamp.elapsed().as_secs() > 600 {
                sessions.remove(&cleaned_email);
                return Err("O código de ativação expirou! Solicite um novo código.".to_string());
            }
            if session.code != code_trimmed {
                return Err("Código de confirmação incorreto! Verifique seu e-mail.".to_string());
            }
            let key = session.license_key.clone();
            sessions.remove(&cleaned_email);
            key
        } else {
            return Err("Nenhum código OTP solicitado para este e-mail. Solicite o envio primeiro.".to_string());
        }
    };

    // 2. Validação Criptográfica Offline (Ed25519) da licença recuperada
    let parts: Vec<&str> = license_key.split('.').collect();
    if parts.len() != 2 {
        return Err("Formato de licença recuperada é inválido.".to_string());
    }

    let payload_hex = parts[0];
    let signature_hex = parts[1];

    let payload_bytes = decode_hex(payload_hex)
        .map_err(|_| "Formato de payload corrompido.".to_string())?;
    let signature_bytes = decode_hex(signature_hex)
        .map_err(|_| "Formato de assinatura corrompido.".to_string())?;

    let pub_key_bytes = decode_hex(PUBLIC_KEY_HEX)
        .map_err(|_| "Erro interno de verificação.".to_string())?;
    let public_key_arr: [u8; 32] = pub_key_bytes.try_into()
        .map_err(|_| "Tamanho incorreto da chave de verificação.".to_string())?;
    let verifying_key = VerifyingKey::from_bytes(&public_key_arr)
        .map_err(|e| format!("Erro na chave Ed25519: {}", e))?;

    let signature_arr: [u8; 64] = signature_bytes.try_into()
        .map_err(|_| "Assinatura com tamanho inválido.".to_string())?;
    let signature = Signature::from_bytes(&signature_arr);

    verifying_key.verify(&payload_bytes, &signature)
        .map_err(|_| "Chave de licença inválida ou violada!".to_string())?;

    let payload_str = String::from_utf8(payload_bytes)
        .map_err(|_| "UTF-8 inválido.".to_string())?;
    let license_json: serde_json::Value = serde_json::from_str(&payload_str)
        .map_err(|_| "JSON inválido.".to_string())?;

    let license_id = license_json.get("license_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "O campo 'license_id' está ausente na licença".to_string())?;

    let device_limit = license_json.get("device_limit")
        .and_then(|v| v.as_i64())
        .unwrap_or(2);

    // 3. Processo de Registro de Ativação no Supabase
    let current_hwid = get_hwid();
    let supabase_url = get_supabase_url();
    let supabase_key = get_supabase_key();

    let agent = get_pinned_agent()
        .map_err(|e| format!("Falha de SSL Pinning: {}", e))?;

    let is_dev_email = cleaned_email == "jv.santos.couto@gmail.com";

    if !is_dev_email {
        // Consulta se este computador já está ativado ou se bateu no limite
        let query_url = format!(
            "{}/rest/v1/license_activations?license_id=eq.{}&select=hwid",
            supabase_url, license_id
        );

        let response = agent.get(&query_url)
            .set("apikey", &supabase_key)
            .set("Authorization", &format!("Bearer {}", supabase_key))
            .call()
            .map_err(|e| format!("Erro ao consultar servidor de ativação: {}", e))?;

        let body = response.into_string()
            .map_err(|_| "Resposta do servidor corrompida.".to_string())?;

        let activations: Vec<serde_json::Value> = serde_json::from_str(&body)
            .map_err(|_| "Dados do servidor com formato inválido.".to_string())?;

        let mut already_activated = false;
        for act in &activations {
            if let Some(h) = act.get("hwid").and_then(|v| v.as_str()) {
                if h == current_hwid {
                    already_activated = true;
                    break;
                }
            }
        }

        if already_activated {
            return Ok(license_key);
        }

        let active_count = activations.len() as i64;
        if active_count >= device_limit {
            return Err(format!(
                "Esta chave de licença atingiu o limite máximo de {} dispositivo(s) ativos. Adquira mais vagas no painel comercial!",
                device_limit
            ));
        }
    }

    // Insere o registro de HWID na tabela do Supabase
    let insert_url = format!("{}/rest/v1/license_activations", supabase_url);
    let comp_name = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "Windows Device".to_string());

    let record = ActivationRecord {
        license_id: license_id.to_string(),
        hwid: current_hwid,
        device_name: Some(comp_name),
    };

    let payload_insert = serde_json::to_string(&record)
        .map_err(|_| "Erro ao serializar registro.".to_string())?;

    let insert_response = agent.post(&insert_url)
        .set("apikey", &supabase_key)
        .set("Authorization", &format!("Bearer {}", supabase_key))
        .set("Content-Type", "application/json")
        .send_string(&payload_insert);

    match insert_response {
        Ok(_) => Ok(license_key),
        Err(e) => Err(format!("Falha ao registrar ativação no servidor: {}", e)),
    }
}

pub fn get_sync_hash(license_key: &str) -> String {
    // Tenta obter o payload da licença de forma segura
    if let Some(parts) = license_key.split('.').next() {
        if let Ok(payload_bytes) = decode_hex(parts) {
            if let Ok(payload_str) = String::from_utf8(payload_bytes) {
                if let Ok(license_json) = serde_json::from_str::<serde_json::Value>(&payload_str) {
                    // Se o desenvolvedor configurou um license_id comum nas chaves do mesmo cliente,
                    // usamos ele para sincronização unificada entre múltiplos dispositivos.
                    if let Some(id_val) = license_json.get("license_id").and_then(|v| v.as_str()) {
                        let hasher = sha2::Sha256::digest(id_val.as_bytes());
                        return format!("{:x}", hasher);
                    }
                    if let Some(email_val) = license_json.get("email").and_then(|v| v.as_str()) {
                        let hasher = sha2::Sha256::digest(email_val.as_bytes());
                        return format!("{:x}", hasher);
                    }
                }
            }
        }
    }
    // Fallback: hash do license_key inteiro
    let hasher = sha2::Sha256::digest(license_key.as_bytes());
    format!("{:x}", hasher)
}

fn decode_hex(s: &str) -> Result<Vec<u8>, std::num::ParseIntError> {
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16))
        .collect()
}
