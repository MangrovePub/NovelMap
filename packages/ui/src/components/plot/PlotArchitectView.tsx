import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { studio, type StudioChapter } from "../../api/client.ts";
import { useProjectStore } from "../../stores/project-store.ts";

const SECTION_COLORS: Record<string, string> = {
  front_matter: "bg-[--color-text-muted]/40",
  chapter:      "bg-[--color-accent]",
  back_matter:  "bg-[--color-text-muted]/30",
  epilogue:     "bg-emerald-600/60",
  prologue:     "bg-blue-600/60",
};

function sectionColor(c: StudioChapter) {
  if (c.is_prologue) return SECTION_COLORS.prologue;
  if (c.is_epilogue) return SECTION_COLORS.epilogue;
  return SECTION_COLORS[c.section_type] ?? SECTION_COLORS.chapter;
}

function sectionLabel(c: StudioChapter) {
  if (c.is_prologue) return "Prologue";
  if (c.is_epilogue) return "Epilogue";
  if (c.section_type === "front_matter") return "Front";
  if (c.section_type === "back_matter") return "Back";
  if (c.chapter_number != null) return `Ch. ${c.chapter_number}`;
  return `#${c.chapter_index}`;
}

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function ChapterBar({
  chapter,
  maxWords,
  selected,
  onClick,
}: {
  chapter: StudioChapter;
  maxWords: number;
  selected: boolean;
  onClick: () => void;
}) {
  const pct = maxWords > 0 ? Math.max(4, Math.round((chapter.word_count / maxWords) * 100)) : 4;
  const color = sectionColor(chapter);

  return (
    <button
      onClick={onClick}
      title={`${chapter.title || sectionLabel(chapter)} — ${fmt(chapter.word_count)}w, ${chapter.scene_count} scenes`}
      className={`group flex flex-col items-center gap-1 transition-opacity ${selected ? "opacity-100" : "hover:opacity-80"}`}
    >
      <div className="flex flex-col justify-end h-24 w-5">
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`w-full rounded-t-sm ${color} ${selected ? "ring-2 ring-[--color-accent] ring-offset-1 ring-offset-[--color-bg-body]" : ""}`}
        />
      </div>
      <span className="text-[9px] text-[--color-text-muted] rotate-[-60deg] origin-top-left w-12 truncate">
        {chapter.title || sectionLabel(chapter)}
      </span>
    </button>
  );
}

function ChapterDetail({ chapter }: { chapter: StudioChapter }) {
  return (
    <motion.div
      key={chapter.chapter_id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[--color-accent]/40 bg-[--color-bg-card] p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-base font-bold text-[--color-text-primary]">
            {chapter.title || sectionLabel(chapter)}
          </h3>
          <p className="text-xs text-[--color-text-muted] mt-0.5">
            {sectionLabel(chapter)} · Index {chapter.chapter_index}
          </p>
        </div>
        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium bg-[--color-bg-accent] text-[--color-text-muted] border-[--color-bg-accent]`}>
          {chapter.section_type}
        </span>
      </div>
      <div className="flex gap-6 text-sm">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-[--color-text-muted]">Words</span>
          <span className="font-serif text-lg font-bold text-[--color-accent]">{fmt(chapter.word_count)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-[--color-text-muted]">Scenes</span>
          <span className="font-serif text-lg font-bold text-[--color-accent]">{chapter.scene_count}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-[--color-text-muted]">Avg/Scene</span>
          <span className="font-serif text-lg font-bold text-[--color-accent]">
            {chapter.scene_count > 0 ? fmt(Math.round(chapter.word_count / chapter.scene_count)) : "—"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function PlotArchitectView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { activeBookId } = useProjectStore();

  const { data: chapters, isLoading, isError } = useQuery<StudioChapter[]>({
    queryKey: ["studio-chapters", activeBookId],
    queryFn: () => activeBookId ? studio.listChapters(activeBookId) : Promise.resolve([]),
    staleTime: 60_000,
    enabled: !!activeBookId,
  });

  const selected = chapters?.find((c) => c.chapter_id === selectedId) ?? null;
  const maxWords = Math.max(...(chapters ?? []).map((c) => c.word_count), 1);
  const totalWords = (chapters ?? []).reduce((s, c) => s + c.word_count, 0);
  const chapterOnly = (chapters ?? []).filter((c) => c.section_type === "chapter");

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[--color-text-primary]">Plot Architect</h1>
          <p className="text-sm text-[--color-text-muted] mt-0.5">
            {activeBookId
              ? chapters
                ? `${chapters.length} chapters · ${fmt(totalWords)} words`
                : "Loading…"
              : "Select a book from the dropdown"}
          </p>
        </div>
      </motion.div>

      {!activeBookId && (
        <div className="flex items-center justify-center h-48 text-[--color-text-muted]">
          <p className="text-sm italic">Select a book in the top bar to view its structure.</p>
        </div>
      )}

      {isLoading && activeBookId && (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-[--color-accent] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-[--color-accent]">Failed to load chapters.</p>
        </div>
      )}

      {chapters && chapters.length > 0 && (
        <>
          {/* Stats bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
            className="flex flex-wrap gap-6 px-5 py-3 rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] text-sm"
          >
            {[
              { label: "Chapters", value: chapterOnly.length },
              { label: "Total Chapters", value: chapters.length },
              { label: "Total Words", value: fmt(totalWords) },
              { label: "Avg Chapter", value: chapterOnly.length > 0 ? fmt(Math.round(chapterOnly.reduce((s,c) => s + c.word_count, 0) / chapterOnly.length)) : "—" },
              { label: "Total Scenes", value: chapters.reduce((s, c) => s + c.scene_count, 0) },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-[--color-text-muted]">{label}</span>
                <span className="font-serif text-lg font-bold text-[--color-accent]">{value}</span>
              </div>
            ))}
          </motion.div>

          {/* Chapter bar chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] p-5"
          >
            <div className="text-[10px] uppercase tracking-widest text-[--color-text-muted] font-semibold mb-4">
              Chapter Structure — word count by chapter (click to inspect)
            </div>
            <div className="flex gap-1 items-end overflow-x-auto pb-8">
              {chapters.map((c, i) => (
                <motion.div
                  key={c.chapter_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.005 }}
                >
                  <ChapterBar
                    chapter={c}
                    maxWords={maxWords}
                    selected={selectedId === c.chapter_id}
                    onClick={() => setSelectedId(selectedId === c.chapter_id ? null : c.chapter_id)}
                  />
                </motion.div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-2">
              {[
                { label: "Chapter", color: "bg-[--color-accent]" },
                { label: "Prologue", color: "bg-blue-600/60" },
                { label: "Epilogue", color: "bg-emerald-600/60" },
                { label: "Front/Back Matter", color: "bg-[--color-text-muted]/40" },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm ${color}`} />
                  <span className="text-[10px] text-[--color-text-muted]">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Selected chapter detail */}
          {selected && <ChapterDetail chapter={selected} />}
        </>
      )}
    </div>
  );
}
