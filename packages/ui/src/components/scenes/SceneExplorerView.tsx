import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { studio, type StudioScene } from "../../api/client.ts";
import { useProjectStore } from "../../stores/project-store.ts";

const TIME_OPTIONS = ["", "morning", "afternoon", "evening", "night", "dawn", "dusk", "midnight"];

function SceneRow({ scene }: { scene: StudioScene }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] p-4 cursor-pointer hover:border-[--color-accent]/40 transition-colors"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap mb-1">
            <span className="font-serif text-sm font-semibold text-[--color-text-primary]">
              {scene.subheader || scene.chapter_title}
            </span>
            {scene.location && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[--color-bg-accent] text-[--color-text-muted] border border-[--color-bg-accent]">
                {scene.location}
              </span>
            )}
            {scene.time_of_day && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[--color-bg-body] text-[--color-text-muted] border border-[--color-bg-accent]">
                {scene.time_of_day}
              </span>
            )}
            {scene.is_set_piece && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-800/60 text-amber-300 border border-amber-700">
                Set piece
              </span>
            )}
          </div>
          <div className="flex gap-3 text-[10px] text-[--color-text-muted] mb-2">
            <span>{scene.book_title}</span>
            <span>Ch. {scene.chapter_index}{scene.chapter_title && ` · ${scene.chapter_title}`}</span>
            <span>{scene.word_count}w</span>
          </div>
          {!expanded && (
            <p className="text-[11px] text-[--color-text-muted] leading-relaxed line-clamp-2">
              {scene.preview}
            </p>
          )}
          {expanded && (
            <p className="text-[11px] text-[--color-text-muted] leading-relaxed">
              {scene.preview}
            </p>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-[--color-text-muted] shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
    </div>
  );
}

export function SceneExplorerView() {
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState("");
  const [page, setPage] = useState(0);
  const { activeBookId } = useProjectStore();
  const limit = 25;

  const params = {
    ...(activeBookId ? { bookId: activeBookId } : {}),
    ...(timeFilter ? { timeOfDay: timeFilter } : {}),
    ...(search ? { q: search } : {}),
    limit,
    offset: page * limit,
  };

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["studio-scenes", params],
    queryFn: () => studio.listScenes(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const scenes = (data?.scenes ?? []) as StudioScene[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  function handleSearch(val: string) {
    setSearch(val);
    setPage(0);
  }

  function handleTimeFilter(val: string) {
    setTimeFilter(val);
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[--color-text-primary]">Scene Explorer</h1>
          <p className="text-sm text-[--color-text-muted] mt-0.5">
            {total > 0 ? `${total} scenes` : isLoading ? "Loading…" : "No scenes"}
            {activeBookId ? " · filtered to active book" : " · all books"}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search scenes…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[--color-bg-card] border border-[--color-bg-accent] rounded-lg text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
          />
        </div>
        <select
          value={timeFilter}
          onChange={(e) => handleTimeFilter(e.target.value)}
          className="bg-[--color-bg-card] text-[--color-text-primary] border border-[--color-bg-accent] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
        >
          {TIME_OPTIONS.map((t) => (
            <option key={t} value={t}>{t === "" ? "Any time of day" : t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Loading / error */}
      {isLoading && (
        <div className="flex items-center justify-center h-48 text-[--color-text-muted]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[--color-accent] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading scenes…</span>
          </div>
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-[--color-accent]">Failed to load scenes.</p>
        </div>
      )}

      {/* Scenes list */}
      <div className={`flex flex-col gap-2 transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        {scenes.map((scene, i) => (
          <motion.div
            key={scene.scene_id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.01 }}
          >
            <SceneRow scene={scene} />
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm bg-[--color-bg-card] border border-[--color-bg-accent] rounded-lg text-[--color-text-secondary] hover:text-[--color-text-primary] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-[--color-text-muted]">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm bg-[--color-bg-card] border border-[--color-bg-accent] rounded-lg text-[--color-text-secondary] hover:text-[--color-text-primary] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
