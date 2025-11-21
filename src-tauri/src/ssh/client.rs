//! SSH Client Implementation using russh

use async_trait::async_trait;
use russh::client::{self, Config, Handle, Handler};
use russh::keys::key::PublicKey;
use russh::{ChannelId, Disconnect};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use uuid::Uuid;

/// SSH connection configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: AuthMethod,
    #[serde(default = "default_timeout")]
    pub timeout_seconds: u64,
}

fn default_timeout() -> u64 {
    30
}

/// Authentication method for SSH
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum AuthMethod {
    Password(String),
    PrivateKey {
        key_path: String,
        passphrase: Option<String>,
    },
    Agent,
}

/// Terminal output types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum TerminalOutput {
    Stdout(String),
    Stderr(String),
    Exit(i32),
    Error(String),
}

/// Command execution output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

/// SSH Error types
#[derive(Debug, thiserror::Error)]
pub enum SshError {
    #[error("Not connected to server")]
    NotConnected,
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),
    #[error("Authentication failed")]
    AuthenticationFailed,
    #[error("Command execution failed: {0}")]
    CommandFailed(String),
    #[error("Channel error: {0}")]
    ChannelError(String),
    #[error("Key error: {0}")]
    KeyError(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("SSH error: {0}")]
    Russh(String),
    #[error("Timeout")]
    Timeout,
}

impl From<russh::Error> for SshError {
    fn from(err: russh::Error) -> Self {
        SshError::Russh(err.to_string())
    }
}

impl From<russh_keys::Error> for SshError {
    fn from(err: russh_keys::Error) -> Self {
        SshError::KeyError(err.to_string())
    }
}

impl Serialize for SshError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Client handler for russh events
pub struct ClientHandler {
    output_tx: Arc<Mutex<Option<mpsc::Sender<TerminalOutput>>>>,
}

impl ClientHandler {
    pub fn new() -> Self {
        Self {
            output_tx: Arc::new(Mutex::new(None)),
        }
    }

    pub fn with_output(tx: mpsc::Sender<TerminalOutput>) -> Self {
        Self {
            output_tx: Arc::new(Mutex::new(Some(tx))),
        }
    }
}

#[async_trait]
impl Handler for ClientHandler {
    type Error = SshError;

    async fn check_server_key(
        &mut self,
        _server_public_key: &PublicKey,
    ) -> Result<bool, Self::Error> {
        // TODO: Implement proper host key verification with known_hosts
        tracing::warn!("Host key verification skipped - implement proper verification!");
        Ok(true)
    }

    async fn data(
        &mut self,
        _channel: ChannelId,
        data: &[u8],
        _session: &mut client::Session,
    ) -> Result<(), Self::Error> {
        let tx_lock = self.output_tx.lock().await;
        if let Some(tx) = tx_lock.as_ref() {
            let text = String::from_utf8_lossy(data).to_string();
            let _ = tx.send(TerminalOutput::Stdout(text)).await;
        }
        Ok(())
    }

    async fn extended_data(
        &mut self,
        _channel: ChannelId,
        ext: u32,
        data: &[u8],
        _session: &mut client::Session,
    ) -> Result<(), Self::Error> {
        if ext == 1 {
            // stderr
            let tx_lock = self.output_tx.lock().await;
            if let Some(tx) = tx_lock.as_ref() {
                let text = String::from_utf8_lossy(data).to_string();
                let _ = tx.send(TerminalOutput::Stderr(text)).await;
            }
        }
        Ok(())
    }
}

/// SSH Client wrapper
pub struct SshClient {
    pub id: Uuid,
    pub config: SshConfig,
    session: Option<Handle<ClientHandler>>,
    output_tx: Option<mpsc::Sender<TerminalOutput>>,
}

impl std::fmt::Debug for SshClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SshClient")
            .field("id", &self.id)
            .field("config", &self.config)
            .field("connected", &self.session.is_some())
            .finish()
    }
}

impl SshClient {
    /// Create a new SSH client
    pub fn new(config: SshConfig) -> Self {
        Self {
            id: Uuid::new_v4(),
            config,
            session: None,
            output_tx: None,
        }
    }

    /// Set output channel for terminal data
    pub fn set_output_channel(&mut self, tx: mpsc::Sender<TerminalOutput>) {
        self.output_tx = Some(tx);
    }

    /// Check if connected
    pub fn is_connected(&self) -> bool {
        self.session.is_some()
    }

    /// Connect to the SSH server
    pub async fn connect(&mut self) -> Result<(), SshError> {
        tracing::info!("Connecting to {}:{}", self.config.host, self.config.port);

        let config = Arc::new(Config {
            inactivity_timeout: Some(std::time::Duration::from_secs(
                self.config.timeout_seconds * 2,
            )),
            ..Default::default()
        });

        let handler = if let Some(tx) = self.output_tx.clone() {
            ClientHandler::with_output(tx)
        } else {
            ClientHandler::new()
        };

        let addr = format!("{}:{}", self.config.host, self.config.port);

        let connect_future = client::connect(config, &addr, handler);
        let timeout = std::time::Duration::from_secs(self.config.timeout_seconds);

        let mut session = match tokio::time::timeout(timeout, connect_future).await {
            Ok(Ok(session)) => session,
            Ok(Err(e)) => return Err(SshError::ConnectionFailed(e.to_string())),
            Err(_) => return Err(SshError::Timeout),
        };

        // Authenticate
        let authenticated = match &self.config.auth_method {
            AuthMethod::Password(password) => {
                session
                    .authenticate_password(&self.config.username, password)
                    .await?
            }
            AuthMethod::PrivateKey {
                key_path,
                passphrase,
            } => {
                let key = if let Some(pass) = passphrase {
                    russh_keys::load_secret_key(key_path, Some(pass))?
                } else {
                    russh_keys::load_secret_key(key_path, None)?
                };
                session
                    .authenticate_publickey(&self.config.username, Arc::new(key))
                    .await?
            }
            AuthMethod::Agent => {
                // TODO: Implement SSH agent authentication
                return Err(SshError::AuthenticationFailed);
            }
        };

        if !authenticated {
            return Err(SshError::AuthenticationFailed);
        }

        tracing::info!("Successfully connected to {}", self.config.host);
        self.session = Some(session);
        Ok(())
    }

    /// Execute a single command (non-interactive)
    pub async fn execute(&mut self, command: &str) -> Result<CommandOutput, SshError> {
        let session = self.session.as_mut().ok_or(SshError::NotConnected)?;

        let mut channel = session.channel_open_session().await?;
        channel.exec(true, command).await?;

        let mut stdout = Vec::new();
        let mut stderr = Vec::new();
        let mut exit_code = 0;

        loop {
            match channel.wait().await {
                Some(russh::ChannelMsg::Data { data }) => {
                    stdout.extend_from_slice(&data);
                }
                Some(russh::ChannelMsg::ExtendedData { data, ext }) => {
                    if ext == 1 {
                        stderr.extend_from_slice(&data);
                    }
                }
                Some(russh::ChannelMsg::ExitStatus { exit_status }) => {
                    exit_code = exit_status as i32;
                }
                Some(russh::ChannelMsg::Eof) | None => {
                    break;
                }
                _ => {}
            }
        }

        Ok(CommandOutput {
            stdout: String::from_utf8_lossy(&stdout).to_string(),
            stderr: String::from_utf8_lossy(&stderr).to_string(),
            exit_code,
        })
    }

    /// Open an interactive shell session and return the channel
    pub async fn open_shell(
        &mut self,
        cols: u32,
        rows: u32,
    ) -> Result<russh::Channel<client::Msg>, SshError> {
        let session = self.session.as_mut().ok_or(SshError::NotConnected)?;

        let channel = session.channel_open_session().await?;

        // Request PTY
        channel
            .request_pty(false, "xterm-256color", cols, rows, 0, 0, &[])
            .await?;

        // Request shell
        channel.request_shell(false).await?;

        tracing::info!("Shell opened for {}", self.config.host);
        Ok(channel)
    }

    /// Open an SFTP channel
    pub async fn open_sftp_channel(&mut self) -> Result<russh::Channel<client::Msg>, SshError> {
        let session = self.session.as_mut().ok_or(SshError::NotConnected)?;

        let channel = session.channel_open_session().await?;

        // Request SFTP subsystem
        channel.request_subsystem(true, "sftp").await?;

        tracing::info!("SFTP channel opened for {}", self.config.host);
        Ok(channel)
    }

    /// Disconnect from the SSH server
    pub async fn disconnect(&mut self) -> Result<(), SshError> {
        if let Some(session) = self.session.take() {
            session
                .disconnect(Disconnect::ByApplication, "User disconnected", "en")
                .await?;
        }

        tracing::info!("Disconnected from {}", self.config.host);
        Ok(())
    }

    /// Measure connection latency (ping)
    pub async fn measure_latency(&mut self) -> Result<u32, SshError> {
        let start = std::time::Instant::now();
        let _ = self.execute("echo ping").await?;
        let latency = start.elapsed().as_millis() as u32;
        Ok(latency)
    }
}

impl Drop for SshClient {
    fn drop(&mut self) {
        if self.session.is_some() {
            tracing::debug!("SSH client dropped while still connected");
        }
    }
}
