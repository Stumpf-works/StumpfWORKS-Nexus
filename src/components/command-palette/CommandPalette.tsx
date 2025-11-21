import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Search,
  Terminal,
  FolderOpen,
  Code2,
  Settings,
  Server,
  Plus,
} from "lucide-react";
import { useCommandPaletteStore } from "../../store/commandPaletteStore";
import { useHostStore } from "../../store/hostStore";

interface Command {
  id: string;
  title: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  category: string;
}

export default function CommandPalette() {
  const navigate = useNavigate();
  const { isOpen, close, query, setQuery } = useCommandPaletteStore();
  const { hosts } = useHostStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Build command list
  const commands: Command[] = [
    // Navigation
    {
      id: "nav-terminal",
      title: "Open Terminal",
      icon: Terminal,
      action: () => navigate("/terminal"),
      category: "Navigation",
    },
    {
      id: "nav-sftp",
      title: "Open SFTP Explorer",
      icon: FolderOpen,
      action: () => navigate("/sftp"),
      category: "Navigation",
    },
    {
      id: "nav-snippets",
      title: "Open Snippets",
      icon: Code2,
      action: () => navigate("/snippets"),
      category: "Navigation",
    },
    {
      id: "nav-settings",
      title: "Open Settings",
      icon: Settings,
      action: () => navigate("/settings"),
      category: "Navigation",
    },
    // Actions
    {
      id: "add-host",
      title: "Add New Server",
      icon: Plus,
      action: () => navigate("/settings?tab=hosts"),
      category: "Actions",
    },
    // Hosts
    ...hosts.map((host) => ({
      id: `host-${host.id}`,
      title: `Connect to ${host.name}`,
      description: `${host.username}@${host.hostname}:${host.port}`,
      icon: Server,
      action: () => navigate(`/terminal`),
      category: "Servers",
    })),
  ];

  // Filter commands
  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(query.toLowerCase())
  );

  // Group by category
  const groupedCommands = filteredCommands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) {
        acc[cmd.category] = [];
      }
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, Command[]>
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, close]);

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in z-50" />
        <Dialog.Content className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl bg-white dark:bg-gray-800 rounded-macos-lg shadow-macos overflow-hidden animate-scale-in z-50">
          {/* Search input */}
          <div className="flex items-center gap-3 p-4 border-b border-border dark:border-border-dark">
            <Search className="w-5 h-5 text-text-secondary" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search commands, servers..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-text-primary dark:text-text-primary-dark placeholder:text-text-secondary"
            />
            <kbd className="text-xs bg-gray-200 dark:bg-gray-700 text-text-secondary px-1.5 py-0.5 rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category} className="mb-2">
                <div className="px-3 py-1.5 text-xs font-medium text-text-secondary uppercase">
                  {category}
                </div>
                {cmds.map((cmd) => {
                  const Icon = cmd.icon;
                  const index = filteredCommands.indexOf(cmd);
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        close();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                        ${
                          isSelected
                            ? "bg-accent text-white"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }
                      `}
                    >
                      <Icon
                        className={`w-4 h-4 ${isSelected ? "text-white" : "text-text-secondary"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-medium ${
                            isSelected
                              ? "text-white"
                              : "text-text-primary dark:text-text-primary-dark"
                          }`}
                        >
                          {cmd.title}
                        </div>
                        {cmd.description && (
                          <div
                            className={`text-xs truncate ${
                              isSelected ? "text-white/70" : "text-text-secondary"
                            }`}
                          >
                            {cmd.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}

            {filteredCommands.length === 0 && (
              <div className="text-center py-8 text-text-secondary">
                No results found
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
