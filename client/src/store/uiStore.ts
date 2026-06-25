import { create } from "zustand";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
}

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem("theme", theme);
}

interface UIState {
  isSidebarOpen: boolean;       // mobile drawer
  isSidebarCollapsed: boolean;  // desktop icon-only mode
  notifications: Notification[];
  unreadCount: number;
  theme: Theme;

  toggleSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  addNotification: (n: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markAllRead: () => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set, get) => {
  const theme = getInitialTheme();
  applyTheme(theme);

  return {
    isSidebarOpen: false,
    isSidebarCollapsed: false,
    notifications: [],
    unreadCount: 0,
    theme,

    toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
    closeSidebar: () => set({ isSidebarOpen: false }),
    toggleSidebarCollapsed: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),

    toggleTheme: () => {
      const next: Theme = get().theme === "dark" ? "light" : "dark";
      applyTheme(next);
      set({ theme: next });
    },

    addNotification: (n) =>
      set((s) => ({
        notifications: [
          { ...n, id: crypto.randomUUID(), read: false, createdAt: new Date().toISOString() },
          ...s.notifications,
        ].slice(0, 50), // cap so this never grows unbounded across a long session
        unreadCount: s.unreadCount + 1,
      })),

    markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })), unreadCount: 0 })),
  };
});
