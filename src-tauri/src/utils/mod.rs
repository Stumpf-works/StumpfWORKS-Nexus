//! Utility functions and helpers

use serde::{Deserialize, Serialize};

/// Application event for frontend notifications
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum AppEvent {
    HostConnected { host_id: String, session_id: String },
    HostDisconnected { host_id: String, session_id: String },
    LatencyUpdate { session_id: String, latency_ms: u32 },
    FileTransferProgress { session_id: String, path: String, progress: f32 },
    FileTransferComplete { session_id: String, path: String },
    Error { message: String },
}

/// Audit log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub action: AuditAction,
    pub details: String,
    pub session_id: Option<String>,
}

/// Audit actions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditAction {
    Connect,
    Disconnect,
    CommandExecuted,
    FileUploaded,
    FileDownloaded,
    FileDeleted,
    SettingsChanged,
    HostAdded,
    HostRemoved,
}

/// Format bytes to human readable string
pub fn format_bytes(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    let mut size = bytes as f64;
    let mut unit_index = 0;

    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }

    if unit_index == 0 {
        format!("{} {}", bytes, UNITS[0])
    } else {
        format!("{:.2} {}", size, UNITS[unit_index])
    }
}
