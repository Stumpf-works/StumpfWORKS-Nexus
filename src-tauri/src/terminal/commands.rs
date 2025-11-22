//! Terminal Tauri Commands

use super::{manager::manager, TerminalError, TerminalInfo};
use crate::ssh::{AuthMethod, SshConfig};
use uuid::Uuid;
use tauri::AppHandle;

/// Create a new terminal session
#[tauri::command]
pub async fn create_terminal(host_id: Uuid, host_name: String) -> TerminalInfo {
    manager().write().await.create_session(host_id, host_name)
}

/// Get terminal session info
#[tauri::command]
pub async fn get_terminal(session_id: Uuid) -> Result<TerminalInfo, TerminalError> {
    manager()
        .read()
        .await.get_session(session_id)
        .ok_or_else(|| TerminalError::SessionNotFound(session_id.to_string()))
}

/// Get all terminal sessions
#[tauri::command]
pub async fn get_terminals() -> Vec<TerminalInfo> {
    manager().read().await.get_sessions()
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
        host: host.clone(),
        port,
        username,
        auth_method,
        timeout_seconds: 30,
    };

    // Check if terminal session exists, create if not
    let session_exists = manager().read().await.get_session(session_id).is_some();
    if !session_exists {
        // Create a new terminal session with the same ID
        let mut mgr = manager().write().await;
        mgr.create_session_with_id(session_id, session_id, host);
    }

    // Take session out to avoid holding lock across await
    let mut session = manager()
        .write()
        .await.close_session(session_id)
        .ok_or_else(|| TerminalError::SessionNotFound(session_id.to_string()))?;

    let result = session.connect(config, app).await;

    // Put session back
    manager().write().await.insert_session(session_id, session);

    result
}

/// Write data to terminal
#[tauri::command]
pub async fn write_terminal(session_id: Uuid, data: String) -> Result<(), TerminalError> {
    // Take session out to avoid holding lock across await
    let mut session = manager()
        .write()
        .await.close_session(session_id)
        .ok_or_else(|| TerminalError::SessionNotFound(session_id.to_string()))?;

    let result = session.write(data.as_bytes()).await;

    // Put session back
    manager().write().await.insert_session(session_id, session);

    result
}

/// Resize terminal
#[tauri::command]
pub async fn resize_terminal(session_id: Uuid, cols: u32, rows: u32) -> Result<(), TerminalError> {
    // Take session out to avoid holding lock across await
    let mut session = manager()
        .write()
        .await.close_session(session_id)
        .ok_or_else(|| TerminalError::SessionNotFound(session_id.to_string()))?;

    let result = session.resize(cols, rows).await;

    // Put session back
    manager().write().await.insert_session(session_id, session);

    result
}

/// Close terminal session
#[tauri::command]
pub async fn close_terminal(session_id: Uuid) -> Result<(), TerminalError> {
    let mut session = manager()
        .write()
        .await.close_session(session_id)
        .ok_or_else(|| TerminalError::SessionNotFound(session_id.to_string()))?;

    session.disconnect().await
}
