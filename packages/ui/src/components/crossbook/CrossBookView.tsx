import { useState } from "react";
import { useProjectStore } from "../../stores/project-store.ts";
import { useCrossBookPresence, useDetectFullProject } from "../../hooks/use-entities.ts";
import { useManuscripts } from "../../hooks/use-projects.ts";
import { EntityTypeBadge } from "../shared/EntityTypeBadge.tsx";
import type { EntityType } from "../../api/client.ts";

const TYPE_COLORS: Record<EntityType, string> = {
  character: "#e94560",
  location: "#0f3460",
  organization: "#533483",
  artifact: "#e9a045",
  concept: "#45e9a0",
  event: "#4560e9",
};

export function CrossBookView() {
  const { activeProjectId } = useProjectStore();
  const { data: presence, isLoading } = useCrossBookPresence(activeProjectId);
  const { data: manuscripts } = useManuscripts(activeProjectId);
  const detectAll = useDetectFullProject();
  const [filterType, setFilterType] = useState<EntityType | "all">("all");

  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center h-64 text-[--color-text-muted]">
        Select a project to view cross-book presence.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[--color-text-muted]">
        Loading cross-book data...
      </div>
    );
  }

  const filtered = filterType === "all"
    ? presence ?? []
    : (presence ?? []).filter((e) => e.entityType === filterType);

  // Only show entities that appear in at least one manuscript
  const withPresence = filtered.filter((e) => e.manuscripts.length > 0);

  // Sort: multi-book entities first, then by name
  const sorted = [...withPresence].sort((a, b) => {
    if (b.manuscripts.length !== a.manuscripts.length)
      return b.manuscripts.length - a.manuscripts.length;
    return a.entityName.localeCompare(b.entityName);
  });

  const allManuscripts = manuscripts ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-text-primary]">
            Cross-Book Presence
          </h1>
          <p className="text-sm text-[--color-text-secondary] mt-1">
            See which entities appear across multiple books in your series.
          </p>
        </div>
        <button
          onClick={() => detectAll.mutate(activeProjectId!)}
          disabled={detectAll.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
          {detectAll.isPending ? "Scanning..." : "Re-scan All"}
        </button>
      </div>

      {/* Type filters */}
      <div className="flex gap-1">
        {(["all", "character", "location", "organization", "artifact", "concept", "event"] as const).map(
          (t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filterType === t
                  ? "bg-[--color-accent] text-white"
                  : "bg-[--color-bg-card] text-[--color-text-secondary] hover:text-[--color-text-primary] border border-[--color-bg-accent]"
              }`}
            >
              {t}
            </button>
          )
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-[--color-text-muted]">
          <p className="text-lg mb-2">No cross-book data yet</p>
          <p className="text-sm">
            Import manuscripts and run a scan to see which entities appear across your books.
          </p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Total Entities"
              value={withPresence.length}
            />
            <StatCard
              label="Multi-Book Entities"
              value={withPresence.filter((e) => e.manuscripts.length > 1).length}
              highlight
            />
            <StatCard
              label="Books"
              value={allManuscripts.length}
            />
          </div>

          {/* Presence matrix */}
          {allManuscripts.length > 0 && (
            <div className="bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[--color-bg-accent]">
                      <th className="text-left text-xs font-medium text-[--color-text-muted] uppercase tracking-wider px-4 py-3 sticky left-0 bg-[--color-bg-card] z-10">
                        Entity
                      </th>
                      {allManuscripts.map((ms) => (
                        <th
                          key={ms.id}
                          className="text-center text-xs font-medium text-[--color-text-muted] uppercase tracking-wider px-3 py-3 min-w-[120px]"
                        >
                          <span className="block truncate max-w-[120px]">
                            {ms.title}
                          </span>
                        </th>
                      ))}
                      <th className="text-center text-xs font-medium text-[--color-text-muted] uppercase tracking-wider px-3 py-3">
                        Books
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((entry) => {
                      const msIds = new Set(
                        entry.manuscripts.map((m) => m.id)
                      );
                      return (
                        <tr
                          key={entry.entityId}
                          className="border-b border-[--color-bg-accent]/50 hover:bg-[--color-bg-body]/50 transition-colors"
                        >
                          <td className="px-4 py-2.5 sticky left-0 bg-[--color-bg-card] z-10">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[--color-text-primary]">
                                {entry.entityName}
                              </span>
                              <EntityTypeBadge type={entry.entityType} />
                            </div>
                          </td>
                          {allManuscripts.map((ms) => {
                            const msEntry = entry.manuscripts.find(
                              (m) => m.id === ms.id
                            );
                            return (
                              <td
                                key={ms.id}
                                className="text-center px-3 py-2.5"
                              >
                                {msIds.has(ms.id) ? (
                                  <div className="flex items-center justify-center">
                                    <div
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                                      style={{
                                        backgroundColor:
                                          TYPE_COLORS[entry.entityType] ?? "#888",
                                      }}
                                      title={`${msEntry?.chapterCount ?? 0} chapters`}
                                    >
                                      {msEntry?.chapterCount ?? 0}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[--color-text-muted] text-xs">
                                    —
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="text-center px-3 py-2.5">
                            <span
                              className={`text-sm font-bold ${
                                entry.manuscripts.length > 1
                                  ? "text-[#45e9a0]"
                                  : "text-[--color-text-muted]"
                              }`}
                            >
                              {entry.manuscripts.length}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Multi-book highlights */}
          {sorted.filter((e) => e.manuscripts.length > 1).length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-[--color-text-primary] mb-3">
                Recurring Entities
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sorted
                  .filter((e) => e.manuscripts.length > 1)
                  .map((entry) => (
                    <div
                      key={entry.entityId}
                      className="bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-[--color-accent]">
                          {entry.entityName}
                        </h3>
                        <EntityTypeBadge type={entry.entityType} />
                      </div>
                      <div className="space-y-1">
                        {entry.manuscripts.map((ms) => (
                          <div
                            key={ms.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-[--color-text-secondary]">
                              {ms.title}
                            </span>
                            <span className="text-xs text-[--color-text-muted]">
                              {ms.chapterCount}{" "}
                              {ms.chapterCount === 1 ? "chapter" : "chapters"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl p-4 text-center">
      <div
        className={`text-3xl font-bold ${
          highlight ? "text-[#45e9a0]" : "text-[--color-text-primary]"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-[--color-text-muted] mt-1 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}
