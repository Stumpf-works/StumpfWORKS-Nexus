//! DataSphere Data Models

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// SSH Host configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Host {
    pub id: Uuid,
    pub name: String,
    pub hostname: String,
    pub port: u16,
    pub username: String,
    pub auth_type: AuthType,
    pub password: Option<String>,
    pub private_key: Option<String>,
    pub passphrase: Option<String>,
    pub group_id: Option<Uuid>,
    pub tags: Vec<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_connected: Option<DateTime<Utc>>,
}

impl Host {
    pub fn new(name: String, hostname: String, username: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            name,
            hostname,
            port: 22,
            username,
            auth_type: AuthType::Password,
            password: None,
            private_key: None,
            passphrase: None,
            group_id: None,
            tags: vec![],
            icon: None,
            color: None,
            notes: None,
            created_at: now,
            updated_at: now,
            last_connected: None,
        }
    }

    pub fn from_new(new: NewHost) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            name: new.name,
            hostname: new.hostname,
            port: new.port,
            username: new.username,
            auth_type: new.auth_type,
            password: new.password,
            private_key: new.private_key,
            passphrase: new.passphrase,
            group_id: new.group_id,
            tags: new.tags,
            icon: new.icon,
            color: new.color,
            notes: new.notes,
            created_at: now,
            updated_at: now,
            last_connected: None,
        }
    }
}

/// New host data (for creating hosts without id/timestamps)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewHost {
    pub name: String,
    pub hostname: String,
    pub port: u16,
    pub username: String,
    pub auth_type: AuthType,
    pub password: Option<String>,
    pub private_key: Option<String>,
    pub passphrase: Option<String>,
    pub group_id: Option<Uuid>,
    pub tags: Vec<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub notes: Option<String>,
}

/// Authentication type for hosts
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuthType {
    Password,
    PrivateKey,
    Agent,
}

/// Host group for organization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostGroup {
    pub id: Uuid,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub order: i32,
    pub created_at: DateTime<Utc>,
}

impl HostGroup {
    pub fn new(name: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            name,
            icon: None,
            color: None,
            order: 0,
            created_at: Utc::now(),
        }
    }
}

/// Code snippet for quick access
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snippet {
    pub id: Uuid,
    pub name: String,
    pub content: String,
    pub language: Option<String>,
    pub tags: Vec<String>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Snippet {
    pub fn new(name: String, content: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            name,
            content,
            language: None,
            tags: vec![],
            description: None,
            created_at: now,
            updated_at: now,
        }
    }
}

/// Application settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub theme: Theme,
    pub font_size: u8,
    pub font_family: String,
    pub terminal_cursor_style: CursorStyle,
    pub terminal_cursor_blink: bool,
    pub auto_reconnect: bool,
    pub show_latency: bool,
    pub sync_enabled: bool,
    pub sync_provider: Option<SyncProvider>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: Theme::System,
            font_size: 14,
            font_family: "SF Mono".to_string(),
            terminal_cursor_style: CursorStyle::Block,
            terminal_cursor_blink: true,
            auto_reconnect: true,
            show_latency: true,
            sync_enabled: false,
            sync_provider: None,
        }
    }
}

/// Application theme
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    System,
}

/// Terminal cursor style
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CursorStyle {
    Block,
    Underline,
    Bar,
}

/// Sync provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SyncProvider {
    WebDAV { url: String, username: String },
    S3 { bucket: String, region: String },
    Nextcloud { url: String, username: String },
}
