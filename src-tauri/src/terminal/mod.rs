//! Terminal Module
//!
//! Manages terminal sessions and bridges SSH I/O with the frontend

pub mod commands;
mod manager;

pub use manager::{TerminalManager, TerminalSession};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Terminal session info for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalInfo {
    pub id: Uuid,
    pub host_id: Uuid,
    pub host_name: String,
    pub connected: bool,
    pub cols: u32,
    pub rows: u32,
}

/// Terminal data event (sent to frontend)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum TerminalEvent {
    Data(String),
    Connected,
    Disconnected,
    Error(String),
    Latency(u32),
}

/// Terminal Error
#[derive(Debug, thiserror::Error)]
pub enum TerminalError {
    #[error("Session not found: {0}")]
    SessionNotFound(String),
    #[error("Not connected")]
    NotConnected,
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),
    #[error("SSH error: {0}")]
    Ssh(String),
}

impl Serialize for TerminalError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
