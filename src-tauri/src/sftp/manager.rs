//! SFTP Session Manager

use super::SftpClient;
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use russh_sftp::client::SftpSession;
use std::collections::HashMap;
use std::sync::Arc;
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
    sessions: HashMap<Uuid, Arc<SftpClient>>,
}

impl SftpManager {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }

    /// Create SFTP session from an existing SFTP session
    pub fn add_session(&mut self, session_id: Uuid, sftp_session: SftpSession) {
        tracing::info!("Adding SFTP session for terminal {}", session_id);
        let client = Arc::new(SftpClient::new(sftp_session));
        self.sessions.insert(session_id, client);
    }

    /// Get SFTP client for a session
    pub fn get_client(&self, session_id: &Uuid) -> Option<Arc<SftpClient>> {
        self.sessions.get(session_id).cloned()
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
