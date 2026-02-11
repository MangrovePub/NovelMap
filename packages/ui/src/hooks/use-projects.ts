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

export function useUploadCover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ manuscriptId, file }: { manuscriptId: number; file: File }) =>
      api.uploadCover(manuscriptId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manuscripts"] }),
  });
}

export function useSetCoverUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ manuscriptId, url }: { manuscriptId: number; url: string }) =>
      api.setCoverUrl(manuscriptId, url),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manuscripts"] }),
  });
}

export function useDeleteCover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (manuscriptId: number) => api.deleteCover(manuscriptId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manuscripts"] }),
  });
}

export function useReorderManuscripts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, order }: { projectId: number; order: { id: number; series_order: number }[] }) =>
      api.reorderManuscripts(projectId, order),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manuscripts"] }),
  });
}
