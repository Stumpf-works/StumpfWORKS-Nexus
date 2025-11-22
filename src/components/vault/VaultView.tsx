import { useState, useEffect } from "react";
import { Server, Folder, Plus, Edit3, Trash2, MoreVertical, Settings } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useHostStore, Host, HostGroup } from "../../store/hostStore";
import HostEditor from "../ui/HostEditor";

export default function VaultView() {
  const { hosts, groups, fetchHosts, fetchGroups, deleteHost, selectHost } = useHostStore();
  const [activeTab, setActiveTab] = useState<"hosts" | "groups">("hosts");
  const [isHostEditorOpen, setIsHostEditorOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    fetchHosts();
    fetchGroups();
  }, [fetchHosts, fetchGroups]);

  const handleAddHost = () => {
    setEditingHost(null);
    setIsHostEditorOpen(true);
  };

  const handleEditHost = (host: Host) => {
    setEditingHost(host);
    setIsHostEditorOpen(true);
  };

  const handleDeleteHost = async (hostId: string) => {
    if (confirm("Are you sure you want to delete this host?")) {
      await deleteHost(hostId);
    }
  };

  const handleCloseEditor = () => {
    setIsHostEditorOpen(false);
    setEditingHost(null);
  };

  // Group hosts by group
  const groupedHosts = groups.map((group) => ({
    ...group,
    hosts: hosts.filter((h) => h.group_id === group.id),
  }));

  const ungroupedHosts = hosts.filter((h) => !h.group_id);

  // Filter hosts by selected group
  const filteredHosts = selectedGroup
    ? hosts.filter((h) => h.group_id === selectedGroup)
    : selectedGroup === "ungrouped"
      ? ungroupedHosts
      : hosts;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border dark:border-border-dark">
        <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark flex items-center gap-2">
          <Server className="w-6 h-6" />
          DataSphere Vault
        </h1>
        <p className="text-text-secondary mt-1">
          Manage your hosts, groups, and connection credentials
        </p>
      </div>

      <Tabs.Root
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "hosts" | "groups")}
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Tab List */}
        <div className="border-b border-border dark:border-border-dark px-6">
          <Tabs.List className="flex gap-6">
            <Tabs.Trigger
              value="hosts"
              className="py-3 relative text-text-secondary data-[state=active]:text-accent data-[state=active]:font-medium transition-colors"
            >
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                Hosts ({hosts.length})
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent data-[state=inactive]:opacity-0 transition-opacity" />
            </Tabs.Trigger>
            <Tabs.Trigger
              value="groups"
              className="py-3 relative text-text-secondary data-[state=active]:text-accent data-[state=active]:font-medium transition-colors"
            >
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4" />
                Groups ({groups.length})
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent data-[state=inactive]:opacity-0 transition-opacity" />
            </Tabs.Trigger>
          </Tabs.List>
        </div>

        {/* Hosts Tab */}
        <Tabs.Content value="hosts" className="flex-1 overflow-hidden flex">
          <div className="flex-1 flex">
            {/* Group Filter Sidebar */}
            <div className="w-64 border-r border-border dark:border-border-dark overflow-auto">
              <div className="p-4">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                  Filter by Group
                </h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedGroup === null
                        ? "bg-accent/10 text-accent"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-text-primary dark:text-text-primary-dark"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      <span className="text-sm">All Hosts</span>
                      <span className="ml-auto text-xs text-text-secondary">
                        {hosts.length}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedGroup("ungrouped")}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedGroup === "ungrouped"
                        ? "bg-accent/10 text-accent"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-text-primary dark:text-text-primary-dark"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 opacity-50" />
                      <span className="text-sm">Ungrouped</span>
                      <span className="ml-auto text-xs text-text-secondary">
                        {ungroupedHosts.length}
                      </span>
                    </div>
                  </button>

                  {groupedHosts.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedGroup === group.id
                          ? "bg-accent/10 text-accent"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800 text-text-primary dark:text-text-primary-dark"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4" />
                        <span className="text-sm">{group.name}</span>
                        <span className="ml-auto text-xs text-text-secondary">
                          {group.hosts.length}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Host List */}
            <div className="flex-1 overflow-auto">
              <div className="p-6">
                {/* Action Bar */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">
                      {selectedGroup === null
                        ? "All Hosts"
                        : selectedGroup === "ungrouped"
                          ? "Ungrouped Hosts"
                          : groupedHosts.find((g) => g.id === selectedGroup)?.name}
                    </h2>
                    <p className="text-sm text-text-secondary">
                      {filteredHosts.length} host{filteredHosts.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={handleAddHost}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Host
                  </button>
                </div>

                {/* Host Grid */}
                {filteredHosts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredHosts.map((host) => (
                      <div
                        key={host.id}
                        className="card p-4 hover:shadow-lg transition-shadow group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: host.color || "#0A84FF" }}
                          >
                            <Server className="w-6 h-6 text-white" />
                          </div>
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger className="btn-ghost p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content className="dropdown-content">
                                <DropdownMenu.Item
                                  className="dropdown-item"
                                  onSelect={() => handleEditHost(host)}
                                >
                                  <Edit3 className="w-4 h-4" />
                                  Edit
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator className="h-px bg-border dark:bg-border-dark my-1" />
                                <DropdownMenu.Item
                                  className="dropdown-item text-error"
                                  onSelect={() => handleDeleteHost(host.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </div>

                        <h3 className="font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                          {host.name}
                        </h3>
                        <p className="text-sm text-text-secondary mb-3">
                          {host.username}@{host.hostname}:{host.port}
                        </p>

                        {host.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {host.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {host.tags.length > 3 && (
                              <span className="text-xs px-2 py-0.5 text-text-secondary">
                                +{host.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="text-xs text-text-secondary">
                          Auth: {host.auth_type.replace("_", " ")}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Server className="w-12 h-12 text-text-secondary mx-auto mb-3" />
                    <p className="text-text-secondary mb-4">No hosts found</p>
                    <button onClick={handleAddHost} className="btn-primary">
                      Add Your First Host
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* Groups Tab */}
        <Tabs.Content value="groups" className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">
                  Host Groups
                </h2>
                <p className="text-sm text-text-secondary">
                  Organize your hosts into groups
                </p>
              </div>
              <button className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Group
              </button>
            </div>

            {groups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedHosts.map((group) => (
                  <div
                    key={group.id}
                    className="card p-4 hover:shadow-lg transition-shadow group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: group.color || "#FF9500" }}
                      >
                        <Folder className="w-6 h-6 text-white" />
                      </div>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger className="btn-ghost p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content className="dropdown-content">
                            <DropdownMenu.Item className="dropdown-item">
                              <Edit3 className="w-4 h-4" />
                              Edit
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator className="h-px bg-border dark:bg-border-dark my-1" />
                            <DropdownMenu.Item className="dropdown-item text-error">
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>

                    <h3 className="font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                      {group.name}
                    </h3>
                    <p className="text-sm text-text-secondary mb-3">
                      {group.hosts.length} host{group.hosts.length !== 1 ? "s" : ""}
                    </p>

                    <div className="flex -space-x-2">
                      {group.hosts.slice(0, 5).map((host) => (
                        <div
                          key={host.id}
                          className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900"
                          style={{ backgroundColor: host.color || "#0A84FF" }}
                          title={host.name}
                        >
                          <Server className="w-4 h-4 text-white" />
                        </div>
                      ))}
                      {group.hosts.length > 5 && (
                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-xs border-2 border-white dark:border-gray-900">
                          +{group.hosts.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Folder className="w-12 h-12 text-text-secondary mx-auto mb-3" />
                <p className="text-text-secondary mb-4">No groups created</p>
                <button className="btn-primary">Create Your First Group</button>
              </div>
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Host Editor Modal */}
      {isHostEditorOpen && (
        <HostEditor host={editingHost} onClose={handleCloseEditor} />
      )}
    </div>
  );
}
