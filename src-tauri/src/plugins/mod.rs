//! Plugin System Module
//!
//! Provides an extensible plugin architecture for Nexus

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Plugin manifest
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub homepage: Option<String>,
    pub permissions: Vec<PluginPermission>,
}

/// Plugin permissions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PluginPermission {
    ReadHosts,
    WriteHosts,
    ExecuteCommands,
    FileAccess,
    NetworkAccess,
    SystemInfo,
}

/// Loaded plugin instance
#[derive(Debug)]
pub struct Plugin {
    pub id: Uuid,
    pub manifest: PluginManifest,
    pub enabled: bool,
}

impl Plugin {
    pub fn new(manifest: PluginManifest) -> Self {
        Self {
            id: Uuid::new_v4(),
            manifest,
            enabled: true,
        }
    }
}

/// Plugin manager (placeholder for future implementation)
#[derive(Debug, Default)]
pub struct PluginManager {
    plugins: Vec<Plugin>,
}

impl PluginManager {
    pub fn new() -> Self {
        Self { plugins: vec![] }
    }

    pub fn load_plugin(&mut self, manifest: PluginManifest) -> &Plugin {
        let plugin = Plugin::new(manifest);
        self.plugins.push(plugin);
        self.plugins.last().unwrap()
    }

    pub fn get_plugins(&self) -> &[Plugin] {
        &self.plugins
    }
}
