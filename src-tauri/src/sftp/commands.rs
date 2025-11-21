//! SFTP Tauri Commands

use super::{FileEntry, SftpError};
use uuid::Uuid;

/// List directory contents
#[tauri::command]
pub async fn list_directory(session_id: Uuid, path: String) -> Result<Vec<FileEntry>, SftpError> {
    tracing::info!("Listing directory: {} for session {}", path, session_id);

    // TODO: Implement actual SFTP directory listing
    // Mock response for now
    Ok(vec![
        FileEntry {
            name: "..".to_string(),
            path: format!("{}/..", path),
            is_dir: true,
            size: 0,
            modified: None,
            permissions: Some("drwxr-xr-x".to_string()),
            owner: None,
            group: None,
        },
        FileEntry {
            name: "documents".to_string(),
            path: format!("{}/documents", path),
            is_dir: true,
            size: 4096,
            modified: Some(chrono::Utc::now()),
            permissions: Some("drwxr-xr-x".to_string()),
            owner: Some("root".to_string()),
            group: Some("root".to_string()),
        },
        FileEntry {
            name: "example.txt".to_string(),
            path: format!("{}/example.txt", path),
            is_dir: false,
            size: 1234,
            modified: Some(chrono::Utc::now()),
            permissions: Some("-rw-r--r--".to_string()),
            owner: Some("root".to_string()),
            group: Some("root".to_string()),
        },
    ])
}

/// Upload a file to the remote server
#[tauri::command]
pub async fn upload_file(
    session_id: Uuid,
    local_path: String,
    remote_path: String,
) -> Result<(), SftpError> {
    tracing::info!(
        "Uploading {} to {} for session {}",
        local_path,
        remote_path,
        session_id
    );

    // TODO: Implement actual file upload
    Ok(())
}

/// Download a file from the remote server
#[tauri::command]
pub async fn download_file(
    session_id: Uuid,
    remote_path: String,
    local_path: String,
) -> Result<(), SftpError> {
    tracing::info!(
        "Downloading {} to {} for session {}",
        remote_path,
        local_path,
        session_id
    );

    // TODO: Implement actual file download
    Ok(())
}

/// Delete a file or directory
#[tauri::command]
pub async fn delete_path(session_id: Uuid, path: String) -> Result<(), SftpError> {
    tracing::info!("Deleting {} for session {}", path, session_id);

    // TODO: Implement actual deletion
    Ok(())
}

/// Create a directory
#[tauri::command]
pub async fn create_directory(session_id: Uuid, path: String) -> Result<(), SftpError> {
    tracing::info!("Creating directory {} for session {}", path, session_id);

    // TODO: Implement actual directory creation
    Ok(())
}
