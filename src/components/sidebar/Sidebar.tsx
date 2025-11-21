import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ChevronDown,
  Server,
  Folder,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import * as Accordion from "@radix-ui/react-accordion";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { useHostStore, Host, HostGroup } from "../../store/hostStore";
import { useSessionStore } from "../../store/sessionStore";
import HostEditor from "../ui/HostEditor";

export default function Sidebar() {
  const navigate = useNavigate();
  const { hosts, groups, fetchHosts, fetchGroups, selectHost, deleteHost } =
    useHostStore();
  const { createSession } = useSessionStore();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [width, setWidth] = useState(240);
  const [isHostEditorOpen, setIsHostEditorOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<Host | null>(null);

  useEffect(() => {
    fetchHosts();
    fetchGroups();
  }, [fetchHosts, fetchGroups]);

  const ungroupedHosts = hosts.filter((h) => !h.group_id);
  const groupedHosts = groups.map((group) => ({
    ...group,
    hosts: hosts.filter((h) => h.group_id === group.id),
  }));

  const handleConnect = async (host: Host) => {
    try {
      const session = await createSession(host.id, host.name);
      navigate(`/terminal/${session.id}`);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const handleAddServer = () => {
    setEditingHost(null);
    setIsHostEditorOpen(true);
  };

  const handleEditHost = (host: Host) => {
    setEditingHost(host);
    setIsHostEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsHostEditorOpen(false);
    setEditingHost(null);
  };

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(180, Math.min(400, e.clientX));
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      className="relative flex-shrink-0 bg-sidebar dark:bg-sidebar-dark border-r border-border dark:border-border-dark"
      style={{ width }}
    >
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-border dark:border-border-dark">
        <span className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          Servers
        </span>
        <button
          onClick={handleAddServer}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Add server"
        >
          <Plus className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {/* Host list */}
      <div className="overflow-y-auto h-[calc(100%-40px)]">
        <Accordion.Root
          type="multiple"
          value={expandedGroups}
          onValueChange={setExpandedGroups}
          className="p-2"
        >
          {/* Grouped hosts */}
          {groupedHosts.map((group) => (
            <Accordion.Item key={group.id} value={group.id}>
              <Accordion.Header>
                <Accordion.Trigger className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-text-primary dark:text-text-primary-dark hover:bg-gray-200 dark:hover:bg-gray-700 rounded group">
                  <ChevronRight className="w-4 h-4 text-text-secondary transition-transform group-data-[state=open]:rotate-90" />
                  <Folder className="w-4 h-4 text-text-secondary" />
                  <span className="flex-1 text-left truncate">{group.name}</span>
                  <span className="text-xs text-text-secondary">
                    {group.hosts.length}
                  </span>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="pl-4">
                {group.hosts.map((host) => (
                  <HostItem
                    key={host.id}
                    host={host}
                    onConnect={() => handleConnect(host)}
                    onEdit={() => handleEditHost(host)}
                    onDelete={() => deleteHost(host.id)}
                  />
                ))}
              </Accordion.Content>
            </Accordion.Item>
          ))}

          {/* Ungrouped hosts */}
          {ungroupedHosts.map((host) => (
            <HostItem
              key={host.id}
              host={host}
              onConnect={() => handleConnect(host)}
              onEdit={() => handleEditHost(host)}
              onDelete={() => deleteHost(host.id)}
            />
          ))}
        </Accordion.Root>

        {/* Empty state */}
        {hosts.length === 0 && (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Server className="w-12 h-12 text-text-secondary mb-3" />
            <p className="text-sm text-text-secondary">No servers yet</p>
            <button
              onClick={handleAddServer}
              className="mt-3 btn-primary text-sm"
            >
              Add Server
            </button>
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/50 transition-colors"
        onMouseDown={handleMouseDown}
      />

      {/* Host Editor Dialog */}
      <HostEditor
        host={editingHost}
        isOpen={isHostEditorOpen}
        onClose={handleCloseEditor}
      />
    </div>
  );
}

interface HostItemProps {
  host: Host;
  onConnect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function HostItem({ host, onConnect, onEdit, onDelete }: HostItemProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <button
          onDoubleClick={onConnect}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-text-primary dark:text-text-primary-dark hover:bg-gray-200 dark:hover:bg-gray-700 rounded group"
        >
          <Server className="w-4 h-4 text-text-secondary" />
          <span className="flex-1 text-left truncate">{host.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4 text-text-secondary" />
          </button>
        </button>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[160px] bg-white dark:bg-gray-800 rounded-macos shadow-macos p-1 border border-gray-200 dark:border-gray-700 animate-scale-in">
          <ContextMenu.Item
            onClick={onConnect}
            className="flex items-center px-3 py-1.5 text-sm text-text-primary dark:text-text-primary-dark hover:bg-accent hover:text-white rounded cursor-pointer outline-none"
          >
            Connect
          </ContextMenu.Item>
          <ContextMenu.Item
            onClick={onEdit}
            className="flex items-center px-3 py-1.5 text-sm text-text-primary dark:text-text-primary-dark hover:bg-accent hover:text-white rounded cursor-pointer outline-none"
          >
            Edit
          </ContextMenu.Item>
          <ContextMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
          <ContextMenu.Item
            onClick={onDelete}
            className="flex items-center px-3 py-1.5 text-sm text-error hover:bg-error hover:text-white rounded cursor-pointer outline-none"
          >
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
