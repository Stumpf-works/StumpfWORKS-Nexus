//! SFTP Client Implementation

use super::{FileEntry, SftpError, TransferProgress};
use chrono::{DateTime, Utc};
use russh::Channel;
use russh_sftp::client::SftpSession;
use std::path::Path;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::mpsc;

/// SFTP Client for file operations
pub struct SftpClient {
    sftp_session: Option<SftpSession>,
    current_path: String,
}

impl SftpClient {
    pub fn new() -> Self {
        Self {
            sftp_session: None,
            current_path: "/".to_string(),
        }
    }

    /// Connect SFTP subsystem over existing SSH channel
    pub async fn connect(&mut self, channel: Channel<russh::client::Msg>) -> Result<(), SftpError> {
        tracing::info!("Initializing SFTP subsystem");

        let sftp = SftpSession::new(channel)
            .await
            .map_err(|e| SftpError::Ssh(e.to_string()))?;

        self.sftp_session = Some(sftp);
        tracing::info!("SFTP subsystem initialized successfully");
        Ok(())
    }

    /// Check if connected
    pub fn is_connected(&self) -> bool {
        self.sftp_session.is_some()
    }

    /// Get mutable reference to SFTP session
    fn session(&mut self) -> Result<&mut SftpSession, SftpError> {
        self.sftp_session.as_mut().ok_or(SftpError::NotConnected)
    }

    /// List directory contents
    pub async fn list_dir(&mut self, path: &str) -> Result<Vec<FileEntry>, SftpError> {
        tracing::debug!("Listing directory: {}", path);

        let sftp = self.session()?;
        let entries = sftp
            .read_dir(path)
            .await
            .map_err(|e| SftpError::Ssh(e.to_string()))?;

        let mut file_entries = Vec::new();

        // Add parent directory entry
        if path != "/" {
            file_entries.push(FileEntry {
                name: "..".to_string(),
                path: get_parent_path(path),
                is_dir: true,
                size: 0,
                modified: None,
                permissions: Some("drwxr-xr-x".to_string()),
                owner: None,
                group: None,
            });
        }

        for entry in entries {
            let attrs = entry.attrs();
            let file_name = entry.file_name();

            let full_path = if path.ends_with('/') {
                format!("{}{}", path, file_name)
            } else {
                format!("{}/{}", path, file_name)
            };

            // Parse permissions from mode
            let permissions = attrs.permissions.map(|p| format_permissions(p));

            // Convert timestamps
            let modified = attrs.mtime.and_then(|mtime| {
                DateTime::from_timestamp(mtime as i64, 0)
            });

            file_entries.push(FileEntry {
                name: file_name.to_string(),
                path: full_path,
                is_dir: attrs.is_dir(),
                size: attrs.size.unwrap_or(0),
                modified,
                permissions,
                owner: attrs.uid.map(|u| u.to_string()),
                group: attrs.gid.map(|g| g.to_string()),
            });
        }

        Ok(file_entries)
    }

    /// Get file/directory info
    pub async fn stat(&mut self, path: &str) -> Result<FileEntry, SftpError> {
        tracing::debug!("Getting file info: {}", path);

        let sftp = self.session()?;
        let attrs = sftp
            .metadata(path)
            .await
            .map_err(|e| SftpError::Ssh(e.to_string()))?;

        let name = Path::new(path)
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "/".to_string());

        let permissions = attrs.permissions.map(|p| format_permissions(p));
        let modified = attrs.mtime.and_then(|mtime| {
            DateTime::from_timestamp(mtime as i64, 0)
        });

        Ok(FileEntry {
            name,
            path: path.to_string(),
            is_dir: attrs.is_dir(),
            size: attrs.size.unwrap_or(0),
            modified,
            permissions,
            owner: attrs.uid.map(|u| u.to_string()),
            group: attrs.gid.map(|g| g.to_string()),
        })
    }

    /// Create directory
    pub async fn mkdir(&mut self, path: &str) -> Result<(), SftpError> {
        tracing::info!("Creating directory: {}", path);

        let sftp = self.session()?;
        sftp.create_dir(path)
            .await
            .map_err(|e| SftpError::Ssh(e.to_string()))?;

        Ok(())
    }

    /// Remove directory
    pub async fn rmdir(&mut self, path: &str) -> Result<(), SftpError> {
        tracing::info!("Removing directory: {}", path);

        let sftp = self.session()?;
        sftp.remove_dir(path)
            .await
            .map_err(|e| SftpError::Ssh(e.to_string()))?;

        Ok(())
    }

    /// Remove file
    pub async fn remove(&mut self, path: &str) -> Result<(), SftpError> {
        tracing::info!("Removing file: {}", path);

        let sftp = self.session()?;
        sftp.remove_file(path)
            .await
            .map_err(|e| SftpError::Ssh(e.to_string()))?;

        Ok(())
    }

    /// Rename/move file or directory
    pub async fn rename(&mut self, from: &str, to: &str) -> Result<(), SftpError> {
        tracing::info!("Renaming {} to {}", from, to);

        let sftp = self.session()?;
        sftp.rename(from, to)
            .await
            .map_err(|e| SftpError::Ssh(e.to_string()))?;

        Ok(())
    }

    /// Upload file with progress
    pub async fn upload(
        &mut self,
        local_path: &str,
        remote_path: &str,
        progress_tx: Option<mpsc::Sender<TransferProgress>>,
    ) -> Result<(), SftpError> {
        tracing::info!("Uploading {} to {}", local_path, remote_path);

        // Read local file
        let mut file = tokio::fs::File::open(local_path).await?;
        let metadata = file.metadata().await?;
        let total_bytes = metadata.len();

        let sftp = self.session()?;

        // Create remote file
        let mut remote_file = sftp
            .create(remote_path)
            .await
            .map_err(|e| SftpError::Ssh(e.to_string()))?;

        // Upload in chunks
        const CHUNK_SIZE: usize = 32768; // 32KB chunks
        let mut buffer = vec![0u8; CHUNK_SIZE];
        let mut bytes_transferred = 0u64;

        loop {
            let n = file.read(&mut buffer).await?;
            if n == 0 {
                break;
            }

            remote_file
                .write_all(&buffer[..n])
                .await
                .map_err(|e| SftpError::Io(e))?;

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

        remote_file
            .shutdown()
            .await
            .map_err(|e| SftpError::Ssh(e.to_string()))?;

        tracing::info!("Upload complete: {} bytes", bytes_transferred);
        Ok(())
    }

    /// Download file with progress
    pub async fn download(
        &mut self,
        remote_path: &str,
        local_path: &str,
        progress_tx: Option<mpsc::Sender<TransferProgress>>,
    ) -> Result<(), SftpError> {
        tracing::info!("Downloading {} to {}", remote_path, local_path);

        let sftp = self.session()?;

        // Get remote file size
        let attrs = sftp
            .metadata(remote_path)
            .await
            .map_err(|e| SftpError::Ssh(e.to_string()))?;
        let total_bytes = attrs.size.unwrap_or(0);

        // Open remote file
        let mut remote_file = sftp
            .open(remote_path)
            .await
            .map_err(|e| SftpError::Ssh(e.to_string()))?;

        // Create local file
        let mut local_file = tokio::fs::File::create(local_path).await?;

        // Download in chunks
        const CHUNK_SIZE: usize = 32768; // 32KB chunks
        let mut buffer = vec![0u8; CHUNK_SIZE];
        let mut bytes_transferred = 0u64;

        loop {
            let n = remote_file
                .read(&mut buffer)
                .await
                .map_err(|e| SftpError::Io(e))?;

            if n == 0 {
                break;
            }

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

        local_file.sync_all().await?;

        tracing::info!("Download complete: {} bytes", bytes_transferred);
        Ok(())
    }

    /// Read file contents
    pub async fn read_file(&mut self, path: &str) -> Result<Vec<u8>, SftpError> {
        tracing::debug!("Reading file: {}", path);

        let sftp = self.session()?;

        let mut file = sftp
            .open(path)
            .await
            .map_err(|e| SftpError::Ssh(e.to_string()))?;

        let mut contents = Vec::new();
        file.read_to_end(&mut contents)
            .await
            .map_err(|e| SftpError::Io(e))?;

        Ok(contents)
    }

    /// Write file contents
    pub async fn write_file(&mut self, path: &str, data: &[u8]) -> Result<(), SftpError> {
        tracing::debug!("Writing {} bytes to {}", data.len(), path);

        let sftp = self.session()?;

        let mut file = sftp
            .create(path)
            .await
            .map_err(|e| SftpError::Ssh(e.to_string()))?;

        file.write_all(data)
            .await
            .map_err(|e| SftpError::Io(e))?;

        file.shutdown()
            .await
            .map_err(|e| SftpError::Ssh(e.to_string()))?;

        Ok(())
    }

    /// Disconnect
    pub async fn disconnect(&mut self) {
        if let Some(mut session) = self.sftp_session.take() {
            let _ = session.close().await;
        }
        tracing::info!("SFTP disconnected");
    }
}

fn get_parent_path(path: &str) -> String {
    Path::new(path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "/".to_string())
}

/// Format Unix permissions into human-readable string (e.g., "drwxr-xr-x")
fn format_permissions(mode: u32) -> String {
    let file_type = match mode & 0o170000 {
        0o040000 => 'd', // Directory
        0o120000 => 'l', // Symlink
        0o100000 => '-', // Regular file
        0o060000 => 'b', // Block device
        0o020000 => 'c', // Character device
        0o010000 => 'p', // FIFO
        0o140000 => 's', // Socket
        _ => '?',
    };

    let user = [
        if mode & 0o400 != 0 { 'r' } else { '-' },
        if mode & 0o200 != 0 { 'w' } else { '-' },
        if mode & 0o100 != 0 { 'x' } else { '-' },
    ];

    let group = [
        if mode & 0o040 != 0 { 'r' } else { '-' },
        if mode & 0o020 != 0 { 'w' } else { '-' },
        if mode & 0o010 != 0 { 'x' } else { '-' },
    ];

    let other = [
        if mode & 0o004 != 0 { 'r' } else { '-' },
        if mode & 0o002 != 0 { 'w' } else { '-' },
        if mode & 0o001 != 0 { 'x' } else { '-' },
    ];

    format!(
        "{}{}{}{}{}{}{}{}{}{}",
        file_type,
        user[0],
        user[1],
        user[2],
        group[0],
        group[1],
        group[2],
        other[0],
        other[1],
        other[2]
    )
}

impl Default for SftpClient {
    fn default() -> Self {
        Self::new()
    }
}
