// ============================================================
// COD CRM — UI Store (Zustand)
// ============================================================
// Controls sidebar state, theme, and locale.
// ============================================================

import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import type { Locale } from "@/lib/constants";

type Theme = "light" | "dark" | "system";

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Locale
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

type UIPersistedSlice = Pick<UIState, "sidebarCollapsed" | "theme" | "locale">;

type PersistedUIState = {
  state: UIPersistedSlice;
  version?: number;
};

const safeUIStorage: PersistStorage<UIPersistedSlice> = {
  getItem: (name) => {
    if (typeof window === "undefined") return null;

    try {
      const raw = window.localStorage.getItem(name);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedUIState;

      if (!parsed || typeof parsed !== "object" || !parsed.state) {
        window.localStorage.removeItem(name);
        return null;
      }

      return parsed as { state: UIPersistedSlice; version?: number };
    } catch {
      window.localStorage.removeItem(name);
      return null;
    }
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, JSON.stringify(value));
    } catch {
      // Ignore storage quota and private mode failures.
    }
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Ignore storage failures.
    }
  },
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarOpen: false,
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapse: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      // Theme
      theme: "system",
      setTheme: (theme) => set({ theme }),

      // Locale
      locale: "fr",
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "cod-crm-ui",
      storage: safeUIStorage,
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        locale: state.locale,
      }),
    }
  )
);
