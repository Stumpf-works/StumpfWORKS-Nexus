//! SFTP Module
//!
//! Provides SFTP file operations

pub mod commands;

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// File entry in a directory listing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<DateTime<Utc>>,
    pub permissions: Option<String>,
}

/// SFTP Error types
#[derive(Debug, thiserror::Error)]
pub enum SftpError {
    #[error("Not connected")]
    NotConnected,
    #[error("Path not found: {0}")]
    PathNotFound(String),
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Transfer failed: {0}")]
    TransferFailed(String),
}

impl Serialize for SftpError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
