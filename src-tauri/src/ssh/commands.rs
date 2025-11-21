//! SSH Tauri Commands

use super::{clients, SshClient, client::{SshConfig, SshError, CommandOutput}};
use uuid::Uuid;

/// Connect to an SSH server
#[tauri::command]
pub async fn connect(config: SshConfig) -> Result<Uuid, SshError> {
    let mut client = SshClient::new(config);
    client.connect().await?;

    let id = client.id;
    clients().write().insert(id, client);

    Ok(id)
}

/// Disconnect from an SSH server
#[tauri::command]
pub async fn disconnect(session_id: Uuid) -> Result<(), SshError> {
    let mut clients = clients().write();

    if let Some(client) = clients.get_mut(&session_id) {
        client.disconnect().await?;
        clients.remove(&session_id);
    }

    Ok(())
}

/// Send a command to the SSH server
#[tauri::command]
pub async fn send_command(session_id: Uuid, command: String) -> Result<CommandOutput, SshError> {
    let clients = clients().read();

    let client = clients
        .get(&session_id)
        .ok_or(SshError::NotConnected)?;

    client.execute(&command).await
}
