import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type EntityType } from "../api/client.ts";

export function useEntities(projectId: number | null, params?: { type?: EntityType; search?: string }) {
  return useQuery({
    queryKey: ["entities", projectId, params],
    queryFn: () => api.listEntities(projectId!, params),
    enabled: projectId != null,
  });
}

export function useCreateEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: { projectId: number; name: string; type: EntityType; metadata?: Record<string, unknown> }) =>
      api.createEntity(projectId, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["entities", vars.projectId] });
    },
  });
}

export function useDeleteEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteEntity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}

export function useFieldGuide(projectId: number | null) {
  return useQuery({
    queryKey: ["fieldguide", projectId],
    queryFn: () => api.getFieldGuide(projectId!),
    enabled: projectId != null,
  });
}

export function useUpdateEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; type?: EntityType; metadata?: Record<string, unknown> }) =>
      api.updateEntity(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entities"] });
      qc.invalidateQueries({ queryKey: ["fieldguide"] });
      qc.invalidateQueries({ queryKey: ["dossier"] });
    },
  });
}

export function useDossier(entityId: number | null) {
  return useQuery({
    queryKey: ["dossier", entityId],
    queryFn: () => api.getDossier(entityId!),
    enabled: entityId != null,
  });
}

export function useDetectFullProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: number) => api.detectFullProject(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entities"] });
      qc.invalidateQueries({ queryKey: ["fieldguide"] });
      qc.invalidateQueries({ queryKey: ["crossbook"] });
    },
  });
}

export function useExtractEntities() {
  return useMutation({
    mutationFn: ({ projectId, manuscriptId }: { projectId: number; manuscriptId?: number }) =>
      manuscriptId
        ? api.extractManuscript(projectId, manuscriptId)
        : api.extractProject(projectId),
  });
}

export function useConfirmExtraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, candidates }: {
      projectId: number;
      candidates: { text: string; type: EntityType; metadata?: Record<string, unknown> }[];
    }) => api.confirmExtraction(projectId, candidates),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["entities", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["fieldguide", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["crossbook", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["graph", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["timeline", vars.projectId] });
    },
  });
}

export function useCrossBookPresence(projectId: number | null) {
  return useQuery({
    queryKey: ["crossbook", projectId],
    queryFn: () => api.getCrossBookPresence(projectId!),
    enabled: projectId != null,
  });
}
