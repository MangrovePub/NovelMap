import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client.ts";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
  });
}

export function useProject(id: number | null) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => api.getProject(id!),
    enabled: id != null,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; path: string }) => api.createProject(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useManuscripts(projectId: number | null) {
  return useQuery({
    queryKey: ["manuscripts", projectId],
    queryFn: () => api.listManuscripts(projectId!),
    enabled: projectId != null,
  });
}

export function useImportManuscript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, file }: { projectId: number; file: File }) =>
      api.importManuscript(projectId, file),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["manuscripts", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["entities", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["graph", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["timeline", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["fieldguide", vars.projectId] });
    },
  });
}
