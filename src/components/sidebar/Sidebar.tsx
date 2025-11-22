import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Server,
  Folder,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import * as Accordion from "@radix-ui/react-accordion";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { useHostStore, Host } from "../../store/hostStore";
import { useSessionStore } from "../../store/sessionStore";
import HostEditor from "../ui/HostEditor";

export default function Sidebar() {
  const navigate = useNavigate();
  const { hosts, groups, fetchHosts, fetchGroups, deleteHost } = useHostStore();
  const { createSession } = useSessionStore();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [width, setWidth] = useState(280);
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
        const newWidth = Math.max(200, Math.min(400, e.clientX));
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
      className="relative flex-shrink-0 glass border-r border-white/10"
      style={{ width }}
    >
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
        <span className="text-sm font-semibold text-white">
          Servers
        </span>
        <button
          onClick={handleAddServer}
          className="p-2 hover:bg-white/10 rounded-lg transition-all"
          title="Add server"
        >
          <Plus className="w-4 h-4 text-accent" />
        </button>
      </div>

      <div className="overflow-y-auto h-[calc(100%-56px)]">
        <Accordion.Root
          type="multiple"
          value={expandedGroups}
          onValueChange={setExpandedGroups}
          className="p-3"
        >
          {groupedHosts.map((group) => (
            <Accordion.Item key={group.id} value={group.id} className="mb-2">
              <Accordion.Header>
                <Accordion.Trigger className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-white hover:bg-white/5 rounded-lg transition-all">
                  <ChevronRight className="w-4 h-4 text-text-secondary transition-transform data-[state=open]:rotate-90" />
                  <Folder className="w-4 h-4 text-warning" />
                  <span className="flex-1 text-left truncate font-medium">{group.name}</span>
                  <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-text-secondary">
                    {group.hosts.length}
                  </span>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="pl-4 mt-1">
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

        {hosts.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Server className="w-8 h-8 text-text-secondary" />
            </div>
            <p className="text-sm text-text-secondary mb-4">No servers yet</p>
            <button
              onClick={handleAddServer}
              className="btn-primary text-sm"
            >
              Add Your First Server
            </button>
          </div>
        )}
      </div>

      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent transition-colors"
        onMouseDown={handleMouseDown}
      />

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
          className="flex items-center gap-3 w-full px-3 py-2.5 mb-1 text-sm text-white hover:bg-white/5 rounded-lg transition-all group"
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: host.color || "#0A84FF" }}
          />
          <Server className="w-4 h-4 text-text-secondary" />
          <span className="flex-1 text-left truncate">{host.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-text-secondary" />
          </button>
        </button>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[180px] glass-card p-2 shadow-glass-lg animate-scale-in">
          <ContextMenu.Item
            onClick={onConnect}
            className="flex items-center px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg cursor-pointer outline-none transition-all"
          >
            Connect
          </ContextMenu.Item>
          <ContextMenu.Item
            onClick={onEdit}
            className="flex items-center px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg cursor-pointer outline-none transition-all"
          >
            Edit
          </ContextMenu.Item>
          <div className="h-px bg-white/10 my-1" />
          <ContextMenu.Item
            onClick={onDelete}
            className="flex items-center px-3 py-2 text-sm text-error hover:bg-error/20 rounded-lg cursor-pointer outline-none transition-all"
          >
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
