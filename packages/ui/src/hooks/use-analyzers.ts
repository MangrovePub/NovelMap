import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client.ts";

export function useProjectGenre(projectId: number | null) {
  return useQuery({
    queryKey: ["genre", projectId],
    queryFn: () => api.getProjectGenre(projectId!),
    enabled: projectId != null,
  });
}

export function useCharacterRoles(projectId: number | null) {
  return useQuery({
    queryKey: ["roles", projectId],
    queryFn: () => api.getCharacterRoles(projectId!),
    enabled: projectId != null,
  });
}

export function useSeriesBible(projectId: number | null) {
  return useQuery({
    queryKey: ["bible", projectId],
    queryFn: () => api.getSeriesBible(projectId!),
    enabled: projectId != null,
  });
}
