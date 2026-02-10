import { useProjectStore } from "../../stores/project-store.ts";
import { useTimeline } from "../../hooks/use-timeline.ts";
import { EntityTypeBadge } from "../shared/EntityTypeBadge.tsx";
import { EmptyState } from "../shared/EmptyState.tsx";
import type { EntityType } from "../../api/client.ts";

const TYPE_COLORS: Record<EntityType, { bg: string; border: string }> = {
  character: { bg: "rgba(233,69,96,0.2)", border: "#e94560" },
  location: { bg: "rgba(15,52,96,0.4)", border: "#0f3460" },
  organization: { bg: "rgba(83,52,131,0.3)", border: "#533483" },
  artifact: { bg: "rgba(233,160,69,0.2)", border: "#e9a045" },
  concept: { bg: "rgba(69,233,160,0.2)", border: "#45e9a0" },
  event: { bg: "rgba(69,96,233,0.2)", border: "#4560e9" },
};

export function TimelineView() {
  const { activeProjectId } = useProjectStore();
  const { data: entries, isLoading } = useTimeline(activeProjectId);

  if (!activeProjectId) {
    return (
      <EmptyState
        title="No project selected"
        description="Select a project from the top bar to view the timeline."
      />
    );
  }

  // Group by manuscript then chapter
  const grouped = new Map<string, Map<string, typeof entries>>();
  for (const e of entries ?? []) {
    if (!grouped.has(e.manuscript_title))
      grouped.set(e.manuscript_title, new Map());
    const chapters = grouped.get(e.manuscript_title)!;
    if (!chapters.has(e.chapter_title)) chapters.set(e.chapter_title, []);
    chapters.get(e.chapter_title)!.push(e);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[--color-text-primary] mb-6">
        Timeline
      </h1>

      {isLoading ? (
        <p className="text-[--color-text-muted]">Loading...</p>
      ) : !entries?.length ? (
        <EmptyState
          title="No appearances yet"
          description="Create entity appearances to see them on the timeline."
        />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped).map(([manuscript, chapters]) => (
            <div key={manuscript}>
              <h2 className="text-lg font-semibold text-[--color-accent] mb-3">
                {manuscript}
              </h2>
              <div className="space-y-1">
                {Array.from(chapters).map(([chapter, chapterEntries]) => (
                  <div
                    key={chapter}
                    className="flex items-start gap-4 py-2 border-b border-[--color-bg-card]"
                  >
                    <span className="text-sm text-[--color-link] min-w-[140px] shrink-0">
                      {chapter}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {chapterEntries!.map((e, i) => {
                        const colors =
                          TYPE_COLORS[e.entity_type as EntityType] ?? {
                            bg: "rgba(128,128,128,0.2)",
                            border: "#888",
                          };
                        return (
                          <span
                            key={i}
                            className="inline-block px-2.5 py-0.5 rounded-full text-xs text-[--color-text-primary]"
                            style={{
                              background: colors.bg,
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            {e.entity_name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
