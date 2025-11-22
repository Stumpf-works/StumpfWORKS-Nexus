import { useState, useEffect } from "react";
import {
  Key,
  Lock,
  Plus,
  Search,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Star,
  Copy,
  Folder,
  Shield,
  Code,
  FileText,
  Award,
} from "lucide-react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { invoke } from "@tauri-apps/api/core";

interface VaultEntry {
  id: string;
  name: string;
  entry_type: "password" | "ssh_key" | "api_key" | "secure_note" | "certificate";
  username: string | null;
  secret: string;
  url: string | null;
  notes: string | null;
  tags: string[];
  folder: string | null;
  favorite: boolean;
  created_at: string;
  updated_at: string;
  last_used: string | null;
}

interface NewVaultEntry {
  name: string;
  entry_type: "password" | "ssh_key" | "api_key" | "secure_note" | "certificate";
  username: string | null;
  secret: string;
  url: string | null;
  notes: string | null;
  tags: string[];
  folder: string | null;
}

export default function VaultManager() {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<VaultEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<VaultEntry | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<NewVaultEntry>>({
    name: "",
    entry_type: "password",
    username: "",
    secret: "",
    url: "",
    notes: "",
    tags: [],
    folder: "",
  });

  useEffect(() => {
    loadVaultEntries();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [searchQuery, entries]);

  const loadVaultEntries = async () => {
    try {
      setIsLoading(true);
      const result = await invoke<VaultEntry[]>("get_vault_entries");
      setEntries(result);
    } catch (err) {
      console.error("Failed to load vault entries:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filterEntries = () => {
    if (!searchQuery.trim()) {
      setFilteredEntries(entries);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(query) ||
        entry.username?.toLowerCase().includes(query) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        entry.folder?.toLowerCase().includes(query)
    );
    setFilteredEntries(filtered);
  };

  const handleAddEntry = () => {
    setEditingEntry(null);
    setFormData({
      name: "",
      entry_type: "password",
      username: "",
      secret: "",
      url: "",
      notes: "",
      tags: [],
      folder: "",
    });
    setIsModalOpen(true);
  };

  const handleEditEntry = (entry: VaultEntry) => {
    setEditingEntry(entry);
    setFormData({
      name: entry.name,
      entry_type: entry.entry_type,
      username: entry.username || "",
      secret: entry.secret,
      url: entry.url || "",
      notes: entry.notes || "",
      tags: entry.tags,
      folder: entry.folder || "",
    });
    setIsModalOpen(true);
  };

  const handleSaveEntry = async () => {
    try {
      setIsLoading(true);

      if (editingEntry) {
        // Update existing entry
        const updatedEntry: VaultEntry = {
          ...editingEntry,
          name: formData.name!,
          entry_type: formData.entry_type!,
          username: formData.username || null,
          secret: formData.secret!,
          url: formData.url || null,
          notes: formData.notes || null,
          tags: formData.tags || [],
          folder: formData.folder || null,
          updated_at: new Date().toISOString(),
        };
        await invoke("update_vault_entry", { entry: updatedEntry });
      } else {
        // Add new entry
        const newEntry: NewVaultEntry = {
          name: formData.name!,
          entry_type: formData.entry_type!,
          username: formData.username || null,
          secret: formData.secret!,
          url: formData.url || null,
          notes: formData.notes || null,
          tags: formData.tags || [],
          folder: formData.folder || null,
        };
        await invoke("add_vault_entry", { entry: newEntry });
      }

      setIsModalOpen(false);
      loadVaultEntries();
    } catch (err) {
      console.error("Failed to save vault entry:", err);
      alert(`Failed to save: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) {
      return;
    }

    try {
      setIsLoading(true);
      await invoke("delete_vault_entry", { id });
      loadVaultEntries();
      if (selectedEntry?.id === id) {
        setSelectedEntry(null);
      }
    } catch (err) {
      console.error("Failed to delete entry:", err);
      alert(`Failed to delete: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: Show toast notification
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getEntryIcon = (type: string) => {
    switch (type) {
      case "password":
        return <Lock className="w-4 h-4" />;
      case "ssh_key":
        return <Key className="w-4 h-4" />;
      case "api_key":
        return <Code className="w-4 h-4" />;
      case "secure_note":
        return <FileText className="w-4 h-4" />;
      case "certificate":
        return <Award className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full flex">
      {/* Entry List */}
      <div className="w-80 border-r border-border dark:border-border-dark flex flex-col bg-white dark:bg-gray-800">
        {/* Search & Add */}
        <div className="p-4 border-b border-border dark:border-border-dark space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Search vault..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              />
            </div>
            <button
              onClick={handleAddEntry}
              className="btn-primary p-2"
              title="Add entry"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Entry List */}
        <ScrollArea.Root className="flex-1">
          <ScrollArea.Viewport className="h-full w-full">
            <div className="p-2 space-y-1">
              {filteredEntries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`
                    w-full p-3 rounded-lg text-left transition-all
                    ${
                      selectedEntry?.id === entry.id
                        ? "bg-accent/20 border border-accent"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent"
                    }
                  `}
                >
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-accent/10 rounded text-accent mt-0.5">
                      {getEntryIcon(entry.entry_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {entry.favorite && (
                          <Star className="w-3 h-3 fill-warning text-warning" />
                        )}
                        <span className="font-medium text-sm text-text-primary dark:text-text-primary-dark truncate">
                          {entry.name}
                        </span>
                      </div>
                      {entry.username && (
                        <p className="text-xs text-text-secondary dark:text-text-secondary-dark truncate">
                          {entry.username}
                        </p>
                      )}
                      {entry.folder && (
                        <div className="flex items-center gap-1 mt-1">
                          <Folder className="w-3 h-3 text-text-secondary" />
                          <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
                            {entry.folder}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {filteredEntries.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <Shield className="w-16 h-16 text-text-secondary mb-4" />
                <p className="text-text-secondary text-center">
                  {searchQuery
                    ? "No entries found"
                    : "No vault entries yet. Add your first one!"}
                </p>
              </div>
            )}
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar
            orientation="vertical"
            className="w-2 bg-transparent"
          >
            <ScrollArea.Thumb className="bg-gray-300 dark:bg-gray-700 rounded-full" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </div>

      {/* Entry Details */}
      <div className="flex-1 flex flex-col bg-surface dark:bg-surface-dark">
        {selectedEntry ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-border dark:border-border-dark">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg text-accent">
                    {getEntryIcon(selectedEntry.entry_type)}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-text-primary dark:text-text-primary-dark">
                      {selectedEntry.name}
                    </h2>
                    <p className="text-sm text-text-secondary dark:text-text-secondary-dark capitalize">
                      {selectedEntry.entry_type.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditEntry(selectedEntry)}
                    className="btn-ghost"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(selectedEntry.id)}
                    className="btn-ghost text-error"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedEntry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedEntry.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <ScrollArea.Root className="flex-1">
              <ScrollArea.Viewport className="h-full w-full">
                <div className="p-6 space-y-6">
                  {selectedEntry.username && (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
                        Username
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={selectedEntry.username}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-border dark:border-border-dark rounded-lg text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(selectedEntry.username!)}
                          className="btn-ghost"
                          title="Copy"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
                      Secret
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type={showSecret ? "text" : "password"}
                        value={selectedEntry.secret}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-border dark:border-border-dark rounded-lg text-sm font-mono"
                      />
                      <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="btn-ghost"
                        title={showSecret ? "Hide" : "Show"}
                      >
                        {showSecret ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(selectedEntry.secret)}
                        className="btn-ghost"
                        title="Copy"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {selectedEntry.url && (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
                        URL
                      </label>
                      <input
                        type="text"
                        value={selectedEntry.url}
                        readOnly
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-border dark:border-border-dark rounded-lg text-sm"
                      />
                    </div>
                  )}

                  {selectedEntry.notes && (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
                        Notes
                      </label>
                      <textarea
                        value={selectedEntry.notes}
                        readOnly
                        rows={4}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-border dark:border-border-dark rounded-lg text-sm resize-none"
                      />
                    </div>
                  )}

                  <div className="pt-4 border-t border-border dark:border-border-dark text-xs text-text-secondary dark:text-text-secondary-dark space-y-1">
                    <p>Created: {new Date(selectedEntry.created_at).toLocaleString()}</p>
                    <p>Modified: {new Date(selectedEntry.updated_at).toLocaleString()}</p>
                    {selectedEntry.last_used && (
                      <p>Last used: {new Date(selectedEntry.last_used).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar
                orientation="vertical"
                className="w-2 bg-transparent"
              >
                <ScrollArea.Thumb className="bg-gray-300 dark:bg-gray-700 rounded-full" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <Shield className="w-24 h-24 text-text-secondary mb-4" />
            <p className="text-text-secondary">
              Select an entry to view details
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border dark:border-border-dark">
              <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">
                {editingEntry ? "Edit Entry" : "Add New Entry"}
              </h3>
            </div>

            <ScrollArea.Root className="flex-1">
              <ScrollArea.Viewport className="h-full w-full">
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-lg"
                      placeholder="My Password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Type *</label>
                    <select
                      value={formData.entry_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          entry_type: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-lg"
                    >
                      <option value="password">Password</option>
                      <option value="ssh_key">SSH Key</option>
                      <option value="api_key">API Key</option>
                      <option value="secure_note">Secure Note</option>
                      <option value="certificate">Certificate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-lg"
                      placeholder="username@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Secret *</label>
                    <input
                      type="password"
                      value={formData.secret}
                      onChange={(e) =>
                        setFormData({ ...formData, secret: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-lg font-mono"
                      placeholder="Enter password, key, or secret"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">URL</label>
                    <input
                      type="text"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-lg"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Folder</label>
                    <input
                      type="text"
                      value={formData.folder}
                      onChange={(e) =>
                        setFormData({ ...formData, folder: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-lg"
                      placeholder="Work, Personal, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-lg resize-none"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar
                orientation="vertical"
                className="w-2 bg-transparent"
              >
                <ScrollArea.Thumb className="bg-gray-300 dark:bg-gray-700 rounded-full" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>

            <div className="p-6 border-t border-border dark:border-border-dark flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn-ghost"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEntry}
                className="btn-primary"
                disabled={isLoading || !formData.name || !formData.secret}
              >
                {isLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
