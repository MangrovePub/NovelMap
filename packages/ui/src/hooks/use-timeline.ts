import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client.ts";

export function useTimeline(projectId: number | null, params?: { entityId?: number; manuscriptId?: number }) {
  return useQuery({
    queryKey: ["timeline", projectId, params],
    queryFn: () => api.getTimeline(projectId!, params),
    enabled: projectId != null,
  });
}
