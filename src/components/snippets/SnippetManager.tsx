import { useState, useEffect } from "react";
import { Plus, Search, Copy, Trash2, Edit3, Check, Save, X } from "lucide-react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { invoke } from "@tauri-apps/api/core";
import { showToast } from "../ui/Toast";

interface Snippet {
  id: string;
  name: string;
  content: string;
  language: string | null;
  tags: string[];
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export default function SnippetManager() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    content: "",
    language: "",
    tags: "",
    description: "",
  });

  // Load snippets from backend
  useEffect(() => {
    loadSnippets();
  }, []);

  const loadSnippets = async () => {
    try {
      const result = await invoke<Snippet[]>("get_snippets");
      setSnippets(result);
    } catch (error) {
      showToast("Failed to load snippets", "error");
      console.error("Failed to load snippets:", error);
    }
  };

  const filteredSnippets = snippets.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCopy = async (snippet: Snippet) => {
    await navigator.clipboard.writeText(snippet.content);
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNew = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedSnippet(null);
    setEditForm({
      name: "",
      content: "",
      language: "",
      tags: "",
      description: "",
    });
  };

  const handleEdit = (snippet: Snippet) => {
    setIsEditing(true);
    setIsCreating(false);
    setEditForm({
      name: snippet.name,
      content: snippet.content,
      language: snippet.language || "",
      tags: snippet.tags.join(", "),
      description: snippet.description || "",
    });
  };

  const handleSave = async () => {
    try {
      const tags = editForm.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (isCreating) {
        const newSnippet: Snippet = {
          id: crypto.randomUUID(),
          name: editForm.name,
          content: editForm.content,
          language: editForm.language || null,
          tags,
          description: editForm.description || null,
        };
        await invoke("add_snippet", { snippet: newSnippet });
        showToast("Snippet created successfully", "success");
      } else if (isEditing && selectedSnippet) {
        const updatedSnippet: Snippet = {
          ...selectedSnippet,
          name: editForm.name,
          content: editForm.content,
          language: editForm.language || null,
          tags,
          description: editForm.description || null,
        };
        await invoke("update_snippet", { snippet: updatedSnippet });
        showToast("Snippet updated successfully", "success");
      }

      setIsEditing(false);
      setIsCreating(false);
      await loadSnippets();
    } catch (error) {
      showToast("Failed to save snippet", "error");
      console.error("Failed to save snippet:", error);
    }
  };

  const handleDelete = async (snippet: Snippet) => {
    if (!confirm(`Delete snippet "${snippet.name}"?`)) {
      return;
    }

    try {
      await invoke("delete_snippet", { id: snippet.id });
      showToast("Snippet deleted successfully", "success");
      setSelectedSnippet(null);
      await loadSnippets();
    } catch (error) {
      showToast("Failed to delete snippet", "error");
      console.error("Failed to delete snippet:", error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
  };

  return (
    <div className="h-full flex">
      {/* Snippet list */}
      <div className="w-80 border-r border-border dark:border-border-dark flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-border dark:border-border-dark">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search snippets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9"
            />
          </div>
        </div>

        {/* List */}
        <ScrollArea.Root className="flex-1">
          <ScrollArea.Viewport className="h-full">
            <div className="p-2">
              {filteredSnippets.map((snippet) => (
                <button
                  key={snippet.id}
                  onClick={() => setSelectedSnippet(snippet)}
                  className={`
                    w-full text-left p-3 rounded-lg mb-1 transition-colors
                    ${
                      selectedSnippet?.id === snippet.id
                        ? "bg-accent/10 border border-accent/30"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }
                  `}
                >
                  <div className="font-medium text-text-primary dark:text-text-primary-dark mb-1">
                    {snippet.name}
                  </div>
                  <div className="text-xs text-text-secondary truncate font-mono">
                    {snippet.content}
                  </div>
                  <div className="flex gap-1 mt-2">
                    {snippet.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}

              {filteredSnippets.length === 0 && (
                <div className="text-center py-8 text-text-secondary">
                  No snippets found
                </div>
              )}
            </div>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar
            orientation="vertical"
            className="w-2 bg-transparent"
          >
            <ScrollArea.Thumb className="bg-gray-300 dark:bg-gray-700 rounded-full" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>

        {/* Add button */}
        <div className="p-3 border-t border-border dark:border-border-dark">
          <button
            onClick={handleNew}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Snippet
          </button>
        </div>
      </div>

      {/* Snippet detail */}
      <div className="flex-1 flex flex-col">
        {isCreating || isEditing ? (
          <>
            {/* Edit form header */}
            <div className="p-4 border-b border-border dark:border-border-dark flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">
                {isCreating ? "New Snippet" : "Edit Snippet"}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="btn-ghost flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>

            {/* Edit form */}
            <div className="flex-1 p-4 overflow-auto">
              <div className="space-y-4 max-w-3xl">
                <div>
                  <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="input w-full"
                    placeholder="e.g., Check disk usage"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    className="input w-full"
                    placeholder="e.g., Show disk usage for mounted devices"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                    Content *
                  </label>
                  <textarea
                    value={editForm.content}
                    onChange={(e) =>
                      setEditForm({ ...editForm, content: e.target.value })
                    }
                    className="input w-full font-mono text-sm"
                    rows={10}
                    placeholder="Paste your command or code here..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                    Language
                  </label>
                  <input
                    type="text"
                    value={editForm.language}
                    onChange={(e) =>
                      setEditForm({ ...editForm, language: e.target.value })
                    }
                    className="input w-full"
                    placeholder="e.g., bash, python, javascript"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) =>
                      setEditForm({ ...editForm, tags: e.target.value })
                    }
                    className="input w-full"
                    placeholder="e.g., disk, monitoring (comma-separated)"
                  />
                </div>
              </div>
            </div>
          </>
        ) : selectedSnippet ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border dark:border-border-dark flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">
                  {selectedSnippet.name}
                </h2>
                {selectedSnippet.description && (
                  <p className="text-sm text-text-secondary mt-1">
                    {selectedSnippet.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(selectedSnippet)}
                  className="btn-secondary flex items-center gap-2"
                >
                  {copiedId === selectedSnippet.id ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copiedId === selectedSnippet.id ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={() => handleEdit(selectedSnippet)}
                  className="btn-ghost"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(selectedSnippet)}
                  className="btn-ghost text-error"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-auto">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <code>{selectedSnippet.content}</code>
              </pre>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            Select a snippet to view details
          </div>
        )}
      </div>
    </div>
  );
}
