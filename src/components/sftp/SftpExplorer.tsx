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
} from "lucide-react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { useSessionStore } from "../../store/sessionStore";

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: string | null;
  permissions: string | null;
}

export default function SftpExplorer() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { sessions, activeSessionId } = useSessionStore();
  const [currentPath, setCurrentPath] = useState("/home");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const session = sessions.find(
    (s) => s.id === (sessionId || activeSessionId)
  );

  // Mock file data
  useEffect(() => {
    setIsLoading(true);
    // Simulated file listing
    setTimeout(() => {
      setFiles([
        { name: "..", path: "/", is_dir: true, size: 0, modified: null, permissions: "drwxr-xr-x" },
        { name: "Documents", path: "/home/Documents", is_dir: true, size: 4096, modified: "2024-01-15T10:30:00Z", permissions: "drwxr-xr-x" },
        { name: "Projects", path: "/home/Projects", is_dir: true, size: 4096, modified: "2024-01-14T08:00:00Z", permissions: "drwxr-xr-x" },
        { name: ".bashrc", path: "/home/.bashrc", is_dir: false, size: 3526, modified: "2024-01-10T12:00:00Z", permissions: "-rw-r--r--" },
        { name: "config.json", path: "/home/config.json", is_dir: false, size: 1234, modified: "2024-01-12T14:30:00Z", permissions: "-rw-r--r--" },
      ]);
      setIsLoading(false);
    }, 500);
  }, [currentPath]);

  const handleNavigate = (entry: FileEntry) => {
    if (entry.is_dir) {
      setCurrentPath(entry.path);
      setSelectedFiles(new Set());
    }
  };

  const handleSelect = (entry: FileEntry, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const newSelected = new Set(selectedFiles);
      if (newSelected.has(entry.path)) {
        newSelected.delete(entry.path);
      } else {
        newSelected.add(entry.path);
      }
      setSelectedFiles(newSelected);
    } else {
      setSelectedFiles(new Set([entry.path]));
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

  const pathParts = currentPath.split("/").filter(Boolean);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border dark:border-border-dark bg-white dark:bg-gray-800">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={() => setCurrentPath("/")}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <Home className="w-4 h-4" />
          </button>
          {pathParts.map((part, index) => (
            <div key={index} className="flex items-center">
              <ChevronRight className="w-4 h-4 text-text-secondary" />
              <button
                onClick={() =>
                  setCurrentPath("/" + pathParts.slice(0, index + 1).join("/"))
                }
                className="px-1.5 py-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-text-primary dark:text-text-primary-dark"
              >
                {part}
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {}}
            className="btn-ghost flex items-center gap-1"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {}}
            className="btn-ghost flex items-center gap-1"
            title="New folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => {}}
            className="btn-ghost flex items-center gap-1"
            title="Upload"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={() => {}}
            disabled={selectedFiles.size === 0}
            className="btn-ghost flex items-center gap-1 disabled:opacity-50"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => {}}
            disabled={selectedFiles.size === 0}
            className="btn-ghost flex items-center gap-1 text-error disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* File list */}
      <ScrollArea.Root className="flex-1">
        <ScrollArea.Viewport className="h-full w-full">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr className="text-left text-text-secondary dark:text-text-secondary-dark">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium w-24">Size</th>
                <th className="px-4 py-2 font-medium w-32">Modified</th>
                <th className="px-4 py-2 font-medium w-28">Permissions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr
                  key={file.path}
                  onClick={(e) => handleSelect(file, e)}
                  onDoubleClick={() => handleNavigate(file)}
                  className={`
                    cursor-pointer border-b border-gray-100 dark:border-gray-800
                    hover:bg-gray-100 dark:hover:bg-gray-800
                    ${selectedFiles.has(file.path) ? "bg-accent/10" : ""}
                  `}
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {file.is_dir ? (
                        <Folder className="w-4 h-4 text-accent" />
                      ) : (
                        <File className="w-4 h-4 text-text-secondary" />
                      )}
                      <span className="text-text-primary dark:text-text-primary-dark">
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
                  <td className="px-4 py-2 font-mono text-xs text-text-secondary dark:text-text-secondary-dark">
                    {file.permissions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty state */}
          {!isLoading && files.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <Folder className="w-16 h-16 text-text-secondary mb-4" />
              <p className="text-text-secondary">This folder is empty</p>
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

      {/* Status bar */}
      <div className="h-8 flex items-center justify-between px-4 border-t border-border dark:border-border-dark bg-gray-50 dark:bg-gray-800 text-xs text-text-secondary">
        <span>
          {files.length} items
          {selectedFiles.size > 0 && ` (${selectedFiles.size} selected)`}
        </span>
        {session && (
          <span className="flex items-center gap-2">
            <span className="status-connected" />
            {session.name}
          </span>
        )}
      </div>
    </div>
  );
}
