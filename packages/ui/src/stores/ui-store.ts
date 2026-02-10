import { create } from "zustand";

type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("novelmap-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("novelmap-theme", theme);
}

interface UIState {
  bookshelfMode: "2d" | "3d";
  setBookshelfMode: (mode: "2d" | "3d") => void;
  theme: Theme;
  toggleTheme: () => void;
}

// Apply theme on load
const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useUIStore = create<UIState>((set) => ({
  bookshelfMode: "2d",
  setBookshelfMode: (mode) => set({ bookshelfMode: mode }),
  theme: initialTheme,
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      return { theme: next };
    }),
}));
