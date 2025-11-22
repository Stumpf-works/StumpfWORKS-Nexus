import { useState, useEffect } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Switch from "@radix-ui/react-switch";
import * as Select from "@radix-ui/react-select";
import {
  Monitor,
  Key,
  Database,
  Plug,
  Info,
  ChevronDown,
  Check,
  Moon,
  Sun,
  Laptop,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { showToast } from "../ui/Toast";
import { useThemeStore } from "../../store/themeStore";

interface Settings {
  theme: string;
  font_size: number;
  font_family: string;
  terminal_cursor_style: string;
  terminal_cursor_blink: boolean;
  auto_reconnect: boolean;
  show_latency: boolean;
  sync_enabled: boolean;
  sync_provider: any | null;
}

export default function Settings() {
  const { theme, setTheme } = useThemeStore();
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState("JetBrains Mono");
  const [cursorBlink, setCursorBlink] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [showLatency, setShowLatency] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from backend
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await invoke<Settings>("get_settings");
      setFontSize(settings.font_size);
      setFontFamily(settings.font_family);
      setCursorBlink(settings.terminal_cursor_blink);
      setAutoReconnect(settings.auto_reconnect);
      setShowLatency(settings.show_latency);
      setSyncEnabled(settings.sync_enabled);
      setIsLoaded(true);
    } catch (error) {
      console.error("Failed to load settings:", error);
      showToast("Failed to load settings", "error");
    }
  };

  const saveSettings = async (updates: Partial<Settings>) => {
    try {
      const currentSettings = await invoke<Settings>("get_settings");
      const updatedSettings = { ...currentSettings, ...updates };
      await invoke("update_settings", { settings: updatedSettings });
      showToast("Settings saved", "success");
    } catch (error) {
      console.error("Failed to save settings:", error);
      showToast("Failed to save settings", "error");
    }
  };

  const handleFontSizeChange = (value: string) => {
    const size = Number(value);
    setFontSize(size);
    saveSettings({ font_size: size });
  };

  const handleCursorBlinkChange = (checked: boolean) => {
    setCursorBlink(checked);
    saveSettings({ terminal_cursor_blink: checked });
  };

  const handleAutoReconnectChange = (checked: boolean) => {
    setAutoReconnect(checked);
    saveSettings({ auto_reconnect: checked });
  };

  const handleShowLatencyChange = (checked: boolean) => {
    setShowLatency(checked);
    saveSettings({ show_latency: checked });
  };

  const handleSyncEnabledChange = (checked: boolean) => {
    setSyncEnabled(checked);
    saveSettings({ sync_enabled: checked });
  };

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-text-secondary">Loading settings...</div>
      </div>
    );
  }

  const tabs = [
    { id: "general", label: "General", icon: Monitor },
    { id: "keys", label: "SSH Keys", icon: Key },
    { id: "datasphere", label: "DataSphere", icon: Database },
    { id: "plugins", label: "Plugins", icon: Plug },
    { id: "about", label: "About", icon: Info },
  ];

  return (
    <div className="h-full flex">
      <Tabs.Root defaultValue="general" className="flex w-full">
        {/* Sidebar */}
        <Tabs.List className="w-56 border-r border-border dark:border-border-dark p-2 flex flex-col gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-left
                           text-text-primary dark:text-text-primary-dark
                           hover:bg-gray-100 dark:hover:bg-gray-800
                           data-[state=active]:bg-accent data-[state=active]:text-white
                           transition-colors"
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {/* General Settings */}
          <Tabs.Content value="general" className="space-y-6">
            <h2 className="text-xl font-semibold text-text-primary dark:text-text-primary-dark">
              General Settings
            </h2>

            {/* Theme */}
            <div className="card p-4">
              <h3 className="font-medium text-text-primary dark:text-text-primary-dark mb-4">
                Appearance
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                      Theme
                    </label>
                    <p className="text-xs text-text-secondary">
                      Choose your preferred color scheme
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {[
                      { value: "light", icon: Sun, label: "Light" },
                      { value: "dark", icon: Moon, label: "Dark" },
                      { value: "system", icon: Laptop, label: "System" },
                    ].map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setTheme(option.value as any)}
                          className={`
                            flex items-center gap-2 px-3 py-2 rounded-lg border text-sm
                            ${
                              theme === option.value
                                ? "border-accent bg-accent/10 text-accent"
                                : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }
                          `}
                        >
                          <Icon className="w-4 h-4" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                      Font Size
                    </label>
                    <p className="text-xs text-text-secondary">
                      Terminal font size
                    </p>
                  </div>
                  <Select.Root
                    value={String(fontSize)}
                    onValueChange={handleFontSizeChange}
                  >
                    <Select.Trigger className="input w-24 flex items-center justify-between">
                      <Select.Value />
                      <ChevronDown className="w-4 h-4 text-text-secondary" />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="bg-white dark:bg-gray-800 rounded-macos shadow-macos border border-gray-200 dark:border-gray-700 p-1">
                        <Select.Viewport>
                          {[12, 13, 14, 15, 16, 18, 20].map((size) => (
                            <Select.Item
                              key={size}
                              value={String(size)}
                              className="flex items-center justify-between px-3 py-1.5 rounded cursor-pointer outline-none hover:bg-accent hover:text-white text-sm"
                            >
                              <Select.ItemText>{size}px</Select.ItemText>
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
              </div>
            </div>

            {/* Terminal */}
            <div className="card p-4">
              <h3 className="font-medium text-text-primary dark:text-text-primary-dark mb-4">
                Terminal
              </h3>
              <div className="space-y-4">
                <SettingRow
                  label="Cursor Blink"
                  description="Enable blinking cursor in terminal"
                  checked={cursorBlink}
                  onCheckedChange={handleCursorBlinkChange}
                />
                <SettingRow
                  label="Auto Reconnect"
                  description="Automatically reconnect on connection loss"
                  checked={autoReconnect}
                  onCheckedChange={handleAutoReconnectChange}
                />
                <SettingRow
                  label="Show Latency"
                  description="Display connection latency in tab bar"
                  checked={showLatency}
                  onCheckedChange={handleShowLatencyChange}
                />
              </div>
            </div>
          </Tabs.Content>

          {/* SSH Keys */}
          <Tabs.Content value="keys" className="space-y-6">
            <h2 className="text-xl font-semibold text-text-primary dark:text-text-primary-dark">
              SSH Keys
            </h2>
            <div className="card p-4">
              <p className="text-text-secondary">
                Manage your SSH keys for authentication.
              </p>
              <button className="btn-primary mt-4">Import Key</button>
            </div>
          </Tabs.Content>

          {/* DataSphere */}
          <Tabs.Content value="datasphere" className="space-y-6">
            <h2 className="text-xl font-semibold text-text-primary dark:text-text-primary-dark">
              DataSphere
            </h2>
            <div className="card p-4">
              <p className="text-text-secondary">
                Configure end-to-end encrypted storage and sync settings.
              </p>
              <div className="mt-4 space-y-4">
                <SettingRow
                  label="Enable Sync"
                  description="Sync data across devices"
                  checked={syncEnabled}
                  onCheckedChange={handleSyncEnabledChange}
                />
              </div>
            </div>
          </Tabs.Content>

          {/* Plugins */}
          <Tabs.Content value="plugins" className="space-y-6">
            <h2 className="text-xl font-semibold text-text-primary dark:text-text-primary-dark">
              Plugins
            </h2>
            <div className="card p-4">
              <p className="text-text-secondary">
                Extend Nexus functionality with plugins.
              </p>
              <button className="btn-primary mt-4">Browse Plugins</button>
            </div>
          </Tabs.Content>

          {/* About */}
          <Tabs.Content value="about" className="space-y-6">
            <h2 className="text-xl font-semibold text-text-primary dark:text-text-primary-dark">
              About StumpfWORKS Nexus
            </h2>
            <div className="card p-6 text-center">
              <div className="w-20 h-20 bg-accent rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">N</span>
              </div>
              <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">
                StumpfWORKS Nexus
              </h3>
              <p className="text-text-secondary">Version 0.1.0</p>
              <p className="text-sm text-text-secondary mt-4">
                Modern SSH, SFTP & DevOps Tool
              </p>
              <p className="text-xs text-text-secondary mt-2">
                Built with Tauri, Rust, and React
              </p>
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}

interface SettingRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function SettingRow({
  label,
  description,
  checked,
  onCheckedChange,
}: SettingRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <label className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
          {label}
        </label>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full relative data-[state=checked]:bg-accent transition-colors"
      >
        <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
    </div>
  );
}
