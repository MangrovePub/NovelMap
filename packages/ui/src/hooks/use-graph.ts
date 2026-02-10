import { useQuery } from "@tanstack/react-query";
import { api, type EntityType } from "../api/client.ts";

export function useGraph(projectId: number | null, params?: { type?: EntityType; manuscriptId?: number }) {
  return useQuery({
    queryKey: ["graph", projectId, params],
    queryFn: () => api.getGraph(projectId!, params),
    enabled: projectId != null,
  });
}
