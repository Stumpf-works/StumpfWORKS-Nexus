import { useState, useEffect } from "react";
import { Copy, Check, ChevronRight, Search, Code } from "lucide-react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Collapsible from "@radix-ui/react-collapsible";

interface Snippet {
  id: string;
  name: string;
  content: string;
  language: string | null;
  tags: string[];
  description: string | null;
}

export default function SnippetSidebar() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set(["all"]));

  // Mock snippets - in real app, fetch from store
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
      {
        id: "5",
        name: "Check open ports",
        content: "netstat -tulpn | grep LISTEN",
        language: "bash",
        tags: ["network", "monitoring"],
        description: "List all listening ports",
      },
    ]);
  }, []);

  const handleCopy = async (snippet: Snippet) => {
    await navigator.clipboard.writeText(snippet.content);
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleTag = (tag: string) => {
    const newExpanded = new Set(expandedTags);
    if (newExpanded.has(tag)) {
      newExpanded.delete(tag);
    } else {
      newExpanded.add(tag);
    }
    setExpandedTags(newExpanded);
  };

  // Group snippets by tag
  const allTags = Array.from(
    new Set(snippets.flatMap((s) => s.tags))
  ).sort();

  const snippetsByTag: Record<string, Snippet[]> = {
    all: snippets,
  };

  allTags.forEach((tag) => {
    snippetsByTag[tag] = snippets.filter((s) => s.tags.includes(tag));
  });

  const filteredSnippets = snippets.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-80 border-l border-border dark:border-border-dark bg-sidebar dark:bg-sidebar-dark flex flex-col">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-border dark:border-border-dark">
        <span className="text-sm font-semibold text-text-primary dark:text-text-primary-dark flex items-center gap-2">
          <Code className="w-4 h-4" />
          Snippets
        </span>
        <span className="text-xs text-text-secondary">
          {snippets.length}
        </span>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border dark:border-border-dark">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-border dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Snippet List */}
      <ScrollArea.Root className="flex-1">
        <ScrollArea.Viewport className="h-full">
          {searchQuery ? (
            <div className="p-2">
              {filteredSnippets.map((snippet) => (
                <SnippetItem
                  key={snippet.id}
                  snippet={snippet}
                  isCopied={copiedId === snippet.id}
                  onCopy={() => handleCopy(snippet)}
                />
              ))}
              {filteredSnippets.length === 0 && (
                <div className="text-center py-8 text-text-secondary text-sm">
                  No snippets found
                </div>
              )}
            </div>
          ) : (
            <div className="p-2">
              {/* All Snippets */}
              <Collapsible.Root
                open={expandedTags.has("all")}
                onOpenChange={() => toggleTag("all")}
              >
                <Collapsible.Trigger className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${expandedTags.has("all") ? "rotate-90" : ""}`}
                  />
                  <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                    All Snippets
                  </span>
                  <span className="ml-auto text-xs text-text-secondary">
                    {snippets.length}
                  </span>
                </Collapsible.Trigger>
                <Collapsible.Content className="mt-1">
                  {snippets.map((snippet) => (
                    <SnippetItem
                      key={snippet.id}
                      snippet={snippet}
                      isCopied={copiedId === snippet.id}
                      onCopy={() => handleCopy(snippet)}
                    />
                  ))}
                </Collapsible.Content>
              </Collapsible.Root>

              {/* By Tags */}
              {allTags.map((tag) => (
                <Collapsible.Root
                  key={tag}
                  open={expandedTags.has(tag)}
                  onOpenChange={() => toggleTag(tag)}
                  className="mt-1"
                >
                  <Collapsible.Trigger className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${expandedTags.has(tag) ? "rotate-90" : ""}`}
                    />
                    <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded capitalize">
                      {tag}
                    </span>
                    <span className="ml-auto text-xs text-text-secondary">
                      {snippetsByTag[tag].length}
                    </span>
                  </Collapsible.Trigger>
                  <Collapsible.Content className="mt-1">
                    {snippetsByTag[tag].map((snippet) => (
                      <SnippetItem
                        key={snippet.id}
                        snippet={snippet}
                        isCopied={copiedId === snippet.id}
                        onCopy={() => handleCopy(snippet)}
                      />
                    ))}
                  </Collapsible.Content>
                </Collapsible.Root>
              ))}
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
  );
}

interface SnippetItemProps {
  snippet: Snippet;
  isCopied: boolean;
  onCopy: () => void;
}

function SnippetItem({ snippet, isCopied, onCopy }: SnippetItemProps) {
  return (
    <div className="group pl-6 mb-1">
      <button
        onClick={onCopy}
        className="w-full text-left p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
        title={snippet.description || undefined}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm text-text-primary dark:text-text-primary-dark font-medium truncate">
              {snippet.name}
            </div>
            <div className="text-xs text-text-secondary font-mono truncate mt-0.5">
              {snippet.content}
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-text-secondary" />
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
