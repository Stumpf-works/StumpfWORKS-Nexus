//! DataSphere Storage Implementation

use super::{DataSphereError, Host, HostGroup, Settings, Snippet, VaultEntry};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

/// DataSphere storage manager
#[derive(Debug)]
pub struct DataSphereStorage {
    data_dir: PathBuf,
    hosts: HashMap<Uuid, Host>,
    groups: HashMap<Uuid, HostGroup>,
    snippets: HashMap<Uuid, Snippet>,
    vault_entries: HashMap<Uuid, VaultEntry>,
    settings: Settings,
}

impl DataSphereStorage {
    /// Create a new DataSphere storage instance
    pub fn new(app: &AppHandle) -> Result<Self, DataSphereError> {
        let data_dir = app.path().app_data_dir()?;
        fs::create_dir_all(&data_dir)?;

        let mut storage = Self {
            data_dir,
            hosts: HashMap::new(),
            groups: HashMap::new(),
            snippets: HashMap::new(),
            vault_entries: HashMap::new(),
            settings: Settings::default(),
        };

        storage.load()?;
        Ok(storage)
    }

    /// Load data from disk
    fn load(&mut self) -> Result<(), DataSphereError> {
        // Load hosts
        let hosts_path = self.data_dir.join("hosts.json");
        if hosts_path.exists() {
            let data = fs::read_to_string(&hosts_path)?;
            self.hosts = serde_json::from_str(&data)?;
        }

        // Load groups
        let groups_path = self.data_dir.join("groups.json");
        if groups_path.exists() {
            let data = fs::read_to_string(&groups_path)?;
            self.groups = serde_json::from_str(&data)?;
        }

        // Load snippets
        let snippets_path = self.data_dir.join("snippets.json");
        if snippets_path.exists() {
            let data = fs::read_to_string(&snippets_path)?;
            self.snippets = serde_json::from_str(&data)?;
        }

        // Load settings
        let settings_path = self.data_dir.join("settings.json");
        if settings_path.exists() {
            let data = fs::read_to_string(&settings_path)?;
            self.settings = serde_json::from_str(&data)?;
        }

        // Load vault entries
        let vault_path = self.data_dir.join("vault.json");
        if vault_path.exists() {
            let data = fs::read_to_string(&vault_path)?;
            self.vault_entries = serde_json::from_str(&data)?;
        }

        tracing::info!(
            "Loaded {} hosts, {} groups, {} snippets, {} vault entries",
            self.hosts.len(),
            self.groups.len(),
            self.snippets.len(),
            self.vault_entries.len()
        );

        Ok(())
    }

    /// Save data to disk
    fn save(&self) -> Result<(), DataSphereError> {
        // TODO: Add encryption using libsodium

        // Save hosts
        let hosts_data = serde_json::to_string_pretty(&self.hosts)?;
        fs::write(self.data_dir.join("hosts.json"), hosts_data)?;

        // Save groups
        let groups_data = serde_json::to_string_pretty(&self.groups)?;
        fs::write(self.data_dir.join("groups.json"), groups_data)?;

        // Save snippets
        let snippets_data = serde_json::to_string_pretty(&self.snippets)?;
        fs::write(self.data_dir.join("snippets.json"), snippets_data)?;

        // Save settings
        let settings_data = serde_json::to_string_pretty(&self.settings)?;
        fs::write(self.data_dir.join("settings.json"), settings_data)?;

        // Save vault entries
        let vault_data = serde_json::to_string_pretty(&self.vault_entries)?;
        fs::write(self.data_dir.join("vault.json"), vault_data)?;

        Ok(())
    }

    // Host operations
    pub fn get_hosts(&self) -> Vec<Host> {
        self.hosts.values().cloned().collect()
    }

    pub fn add_host(&mut self, host: Host) -> Result<Host, DataSphereError> {
        self.hosts.insert(host.id, host.clone());
        self.save()?;
        Ok(host)
    }

    pub fn update_host(&mut self, host: Host) -> Result<Host, DataSphereError> {
        if !self.hosts.contains_key(&host.id) {
            return Err(DataSphereError::NotFound(host.id.to_string()));
        }
        self.hosts.insert(host.id, host.clone());
        self.save()?;
        Ok(host)
    }

    pub fn delete_host(&mut self, id: Uuid) -> Result<(), DataSphereError> {
        self.hosts.remove(&id);
        self.save()?;
        Ok(())
    }

    // Group operations
    pub fn get_groups(&self) -> Vec<HostGroup> {
        let mut groups: Vec<_> = self.groups.values().cloned().collect();
        groups.sort_by_key(|g| g.order);
        groups
    }

    // Snippet operations
    pub fn get_snippets(&self) -> Vec<Snippet> {
        self.snippets.values().cloned().collect()
    }

    pub fn add_snippet(&mut self, snippet: Snippet) -> Result<Snippet, DataSphereError> {
        self.snippets.insert(snippet.id, snippet.clone());
        self.save()?;
        Ok(snippet)
    }

    // Settings operations
    pub fn get_settings(&self) -> Settings {
        self.settings.clone()
    }

    pub fn update_settings(&mut self, settings: Settings) -> Result<Settings, DataSphereError> {
        self.settings = settings.clone();
        self.save()?;
        Ok(settings)
    }

    // Vault operations
    pub fn get_vault_entries(&self) -> Vec<VaultEntry> {
        self.vault_entries.values().cloned().collect()
    }

    pub fn get_vault_entry(&self, id: Uuid) -> Option<VaultEntry> {
        self.vault_entries.get(&id).cloned()
    }

    pub fn add_vault_entry(&mut self, entry: VaultEntry) -> Result<VaultEntry, DataSphereError> {
        self.vault_entries.insert(entry.id, entry.clone());
        self.save()?;
        Ok(entry)
    }

    pub fn update_vault_entry(&mut self, entry: VaultEntry) -> Result<VaultEntry, DataSphereError> {
        if !self.vault_entries.contains_key(&entry.id) {
            return Err(DataSphereError::NotFound(entry.id.to_string()));
        }
        self.vault_entries.insert(entry.id, entry.clone());
        self.save()?;
        Ok(entry)
    }

    pub fn delete_vault_entry(&mut self, id: Uuid) -> Result<(), DataSphereError> {
        self.vault_entries.remove(&id);
        self.save()?;
        Ok(())
    }

    pub fn search_vault(&self, query: &str) -> Vec<VaultEntry> {
        let query_lower = query.to_lowercase();
        self.vault_entries
            .values()
            .filter(|entry| {
                entry.name.to_lowercase().contains(&query_lower)
                    || entry
                        .username
                        .as_ref()
                        .map(|u| u.to_lowercase().contains(&query_lower))
                        .unwrap_or(false)
                    || entry.tags.iter().any(|t| t.to_lowercase().contains(&query_lower))
                    || entry
                        .folder
                        .as_ref()
                        .map(|f| f.to_lowercase().contains(&query_lower))
                        .unwrap_or(false)
            })
            .cloned()
            .collect()
    }

    pub fn get_vault_folders(&self) -> Vec<String> {
        let mut folders: Vec<String> = self
            .vault_entries
            .values()
            .filter_map(|entry| entry.folder.clone())
            .collect();
        folders.sort();
        folders.dedup();
        folders
    }
}
