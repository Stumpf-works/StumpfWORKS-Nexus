//! MCP Permission System
//!
//! Manages user permissions for MCP abilities

use super::{AiProvider, McpAbility};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// Permission manager for MCP requests
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionManager {
    /// Abilities that are always allowed (no prompt)
    pub auto_approve: HashSet<String>,
    /// Abilities that are always denied
    pub blocked: HashSet<String>,
    /// Per-provider permissions
    pub provider_permissions: std::collections::HashMap<String, ProviderPermission>,
}

impl Default for PermissionManager {
    fn default() -> Self {
        Self {
            auto_approve: HashSet::new(),
            blocked: HashSet::new(),
            provider_permissions: std::collections::HashMap::new(),
        }
    }
}

impl PermissionManager {
    /// Check if an ability is allowed for a provider
    pub fn check_permission(
        &self,
        provider: &AiProvider,
        ability: &McpAbility,
    ) -> PermissionResult {
        let ability_str = ability.as_str().to_string();
        let provider_str = format!("{:?}", provider).to_lowercase();

        // Check if blocked
        if self.blocked.contains(&ability_str) {
            return PermissionResult::Denied;
        }

        // Check auto-approve
        if self.auto_approve.contains(&ability_str) {
            return PermissionResult::Allowed;
        }

        // Check provider-specific permissions
        if let Some(perms) = self.provider_permissions.get(&provider_str) {
            if perms.allowed_abilities.contains(&ability_str) {
                return PermissionResult::Allowed;
            }
            if perms.blocked_abilities.contains(&ability_str) {
                return PermissionResult::Denied;
            }
        }

        // Default: require approval
        PermissionResult::RequiresApproval
    }

    /// Grant permission for an ability
    pub fn grant(&mut self, ability: &McpAbility) {
        self.auto_approve.insert(ability.as_str().to_string());
        self.blocked.remove(ability.as_str());
    }

    /// Block an ability
    pub fn block(&mut self, ability: &McpAbility) {
        self.blocked.insert(ability.as_str().to_string());
        self.auto_approve.remove(ability.as_str());
    }
}

/// Provider-specific permissions
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProviderPermission {
    pub allowed_abilities: HashSet<String>,
    pub blocked_abilities: HashSet<String>,
}

/// Result of a permission check
#[derive(Debug, Clone, PartialEq)]
pub enum PermissionResult {
    Allowed,
    Denied,
    RequiresApproval,
}

/// Pending approval request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalRequest {
    pub id: uuid::Uuid,
    pub provider: AiProvider,
    pub ability: McpAbility,
    pub description: String,
    pub params_preview: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl ApprovalRequest {
    pub fn new(provider: AiProvider, ability: McpAbility, params: &serde_json::Value) -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            provider,
            ability: ability.clone(),
            description: Self::describe_ability(&ability),
            params_preview: serde_json::to_string_pretty(params)
                .unwrap_or_default()
                .chars()
                .take(500)
                .collect(),
            timestamp: chrono::Utc::now(),
        }
    }

    fn describe_ability(ability: &McpAbility) -> String {
        match ability {
            McpAbility::ServerList => "List available servers".to_string(),
            McpAbility::SshConnect => "Connect to an SSH server".to_string(),
            McpAbility::SshExecute => "Execute a command on a server".to_string(),
            McpAbility::SshUpload => "Upload a file to a server".to_string(),
            McpAbility::SshDownload => "Download a file from a server".to_string(),
            McpAbility::DatasphereGet => "Read data from DataSphere".to_string(),
            McpAbility::DatasphereSet => "Write data to DataSphere".to_string(),
            McpAbility::LogsStream => "Stream logs from a session".to_string(),
            McpAbility::AiInvoke => "Invoke AI processing".to_string(),
        }
    }
}
