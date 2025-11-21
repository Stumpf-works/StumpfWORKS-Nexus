//! MCP Request Handlers
//!
//! HTTP/WebSocket handlers for MCP protocol

use super::{McpRequest, McpResponse, McpError};
use serde::{Deserialize, Serialize};

/// MCP Protocol message types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum McpMessage {
    /// Capabilities announcement
    Capabilities(CapabilitiesMessage),
    /// Request from AI
    Request(McpRequest),
    /// Response to AI
    Response(McpResponse),
    /// Error message
    Error(ErrorMessage),
    /// Heartbeat/ping
    Ping,
    /// Heartbeat/pong
    Pong,
}

/// Capabilities announcement message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilitiesMessage {
    pub version: String,
    pub abilities: Vec<String>,
}

impl CapabilitiesMessage {
    pub fn new() -> Self {
        use super::McpAbility;

        Self {
            version: "1.0.0".to_string(),
            abilities: McpAbility::all()
                .iter()
                .map(|a| a.as_str().to_string())
                .collect(),
        }
    }
}

impl Default for CapabilitiesMessage {
    fn default() -> Self {
        Self::new()
    }
}

/// Error message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorMessage {
    pub code: String,
    pub message: String,
}

impl From<McpError> for ErrorMessage {
    fn from(err: McpError) -> Self {
        Self {
            code: match &err {
                McpError::NotEnabled => "NOT_ENABLED",
                McpError::PermissionDenied(_) => "PERMISSION_DENIED",
                McpError::InvalidRequest(_) => "INVALID_REQUEST",
                McpError::ProviderNotAllowed(_) => "PROVIDER_NOT_ALLOWED",
                McpError::ExecutionError(_) => "EXECUTION_ERROR",
            }
            .to_string(),
            message: err.to_string(),
        }
    }
}

/// JSON-RPC style request wrapper for MCP
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub id: Option<serde_json::Value>,
    pub method: String,
    pub params: Option<serde_json::Value>,
}

/// JSON-RPC style response wrapper for MCP
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub id: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
}

/// JSON-RPC error object
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

impl JsonRpcResponse {
    pub fn success(id: Option<serde_json::Value>, result: serde_json::Value) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(result),
            error: None,
        }
    }

    pub fn error(id: Option<serde_json::Value>, code: i32, message: String) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(JsonRpcError {
                code,
                message,
                data: None,
            }),
        }
    }
}
