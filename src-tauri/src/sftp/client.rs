//! SFTP Client Implementation

use super::{FileEntry, SftpError, TransferProgress};
use chrono::Utc;
use russh_sftp::client::SftpSession;
use std::path::Path;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::mpsc;

/// SFTP Client for file operations
pub struct SftpClient {
    sftp: SftpSession,
}

impl SftpClient {
    /// Create SFTP client from SFTP session
    pub fn new(sftp: SftpSession) -> Self {
        Self { sftp }
    }

    /// List directory contents
    pub async fn list_dir(&self, path: &str) -> Result<Vec<FileEntry>, SftpError> {
        tracing::debug!("Listing directory: {}", path);

        let entries_result = self.sftp.read_dir(path).await
            .map_err(|e| SftpError::Ssh(format!("Failed to read directory: {}", e)))?;

        let mut entries = Vec::new();

        for entry in entries_result {
            let metadata = entry.metadata();
            let is_dir = metadata.is_dir();
            let size = metadata.len();

            let modified = metadata.modified().ok().and_then(|system_time| {
                system_time
                    .duration_since(std::time::UNIX_EPOCH)
                    .ok()
                    .and_then(|duration| {
                        chrono::DateTime::from_timestamp(duration.as_secs() as i64, 0)
                    })
            });

            let permissions = {
                let perms = metadata.permissions();
                Some(format_permissions(perms.mode(), is_dir))
            };

            entries.push(FileEntry {
                name: entry.file_name().to_string(),
                path: format!("{}/{}", path.trim_end_matches('/'), entry.file_name()),
                is_dir,
                size,
                modified,
                permissions,
                owner: None,
                group: None,
            });
        }

        // Add parent directory entry if not root
        if path != "/" {
            entries.insert(
                0,
                FileEntry {
                    name: "..".to_string(),
                    path: get_parent_path(path),
                    is_dir: true,
                    size: 0,
                    modified: None,
                    permissions: Some("drwxr-xr-x".to_string()),
                    owner: None,
                    group: None,
                },
            );
        }

        Ok(entries)
    }

    /// Get file/directory info
    pub async fn stat(&self, path: &str) -> Result<FileEntry, SftpError> {
        tracing::debug!("Getting stats for: {}", path);

        let metadata = self
            .sftp
            .metadata(path)
            .await
            .map_err(|e| SftpError::PathNotFound(format!("{}: {}", path, e)))?;

        let is_dir = metadata.is_dir();
        let size = metadata.len();

        let modified = metadata.modified().ok().and_then(|system_time| {
            system_time
                .duration_since(std::time::UNIX_EPOCH)
                .ok()
                .and_then(|duration| {
                    chrono::DateTime::from_timestamp(duration.as_secs() as i64, 0)
                })
        });

        let permissions = {
            let perms = metadata.permissions();
            Some(format_permissions(perms.mode(), is_dir))
        };

        let name = Path::new(path)
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "/".to_string());

        Ok(FileEntry {
            name,
            path: path.to_string(),
            is_dir,
            size,
            modified,
            permissions,
            owner: None,
            group: None,
        })
    }

    /// Create directory
    pub async fn mkdir(&self, path: &str) -> Result<(), SftpError> {
        tracing::info!("Creating directory: {}", path);

        self.sftp
            .create_dir(path)
            .await
            .map_err(|e| SftpError::Ssh(format!("Failed to create directory: {}", e)))?;

        Ok(())
    }

    /// Remove directory
    pub async fn rmdir(&self, path: &str) -> Result<(), SftpError> {
        tracing::info!("Removing directory: {}", path);

        self.sftp
            .remove_dir(path)
            .await
            .map_err(|e| SftpError::Ssh(format!("Failed to remove directory: {}", e)))?;

        Ok(())
    }

    /// Remove file
    pub async fn remove(&self, path: &str) -> Result<(), SftpError> {
        tracing::info!("Removing file: {}", path);

        self.sftp
            .remove_file(path)
            .await
            .map_err(|e| SftpError::Ssh(format!("Failed to remove file: {}", e)))?;

        Ok(())
    }

    /// Rename/move file or directory
    pub async fn rename(&self, from: &str, to: &str) -> Result<(), SftpError> {
        tracing::info!("Renaming {} to {}", from, to);

        self.sftp
            .rename(from, to)
            .await
            .map_err(|e| SftpError::Ssh(format!("Failed to rename: {}", e)))?;

        Ok(())
    }

    /// Upload file with progress
    pub async fn upload(
        &self,
        local_path: &str,
        remote_path: &str,
        progress_tx: Option<mpsc::Sender<TransferProgress>>,
    ) -> Result<(), SftpError> {
        tracing::info!("Uploading {} to {}", local_path, remote_path);

        // Read local file in chunks
        let mut local_file = tokio::fs::File::open(local_path).await?;
        let metadata = local_file.metadata().await?;
        let total_bytes = metadata.len();

        let mut buffer = vec![0u8; 32768]; // 32KB chunks
        let mut all_data = Vec::new();
        let mut bytes_transferred = 0u64;

        loop {
            let n = local_file.read(&mut buffer).await?;
            if n == 0 {
                break;
            }

            all_data.extend_from_slice(&buffer[..n]);
            bytes_transferred += n as u64;

            // Send progress update
            if let Some(ref tx) = progress_tx {
                let progress = TransferProgress {
                    path: remote_path.to_string(),
                    bytes_transferred,
                    total_bytes,
                    percent: (bytes_transferred as f32 / total_bytes as f32) * 100.0,
                };
                let _ = tx.send(progress).await;
            }
        }

        // Write all data to remote file
        self.sftp
            .write(remote_path, &all_data)
            .await
            .map_err(|e| SftpError::TransferFailed(format!("Write failed: {}", e)))?;

        tracing::info!("Upload complete: {} bytes", bytes_transferred);
        Ok(())
    }

    /// Download file with progress
    pub async fn download(
        &self,
        remote_path: &str,
        local_path: &str,
        progress_tx: Option<mpsc::Sender<TransferProgress>>,
    ) -> Result<(), SftpError> {
        tracing::info!("Downloading {} to {}", remote_path, local_path);

        // Get remote file size
        let attrs = self.sftp.metadata(remote_path).await
            .map_err(|e| SftpError::PathNotFound(format!("{}: {}", remote_path, e)))?;
        let total_bytes = attrs.size.unwrap_or(0);

        // Read remote file
        let data = self
            .sftp
            .read(remote_path)
            .await
            .map_err(|e| SftpError::PathNotFound(format!("{}: {}", remote_path, e)))?;

        // Write to local file
        let mut local_file = tokio::fs::File::create(local_path).await?;
        local_file.write_all(&data).await?;
        local_file.flush().await?;

        let bytes_transferred = data.len() as u64;

        // Send final progress update
        if let Some(ref tx) = progress_tx {
            let progress = TransferProgress {
                path: remote_path.to_string(),
                bytes_transferred,
                total_bytes,
                percent: 100.0,
            };
            let _ = tx.send(progress).await;
        }

        tracing::info!("Download complete: {} bytes", bytes_transferred);
        Ok(())
    }

    /// Read file contents
    pub async fn read_file(&self, path: &str) -> Result<Vec<u8>, SftpError> {
        tracing::debug!("Reading file: {}", path);

        let data = self
            .sftp
            .read(path)
            .await
            .map_err(|e| SftpError::PathNotFound(format!("{}: {}", path, e)))?;

        Ok(data)
    }

    /// Write file contents
    pub async fn write_file(&self, path: &str, data: &[u8]) -> Result<(), SftpError> {
        tracing::debug!("Writing {} bytes to {}", data.len(), path);

        self.sftp
            .write(path, data)
            .await
            .map_err(|e| SftpError::TransferFailed(format!("Write failed: {}", e)))?;

        Ok(())
    }
}

fn get_parent_path(path: &str) -> String {
    Path::new(path)
        .parent()
        .map(|p| {
            let parent_str = p.to_string_lossy().to_string();
            if parent_str.is_empty() {
                "/".to_string()
            } else {
                parent_str
            }
        })
        .unwrap_or_else(|| "/".to_string())
}

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
