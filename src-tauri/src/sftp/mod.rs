//! SFTP Module
//!
//! Provides SFTP file operations using russh-sftp

pub mod commands;
mod client;
pub mod manager;

pub use client::SftpClient;
pub use manager::manager;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// File entry in a directory listing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<DateTime<Utc>>,
    pub permissions: Option<String>,
    pub owner: Option<String>,
    pub group: Option<String>,
}

/// File transfer progress
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferProgress {
    pub path: String,
    pub bytes_transferred: u64,
    pub total_bytes: u64,
    pub percent: f32,
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
    #[error("Already exists: {0}")]
    AlreadyExists(String),
    #[error("Not a directory: {0}")]
    NotDirectory(String),
    #[error("Not a file: {0}")]
    NotFile(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Transfer failed: {0}")]
    TransferFailed(String),
    #[error("SSH error: {0}")]
    Ssh(String),
}

impl Serialize for SftpError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
