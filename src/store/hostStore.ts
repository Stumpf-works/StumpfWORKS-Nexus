import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface Host {
  id: string;
  name: string;
  hostname: string;
  port: number;
  username: string;
  auth_type: "password" | "private_key" | "agent";
  group_id: string | null;
  tags: string[];
  icon: string | null;
  color: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  last_connected: string | null;
}

export interface HostGroup {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  order: number;
  created_at: string;
}

interface HostState {
  hosts: Host[];
  groups: HostGroup[];
  selectedHostId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchHosts: () => Promise<void>;
  fetchGroups: () => Promise<void>;
  addHost: (host: Omit<Host, "id" | "created_at" | "updated_at">) => Promise<Host>;
  updateHost: (host: Host) => Promise<void>;
  deleteHost: (id: string) => Promise<void>;
  selectHost: (id: string | null) => void;
}

export const useHostStore = create<HostState>((set, get) => ({
  hosts: [],
  groups: [],
  selectedHostId: null,
  isLoading: false,
  error: null,

  fetchHosts: async () => {
    set({ isLoading: true, error: null });
    try {
      const hosts = await invoke<Host[]>("get_hosts");
      set({ hosts, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  fetchGroups: async () => {
    try {
      const groups = await invoke<HostGroup[]>("get_host_groups");
      set({ groups });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  addHost: async (hostData) => {
    set({ isLoading: true, error: null });
    try {
      const host = await invoke<Host>("add_host", { host: hostData });
      set((state) => ({
        hosts: [...state.hosts, host],
        isLoading: false,
      }));
      return host;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  updateHost: async (host) => {
    set({ isLoading: true, error: null });
    try {
      await invoke("update_host", { host });
      set((state) => ({
        hosts: state.hosts.map((h) => (h.id === host.id ? host : h)),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  deleteHost: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await invoke("delete_host", { id });
      set((state) => ({
        hosts: state.hosts.filter((h) => h.id !== id),
        selectedHostId: state.selectedHostId === id ? null : state.selectedHostId,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  selectHost: (id) => {
    set({ selectedHostId: id });
  },
}));
