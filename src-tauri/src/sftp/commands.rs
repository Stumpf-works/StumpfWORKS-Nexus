//! SFTP Tauri Commands

use super::{manager, FileEntry, SftpError};
use crate::ssh::SshConfig;
use uuid::Uuid;

/// Connect to SFTP server
#[tauri::command]
pub async fn connect_sftp(
    session_id: Uuid,
    host_id: Uuid,
    host_name: String,
    config: SshConfig,
) -> Result<(), SftpError> {
    tracing::info!("Connecting SFTP session {} to {}", session_id, host_name);

    // Get or create session
    let mut manager = manager().write().await;

    if !manager.get_session(session_id).is_some() {
        manager.create_session_with_id(session_id, host_id, host_name.clone());
    }

    // Get mutable session
    let session = manager
        .get_session_mut(session_id)
        .ok_or(SftpError::NotConnected)?;

    // Connect
    session.connect(config).await?;

    Ok(())
}

/// Disconnect SFTP session
#[tauri::command]
pub async fn disconnect_sftp(session_id: Uuid) -> Result<(), SftpError> {
    tracing::info!("Disconnecting SFTP session {}", session_id);

    let mut manager = manager().write().await;

    if let Some(mut session) = manager.close_session(session_id) {
        session.disconnect().await?;
    }

    Ok(())
}

/// List directory contents
#[tauri::command]
pub async fn list_directory(session_id: Uuid, path: String) -> Result<Vec<FileEntry>, SftpError> {
    tracing::info!("Listing directory: {} for session {}", path, session_id);

    let mut manager = manager().write().await;
    let session = manager
        .get_session_mut(session_id)
        .ok_or(SftpError::NotConnected)?;

    let sftp = session.sftp_client_mut()?;
    sftp.list_dir(&path).await
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

    let mut manager = manager().write().await;
    let session = manager
        .get_session_mut(session_id)
        .ok_or(SftpError::NotConnected)?;

    let sftp = session.sftp_client_mut()?;
    sftp.upload(&local_path, &remote_path, None).await
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

    let mut manager = manager().write().await;
    let session = manager
        .get_session_mut(session_id)
        .ok_or(SftpError::NotConnected)?;

    let sftp = session.sftp_client_mut()?;
    sftp.download(&remote_path, &local_path, None).await
}

/// Delete a file or directory
#[tauri::command]
pub async fn delete_path(session_id: Uuid, path: String, is_dir: bool) -> Result<(), SftpError> {
    tracing::info!("Deleting {} for session {}", path, session_id);

    let mut manager = manager().write().await;
    let session = manager
        .get_session_mut(session_id)
        .ok_or(SftpError::NotConnected)?;

    let sftp = session.sftp_client_mut()?;

    if is_dir {
        sftp.rmdir(&path).await
    } else {
        sftp.remove(&path).await
    }
}

/// Create a directory
#[tauri::command]
pub async fn create_directory(session_id: Uuid, path: String) -> Result<(), SftpError> {
    tracing::info!("Creating directory {} for session {}", path, session_id);

    let mut manager = manager().write().await;
    let session = manager
        .get_session_mut(session_id)
        .ok_or(SftpError::NotConnected)?;

    let sftp = session.sftp_client_mut()?;
    sftp.mkdir(&path).await
}
