//! Terminal Tauri Commands

use super::{manager::manager, TerminalError, TerminalInfo};
use crate::ssh::{AuthMethod, SshConfig};
use uuid::Uuid;
use tauri::AppHandle;

/// Create a new terminal session
#[tauri::command]
pub fn create_terminal(host_id: Uuid, host_name: String) -> TerminalInfo {
    manager().write().create_session(host_id, host_name)
}

/// Get terminal session info
#[tauri::command]
pub fn get_terminal(session_id: Uuid) -> Result<TerminalInfo, TerminalError> {
    manager()
        .read()
        .get_session(session_id)
        .ok_or_else(|| TerminalError::SessionNotFound(session_id.to_string()))
}

/// Get all terminal sessions
#[tauri::command]
pub fn get_terminals() -> Vec<TerminalInfo> {
    manager().read().get_sessions()
}

/// Connect terminal to SSH
#[tauri::command]
pub async fn connect_terminal(
    app: AppHandle,
    session_id: Uuid,
    host: String,
    port: u16,
    username: String,
    auth_type: String,
    password: Option<String>,
    key_path: Option<String>,
    passphrase: Option<String>,
) -> Result<(), TerminalError> {
    let auth_method = match auth_type.as_str() {
        "password" => AuthMethod::Password(password.unwrap_or_default()),
        "private_key" => AuthMethod::PrivateKey {
            key_path: key_path.unwrap_or_default(),
            passphrase,
        },
        "agent" => AuthMethod::Agent,
        _ => return Err(TerminalError::ConnectionFailed("Invalid auth type".to_string())),
    };

    let config = SshConfig {
        host,
        port,
        username,
        auth_method,
        timeout_seconds: 30,
    };

    let mut mgr = manager().write();
    let session = mgr
        .get_session_mut(session_id)
        .ok_or_else(|| TerminalError::SessionNotFound(session_id.to_string()))?;

    session.connect(config, app).await
}

/// Write data to terminal
#[tauri::command]
pub async fn write_terminal(session_id: Uuid, data: String) -> Result<(), TerminalError> {
    let mut mgr = manager().write();
    let session = mgr
        .get_session_mut(session_id)
        .ok_or_else(|| TerminalError::SessionNotFound(session_id.to_string()))?;

    session.write(data.as_bytes()).await
}

/// Resize terminal
#[tauri::command]
pub async fn resize_terminal(session_id: Uuid, cols: u32, rows: u32) -> Result<(), TerminalError> {
    let mut mgr = manager().write();
    let session = mgr
        .get_session_mut(session_id)
        .ok_or_else(|| TerminalError::SessionNotFound(session_id.to_string()))?;

    session.resize(cols, rows).await
}

/// Close terminal session
#[tauri::command]
pub async fn close_terminal(session_id: Uuid) -> Result<(), TerminalError> {
    let mut session = manager()
        .write()
        .close_session(session_id)
        .ok_or_else(|| TerminalError::SessionNotFound(session_id.to_string()))?;

    session.disconnect().await
}
