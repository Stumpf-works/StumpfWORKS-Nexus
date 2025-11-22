//! SFTP Session Manager
//!
//! NOTE: Real SFTP integration pending due to russh-sftp API compatibility issues.
//! Currently uses mock implementation for development.

use super::{SftpClient, SftpError};
use crate::ssh::{SshClient, SshConfig};
use once_cell::sync::Lazy;
use tokio::sync::RwLock;
use std::collections::HashMap;
use uuid::Uuid;

/// Global SFTP manager
static SFTP_MANAGER: Lazy<RwLock<SftpManager>> =
    Lazy::new(|| RwLock::new(SftpManager::new()));

/// Get the SFTP manager
pub fn manager() -> &'static RwLock<SftpManager> {
    &SFTP_MANAGER
}

/// SFTP Session - combines SSH client and SFTP client
pub struct SftpSession {
    pub id: Uuid,
    pub host_id: Uuid,
    pub host_name: String,
    ssh_client: Option<SshClient>,
    sftp_client: Option<SftpClient>,
}

impl SftpSession {
    pub fn new(host_id: Uuid, host_name: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            host_id,
            host_name,
            ssh_client: None,
            sftp_client: None,
        }
    }

    pub fn new_with_id(id: Uuid, host_id: Uuid, host_name: String) -> Self {
        Self {
            id,
            host_id,
            host_name,
            ssh_client: None,
            sftp_client: None,
        }
    }

    /// Check if connected
    pub fn is_connected(&self) -> bool {
        self.sftp_client.as_ref().map(|c| c.is_connected()).unwrap_or(false)
    }

    /// Connect to SSH and initialize SFTP subsystem
    /// TODO: Real SFTP integration pending
    pub async fn connect(&mut self, config: SshConfig) -> Result<(), SftpError> {
        tracing::info!("Connecting SFTP session to {}:{} (mock mode)", config.host, config.port);

        // Create and connect SSH client
        let mut ssh_client = SshClient::new(config);
        ssh_client
            .connect()
            .await
            .map_err(|e| SftpError::Ssh(e.to_string()))?;

        // Initialize SFTP client (mock mode - no channel needed for now)
        let mut sftp_client = SftpClient::new();
        sftp_client.connect().await?;

        self.ssh_client = Some(ssh_client);
        self.sftp_client = Some(sftp_client);

        tracing::info!("SFTP session connected successfully (mock mode)");
        Ok(())
    }

    /// Get mutable reference to SFTP client
    pub fn sftp_client_mut(&mut self) -> Result<&mut SftpClient, SftpError> {
        self.sftp_client.as_mut().ok_or(SftpError::NotConnected)
    }

    /// Disconnect
    pub async fn disconnect(&mut self) -> Result<(), SftpError> {
        if let Some(mut sftp) = self.sftp_client.take() {
            sftp.disconnect().await;
        }

        if let Some(mut ssh) = self.ssh_client.take() {
            ssh.disconnect()
                .await
                .map_err(|e| SftpError::Ssh(e.to_string()))?;
        }

        tracing::info!("SFTP session disconnected");
        Ok(())
    }
}

/// SFTP Manager - manages all SFTP sessions
pub struct SftpManager {
    sessions: HashMap<Uuid, SftpSession>,
}

impl SftpManager {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }

    /// Create a new SFTP session
    pub fn create_session(&mut self, host_id: Uuid, host_name: String) -> Uuid {
        let session = SftpSession::new(host_id, host_name);
        let id = session.id;
        self.sessions.insert(id, session);
        id
    }

    /// Create a new SFTP session with a specific ID
    pub fn create_session_with_id(&mut self, id: Uuid, host_id: Uuid, host_name: String) -> Uuid {
        let session = SftpSession::new_with_id(id, host_id, host_name);
        self.sessions.insert(id, session);
        id
    }

    /// Get session by ID
    pub fn get_session(&self, id: Uuid) -> Option<&SftpSession> {
        self.sessions.get(&id)
    }

    /// Get mutable session by ID
    pub fn get_session_mut(&mut self, id: Uuid) -> Option<&mut SftpSession> {
        self.sessions.get_mut(&id)
    }

    /// Check if session exists and is connected
    pub fn is_connected(&self, id: Uuid) -> bool {
        self.sessions
            .get(&id)
            .map(|s| s.is_connected())
            .unwrap_or(false)
    }

    /// Close session
    pub fn close_session(&mut self, id: Uuid) -> Option<SftpSession> {
        self.sessions.remove(&id)
    }

    /// Get all session IDs
    pub fn get_all_session_ids(&self) -> Vec<Uuid> {
        self.sessions.keys().copied().collect()
    }
}

impl Default for SftpManager {
    fn default() -> Self {
        Self::new()
    }
}
