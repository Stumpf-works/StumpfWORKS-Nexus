//! SSH Client Module
//!
//! Provides SSH connection management using russh (to be implemented)

pub mod commands;
mod client;

pub use client::{SshClient, SshConfig, SshError, AuthMethod, CommandOutput};

use std::collections::HashMap;
use tokio::sync::RwLock;
use once_cell::sync::Lazy;
use uuid::Uuid;

/// Global SSH client manager
static SSH_CLIENTS: Lazy<RwLock<HashMap<Uuid, SshClient>>> =
    Lazy::new(|| RwLock::new(HashMap::new()));

/// Get a reference to the SSH clients map
pub fn clients() -> &'static RwLock<HashMap<Uuid, SshClient>> {
    &SSH_CLIENTS
}
