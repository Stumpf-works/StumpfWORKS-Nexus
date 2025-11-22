//! SSH Tauri Commands

use super::{clients, SshClient, SshConfig, SshError, CommandOutput};
use uuid::Uuid;

/// Connect to an SSH server
#[tauri::command]
pub async fn connect(config: SshConfig) -> Result<Uuid, SshError> {
    let mut client = SshClient::new(config);
    client.connect().await?;

    let id = client.id;
    clients().write().await.insert(id, client);

    Ok(id)
}

/// Disconnect from an SSH server
#[tauri::command]
pub async fn disconnect(session_id: Uuid) -> Result<(), SshError> {
    // Remove client from map first, then disconnect
    // This avoids holding the lock across await
    let client = clients().write().await.remove(&session_id);

    if let Some(mut client) = client {
        client.disconnect().await?;
    }

    Ok(())
}

/// Send a command to the SSH server
#[tauri::command]
pub async fn send_command(session_id: Uuid, command: String) -> Result<CommandOutput, SshError> {
    // Take client out, execute, then put back
    // This avoids holding lock across await
    let mut client = clients()
        .write().await
        .remove(&session_id)
        .ok_or(SshError::NotConnected)?;

    let result = client.execute(&command).await;

    // Put the client back
    clients().write().await.insert(session_id, client);

    result
}
