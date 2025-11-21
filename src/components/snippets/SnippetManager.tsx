import { useState, useEffect } from "react";
import { Plus, Search, Copy, Trash2, Edit3, Check } from "lucide-react";
import * as ScrollArea from "@radix-ui/react-scroll-area";

interface Snippet {
  id: string;
  name: string;
  content: string;
  language: string | null;
  tags: string[];
  description: string | null;
}

export default function SnippetManager() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Mock snippets
  useEffect(() => {
    setSnippets([
      {
        id: "1",
        name: "Check disk usage",
        content: "df -h | grep -E '^/dev'",
        language: "bash",
        tags: ["disk", "monitoring"],
        description: "Show disk usage for mounted devices",
      },
      {
        id: "2",
        name: "Find large files",
        content: "find / -type f -size +100M -exec ls -lh {} \\; 2>/dev/null",
        language: "bash",
        tags: ["disk", "files"],
        description: "Find files larger than 100MB",
      },
      {
        id: "3",
        name: "Docker cleanup",
        content: "docker system prune -af --volumes",
        language: "bash",
        tags: ["docker", "cleanup"],
        description: "Remove all unused Docker resources",
      },
      {
        id: "4",
        name: "Git log pretty",
        content: "git log --oneline --graph --decorate --all",
        language: "bash",
        tags: ["git"],
        description: "Show a pretty git log",
      },
    ]);
  }, []);

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
          <button className="btn-primary w-full flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            New Snippet
          </button>
        </div>
      </div>

      {/* Snippet detail */}
      <div className="flex-1 flex flex-col">
        {selectedSnippet ? (
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
                <button className="btn-ghost">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button className="btn-ghost text-error">
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
