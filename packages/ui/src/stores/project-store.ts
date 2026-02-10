import { create } from "zustand";

interface ProjectState {
  activeProjectId: number | null;
  setActiveProject: (id: number | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  activeProjectId: null,
  setActiveProject: (id) => set({ activeProjectId: id }),
}));
