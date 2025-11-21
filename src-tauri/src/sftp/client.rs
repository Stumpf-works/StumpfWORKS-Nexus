//! SFTP Client Implementation

use super::{FileEntry, SftpError, TransferProgress};
use chrono::Utc;
use russh::Channel;
use russh_sftp::client::SftpSession;
use std::path::Path;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::mpsc;

/// SFTP Client for file operations
pub struct SftpClient {
    sftp: SftpSession,
}

impl SftpClient {
    /// Create SFTP client from existing SSH channel
    pub async fn from_channel(channel: Channel<russh::client::Msg>) -> Result<Self, SftpError> {
        tracing::info!("Initializing SFTP session");
        let sftp = SftpSession::new(channel)
            .await
            .map_err(|e| SftpError::Ssh(format!("Failed to create SFTP session: {}", e)))?;

        Ok(Self { sftp })
    }

    /// List directory contents
    pub async fn list_dir(&self, path: &str) -> Result<Vec<FileEntry>, SftpError> {
        tracing::debug!("Listing directory: {}", path);

        let mut entries = Vec::new();

        // Read directory
        let dir_handle = self
            .sftp
            .open_dir(path)
            .await
            .map_err(|e| SftpError::Ssh(format!("Failed to open directory: {}", e)))?;

        let files = self
            .sftp
            .read_dir(dir_handle)
            .await
            .map_err(|e| SftpError::Ssh(format!("Failed to read directory: {}", e)))?;

        for file in files {
            let attrs = file.attrs();
            let is_dir = attrs.is_dir();
            let size = attrs.size.unwrap_or(0);
            let modified = attrs.mtime.map(|t| {
                chrono::DateTime::from_timestamp(t as i64, 0)
                    .unwrap_or_else(|| Utc::now())
            });

            let permissions = if let Some(perms) = attrs.permissions {
                Some(format_permissions(perms, is_dir))
            } else {
                None
            };

            entries.push(FileEntry {
                name: file.file_name().to_string(),
                path: format!("{}/{}", path.trim_end_matches('/'), file.file_name()),
                is_dir,
                size,
                modified,
                permissions,
                owner: None, // russh-sftp doesn't provide owner/group easily
                group: None,
            });
        }

        self.sftp
            .close(dir_handle)
            .await
            .map_err(|e| SftpError::Ssh(format!("Failed to close directory: {}", e)))?;

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

        let attrs = self
            .sftp
            .metadata(path)
            .await
            .map_err(|e| SftpError::PathNotFound(format!("{}: {}", path, e)))?;

        let is_dir = attrs.is_dir();
        let size = attrs.size.unwrap_or(0);
        let modified = attrs.mtime.map(|t| {
            chrono::DateTime::from_timestamp(t as i64, 0)
                .unwrap_or_else(|| Utc::now())
        });

        let permissions = if let Some(perms) = attrs.permissions {
            Some(format_permissions(perms, is_dir))
        } else {
            None
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

        // Read local file
        let mut local_file = tokio::fs::File::open(local_path).await?;
        let metadata = local_file.metadata().await?;
        let total_bytes = metadata.len();

        // Create remote file
        let mut remote_file = self
            .sftp
            .create(remote_path)
            .await
            .map_err(|e| SftpError::Ssh(format!("Failed to create remote file: {}", e)))?;

        // Upload in chunks
        let mut buffer = vec![0u8; 32768]; // 32KB chunks
        let mut bytes_transferred = 0u64;

        loop {
            let n = local_file.read(&mut buffer).await?;
            if n == 0 {
                break;
            }

            self.sftp
                .write(&mut remote_file, &buffer[..n])
                .await
                .map_err(|e| SftpError::TransferFailed(format!("Write failed: {}", e)))?;

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

        self.sftp
            .close(remote_file)
            .await
            .map_err(|e| SftpError::Ssh(format!("Failed to close remote file: {}", e)))?;

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

        // Open remote file
        let mut remote_file = self
            .sftp
            .open(remote_path)
            .await
            .map_err(|e| SftpError::PathNotFound(format!("{}: {}", remote_path, e)))?;

        // Create local file
        let mut local_file = tokio::fs::File::create(local_path).await?;

        // Download in chunks
        let mut buffer = vec![0u8; 32768]; // 32KB chunks
        let mut bytes_transferred = 0u64;

        loop {
            let n = match self.sftp.read(&mut remote_file, &mut buffer).await {
                Ok(n) if n == 0 => break,
                Ok(n) => n,
                Err(e) => return Err(SftpError::TransferFailed(format!("Read failed: {}", e))),
            };

            local_file.write_all(&buffer[..n]).await?;
            bytes_transferred += n as u64;

            // Send progress update
            if let Some(ref tx) = progress_tx {
                let progress = TransferProgress {
                    path: remote_path.to_string(),
                    bytes_transferred,
                    total_bytes,
                    percent: if total_bytes > 0 {
                        (bytes_transferred as f32 / total_bytes as f32) * 100.0
                    } else {
                        0.0
                    },
                };
                let _ = tx.send(progress).await;
            }
        }

        self.sftp
            .close(remote_file)
            .await
            .map_err(|e| SftpError::Ssh(format!("Failed to close remote file: {}", e)))?;

        local_file.flush().await?;

        tracing::info!("Download complete: {} bytes", bytes_transferred);
        Ok(())
    }

    /// Read file contents
    pub async fn read_file(&self, path: &str) -> Result<Vec<u8>, SftpError> {
        tracing::debug!("Reading file: {}", path);

        let mut file = self
            .sftp
            .open(path)
            .await
            .map_err(|e| SftpError::PathNotFound(format!("{}: {}", path, e)))?;

        let mut contents = Vec::new();
        let mut buffer = vec![0u8; 32768];

        loop {
            let n = match self.sftp.read(&mut file, &mut buffer).await {
                Ok(n) if n == 0 => break,
                Ok(n) => n,
                Err(e) => return Err(SftpError::Io(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("Read failed: {}", e),
                ))),
            };

            contents.extend_from_slice(&buffer[..n]);
        }

        self.sftp
            .close(file)
            .await
            .map_err(|e| SftpError::Ssh(format!("Failed to close file: {}", e)))?;

        Ok(contents)
    }

    /// Write file contents
    pub async fn write_file(&self, path: &str, data: &[u8]) -> Result<(), SftpError> {
        tracing::debug!("Writing {} bytes to {}", data.len(), path);

        let mut file = self
            .sftp
            .create(path)
            .await
            .map_err(|e| SftpError::Ssh(format!("Failed to create file: {}", e)))?;

        self.sftp
            .write(&mut file, data)
            .await
            .map_err(|e| SftpError::TransferFailed(format!("Write failed: {}", e)))?;

        self.sftp
            .close(file)
            .await
            .map_err(|e| SftpError::Ssh(format!("Failed to close file: {}", e)))?;

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
