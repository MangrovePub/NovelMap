import { create } from "zustand";

export type Theme = "night" | "amber" | "studio";

export const THEMES: { id: Theme; label: string; icon: string; dark: boolean }[] = [
  { id: "night",  label: "Night",  icon: "moon",   dark: true  },
  { id: "amber",  label: "Amber",  icon: "candle", dark: true  },
  { id: "studio", label: "Studio", icon: "sun",    dark: false },
];

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("mps-theme");
  if (stored === "night" || stored === "amber" || stored === "studio") return stored;
  // Legacy: respect old dark/light pref
  const legacy = localStorage.getItem("novelmap-theme");
  return legacy === "light" ? "studio" : "night";
}

function applyTheme(theme: Theme) {
  // "night" is the default @theme in CSS — no data-theme attr needed
  document.documentElement.dataset.theme = theme === "night" ? "" : theme;
  localStorage.setItem("mps-theme", theme);
}

interface UIState {
  bookshelfMode: "2d" | "3d";
  setBookshelfMode: (mode: "2d" | "3d") => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  // kept for legacy callers
  toggleTheme: () => void;
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useUIStore = create<UIState>((set) => ({
  bookshelfMode: "2d",
  setBookshelfMode: (mode) => set({ bookshelfMode: mode }),
  theme: initialTheme,
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const order: Theme[] = ["night", "amber", "studio"];
      const next = order[(order.indexOf(state.theme) + 1) % order.length];
      applyTheme(next);
      return { theme: next };
    }),
}));
