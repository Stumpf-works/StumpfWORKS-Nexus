import { useState } from "react";
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
} from "lucide-react";
import { useThemeStore } from "../../store/themeStore";

export default function Settings() {
  const { theme, setTheme } = useThemeStore();
  const [fontSize, setFontSize] = useState(14);
  const [cursorBlink, setCursorBlink] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [showLatency, setShowLatency] = useState(true);

  const tabs = [
    { id: "general", label: "General", icon: Monitor },
    { id: "keys", label: "SSH Keys", icon: Key },
    { id: "datasphere", label: "DataSphere", icon: Database },
    { id: "plugins", label: "Plugins", icon: Plug },
    { id: "about", label: "About", icon: Info },
  ];

  return (
    <div className="h-full flex p-6 gap-6 animate-fade-in">
      <Tabs.Root defaultValue="general" className="flex w-full gap-6">
        <Tabs.List className="w-64 glass-panel p-3 flex flex-col gap-2 h-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-3 px-4 py-3 text-sm rounded-xl text-left
                           text-white hover:bg-white/5
                           data-[state=active]:bg-gradient-to-r data-[state=active]:from-accent data-[state=active]:to-accent-light
                           transition-all"
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        <div className="flex-1 overflow-auto space-y-6">
          <Tabs.Content value="general" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                General Settings
              </h2>
              <p className="text-text-secondary">
                Configure your application preferences
              </p>
            </div>

            <div className="floating-card space-y-6">
              <h3 className="text-lg font-semibold text-white">
                Appearance
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white block mb-3">
                    Font Size
                  </label>
                  <Select.Root
                    value={String(fontSize)}
                    onValueChange={(v) => setFontSize(Number(v))}
                  >
                    <Select.Trigger className="glass-button w-full flex items-center justify-between">
                      <span className="text-white">{fontSize}px</span>
                      <ChevronDown className="w-4 h-4 text-text-secondary" />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="glass-card p-2 shadow-glass-lg z-50">
                        <Select.Viewport>
                          {[12, 13, 14, 15, 16, 18, 20].map((size) => (
                            <Select.Item
                              key={size}
                              value={String(size)}
                              className="flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer outline-none hover:bg-white/10 text-white"
                            >
                              <Select.ItemText>{size}px</Select.ItemText>
                              <Select.ItemIndicator>
                                <Check className="w-4 h-4 text-accent" />
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

            <div className="floating-card space-y-6">
              <h3 className="text-lg font-semibold text-white">
                Terminal
              </h3>
              <div className="space-y-4">
                <SettingRow
                  label="Cursor Blink"
                  description="Enable blinking cursor in terminal"
                  checked={cursorBlink}
                  onCheckedChange={setCursorBlink}
                />
                <SettingRow
                  label="Auto Reconnect"
                  description="Automatically reconnect on connection loss"
                  checked={autoReconnect}
                  onCheckedChange={setAutoReconnect}
                />
                <SettingRow
                  label="Show Latency"
                  description="Display connection latency in tab bar"
                  checked={showLatency}
                  onCheckedChange={setShowLatency}
                />
              </div>
            </div>
          </Tabs.Content>

          <Tabs.Content value="keys" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                SSH Keys
              </h2>
              <p className="text-text-secondary">
                Manage your SSH keys for authentication
              </p>
            </div>
            <div className="floating-card text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto">
                <Key className="w-8 h-8 text-accent" />
              </div>
              <p className="text-text-secondary">
                SSH key management coming soon
              </p>
              <button className="btn-primary">Import Key</button>
            </div>
          </Tabs.Content>

          <Tabs.Content value="datasphere" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                DataSphere
              </h2>
              <p className="text-text-secondary">
                End-to-end encrypted storage and sync
              </p>
            </div>
            <div className="floating-card space-y-4">
              <SettingRow
                label="Enable Sync"
                description="Sync data across devices (coming soon)"
                checked={false}
                onCheckedChange={() => {}}
              />
            </div>
          </Tabs.Content>

          <Tabs.Content value="plugins" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Plugins
              </h2>
              <p className="text-text-secondary">
                Extend Nexus functionality with plugins
              </p>
            </div>
            <div className="floating-card text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto">
                <Plug className="w-8 h-8 text-purple" />
              </div>
              <p className="text-text-secondary">
                Plugin marketplace coming soon
              </p>
              <button className="btn-primary">Browse Plugins</button>
            </div>
          </Tabs.Content>

          <Tabs.Content value="about" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                About
              </h2>
              <p className="text-text-secondary">
                Version and build information
              </p>
            </div>
            <div className="floating-card text-center space-y-4">
              <div className="w-24 h-24 bg-gradient-to-br from-accent to-accent-light rounded-2xl mx-auto flex items-center justify-center">
                <span className="text-4xl font-bold text-white">N</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  StumpfWORKS Nexus
                </h3>
                <p className="text-text-secondary mt-1">Version 0.1.0</p>
              </div>
              <div className="glass-panel space-y-2 text-sm">
                <p className="text-white font-medium">
                  Modern SSH, SFTP & DevOps Tool
                </p>
                <p className="text-text-secondary">
                  Built with Tauri 2.0, Rust & React
                </p>
              </div>
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
        <label className="text-sm font-medium text-white">
          {label}
        </label>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="w-11 h-6 bg-white/10 rounded-full relative data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent data-[state=checked]:to-accent-light transition-all"
      >
        <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-lg transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
    </div>
  );
}
