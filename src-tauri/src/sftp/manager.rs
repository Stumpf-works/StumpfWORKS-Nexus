//! SFTP Session Manager

use super::{SftpClient, SftpError};
use crate::ssh::SshClient;
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use std::collections::HashMap;
use uuid::Uuid;

/// Global SFTP manager
static SFTP_MANAGER: Lazy<RwLock<SftpManager>> =
    Lazy::new(|| RwLock::new(SftpManager::new()));

/// Get the SFTP manager
pub fn manager() -> &'static RwLock<SftpManager> {
    &SFTP_MANAGER
}

/// SFTP Session Manager
pub struct SftpManager {
    sessions: HashMap<Uuid, SftpClient>,
}

impl SftpManager {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }

    /// Create SFTP session for a terminal session
    pub async fn create_session(
        &mut self,
        session_id: Uuid,
        ssh_client: &mut SshClient,
    ) -> Result<(), SftpError> {
        tracing::info!("Creating SFTP session for terminal {}", session_id);

        // Open SFTP channel
        let channel = ssh_client
            .open_sftp_channel()
            .await
            .map_err(|e| SftpError::Ssh(format!("Failed to open SFTP channel: {}", e)))?;

        // Create SFTP client
        let sftp_client = SftpClient::from_channel(channel).await?;

        self.sessions.insert(session_id, sftp_client);

        tracing::info!("SFTP session created for terminal {}", session_id);
        Ok(())
    }

    /// Get SFTP client for a session
    pub fn get_client(&self, session_id: &Uuid) -> Option<&SftpClient> {
        self.sessions.get(session_id)
    }

    /// Remove SFTP session
    pub fn remove_session(&mut self, session_id: &Uuid) {
        if self.sessions.remove(session_id).is_some() {
            tracing::info!("Removed SFTP session for terminal {}", session_id);
        }
    }

    /// Check if session has SFTP
    pub fn has_session(&self, session_id: &Uuid) -> bool {
        self.sessions.contains_key(session_id)
    }
}

impl Default for SftpManager {
    fn default() -> Self {
        Self::new()
    }
}
