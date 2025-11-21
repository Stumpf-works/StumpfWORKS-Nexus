//! DataSphere Tauri Commands

use super::{storage, DataSphereError, Host, HostGroup, NewHost, Settings, Snippet};
use uuid::Uuid;

/// Get all hosts
#[tauri::command]
pub fn get_hosts() -> Result<Vec<Host>, DataSphereError> {
    let storage = storage().read();
    let storage = storage.as_ref().ok_or(DataSphereError::NotInitialized)?;
    Ok(storage.get_hosts())
}

/// Add a new host
#[tauri::command]
pub fn add_host(host: NewHost) -> Result<Host, DataSphereError> {
    let mut storage = storage().write();
    let storage = storage.as_mut().ok_or(DataSphereError::NotInitialized)?;
    let host = Host::from_new(host);
    storage.add_host(host)
}

/// Update an existing host
#[tauri::command]
pub fn update_host(host: Host) -> Result<Host, DataSphereError> {
    let mut storage = storage().write();
    let storage = storage.as_mut().ok_or(DataSphereError::NotInitialized)?;
    storage.update_host(host)
}

/// Delete a host
#[tauri::command]
pub fn delete_host(id: Uuid) -> Result<(), DataSphereError> {
    let mut storage = storage().write();
    let storage = storage.as_mut().ok_or(DataSphereError::NotInitialized)?;
    storage.delete_host(id)
}

/// Get all host groups
#[tauri::command]
pub fn get_host_groups() -> Result<Vec<HostGroup>, DataSphereError> {
    let storage = storage().read();
    let storage = storage.as_ref().ok_or(DataSphereError::NotInitialized)?;
    Ok(storage.get_groups())
}

/// Get all snippets
#[tauri::command]
pub fn get_snippets() -> Result<Vec<Snippet>, DataSphereError> {
    let storage = storage().read();
    let storage = storage.as_ref().ok_or(DataSphereError::NotInitialized)?;
    Ok(storage.get_snippets())
}

/// Add a new snippet
#[tauri::command]
pub fn add_snippet(snippet: Snippet) -> Result<Snippet, DataSphereError> {
    let mut storage = storage().write();
    let storage = storage.as_mut().ok_or(DataSphereError::NotInitialized)?;
    storage.add_snippet(snippet)
}

/// Get application settings
#[tauri::command]
pub fn get_settings() -> Result<Settings, DataSphereError> {
    let storage = storage().read();
    let storage = storage.as_ref().ok_or(DataSphereError::NotInitialized)?;
    Ok(storage.get_settings())
}

/// Update application settings
#[tauri::command]
pub fn update_settings(settings: Settings) -> Result<Settings, DataSphereError> {
    let mut storage = storage().write();
    let storage = storage.as_mut().ok_or(DataSphereError::NotInitialized)?;
    storage.update_settings(settings)
}
