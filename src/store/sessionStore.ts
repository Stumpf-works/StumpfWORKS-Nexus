import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export type SessionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export interface Session {
  id: string;
  host_id: string;
  name: string;
  status: SessionStatus;
  created_at: string;
  connected_at: string | null;
  latency_ms: number | null;
}

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSessions: () => Promise<void>;
  createSession: (hostId: string, name: string) => Promise<Session>;
  closeSession: (id: string) => Promise<void>;
  setActiveSession: (id: string | null) => void;
  updateSessionStatus: (id: string, status: SessionStatus) => void;
  updateLatency: (id: string, latencyMs: number) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSessionId: null,
  isLoading: false,
  error: null,

  fetchSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const sessions = await invoke<Session[]>("get_sessions");
      set({ sessions, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  createSession: async (hostId, name) => {
    set({ isLoading: true, error: null });
    try {
      const session = await invoke<Session>("create_session", {
        hostId,
        name,
      });
      set((state) => ({
        sessions: [...state.sessions, session],
        activeSessionId: session.id,
        isLoading: false,
      }));
      return session;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  closeSession: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await invoke("close_session", { id });
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
        activeSessionId:
          state.activeSessionId === id ? null : state.activeSessionId,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id });
  },

  updateSessionStatus: (id, status) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, status } : s
      ),
    }));
  },

  updateLatency: (id, latencyMs) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, latency_ms: latencyMs } : s
      ),
    }));
  },
}));
