import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import { X, ChevronDown, Check, Eye, EyeOff, Key, Lock, Server } from "lucide-react";
import { Host, useHostStore } from "../../store/hostStore";
import { cn } from "../../lib/utils";

interface HostEditorProps {
  host?: Host | null;
  isOpen: boolean;
  onClose: () => void;
}

type AuthType = "password" | "private_key" | "agent";

interface HostFormData {
  name: string;
  hostname: string;
  port: number;
  username: string;
  auth_type: AuthType;
  password: string;
  key_path: string;
  passphrase: string;
  group_id: string | null;
  tags: string;
  color: string;
  notes: string;
}

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
  "#0A84FF",
  "#34C759",
  "#FF9500",
  "#FF3B30",
];

export default function HostEditor({ host, isOpen, onClose }: HostEditorProps) {
  const { addHost, updateHost, groups } = useHostStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<HostFormData>({
    name: "",
    hostname: "",
    port: 22,
    username: "",
    auth_type: "password",
    password: "",
    key_path: "",
    passphrase: "",
    group_id: null,
    tags: "",
    color: COLORS[0],
    notes: "",
  });

  // Reset form when dialog opens/closes or host changes
  useEffect(() => {
    if (isOpen) {
      if (host) {
        setFormData({
          name: host.name,
          hostname: host.hostname,
          port: host.port,
          username: host.username,
          auth_type: host.auth_type,
          password: host.password || "",
          key_path: host.private_key || "",
          passphrase: host.passphrase || "",
          group_id: host.group_id,
          tags: host.tags.join(", "),
          color: host.color || COLORS[0],
          notes: host.notes || "",
        });
      } else {
        setFormData({
          name: "",
          hostname: "",
          port: 22,
          username: "",
          auth_type: "password",
          password: "",
          key_path: "",
          passphrase: "",
          group_id: null,
          tags: "",
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          notes: "",
        });
      }
      setError(null);
    }
  }, [isOpen, host]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const hostData = {
        name: formData.name,
        hostname: formData.hostname,
        port: formData.port,
        username: formData.username,
        auth_type: formData.auth_type,
        password: formData.auth_type === "password" ? (formData.password || null) : null,
        private_key: formData.auth_type === "private_key" ? (formData.key_path || null) : null,
        passphrase: formData.auth_type === "private_key" ? (formData.passphrase || null) : null,
        group_id: formData.group_id,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        icon: null,
        color: formData.color,
        notes: formData.notes || null,
      };

      if (host) {
        await updateHost({
          ...host,
          ...hostData,
        });
      } else {
        await addHost(hostData as any);
      }

      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof HostFormData>(
    field: K,
    value: HostFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-gray-800 rounded-macos-lg shadow-macos overflow-hidden animate-scale-in z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
            <Dialog.Title className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">
              {host ? "Edit Server" : "Add Server"}
            </Dialog.Title>
            <Dialog.Close className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
                {error}
              </div>
            )}

            {/* Name & Color */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="input"
                  placeholder="My Server"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                  Color
                </label>
                <div className="flex gap-1 flex-wrap max-w-[120px]">
                  {COLORS.slice(0, 7).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => updateField("color", color)}
                      className={cn(
                        "w-6 h-6 rounded-full transition-transform",
                        formData.color === color && "ring-2 ring-offset-2 ring-accent scale-110"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Hostname & Port */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                  Hostname
                </label>
                <input
                  type="text"
                  value={formData.hostname}
                  onChange={(e) => updateField("hostname", e.target.value)}
                  className="input"
                  placeholder="192.168.1.1 or server.example.com"
                  required
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={formData.port}
                  onChange={(e) => updateField("port", parseInt(e.target.value) || 22)}
                  className="input"
                  min="1"
                  max="65535"
                  required
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => updateField("username", e.target.value)}
                className="input"
                placeholder="root"
                required
              />
            </div>

            {/* Auth Type */}
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                Authentication
              </label>
              <div className="flex gap-2">
                {[
                  { value: "password", label: "Password", icon: Lock },
                  { value: "private_key", label: "SSH Key", icon: Key },
                  { value: "agent", label: "Agent", icon: Server },
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("auth_type", option.value as AuthType)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
                        formData.auth_type === option.value
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Password field */}
            {formData.auth_type === "password" && (
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    className="input pr-10"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Private Key fields */}
            {formData.auth_type === "private_key" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                    Private Key Path
                  </label>
                  <input
                    type="text"
                    value={formData.key_path}
                    onChange={(e) => updateField("key_path", e.target.value)}
                    className="input"
                    placeholder="~/.ssh/id_rsa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                    Passphrase (optional)
                  </label>
                  <input
                    type="password"
                    value={formData.passphrase}
                    onChange={(e) => updateField("passphrase", e.target.value)}
                    className="input"
                    placeholder="Key passphrase"
                  />
                </div>
              </>
            )}

            {/* Group */}
            {groups.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                  Group
                </label>
                <Select.Root
                  value={formData.group_id || "none"}
                  onValueChange={(v) => updateField("group_id", v === "none" ? null : v)}
                >
                  <Select.Trigger className="input flex items-center justify-between">
                    <Select.Value placeholder="No group" />
                    <ChevronDown className="w-4 h-4 text-text-secondary" />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="bg-white dark:bg-gray-800 rounded-macos shadow-macos border border-gray-200 dark:border-gray-700 p-1 z-[100]">
                      <Select.Viewport>
                        <Select.Item
                          value="none"
                          className="flex items-center justify-between px-3 py-1.5 rounded cursor-pointer outline-none hover:bg-accent hover:text-white text-sm"
                        >
                          <Select.ItemText>No group</Select.ItemText>
                        </Select.Item>
                        {groups.map((group) => (
                          <Select.Item
                            key={group.id}
                            value={group.id}
                            className="flex items-center justify-between px-3 py-1.5 rounded cursor-pointer outline-none hover:bg-accent hover:text-white text-sm"
                          >
                            <Select.ItemText>{group.name}</Select.ItemText>
                            <Select.ItemIndicator>
                              <Check className="w-4 h-4" />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                Tags
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => updateField("tags", e.target.value)}
                className="input"
                placeholder="production, web, us-east (comma separated)"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                className="input min-h-[80px] resize-y"
                placeholder="Optional notes about this server..."
              />
            </div>
          </form>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-border dark:border-border-dark">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : host ? "Save Changes" : "Add Server"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
