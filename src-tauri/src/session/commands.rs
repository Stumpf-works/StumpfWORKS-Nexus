//! Session Tauri Commands

use super::{manager, Session, SessionError};
use uuid::Uuid;

/// Get all active sessions
#[tauri::command]
pub fn get_sessions() -> Vec<Session> {
    manager().read().get_sessions()
}

/// Create a new session
#[tauri::command]
pub fn create_session(host_id: Uuid, name: String) -> Session {
    manager().write().create_session(host_id, name)
}

/// Close a session
#[tauri::command]
pub fn close_session(id: Uuid) -> Result<(), SessionError> {
    manager()
        .write()
        .close_session(id)
        .map(|_| ())
        .ok_or_else(|| SessionError::NotFound(id.to_string()))
}
