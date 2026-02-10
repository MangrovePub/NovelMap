import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client.ts";

export function useSnapshots(projectId: number | null) {
  return useQuery({
    queryKey: ["snapshots", projectId],
    queryFn: () => api.listSnapshots(projectId!),
    enabled: projectId != null,
  });
}

export function useCreateSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: number) => api.createSnapshot(projectId),
    onSuccess: (_data, projectId) => {
      qc.invalidateQueries({ queryKey: ["snapshots", projectId] });
    },
  });
}

export function useRestoreSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, snapshotId }: { projectId: number; snapshotId: number }) =>
      api.restoreSnapshot(projectId, snapshotId),
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

export function useDeleteSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, snapshotId }: { projectId: number; snapshotId: number }) =>
      api.deleteSnapshot(projectId, snapshotId),
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["snapshots", projectId] });
    },
  });
}

export function useSnapshotDiff(projectId: number | null, sidA: number | null, sidB: number | null) {
  return useQuery({
    queryKey: ["snapshot-diff", projectId, sidA, sidB],
    queryFn: () => api.diffSnapshots(projectId!, sidA!, sidB!),
    enabled: projectId != null && sidA != null && sidB != null,
  });
}
