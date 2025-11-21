import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Folder,
  File,
  ChevronRight,
  Upload,
  Download,
  Trash2,
  FolderPlus,
  RefreshCw,
  Home,
  HardDrive,
  Server,
  ArrowRight,
  ArrowLeft,
  Copy,
} from "lucide-react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Select from "@radix-ui/react-select";
import { useSessionStore } from "../../store/sessionStore";
import { useHostStore } from "../../store/hostStore";

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: string | null;
  permissions: string | null;
}

type PanelSource = "local" | string; // "local" or host ID

interface PanelState {
  source: PanelSource;
  currentPath: string;
  files: FileEntry[];
  selectedFiles: Set<string>;
  isLoading: boolean;
}

export default function SftpExplorer() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { sessions, activeSessionId } = useSessionStore();
  const { hosts } = useHostStore();

  const [leftPanel, setLeftPanel] = useState<PanelState>({
    source: "local",
    currentPath: "/home",
    files: [],
    selectedFiles: new Set(),
    isLoading: false,
  });

  const [rightPanel, setRightPanel] = useState<PanelState>({
    source: sessionId || activeSessionId || "local",
    currentPath: "/home",
    files: [],
    selectedFiles: new Set(),
    isLoading: false,
  });

  const session = sessions.find((s) => s.id === (sessionId || activeSessionId));
  const currentHost = session ? hosts.find((h) => h.id === session.host_id) : null;

  // Load files for a panel
  const loadFiles = (panel: "left" | "right", path: string, source: PanelSource) => {
    const updatePanel = panel === "left" ? setLeftPanel : setRightPanel;

    updatePanel((prev) => ({ ...prev, isLoading: true }));

    // Simulated file listing (replace with actual SFTP/Local FS calls)
    setTimeout(() => {
      const mockFiles: FileEntry[] = [
        { name: "..", path: "/", is_dir: true, size: 0, modified: null, permissions: "drwxr-xr-x" },
        {
          name: source === "local" ? "Documents" : "www",
          path: path + (source === "local" ? "/Documents" : "/www"),
          is_dir: true,
          size: 4096,
          modified: "2024-01-15T10:30:00Z",
          permissions: "drwxr-xr-x",
        },
        {
          name: source === "local" ? "Downloads" : "logs",
          path: path + (source === "local" ? "/Downloads" : "/logs"),
          is_dir: true,
          size: 4096,
          modified: "2024-01-14T08:00:00Z",
          permissions: "drwxr-xr-x",
        },
        {
          name: source === "local" ? "readme.txt" : "config.json",
          path: path + (source === "local" ? "/readme.txt" : "/config.json"),
          is_dir: false,
          size: 1234,
          modified: "2024-01-12T14:30:00Z",
          permissions: "-rw-r--r--",
        },
      ];

      updatePanel((prev) => ({
        ...prev,
        files: mockFiles,
        isLoading: false,
      }));
    }, 300);
  };

  // Load files when source or path changes
  useEffect(() => {
    loadFiles("left", leftPanel.currentPath, leftPanel.source);
  }, [leftPanel.source, leftPanel.currentPath]);

  useEffect(() => {
    loadFiles("right", rightPanel.currentPath, rightPanel.source);
  }, [rightPanel.source, rightPanel.currentPath]);

  const handleNavigate = (panel: "left" | "right", entry: FileEntry) => {
    if (!entry.is_dir) return;

    const updatePanel = panel === "left" ? setLeftPanel : setRightPanel;
    updatePanel((prev) => ({
      ...prev,
      currentPath: entry.path,
      selectedFiles: new Set(),
    }));
  };

  const handleSelect = (panel: "left" | "right", entry: FileEntry, e: React.MouseEvent) => {
    const updatePanel = panel === "left" ? setLeftPanel : setRightPanel;
    const panelState = panel === "left" ? leftPanel : rightPanel;

    if (e.ctrlKey || e.metaKey) {
      const newSelected = new Set(panelState.selectedFiles);
      if (newSelected.has(entry.path)) {
        newSelected.delete(entry.path);
      } else {
        newSelected.add(entry.path);
      }
      updatePanel((prev) => ({ ...prev, selectedFiles: newSelected }));
    } else {
      updatePanel((prev) => ({ ...prev, selectedFiles: new Set([entry.path]) }));
    }
  };

  const handleSourceChange = (panel: "left" | "right", newSource: PanelSource) => {
    const updatePanel = panel === "left" ? setLeftPanel : setRightPanel;
    updatePanel((prev) => ({
      ...prev,
      source: newSource,
      currentPath: "/home",
      selectedFiles: new Set(),
    }));
  };

  const handleCopyToRight = () => {
    console.log("Copy from left to right:", Array.from(leftPanel.selectedFiles));
    // TODO: Implement file copy
  };

  const handleCopyToLeft = () => {
    console.log("Copy from right to left:", Array.from(rightPanel.selectedFiles));
    // TODO: Implement file copy
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  const renderSourceSelector = (panel: "left" | "right") => {
    const panelState = panel === "left" ? leftPanel : rightPanel;
    const sourceLabel =
      panelState.source === "local"
        ? "Local Filesystem"
        : hosts.find((h) => h.id === panelState.source)?.name || "Server";

    return (
      <Select.Root
        value={panelState.source}
        onValueChange={(value) => handleSourceChange(panel, value)}
      >
        <Select.Trigger className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm min-w-[150px]">
          {panelState.source === "local" ? (
            <HardDrive className="w-4 h-4" />
          ) : (
            <Server className="w-4 h-4" />
          )}
          <Select.Value>{sourceLabel}</Select.Value>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 z-50">
            <Select.Viewport>
              <Select.Item
                value="local"
                className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-accent hover:text-white text-sm outline-none"
              >
                <HardDrive className="w-4 h-4" />
                <Select.ItemText>Local Filesystem</Select.ItemText>
              </Select.Item>

              {hosts.length > 0 && (
                <Select.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              )}

              {hosts.map((host) => (
                <Select.Item
                  key={host.id}
                  value={host.id}
                  className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-accent hover:text-white text-sm outline-none"
                >
                  <Server className="w-4 h-4" />
                  <Select.ItemText>{host.name}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    );
  };

  const renderPanel = (panel: "left" | "right") => {
    const panelState = panel === "left" ? leftPanel : rightPanel;
    const pathParts = panelState.currentPath.split("/").filter(Boolean);

    return (
      <div className="flex-1 flex flex-col border-r border-border dark:border-border-dark last:border-r-0">
        {/* Panel Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-border dark:border-border-dark bg-gray-50 dark:bg-gray-800">
          {renderSourceSelector(panel)}

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                loadFiles(panel, panelState.currentPath, panelState.source)
              }
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 ${panelState.isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="h-10 flex items-center px-4 border-b border-border dark:border-border-dark bg-white dark:bg-gray-900">
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() =>
                handleSourceChange(panel, panelState.source)
              }
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <Home className="w-4 h-4" />
            </button>
            {pathParts.map((part, index) => (
              <div key={index} className="flex items-center">
                <ChevronRight className="w-4 h-4 text-text-secondary" />
                <button
                  onClick={() => {
                    const updatePanel = panel === "left" ? setLeftPanel : setRightPanel;
                    updatePanel((prev) => ({
                      ...prev,
                      currentPath: "/" + pathParts.slice(0, index + 1).join("/"),
                    }));
                  }}
                  className="px-1.5 py-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-text-primary dark:text-text-primary-dark"
                >
                  {part}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* File List */}
        <ScrollArea.Root className="flex-1">
          <ScrollArea.Viewport className="h-full w-full">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr className="text-left text-text-secondary dark:text-text-secondary-dark">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium w-24">Size</th>
                  <th className="px-4 py-2 font-medium w-32">Modified</th>
                </tr>
              </thead>
              <tbody>
                {panelState.files.map((file) => (
                  <tr
                    key={file.path}
                    onClick={(e) => handleSelect(panel, file, e)}
                    onDoubleClick={() => handleNavigate(panel, file)}
                    className={`
                      cursor-pointer border-b border-gray-100 dark:border-gray-800
                      hover:bg-gray-100 dark:hover:bg-gray-800
                      ${panelState.selectedFiles.has(file.path) ? "bg-accent/10" : ""}
                    `}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {file.is_dir ? (
                          <Folder className="w-4 h-4 text-accent" />
                        ) : (
                          <File className="w-4 h-4 text-text-secondary" />
                        )}
                        <span className="text-text-primary dark:text-text-primary-dark truncate">
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-text-secondary dark:text-text-secondary-dark">
                      {formatSize(file.size)}
                    </td>
                    <td className="px-4 py-2 text-text-secondary dark:text-text-secondary-dark">
                      {formatDate(file.modified)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!panelState.isLoading && panelState.files.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <Folder className="w-16 h-16 text-text-secondary mb-4" />
                <p className="text-text-secondary">This folder is empty</p>
              </div>
            )}
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" className="w-2 bg-transparent">
            <ScrollArea.Thumb className="bg-gray-300 dark:bg-gray-700 rounded-full" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>

        {/* Panel Status */}
        <div className="h-8 flex items-center justify-between px-4 border-t border-border dark:border-border-dark bg-gray-50 dark:bg-gray-800 text-xs text-text-secondary">
          <span>
            {panelState.files.length} items
            {panelState.selectedFiles.size > 0 &&
              ` (${panelState.selectedFiles.size} selected)`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Main dual-panel area */}
      <div className="flex-1 flex overflow-hidden">
        {renderPanel("left")}

        {/* Center transfer buttons */}
        <div className="w-16 flex flex-col items-center justify-center gap-4 bg-gray-100 dark:bg-gray-800 border-r border-border dark:border-border-dark">
          <button
            onClick={handleCopyToRight}
            disabled={leftPanel.selectedFiles.size === 0}
            className="p-2 rounded-lg bg-white dark:bg-gray-700 hover:bg-accent hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Copy to right"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={handleCopyToLeft}
            disabled={rightPanel.selectedFiles.size === 0}
            className="p-2 rounded-lg bg-white dark:bg-gray-700 hover:bg-accent hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Copy to left"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {renderPanel("right")}
      </div>
    </div>
  );
}
