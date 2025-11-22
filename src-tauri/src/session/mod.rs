//! Session Management Module
//!
//! Handles terminal sessions, tabs, panes, and auto-reconnect

pub mod commands;

use tokio::sync::RwLock;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::AppHandle;
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Global session manager
static SESSION_MANAGER: Lazy<RwLock<SessionManager>> =
    Lazy::new(|| RwLock::new(SessionManager::new()));

/// Initialize session manager
pub fn init(_app: &AppHandle) -> Result<(), SessionError> {
    tracing::info!("Session manager initialized");
    Ok(())
}

/// Get the session manager
pub fn manager() -> &'static RwLock<SessionManager> {
    &SESSION_MANAGER
}

/// Session manager
#[derive(Debug, Default)]
pub struct SessionManager {
    sessions: HashMap<Uuid, Session>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }

    pub fn get_sessions(&self) -> Vec<Session> {
        self.sessions.values().cloned().collect()
    }

    pub fn create_session(&mut self, host_id: Uuid, name: String) -> Session {
        let session = Session::new(host_id, name);
        self.sessions.insert(session.id, session.clone());
        session
    }

    pub fn close_session(&mut self, id: Uuid) -> Option<Session> {
        self.sessions.remove(&id)
    }

    pub fn get_session(&self, id: Uuid) -> Option<&Session> {
        self.sessions.get(&id)
    }

    pub fn get_session_mut(&mut self, id: Uuid) -> Option<&mut Session> {
        self.sessions.get_mut(&id)
    }
}

/// Terminal session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: Uuid,
    pub host_id: Uuid,
    pub name: String,
    pub status: SessionStatus,
    pub created_at: DateTime<Utc>,
    pub connected_at: Option<DateTime<Utc>>,
    pub latency_ms: Option<u32>,
}

impl Session {
    pub fn new(host_id: Uuid, name: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            host_id,
            name,
            status: SessionStatus::Disconnected,
            created_at: Utc::now(),
            connected_at: None,
            latency_ms: None,
        }
    }
}

/// Session connection status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionStatus {
    Disconnected,
    Connecting,
    Connected,
    Reconnecting,
    Error,
}

/// Session Error types
#[derive(Debug, thiserror::Error)]
pub enum SessionError {
    #[error("Session not found: {0}")]
    NotFound(String),
    #[error("Session error: {0}")]
    General(String),
}

impl Serialize for SessionError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
