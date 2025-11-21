//! SFTP Tauri Commands

use super::{manager, FileEntry, SftpError};
use uuid::Uuid;

/// List directory contents
#[tauri::command]
pub async fn list_directory(session_id: String, path: String) -> Result<Vec<FileEntry>, SftpError> {
    let session_uuid = Uuid::parse_str(&session_id)
        .map_err(|_| SftpError::Ssh("Invalid session ID".to_string()))?;

    tracing::info!("Listing directory: {} for session {}", path, session_id);

    // Get client and drop lock before await
    let client = {
        let sftp_mgr = manager().read();
        sftp_mgr
            .get_client(&session_uuid)
            .ok_or_else(|| SftpError::NotConnected)?
    }; // Lock is dropped here

    client.list_dir(&path).await
}

/// Upload a file to the remote server
#[tauri::command]
pub async fn upload_file(
    session_id: String,
    local_path: String,
    remote_path: String,
) -> Result<(), SftpError> {
    let session_uuid = Uuid::parse_str(&session_id)
        .map_err(|_| SftpError::Ssh("Invalid session ID".to_string()))?;

    tracing::info!(
        "Uploading {} to {} for session {}",
        local_path,
        remote_path,
        session_id
    );

    let client = {
        let sftp_mgr = manager().read();
        sftp_mgr
            .get_client(&session_uuid)
            .ok_or_else(|| SftpError::NotConnected)?
    };

    client.upload(&local_path, &remote_path, None).await
}

/// Download a file from the remote server
#[tauri::command]
pub async fn download_file(
    session_id: String,
    remote_path: String,
    local_path: String,
) -> Result<(), SftpError> {
    let session_uuid = Uuid::parse_str(&session_id)
        .map_err(|_| SftpError::Ssh("Invalid session ID".to_string()))?;

    tracing::info!(
        "Downloading {} to {} for session {}",
        remote_path,
        local_path,
        session_id
    );

    let client = {
        let sftp_mgr = manager().read();
        sftp_mgr
            .get_client(&session_uuid)
            .ok_or_else(|| SftpError::NotConnected)?
    };

    client.download(&remote_path, &local_path, None).await
}

/// Delete a file or directory
#[tauri::command]
pub async fn delete_path(session_id: String, path: String, is_dir: bool) -> Result<(), SftpError> {
    let session_uuid = Uuid::parse_str(&session_id)
        .map_err(|_| SftpError::Ssh("Invalid session ID".to_string()))?;

    tracing::info!("Deleting {} for session {}", path, session_id);

    let client = {
        let sftp_mgr = manager().read();
        sftp_mgr
            .get_client(&session_uuid)
            .ok_or_else(|| SftpError::NotConnected)?
    };

    if is_dir {
        client.rmdir(&path).await
    } else {
        client.remove(&path).await
    }
}

/// Create a directory
#[tauri::command]
pub async fn create_directory(session_id: String, path: String) -> Result<(), SftpError> {
    let session_uuid = Uuid::parse_str(&session_id)
        .map_err(|_| SftpError::Ssh("Invalid session ID".to_string()))?;

    tracing::info!("Creating directory {} for session {}", path, session_id);

    let client = {
        let sftp_mgr = manager().read();
        sftp_mgr
            .get_client(&session_uuid)
            .ok_or_else(|| SftpError::NotConnected)?
    };

    client.mkdir(&path).await
}

/// List local directory contents
#[tauri::command]
pub async fn list_local_directory(path: String) -> Result<Vec<FileEntry>, SftpError> {
    tracing::info!("Listing local directory: {}", path);

    let mut entries = Vec::new();

    let dir_path = std::path::Path::new(&path);
    if !dir_path.exists() {
        return Err(SftpError::PathNotFound(path));
    }

    if !dir_path.is_dir() {
        return Err(SftpError::NotDirectory(path));
    }

    // Add parent directory entry if not root
    if let Some(parent) = dir_path.parent() {
        entries.push(FileEntry {
            name: "..".to_string(),
            path: parent.to_string_lossy().to_string(),
            is_dir: true,
            size: 0,
            modified: None,
            permissions: Some("drwxr-xr-x".to_string()),
            owner: None,
            group: None,
        });
    }

    // Read directory contents
    let mut read_dir = tokio::fs::read_dir(&path).await?;

    while let Some(entry) = read_dir.next_entry().await? {
        let metadata = entry.metadata().await?;
        let is_dir = metadata.is_dir();
        let size = metadata.len();
        let modified = metadata.modified().ok().map(|t| {
            chrono::DateTime::from(t)
        });

        #[cfg(unix)]
        let permissions = {
            use std::os::unix::fs::PermissionsExt;
            let mode = metadata.permissions().mode();
            Some(format_permissions(mode, is_dir))
        };

        #[cfg(not(unix))]
        let permissions = if metadata.permissions().readonly() {
            Some(if is_dir { "dr-xr-xr-x" } else { "-r--r--r--" }.to_string())
        } else {
            Some(if is_dir { "drwxrwxrwx" } else { "-rw-rw-rw-" }.to_string())
        };

        entries.push(FileEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_dir,
            size,
            modified,
            permissions,
            owner: None,
            group: None,
        });
    }

    // Sort: directories first, then by name
    entries.sort_by(|a, b| {
        if a.name == ".." {
            std::cmp::Ordering::Less
        } else if b.name == ".." {
            std::cmp::Ordering::Greater
        } else {
            match (a.is_dir, b.is_dir) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.cmp(&b.name),
            }
        }
    });

    Ok(entries)
}

/// Create a local directory
#[tauri::command]
pub async fn create_local_directory(path: String) -> Result<(), SftpError> {
    tracing::info!("Creating local directory: {}", path);
    tokio::fs::create_dir_all(&path).await?;
    Ok(())
}

/// Delete a local file or directory
#[tauri::command]
pub async fn delete_local_path(path: String, is_dir: bool) -> Result<(), SftpError> {
    tracing::info!("Deleting local path: {}", path);

    if is_dir {
        tokio::fs::remove_dir_all(&path).await?;
    } else {
        tokio::fs::remove_file(&path).await?;
    }

    Ok(())
}

#[cfg(unix)]
fn format_permissions(mode: u32, is_dir: bool) -> String {
    let file_type = if is_dir { 'd' } else { '-' };

    let user = format!(
        "{}{}{}",
        if mode & 0o400 != 0 { 'r' } else { '-' },
        if mode & 0o200 != 0 { 'w' } else { '-' },
        if mode & 0o100 != 0 { 'x' } else { '-' }
    );

    let group = format!(
        "{}{}{}",
        if mode & 0o040 != 0 { 'r' } else { '-' },
        if mode & 0o020 != 0 { 'w' } else { '-' },
        if mode & 0o010 != 0 { 'x' } else { '-' }
    );

    let other = format!(
        "{}{}{}",
        if mode & 0o004 != 0 { 'r' } else { '-' },
        if mode & 0o002 != 0 { 'w' } else { '-' },
        if mode & 0o001 != 0 { 'x' } else { '-' }
    );

    format!("{}{}{}{}", file_type, user, group, other)
}
