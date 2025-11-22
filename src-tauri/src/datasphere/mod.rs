//! DataSphere Module
//!
//! End-to-End encrypted storage for:
//! - Hosts
//! - SSH Keys
//! - Snippets
//! - Settings
//!
//! Uses ChaCha20-Poly1305 for encryption and Argon2id for key derivation

pub mod commands;
pub mod crypto;
mod models;
mod storage;

pub use crypto::{DataSphereCrypto, EncryptedData, VaultFile};
pub use models::*;
pub use storage::DataSphereStorage;

use tokio::sync::RwLock;
use once_cell::sync::Lazy;
use tauri::AppHandle;

/// Global DataSphere storage instance
static DATASPHERE: Lazy<RwLock<Option<DataSphereStorage>>> = Lazy::new(|| RwLock::new(None));

/// Initialize DataSphere
pub fn init(app: &AppHandle) -> Result<(), DataSphereError> {
    let storage = DataSphereStorage::new(app)?;
    *DATASPHERE.write() = Some(storage);
    tracing::info!("DataSphere initialized");
    Ok(())
}

/// Get the DataSphere storage instance
pub fn storage() -> &'static RwLock<Option<DataSphereStorage>> {
    &DATASPHERE
}

/// DataSphere Error types
#[derive(Debug, thiserror::Error)]
pub enum DataSphereError {
    #[error("Storage not initialized")]
    NotInitialized,
    #[error("Encryption error: {0}")]
    Encryption(String),
    #[error("Decryption error: {0}")]
    Decryption(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Item not found: {0}")]
    NotFound(String),
    #[error("Tauri error: {0}")]
    Tauri(String),
}

impl From<tauri::Error> for DataSphereError {
    fn from(err: tauri::Error) -> Self {
        DataSphereError::Tauri(err.to_string())
    }
}

impl serde::Serialize for DataSphereError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
