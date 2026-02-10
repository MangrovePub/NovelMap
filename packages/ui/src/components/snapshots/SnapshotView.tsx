import { useState } from "react";
import { useProjectStore } from "../../stores/project-store.ts";
import {
  useSnapshots,
  useCreateSnapshot,
  useRestoreSnapshot,
  useDeleteSnapshot,
  useSnapshotDiff,
} from "../../hooks/use-snapshots.ts";
import type { SnapshotSummary, SnapshotDiff } from "../../api/client.ts";

function formatDate(iso: string): string {
  const d = new Date(iso + "Z");
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DiffPanel({ diff }: { diff: SnapshotDiff }) {
  const hasEntityChanges =
    diff.entities.added.length > 0 ||
    diff.entities.removed.length > 0 ||
    diff.entities.changed.length > 0;
  const hasRelChanges = diff.relationships.added > 0 || diff.relationships.removed > 0;
  const hasAppChanges = diff.appearances.added > 0 || diff.appearances.removed > 0;
  const isEmpty = !hasEntityChanges && !hasRelChanges && !hasAppChanges;

  if (isEmpty) {
    return (
      <div className="text-sm text-[--color-text-muted] text-center py-4">
        No differences between these snapshots.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Entity changes */}
      {hasEntityChanges && (
        <div>
          <h4 className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wider mb-2">
            Entities
          </h4>
          <div className="space-y-1.5">
            {diff.entities.added.map((name) => (
              <div key={`add-${name}`} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded bg-[#45e9a0]/20 text-[#45e9a0] flex items-center justify-center text-xs font-bold">+</span>
                <span className="text-[--color-text-primary]">{name}</span>
              </div>
            ))}
            {diff.entities.removed.map((name) => (
              <div key={`rem-${name}`} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded bg-[--color-accent]/20 text-[--color-accent] flex items-center justify-center text-xs font-bold">-</span>
                <span className="text-[--color-text-primary] line-through opacity-60">{name}</span>
              </div>
            ))}
            {diff.entities.changed.map((name) => (
              <div key={`chg-${name}`} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded bg-[#e9a045]/20 text-[#e9a045] flex items-center justify-center text-xs font-bold">~</span>
                <span className="text-[--color-text-primary]">{name}</span>
                <span className="text-xs text-[--color-text-muted]">metadata changed</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relationship & appearance deltas */}
      {(hasRelChanges || hasAppChanges) && (
        <div className="flex gap-4">
          {hasRelChanges && (
            <div className="flex-1 rounded-lg bg-[--color-bg-body] p-3">
              <div className="text-xs text-[--color-text-muted] mb-1">Relationships</div>
              <div className="flex gap-3 text-sm">
                {diff.relationships.added > 0 && (
                  <span className="text-[#45e9a0]">+{diff.relationships.added}</span>
                )}
                {diff.relationships.removed > 0 && (
                  <span className="text-[--color-accent]">-{diff.relationships.removed}</span>
                )}
              </div>
            </div>
          )}
          {hasAppChanges && (
            <div className="flex-1 rounded-lg bg-[--color-bg-body] p-3">
              <div className="text-xs text-[--color-text-muted] mb-1">Appearances</div>
              <div className="flex gap-3 text-sm">
                {diff.appearances.added > 0 && (
                  <span className="text-[#45e9a0]">+{diff.appearances.added}</span>
                )}
                {diff.appearances.removed > 0 && (
                  <span className="text-[--color-accent]">-{diff.appearances.removed}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SnapshotCard({
  snapshot,
  isSelected,
  onSelect,
  onRestore,
  onDelete,
  isRestoring,
}: {
  snapshot: SnapshotSummary;
  isSelected: boolean;
  onSelect: () => void;
  onRestore: () => void;
  onDelete: () => void;
  isRestoring: boolean;
}) {
  const entityCount = snapshot.data.entities.length;
  const manuscriptCount = snapshot.data.manuscripts.length;
  const chapterCount = snapshot.data.chapters.length;
  const relCount = snapshot.data.relationships.length;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-4 transition-colors ${
        isSelected
          ? "border-[--color-accent] bg-[--color-accent]/5"
          : "border-[--color-bg-accent] bg-[--color-bg-card] hover:border-[--color-text-muted]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-[--color-text-primary]">
            {formatDate(snapshot.created_at)}
          </div>
          <div className="text-xs text-[--color-text-muted] mt-1">
            Snapshot #{snapshot.id}
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onRestore(); }}
            disabled={isRestoring}
            title="Restore this snapshot"
            className="p-1.5 rounded-lg text-[--color-text-muted] hover:text-[#45e9a0] hover:bg-[#45e9a0]/10 transition-colors disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete snapshot"
            className="p-1.5 rounded-lg text-[--color-text-muted] hover:text-[--color-accent] hover:bg-[--color-accent]/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 mt-3 text-xs text-[--color-text-secondary]">
        <span>{manuscriptCount} manuscript{manuscriptCount !== 1 ? "s" : ""}</span>
        <span>{chapterCount} chapter{chapterCount !== 1 ? "s" : ""}</span>
        <span>{entityCount} entit{entityCount !== 1 ? "ies" : "y"}</span>
        <span>{relCount} rel{relCount !== 1 ? "s" : ""}</span>
      </div>
    </button>
  );
}

export function SnapshotView() {
  const projectId = useProjectStore((s) => s.activeProjectId);
  const { data: snapshots, isLoading } = useSnapshots(projectId);
  const createSnapshot = useCreateSnapshot();
  const restoreSnapshot = useRestoreSnapshot();
  const deleteSnapshot = useDeleteSnapshot();

  const [selectedIds, setSelectedIds] = useState<[number | null, number | null]>([null, null]);
  const [confirmRestore, setConfirmRestore] = useState<number | null>(null);

  // For diff: select two snapshots
  const [diffA, diffB] = selectedIds;
  const { data: diffResult } = useSnapshotDiff(projectId, diffA, diffB);

  function handleSelect(id: number) {
    setSelectedIds(([a, _b]) => {
      if (a === null) return [id, null];
      if (a === id) return [null, null];
      return [a, id];
    });
  }

  function handleRestore(snapshotId: number) {
    if (confirmRestore === snapshotId) {
      restoreSnapshot.mutate(
        { projectId: projectId!, snapshotId },
        { onSuccess: () => setConfirmRestore(null) }
      );
    } else {
      setConfirmRestore(snapshotId);
      setTimeout(() => setConfirmRestore(null), 5000);
    }
  }

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-64 text-[--color-text-muted]">
        Select a project to manage snapshots.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-text-primary]">Snapshots</h1>
          <p className="text-sm text-[--color-text-secondary] mt-1">
            Capture, compare, and restore project state. Select two snapshots to see a diff.
          </p>
        </div>
        <button
          onClick={() => createSnapshot.mutate(projectId)}
          disabled={createSnapshot.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[--color-accent] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
          </svg>
          {createSnapshot.isPending ? "Capturing..." : "Capture Snapshot"}
        </button>
      </div>

      {isLoading ? (
        <div className="text-[--color-text-muted] text-center py-12">Loading snapshots...</div>
      ) : !snapshots?.length ? (
        <div className="rounded-xl border border-dashed border-[--color-bg-accent] bg-[--color-bg-card] p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-[--color-text-muted] mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
          </svg>
          <h3 className="text-lg font-semibold text-[--color-text-primary] mb-2">No snapshots yet</h3>
          <p className="text-sm text-[--color-text-secondary] max-w-md mx-auto">
            Click "Capture Snapshot" to save the current state of your project. You can restore any snapshot later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Snapshot list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[--color-text-secondary] uppercase tracking-wider">
                History ({snapshots.length})
              </h2>
              {(diffA || diffB) && (
                <button
                  onClick={() => setSelectedIds([null, null])}
                  className="text-xs text-[--color-text-muted] hover:text-[--color-text-primary]"
                >
                  Clear selection
                </button>
              )}
            </div>
            {snapshots.map((snap) => (
              <SnapshotCard
                key={snap.id}
                snapshot={snap}
                isSelected={snap.id === diffA || snap.id === diffB}
                onSelect={() => handleSelect(snap.id)}
                onRestore={() => handleRestore(snap.id)}
                onDelete={() =>
                  deleteSnapshot.mutate({ projectId: projectId!, snapshotId: snap.id })
                }
                isRestoring={restoreSnapshot.isPending}
              />
            ))}
          </div>

          {/* Diff panel */}
          <div>
            <h2 className="text-sm font-semibold text-[--color-text-secondary] uppercase tracking-wider mb-3">
              Comparison
            </h2>
            <div className="rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] p-5 min-h-[200px]">
              {diffA && diffB && diffResult ? (
                <>
                  <div className="flex items-center gap-2 text-xs text-[--color-text-muted] mb-4">
                    <span className="px-2 py-0.5 rounded bg-[--color-bg-accent]">#{diffA}</span>
                    <span>vs</span>
                    <span className="px-2 py-0.5 rounded bg-[--color-bg-accent]">#{diffB}</span>
                  </div>
                  <DiffPanel diff={diffResult} />
                </>
              ) : diffA && !diffB ? (
                <div className="text-sm text-[--color-text-muted] text-center py-8">
                  Select a second snapshot to compare with #{diffA}.
                </div>
              ) : (
                <div className="text-sm text-[--color-text-muted] text-center py-8">
                  Select two snapshots from the list to compare their contents.
                </div>
              )}
            </div>

            {/* Restore confirmation */}
            {confirmRestore && (
              <div className="mt-4 rounded-xl border border-[#e9a045]/30 bg-[#e9a045]/5 p-4">
                <p className="text-sm text-[#e9a045] font-medium">
                  Click restore again on snapshot #{confirmRestore} to confirm.
                </p>
                <p className="text-xs text-[--color-text-muted] mt-1">
                  This will replace all current project data with the snapshot state. Consider capturing a new snapshot first.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
