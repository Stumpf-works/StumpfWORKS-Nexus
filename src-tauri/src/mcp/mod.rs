//! MCP (Model Context Protocol) Server Module
//!
//! Provides a local MCP server that acts as secure middleware
//! for AI integrations (Claude, ChatGPT, Ollama)
//!
//! Capabilities:
//! - nexus.server.list
//! - nexus.ssh.connect
//! - nexus.ssh.execute
//! - nexus.ssh.upload
//! - nexus.ssh.download
//! - nexus.datasphere.set
//! - nexus.datasphere.get
//! - nexus.logs.stream
//! - nexus.ai.invoke

pub mod handlers;
pub mod http;
pub mod permissions;
pub mod server;

pub use http::McpHttpServer;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// MCP Server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpConfig {
    pub enabled: bool,
    pub port: u16,
    pub require_approval: bool,
    pub allowed_providers: Vec<AiProvider>,
}

impl Default for McpConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            port: 9742,
            require_approval: true,
            allowed_providers: vec![],
        }
    }
}

/// Supported AI providers
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AiProvider {
    Claude,
    ChatGPT,
    Ollama,
    Custom(String),
}

/// MCP Request from AI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpRequest {
    pub id: Uuid,
    pub provider: AiProvider,
    pub ability: McpAbility,
    pub params: serde_json::Value,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// MCP Response to AI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpResponse {
    pub id: Uuid,
    pub request_id: Uuid,
    pub success: bool,
    pub data: Option<serde_json::Value>,
    pub error: Option<String>,
}

/// Available MCP abilities
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum McpAbility {
    // Server abilities
    ServerList,

    // SSH abilities
    SshConnect,
    SshExecute,
    SshUpload,
    SshDownload,

    // DataSphere abilities
    DatasphereGet,
    DatasphereSet,

    // Logging abilities
    LogsStream,

    // AI abilities
    AiInvoke,
}

impl McpAbility {
    /// Get the string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::ServerList => "nexus.server.list",
            Self::SshConnect => "nexus.ssh.connect",
            Self::SshExecute => "nexus.ssh.execute",
            Self::SshUpload => "nexus.ssh.upload",
            Self::SshDownload => "nexus.ssh.download",
            Self::DatasphereGet => "nexus.datasphere.get",
            Self::DatasphereSet => "nexus.datasphere.set",
            Self::LogsStream => "nexus.logs.stream",
            Self::AiInvoke => "nexus.ai.invoke",
        }
    }

    /// Get all available abilities
    pub fn all() -> Vec<Self> {
        vec![
            Self::ServerList,
            Self::SshConnect,
            Self::SshExecute,
            Self::SshUpload,
            Self::SshDownload,
            Self::DatasphereGet,
            Self::DatasphereSet,
            Self::LogsStream,
            Self::AiInvoke,
        ]
    }
}

/// MCP Error types
#[derive(Debug, thiserror::Error)]
pub enum McpError {
    #[error("MCP server not enabled")]
    NotEnabled,
    #[error("Permission denied for ability: {0}")]
    PermissionDenied(String),
    #[error("Invalid request: {0}")]
    InvalidRequest(String),
    #[error("Provider not allowed: {0:?}")]
    ProviderNotAllowed(AiProvider),
    #[error("Execution error: {0}")]
    ExecutionError(String),
}

impl Serialize for McpError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
