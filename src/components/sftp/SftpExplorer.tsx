import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  Folder,
  File,
  ChevronRight,
  FolderPlus,
  RefreshCw,
  Home,
  HardDrive,
  Server,
  ArrowRight,
  ArrowLeft,
  Trash2,
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

type PanelSource = "local" | string;

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
    currentPath: process.platform === "win32" ? "C:\\" : "/home",
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

  const loadFiles = async (panel: "left" | "right", path: string, source: PanelSource) => {
    const updatePanel = panel === "left" ? setLeftPanel : setRightPanel;

    updatePanel((prev) => ({ ...prev, isLoading: true }));

    try {
      let files: FileEntry[] = [];

      if (source === "local") {
        files = await invoke<FileEntry[]>("list_local_directory", { path });
      } else {
        const sessionToUse = sessions.find((s) => s.host_id === source);
        if (sessionToUse) {
          files = await invoke<FileEntry[]>("list_directory", {
            sessionId: sessionToUse.id,
            path,
          });
        }
      }

      updatePanel((prev) => ({
        ...prev,
        files,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Failed to load files:", error);
      updatePanel((prev) => ({
        ...prev,
        files: [],
        isLoading: false,
      }));
    }
  };

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
    const defaultPath = newSource === "local"
      ? (process.platform === "win32" ? "C:\\" : "/home")
      : "/home";

    updatePanel((prev) => ({
      ...prev,
      source: newSource,
      currentPath: defaultPath,
      selectedFiles: new Set(),
    }));
  };

  const handleCopyToRight = async () => {
    try {
      for (const filePath of leftPanel.selectedFiles) {
        const file = leftPanel.files.find((f) => f.path === filePath);
        if (!file || file.is_dir) continue;

        if (leftPanel.source === "local" && rightPanel.source !== "local") {
          const sessionToUse = sessions.find((s) => s.host_id === rightPanel.source);
          if (sessionToUse) {
            await invoke("upload_file", {
              sessionId: sessionToUse.id,
              localPath: file.path,
              remotePath: `${rightPanel.currentPath}/${file.name}`,
            });
          }
        }
      }
      await loadFiles("right", rightPanel.currentPath, rightPanel.source);
    } catch (error) {
      console.error("Failed to copy files:", error);
    }
  };

  const handleCopyToLeft = async () => {
    try {
      for (const filePath of rightPanel.selectedFiles) {
        const file = rightPanel.files.find((f) => f.path === filePath);
        if (!file || file.is_dir) continue;

        if (rightPanel.source !== "local" && leftPanel.source === "local") {
          const sessionToUse = sessions.find((s) => s.host_id === rightPanel.source);
          if (sessionToUse) {
            await invoke("download_file", {
              sessionId: sessionToUse.id,
              remotePath: file.path,
              localPath: `${leftPanel.currentPath}/${file.name}`,
            });
          }
        }
      }
      await loadFiles("left", leftPanel.currentPath, leftPanel.source);
    } catch (error) {
      console.error("Failed to copy files:", error);
    }
  };

  const handleDelete = async (panel: "left" | "right") => {
    const panelState = panel === "left" ? leftPanel : rightPanel;
    const updatePanel = panel === "left" ? setLeftPanel : setRightPanel;

    try {
      for (const filePath of panelState.selectedFiles) {
        if (panelState.source === "local") {
          await invoke("delete_local_path", { path: filePath });
        } else {
          const sessionToUse = sessions.find((s) => s.host_id === panelState.source);
          if (sessionToUse) {
            await invoke("delete_path", {
              sessionId: sessionToUse.id,
              path: filePath,
            });
          }
        }
      }
      updatePanel((prev) => ({ ...prev, selectedFiles: new Set() }));
      await loadFiles(panel, panelState.currentPath, panelState.source);
    } catch (error) {
      console.error("Failed to delete files:", error);
    }
  };

  const handleCreateDirectory = async (panel: "left" | "right") => {
    const panelState = panel === "left" ? leftPanel : rightPanel;
    const dirName = prompt("Enter directory name:");
    if (!dirName) return;

    try {
      const newPath = `${panelState.currentPath}/${dirName}`;
      if (panelState.source === "local") {
        await invoke("create_local_directory", { path: newPath });
      } else {
        const sessionToUse = sessions.find((s) => s.host_id === panelState.source);
        if (sessionToUse) {
          await invoke("create_directory", {
            sessionId: sessionToUse.id,
            path: newPath,
          });
        }
      }
      await loadFiles(panel, panelState.currentPath, panelState.source);
    } catch (error) {
      console.error("Failed to create directory:", error);
    }
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
        <Select.Trigger className="flex items-center gap-2 px-4 py-2 glass-button text-sm font-medium min-w-[180px]">
          {panelState.source === "local" ? (
            <HardDrive className="w-4 h-4 text-accent" />
          ) : (
            <Server className="w-4 h-4 text-success" />
          )}
          <Select.Value>{sourceLabel}</Select.Value>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="glass-card p-2 z-50 shadow-glass-lg min-w-[180px]">
            <Select.Viewport>
              <Select.Item
                value="local"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer hover:bg-white/10 text-white outline-none transition-all"
              >
                <HardDrive className="w-4 h-4 text-accent" />
                <Select.ItemText>Local Filesystem</Select.ItemText>
              </Select.Item>

              {hosts.length > 0 && (
                <div className="h-px bg-white/10 my-2" />
              )}

              {hosts.map((host) => (
                <Select.Item
                  key={host.id}
                  value={host.id}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer hover:bg-white/10 text-white outline-none transition-all"
                >
                  <Server className="w-4 h-4 text-success" />
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
      <div className="flex-1 flex flex-col glass-panel border-white/10">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          {renderSourceSelector(panel)}

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCreateDirectory(panel)}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
              title="New Folder"
            >
              <FolderPlus className="w-4 h-4 text-text-secondary hover:text-accent transition-colors" />
            </button>
            <button
              onClick={() => handleDelete(panel)}
              disabled={panelState.selectedFiles.size === 0}
              className="p-2 hover:bg-white/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-text-secondary hover:text-error transition-colors" />
            </button>
            <button
              onClick={() =>
                loadFiles(panel, panelState.currentPath, panelState.source)
              }
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
              title="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 text-text-secondary hover:text-accent transition-colors ${panelState.isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center px-4 py-2 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() =>
                handleSourceChange(panel, panelState.source)
              }
              className="p-1.5 hover:bg-white/10 rounded transition-all"
            >
              <Home className="w-4 h-4 text-accent" />
            </button>
            {pathParts.map((part, index) => (
              <div key={index} className="flex items-center">
                <ChevronRight className="w-4 h-4 text-text-tertiary" />
                <button
                  onClick={() => {
                    const updatePanel = panel === "left" ? setLeftPanel : setRightPanel;
                    updatePanel((prev) => ({
                      ...prev,
                      currentPath: "/" + pathParts.slice(0, index + 1).join("/"),
                    }));
                  }}
                  className="px-2 py-1 hover:bg-white/10 rounded text-white hover:text-accent transition-all"
                >
                  {part}
                </button>
              </div>
            ))}
          </div>
        </div>

        <ScrollArea.Root className="flex-1">
          <ScrollArea.Viewport className="h-full w-full">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white/5 backdrop-blur-xl border-b border-white/10">
                <tr className="text-left text-text-secondary">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium w-28">Size</th>
                  <th className="px-4 py-3 font-medium w-36">Modified</th>
                </tr>
              </thead>
              <tbody>
                {panelState.files.map((file) => (
                  <tr
                    key={file.path}
                    onClick={(e) => handleSelect(panel, file, e)}
                    onDoubleClick={() => handleNavigate(panel, file)}
                    className={`
                      cursor-pointer border-b border-white/5
                      hover:bg-white/10 transition-all
                      ${panelState.selectedFiles.has(file.path) ? "bg-accent/20" : ""}
                    `}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {file.is_dir ? (
                          <Folder className="w-5 h-5 text-accent flex-shrink-0" />
                        ) : (
                          <File className="w-5 h-5 text-text-secondary flex-shrink-0" />
                        )}
                        <span className="text-white truncate font-medium">
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {formatSize(file.size)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {formatDate(file.modified)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!panelState.isLoading && panelState.files.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <Folder className="w-16 h-16 text-text-tertiary mb-4" />
                <p className="text-text-secondary">This folder is empty</p>
              </div>
            )}
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" className="w-2 bg-transparent">
            <ScrollArea.Thumb className="bg-white/20 rounded-full hover:bg-white/30" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>

        <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 bg-white/5 text-sm">
          <span className="text-text-secondary">
            {panelState.files.length} items
            {panelState.selectedFiles.size > 0 &&
              ` • ${panelState.selectedFiles.size} selected`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex p-4 gap-4 animate-fade-in">
      {renderPanel("left")}

      <div className="w-20 flex flex-col items-center justify-center gap-6 glass-panel">
        <button
          onClick={handleCopyToRight}
          disabled={leftPanel.selectedFiles.size === 0}
          className="p-3 rounded-xl bg-gradient-to-r from-accent to-accent-light text-white hover:shadow-glow disabled:opacity-30 disabled:cursor-not-allowed disabled:from-white/10 disabled:to-white/10 disabled:text-text-tertiary transition-all duration-300 hover:scale-110 active:scale-95"
          title="Copy to right"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        <button
          onClick={handleCopyToLeft}
          disabled={rightPanel.selectedFiles.size === 0}
          className="p-3 rounded-xl bg-gradient-to-r from-success to-teal text-white hover:glow-success disabled:opacity-30 disabled:cursor-not-allowed disabled:from-white/10 disabled:to-white/10 disabled:text-text-tertiary transition-all duration-300 hover:scale-110 active:scale-95"
          title="Copy to left"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {renderPanel("right")}
    </div>
  );
}
