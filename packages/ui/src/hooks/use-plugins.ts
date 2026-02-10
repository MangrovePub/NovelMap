import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client.ts";
import { useProjectStore } from "../stores/project-store.ts";

export function usePlugins() {
  return useQuery({
    queryKey: ["plugins"],
    queryFn: () => api.listPlugins(),
  });
}

export function usePluginExporters() {
  return useQuery({
    queryKey: ["plugins", "exporters"],
    queryFn: () => api.listPluginExporters(),
  });
}

export function usePluginViews() {
  return useQuery({
    queryKey: ["plugins", "views"],
    queryFn: () => api.listPluginViews(),
  });
}

export function useReloadPlugins() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.reloadPlugins(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plugins"] });
    },
  });
}

export function useRunPluginAnalyzer() {
  const projectId = useProjectStore((s) => s.activeProjectId);
  return useMutation({
    mutationFn: (pluginName: string) => {
      if (!projectId) throw new Error("No active project");
      return api.runPluginAnalyzer(projectId, pluginName);
    },
  });
}
