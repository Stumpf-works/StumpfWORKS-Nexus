//! DataSphere Tauri Commands

use super::{storage, DataSphereError, Host, HostGroup, NewHost, NewVaultEntry, Settings, Snippet, VaultEntry};
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

/// Update an existing snippet
#[tauri::command]
pub fn update_snippet(snippet: Snippet) -> Result<Snippet, DataSphereError> {
    let mut storage = storage().write();
    let storage = storage.as_mut().ok_or(DataSphereError::NotInitialized)?;
    storage.update_snippet(snippet)
}

/// Delete a snippet
#[tauri::command]
pub fn delete_snippet(id: Uuid) -> Result<(), DataSphereError> {
    let mut storage = storage().write();
    let storage = storage.as_mut().ok_or(DataSphereError::NotInitialized)?;
    storage.delete_snippet(id)
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

// Vault commands

/// Get all vault entries
#[tauri::command]
pub fn get_vault_entries() -> Result<Vec<VaultEntry>, DataSphereError> {
    let storage = storage().read();
    let storage = storage.as_ref().ok_or(DataSphereError::NotInitialized)?;
    Ok(storage.get_vault_entries())
}

/// Get a specific vault entry by ID
#[tauri::command]
pub fn get_vault_entry(id: Uuid) -> Result<Option<VaultEntry>, DataSphereError> {
    let storage = storage().read();
    let storage = storage.as_ref().ok_or(DataSphereError::NotInitialized)?;
    Ok(storage.get_vault_entry(id))
}

/// Add a new vault entry
#[tauri::command]
pub fn add_vault_entry(entry: NewVaultEntry) -> Result<VaultEntry, DataSphereError> {
    let mut storage = storage().write();
    let storage = storage.as_mut().ok_or(DataSphereError::NotInitialized)?;

    let vault_entry = VaultEntry {
        id: Uuid::new_v4(),
        name: entry.name,
        entry_type: entry.entry_type,
        username: entry.username,
        secret: entry.secret,
        url: entry.url,
        notes: entry.notes,
        tags: entry.tags,
        folder: entry.folder,
        favorite: false,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        last_used: None,
    };

    storage.add_vault_entry(vault_entry)
}

/// Update an existing vault entry
#[tauri::command]
pub fn update_vault_entry(entry: VaultEntry) -> Result<VaultEntry, DataSphereError> {
    let mut storage = storage().write();
    let storage = storage.as_mut().ok_or(DataSphereError::NotInitialized)?;
    storage.update_vault_entry(entry)
}

/// Delete a vault entry
#[tauri::command]
pub fn delete_vault_entry(id: Uuid) -> Result<(), DataSphereError> {
    let mut storage = storage().write();
    let storage = storage.as_mut().ok_or(DataSphereError::NotInitialized)?;
    storage.delete_vault_entry(id)
}

/// Search vault entries
#[tauri::command]
pub fn search_vault(query: String) -> Result<Vec<VaultEntry>, DataSphereError> {
    let storage = storage().read();
    let storage = storage.as_ref().ok_or(DataSphereError::NotInitialized)?;
    Ok(storage.search_vault(&query))
}

/// Get all vault folders
#[tauri::command]
pub fn get_vault_folders() -> Result<Vec<String>, DataSphereError> {
    let storage = storage().read();
    let storage = storage.as_ref().ok_or(DataSphereError::NotInitialized)?;
    Ok(storage.get_vault_folders())
}
