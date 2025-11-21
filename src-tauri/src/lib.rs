//! StumpfWORKS Nexus - Modern SSH, SFTP & DevOps Tool
//!
//! This is the main library for the Tauri backend, providing:
//! - SSH client functionality
//! - SFTP file operations
//! - DataSphere (encrypted storage)
//! - Session management
//! - Plugin system
//! - MCP Server for AI integrations

pub mod datasphere;
pub mod mcp;
pub mod plugins;
pub mod session;
pub mod sftp;
pub mod ssh;
pub mod terminal;
pub mod utils;

use tauri::Manager;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

/// Initialize the application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize tracing/logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "stumpfworks_nexus=debug,info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Starting StumpfWORKS Nexus");

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            info!("Application setup complete");

            // Initialize DataSphere
            let app_handle = app.handle().clone();
            datasphere::init(&app_handle)?;

            // Initialize Session Manager
            session::init(&app_handle)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // DataSphere commands
            datasphere::commands::get_hosts,
            datasphere::commands::add_host,
            datasphere::commands::update_host,
            datasphere::commands::delete_host,
            datasphere::commands::get_host_groups,
            datasphere::commands::get_snippets,
            datasphere::commands::add_snippet,
            datasphere::commands::get_settings,
            datasphere::commands::update_settings,
            // SSH commands
            ssh::commands::connect,
            ssh::commands::disconnect,
            ssh::commands::send_command,
            // SFTP commands
            sftp::commands::list_directory,
            sftp::commands::upload_file,
            sftp::commands::download_file,
            sftp::commands::delete_path,
            sftp::commands::create_directory,
            // Session commands
            session::commands::get_sessions,
            session::commands::create_session,
            session::commands::close_session,
            // Terminal commands
            terminal::commands::create_terminal,
            terminal::commands::get_terminal,
            terminal::commands::get_terminals,
            terminal::commands::connect_terminal,
            terminal::commands::write_terminal,
            terminal::commands::resize_terminal,
            terminal::commands::close_terminal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
