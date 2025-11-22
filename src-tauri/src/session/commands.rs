//! Session Tauri Commands

use super::{manager, Session, SessionError};
use uuid::Uuid;

/// Get all active sessions
#[tauri::command]
pub async fn get_sessions() -> Vec<Session> {
    manager().read().await.get_sessions()
}

/// Create a new session
#[tauri::command]
pub async fn create_session(host_id: Uuid, name: String) -> Session {
    manager().write().await.create_session(host_id, name)
}

/// Close a session
#[tauri::command]
pub async fn close_session(id: Uuid) -> Result<(), SessionError> {
    manager()
        .write()
        .close_session(id)
        .map(|_| ())
        .ok_or_else(|| SessionError::NotFound(id.to_string()))
}
