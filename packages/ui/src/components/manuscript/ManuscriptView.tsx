import { useParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api, type Entity } from "../../api/client.ts";
import { useProjectStore } from "../../stores/project-store.ts";
import { useEntities } from "../../hooks/use-entities.ts";
import { EmptyState } from "../shared/EmptyState.tsx";
import { ChapterPane } from "./ChapterPane.tsx";
import { useState } from "react";

export function ManuscriptView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const manuscriptId = id ? Number(id) : null;
  const projectId = useProjectStore((s) => s.activeProjectId);
  const { data: chapters, isLoading } = useQuery({
    queryKey: ["chapters", manuscriptId],
    queryFn: () => api.listChapters(manuscriptId!),
    enabled: manuscriptId != null,
  });
  const { data: entities } = useEntities(projectId);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);

  function handleEntityClick(_entity: Entity) {
    navigate("/entities");
  }

  if (!manuscriptId) {
    return (
      <EmptyState
        title="No manuscript"
        description="Select a manuscript from the bookshelf."
      />
    );
  }

  if (isLoading) {
    return <p className="text-[--color-text-muted]">Loading...</p>;
  }

  if (!chapters?.length) {
    return (
      <EmptyState
        title="No chapters"
        description="This manuscript has no chapters."
      />
    );
  }

  const active =
    chapters.find((c) => c.id === selectedChapter) ?? chapters[0];

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar */}
      <div className="w-56 shrink-0 bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl overflow-auto">
        <div className="p-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[--color-text-muted] mb-2 px-2">
            Chapters
          </h2>
          {chapters.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChapter(c.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                active.id === c.id
                  ? "bg-[--color-bg-accent] text-[--color-text-primary]"
                  : "text-[--color-text-secondary] hover:bg-[--color-bg-body] hover:text-[--color-text-primary]"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {/* Reading pane with entity highlighting */}
      <ChapterPane
        title={active.title}
        body={active.body}
        entities={entities}
        onEntityClick={handleEntityClick}
      />
    </div>
  );
}
