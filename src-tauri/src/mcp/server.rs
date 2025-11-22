//! MCP Server Implementation

use super::{
    permissions::{PermissionManager, PermissionResult, ApprovalRequest},
    McpAbility, McpConfig, McpError, McpRequest, McpResponse,
};
use std::collections::VecDeque;
use uuid::Uuid;

/// MCP Server instance
pub struct McpServer {
    config: McpConfig,
    permissions: PermissionManager,
    pending_approvals: VecDeque<ApprovalRequest>,
    running: bool,
}

impl McpServer {
    /// Create a new MCP server
    pub fn new(config: McpConfig) -> Self {
        Self {
            config,
            permissions: PermissionManager::default(),
            pending_approvals: VecDeque::new(),
            running: false,
        }
    }

    /// Start the MCP server
    pub async fn start(&mut self) -> Result<(), McpError> {
        if !self.config.enabled {
            return Err(McpError::NotEnabled);
        }

        tracing::info!("Starting MCP server on port {}", self.config.port);
        self.running = true;

        // TODO: Implement actual HTTP/WebSocket server
        // For now, this is a placeholder for the architecture

        Ok(())
    }

    /// Stop the MCP server
    pub async fn stop(&mut self) {
        tracing::info!("Stopping MCP server");
        self.running = false;
    }

    /// Process an incoming MCP request
    pub async fn process_request(&mut self, request: McpRequest) -> Result<McpResponse, McpError> {
        // Check if provider is allowed
        if !self.config.allowed_providers.contains(&request.provider) {
            return Err(McpError::ProviderNotAllowed(request.provider));
        }

        // Check permissions
        let permission = self.permissions.check_permission(&request.provider, &request.ability);

        match permission {
            PermissionResult::Allowed => {
                self.execute_ability(request).await
            }
            PermissionResult::Denied => {
                Err(McpError::PermissionDenied(request.ability.as_str().to_string()))
            }
            PermissionResult::RequiresApproval => {
                if self.config.require_approval {
                    // Queue for user approval
                    let approval = ApprovalRequest::new(
                        request.provider.clone(),
                        request.ability.clone(),
                        &request.params,
                    );
                    self.pending_approvals.push_back(approval);

                    Err(McpError::PermissionDenied(
                        "Action requires user approval".to_string(),
                    ))
                } else {
                    self.execute_ability(request).await
                }
            }
        }
    }

    /// Execute an MCP ability
    async fn execute_ability(&self, request: McpRequest) -> Result<McpResponse, McpError> {
        let result = match request.ability {
            McpAbility::ServerList => {
                self.handle_server_list().await
            }
            McpAbility::SshConnect => {
                self.handle_ssh_connect(&request.params).await
            }
            McpAbility::SshExecute => {
                self.handle_ssh_execute(&request.params).await
            }
            McpAbility::SshUpload => {
                self.handle_ssh_upload(&request.params).await
            }
            McpAbility::SshDownload => {
                self.handle_ssh_download(&request.params).await
            }
            McpAbility::DatasphereGet => {
                self.handle_datasphere_get(&request.params).await
            }
            McpAbility::DatasphereSet => {
                self.handle_datasphere_set(&request.params).await
            }
            McpAbility::LogsStream => {
                self.handle_logs_stream(&request.params).await
            }
            McpAbility::AiInvoke => {
                self.handle_ai_invoke(&request.params).await
            }
        };

        match result {
            Ok(data) => Ok(McpResponse {
                id: Uuid::new_v4(),
                request_id: request.id,
                success: true,
                data: Some(data),
                error: None,
            }),
            Err(e) => Ok(McpResponse {
                id: Uuid::new_v4(),
                request_id: request.id,
                success: false,
                data: None,
                error: Some(e.to_string()),
            }),
        }
    }

    // Handler implementations (placeholders)

    async fn handle_server_list(&self) -> Result<serde_json::Value, McpError> {
        // TODO: Return list of configured hosts
        Ok(serde_json::json!({
            "servers": []
        }))
    }

    async fn handle_ssh_connect(&self, _params: &serde_json::Value) -> Result<serde_json::Value, McpError> {
        // TODO: Implement SSH connection
        Ok(serde_json::json!({
            "status": "connected",
            "session_id": Uuid::new_v4()
        }))
    }

    async fn handle_ssh_execute(&self, params: &serde_json::Value) -> Result<serde_json::Value, McpError> {
        let command = params.get("command")
            .and_then(|v| v.as_str())
            .ok_or_else(|| McpError::InvalidRequest("Missing command".to_string()))?;

        // TODO: Execute command on SSH session
        tracing::info!("MCP: Executing command: {}", command);

        Ok(serde_json::json!({
            "stdout": "",
            "stderr": "",
            "exit_code": 0
        }))
    }

    async fn handle_ssh_upload(&self, _params: &serde_json::Value) -> Result<serde_json::Value, McpError> {
        // TODO: Implement file upload
        Ok(serde_json::json!({
            "status": "uploaded"
        }))
    }

    async fn handle_ssh_download(&self, _params: &serde_json::Value) -> Result<serde_json::Value, McpError> {
        // TODO: Implement file download
        Ok(serde_json::json!({
            "status": "downloaded"
        }))
    }

    async fn handle_datasphere_get(&self, params: &serde_json::Value) -> Result<serde_json::Value, McpError> {
        let key = params.get("key")
            .and_then(|v| v.as_str())
            .ok_or_else(|| McpError::InvalidRequest("Missing key".to_string()))?;

        // TODO: Get data from DataSphere
        tracing::info!("MCP: Getting key: {}", key);

        Ok(serde_json::json!({
            "key": key,
            "value": null
        }))
    }

    async fn handle_datasphere_set(&self, params: &serde_json::Value) -> Result<serde_json::Value, McpError> {
        let key = params.get("key")
            .and_then(|v| v.as_str())
            .ok_or_else(|| McpError::InvalidRequest("Missing key".to_string()))?;

        // TODO: Set data in DataSphere
        tracing::info!("MCP: Setting key: {}", key);

        Ok(serde_json::json!({
            "status": "set"
        }))
    }

    async fn handle_logs_stream(&self, _params: &serde_json::Value) -> Result<serde_json::Value, McpError> {
        // TODO: Implement log streaming
        Ok(serde_json::json!({
            "status": "streaming"
        }))
    }

    async fn handle_ai_invoke(&self, params: &serde_json::Value) -> Result<serde_json::Value, McpError> {
        let prompt = params.get("prompt")
            .and_then(|v| v.as_str())
            .ok_or_else(|| McpError::InvalidRequest("Missing prompt".to_string()))?;

        // TODO: Invoke local AI (Ollama) or pass through
        tracing::info!("MCP: AI invoke with prompt length: {}", prompt.len());

        Ok(serde_json::json!({
            "response": "AI response placeholder"
        }))
    }

    /// Get pending approval requests
    pub fn get_pending_approvals(&self) -> Vec<ApprovalRequest> {
        self.pending_approvals.iter().cloned().collect()
    }

    /// Approve a pending request
    pub fn approve_request(&mut self, id: Uuid, remember: bool) -> bool {
        if let Some(pos) = self.pending_approvals.iter().position(|r| r.id == id) {
            let request = self.pending_approvals.remove(pos).unwrap();
            if remember {
                self.permissions.grant(&request.ability);
            }
            true
        } else {
            false
        }
    }

    /// Deny a pending request
    pub fn deny_request(&mut self, id: Uuid, remember: bool) -> bool {
        if let Some(pos) = self.pending_approvals.iter().position(|r| r.id == id) {
            let request = self.pending_approvals.remove(pos).unwrap();
            if remember {
                self.permissions.block(&request.ability);
            }
            true
        } else {
            false
        }
    }
}
