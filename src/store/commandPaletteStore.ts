import { create } from "zustand";

interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (query: string) => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  isOpen: false,
  query: "",

  open: () => set({ isOpen: true, query: "" }),
  close: () => set({ isOpen: false, query: "" }),
  toggle: () =>
    set((state) => ({ isOpen: !state.isOpen, query: state.isOpen ? "" : state.query })),
  setQuery: (query) => set({ query }),
}));

// Global keyboard shortcut
if (typeof window !== "undefined") {
  document.addEventListener("keydown", (e) => {
    // Cmd/Ctrl + K
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      useCommandPaletteStore.getState().toggle();
    }
    // Escape
    if (e.key === "Escape") {
      useCommandPaletteStore.getState().close();
    }
  });
}
