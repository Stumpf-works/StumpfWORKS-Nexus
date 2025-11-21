import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";

export type Theme = "light" | "dark" | "system";
export type CursorStyle = "block" | "underline" | "bar";

export interface Settings {
  theme: Theme;
  fontSize: number;
  fontFamily: string;
  cursorStyle: CursorStyle;
  cursorBlink: boolean;
  autoReconnect: boolean;
  showLatency: boolean;
  syncEnabled: boolean;
  mcpEnabled: boolean;
  mcpPort: number;
}

interface SettingsState {
  settings: Settings;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
  theme: "system",
  fontSize: 14,
  fontFamily: "SF Mono",
  cursorStyle: "block",
  cursorBlink: true,
  autoReconnect: true,
  showLatency: true,
  syncEnabled: false,
  mcpEnabled: false,
  mcpPort: 9742,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isLoading: false,
      error: null,

      loadSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const backendSettings = await invoke<any>("get_settings");
          // Merge with defaults for any missing properties
          const settings: Settings = {
            ...defaultSettings,
            theme: backendSettings.theme || defaultSettings.theme,
            fontSize: backendSettings.font_size || defaultSettings.fontSize,
            fontFamily: backendSettings.font_family || defaultSettings.fontFamily,
            cursorStyle: backendSettings.terminal_cursor_style || defaultSettings.cursorStyle,
            cursorBlink: backendSettings.terminal_cursor_blink ?? defaultSettings.cursorBlink,
            autoReconnect: backendSettings.auto_reconnect ?? defaultSettings.autoReconnect,
            showLatency: backendSettings.show_latency ?? defaultSettings.showLatency,
            syncEnabled: backendSettings.sync_enabled ?? defaultSettings.syncEnabled,
          };
          set({ settings, isLoading: false });
        } catch (error) {
          console.error("Failed to load settings:", error);
          set({ isLoading: false });
          // Use local settings on error
        }
      },

      updateSettings: async (partial) => {
        const current = get().settings;
        const newSettings = { ...current, ...partial };
        set({ settings: newSettings });

        try {
          // Convert to backend format
          const backendSettings = {
            theme: newSettings.theme,
            font_size: newSettings.fontSize,
            font_family: newSettings.fontFamily,
            terminal_cursor_style: newSettings.cursorStyle,
            terminal_cursor_blink: newSettings.cursorBlink,
            auto_reconnect: newSettings.autoReconnect,
            show_latency: newSettings.showLatency,
            sync_enabled: newSettings.syncEnabled,
            sync_provider: null,
          };
          await invoke("update_settings", { settings: backendSettings });
        } catch (error) {
          console.error("Failed to save settings:", error);
          // Settings are still saved locally via persist
        }
      },

      resetSettings: async () => {
        set({ settings: defaultSettings });
        try {
          const backendSettings = {
            theme: defaultSettings.theme,
            font_size: defaultSettings.fontSize,
            font_family: defaultSettings.fontFamily,
            terminal_cursor_style: defaultSettings.cursorStyle,
            terminal_cursor_blink: defaultSettings.cursorBlink,
            auto_reconnect: defaultSettings.autoReconnect,
            show_latency: defaultSettings.showLatency,
            sync_enabled: defaultSettings.syncEnabled,
            sync_provider: null,
          };
          await invoke("update_settings", { settings: backendSettings });
        } catch (error) {
          console.error("Failed to reset settings:", error);
        }
      },
    }),
    {
      name: "nexus-settings",
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
