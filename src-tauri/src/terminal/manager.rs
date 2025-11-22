//! Terminal Session Manager

use super::{TerminalError, TerminalEvent, TerminalInfo};
use crate::ssh::{SshConfig, SshClient};
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use std::collections::HashMap;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;
use uuid::Uuid;

/// Global terminal manager
static TERMINAL_MANAGER: Lazy<RwLock<TerminalManager>> =
    Lazy::new(|| RwLock::new(TerminalManager::new()));

/// Get the terminal manager
pub fn manager() -> &'static RwLock<TerminalManager> {
    &TERMINAL_MANAGER
}

/// Terminal session
pub struct TerminalSession {
    pub id: Uuid,
    pub host_id: Uuid,
    pub host_name: String,
    pub cols: u32,
    pub rows: u32,
    ssh_client: Option<SshClient>,
    input_tx: Option<mpsc::Sender<Vec<u8>>>,
    resize_tx: Option<mpsc::Sender<(u32, u32)>>,
}

impl TerminalSession {
    pub fn new(host_id: Uuid, host_name: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            host_id,
            host_name,
            cols: 80,
            rows: 24,
            ssh_client: None,
            input_tx: None,
            resize_tx: None,
        }
    }

    pub fn new_with_id(id: Uuid, host_id: Uuid, host_name: String) -> Self {
        Self {
            id,
            host_id,
            host_name,
            cols: 80,
            rows: 24,
            ssh_client: None,
            input_tx: None,
            resize_tx: None,
        }
    }

    pub fn info(&self) -> TerminalInfo {
        TerminalInfo {
            id: self.id,
            host_id: self.host_id,
            host_name: self.host_name.clone(),
            connected: self.ssh_client.as_ref().map(|c| c.is_connected()).unwrap_or(false),
            cols: self.cols,
            rows: self.rows,
        }
    }

    /// Connect to SSH and start shell
    pub async fn connect(&mut self, config: SshConfig, app: AppHandle) -> Result<(), TerminalError> {
        let mut client = SshClient::new(config);

        client
            .connect()
            .await
            .map_err(|e| TerminalError::ConnectionFailed(e.to_string()))?;

        // Open shell with PTY
        let mut channel = client
            .open_shell(self.cols, self.rows)
            .await
            .map_err(|e| TerminalError::Ssh(e.to_string()))?;

        let session_id = self.id;

        // Create channels for input and resize
        let (input_tx, mut input_rx) = mpsc::channel::<Vec<u8>>(100);
        let (resize_tx, mut resize_rx) = mpsc::channel::<(u32, u32)>(10);

        // Clone app handle for the task
        let app_clone = app.clone();

        // Spawn task to handle input and resize
        tokio::spawn(async move {
            loop {
                tokio::select! {
                    // Handle input data
                    Some(data) = input_rx.recv() => {
                        if let Err(e) = channel.data(&data[..]).await {
                            tracing::error!("Failed to send data to channel: {}", e);
                            break;
                        }
                    }
                    // Handle resize
                    Some((cols, rows)) = resize_rx.recv() => {
                        if let Err(e) = channel.window_change(cols, rows, 0, 0).await {
                            tracing::error!("Failed to resize channel: {}", e);
                        }
                    }
                    // Read from SSH
                    msg = channel.wait() => {
                        match msg {
                            Some(russh::ChannelMsg::Data { data }) => {
                                let text = String::from_utf8_lossy(&data).to_string();
                                let _ = app_clone.emit(
                                    &format!("terminal-data-{}", session_id),
                                    TerminalEvent::Data(text),
                                );
                            }
                            Some(russh::ChannelMsg::ExtendedData { data, ext: 1 }) => {
                                let text = String::from_utf8_lossy(&data).to_string();
                                let _ = app_clone.emit(
                                    &format!("terminal-data-{}", session_id),
                                    TerminalEvent::Data(text),
                                );
                            }
                            Some(russh::ChannelMsg::Eof) | None => {
                                let _ = app_clone.emit(
                                    &format!("terminal-data-{}", session_id),
                                    TerminalEvent::Disconnected,
                                );
                                break;
                            }
                            _ => {}
                        }
                    }
                }
            }
        });

        // Emit connected event
        let _ = app.emit(
            &format!("terminal-data-{}", self.id),
            TerminalEvent::Connected,
        );

        self.ssh_client = Some(client);
        self.input_tx = Some(input_tx);
        self.resize_tx = Some(resize_tx);
        Ok(())
    }

    /// Send data to terminal
    pub async fn write(&mut self, data: &[u8]) -> Result<(), TerminalError> {
        if let Some(tx) = &self.input_tx {
            tx.send(data.to_vec())
                .await
                .map_err(|e| TerminalError::Ssh(format!("Failed to send input: {}", e)))?;
        } else {
            return Err(TerminalError::Ssh("Not connected".to_string()));
        }
        Ok(())
    }

    /// Resize terminal
    pub async fn resize(&mut self, cols: u32, rows: u32) -> Result<(), TerminalError> {
        self.cols = cols;
        self.rows = rows;

        if let Some(tx) = &self.resize_tx {
            tx.send((cols, rows))
                .await
                .map_err(|e| TerminalError::Ssh(format!("Failed to send resize: {}", e)))?;
        }
        Ok(())
    }

    /// Get mutable SSH client
    pub fn get_ssh_client_mut(&mut self) -> Option<&mut SshClient> {
        self.ssh_client.as_mut()
    }

    /// Disconnect
    pub async fn disconnect(&mut self) -> Result<(), TerminalError> {
        // Drop the channels to signal the task to stop
        self.input_tx = None;
        self.resize_tx = None;

        if let Some(mut client) = self.ssh_client.take() {
            client
                .disconnect()
                .await
                .map_err(|e| TerminalError::Ssh(e.to_string()))?;
        }
        Ok(())
    }
}

/// Terminal manager
pub struct TerminalManager {
    sessions: HashMap<Uuid, TerminalSession>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }

    /// Create a new terminal session
    pub fn create_session(&mut self, host_id: Uuid, host_name: String) -> TerminalInfo {
        let session = TerminalSession::new(host_id, host_name);
        let info = session.info();
        self.sessions.insert(session.id, session);
        info
    }

    /// Create a new terminal session with a specific ID
    pub fn create_session_with_id(&mut self, id: Uuid, host_id: Uuid, host_name: String) -> TerminalInfo {
        let session = TerminalSession::new_with_id(id, host_id, host_name);
        let info = session.info();
        self.sessions.insert(session.id, session);
        info
    }

    /// Get session info
    pub fn get_session(&self, id: Uuid) -> Option<TerminalInfo> {
        self.sessions.get(&id).map(|s| s.info())
    }

    /// Get all sessions
    pub fn get_sessions(&self) -> Vec<TerminalInfo> {
        self.sessions.values().map(|s| s.info()).collect()
    }

    /// Get mutable session
    pub fn get_session_mut(&mut self, id: Uuid) -> Option<&mut TerminalSession> {
        self.sessions.get_mut(&id)
    }

    /// Close session
    pub fn close_session(&mut self, id: Uuid) -> Option<TerminalSession> {
        self.sessions.remove(&id)
    }

    /// Insert a session back (used after async operations)
    pub fn insert_session(&mut self, id: Uuid, session: TerminalSession) {
        self.sessions.insert(id, session);
    }
}

impl Default for TerminalManager {
    fn default() -> Self {
        Self::new()
    }
}
