import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  studio,
  type DevEditChunk,
  type DevEditDetail,
  type DevEditIssue,
} from "../../api/client.ts";
import { useProjectStore } from "../../stores/project-store.ts";

const CAT_META: Record<string, { label: string; color: string }> = {
  priority_fixes:    { label: "Priority Fixes",    color: "bg-red-800/60 text-red-300 border-red-700" },
  pacing_notes:      { label: "Pacing",            color: "bg-amber-800/60 text-amber-300 border-amber-700" },
  clarity_issues:    { label: "Clarity",           color: "bg-orange-800/60 text-orange-300 border-orange-700" },
  character_notes:   { label: "Character",         color: "bg-blue-800/60 text-blue-300 border-blue-700" },
  structure_notes:   { label: "Structure",         color: "bg-purple-800/60 text-purple-300 border-purple-700" },
  continuity_flags:  { label: "Continuity",        color: "bg-cyan-800/60 text-cyan-300 border-cyan-700" },
  ai_detection_risks:{ label: "AI Risk",           color: "bg-rose-800/60 text-rose-300 border-rose-700" },
  strengths:         { label: "Strengths",         color: "bg-emerald-800/60 text-emerald-300 border-emerald-700" },
};

function CategoryBadge({ cat }: { cat: string }) {
  const m = CAT_META[cat] ?? { label: cat, color: "bg-[--color-bg-accent] text-[--color-text-muted] border-[--color-bg-accent]" };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${m.color}`}>
      {m.label}
    </span>
  );
}

function IssueCard({ issue, cat }: { issue: DevEditIssue; cat: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="rounded-lg border border-[--color-bg-accent] bg-[--color-bg-body] p-3 cursor-pointer hover:border-[--color-accent]/30 transition-colors"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start gap-2 mb-1.5">
        <CategoryBadge cat={cat} />
        {issue.anchor_quote && (
          <span className="text-[10px] text-[--color-text-muted] italic flex-1 truncate">
            "{issue.anchor_quote.substring(0, 80)}{issue.anchor_quote.length > 80 ? "…" : ""}"
          </span>
        )}
      </div>
      <p className="text-xs text-[--color-text-secondary] leading-relaxed">
        {issue.issue}
      </p>
      {expanded && (
        <div className="mt-2 flex flex-col gap-2">
          {issue.paragraph_hint && (
            <p className="text-[11px] text-[--color-text-muted]">
              <span className="font-medium">Where:</span> {issue.paragraph_hint}
            </p>
          )}
          {issue.rewrite_a && (
            <div className="rounded border border-[--color-bg-accent] bg-[--color-bg-card] p-2">
              <div className="text-[9px] uppercase tracking-widest text-[--color-text-muted] mb-1">Rewrite A</div>
              <p className="text-[11px] text-[--color-text-secondary] leading-relaxed">{issue.rewrite_a}</p>
            </div>
          )}
          {issue.rewrite_b && (
            <div className="rounded border border-[--color-bg-accent] bg-[--color-bg-card] p-2">
              <div className="text-[9px] uppercase tracking-widest text-[--color-text-muted] mb-1">Rewrite B</div>
              <p className="text-[11px] text-[--color-text-secondary] leading-relaxed">{issue.rewrite_b}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChunkDetail({ chunkIndex, bookId }: { chunkIndex: number; bookId: string | null }) {
  const [activeCategory, setActiveCategory] = useState<string>("priority_fixes");

  const { data, isLoading } = useQuery<DevEditDetail>({
    queryKey: ["dev-edit-chunk", chunkIndex, bookId],
    queryFn: () => studio.getDevEditChunk(chunkIndex, bookId ?? undefined),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 border-2 border-[--color-accent] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  const categories = Object.entries(data.analysis).filter(([, items]) => items.length > 0);

  return (
    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-3">
      <div>
        <h2 className="font-serif text-base font-bold text-[--color-text-primary]">{data.chapter}</h2>
        <div className="flex gap-2 mt-1.5 flex-wrap">
          {categories.map(([cat, items]) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-opacity ${
                activeCategory === cat ? "opacity-100" : "opacity-50 hover:opacity-75"
              } ${CAT_META[cat]?.color ?? "bg-[--color-bg-accent] text-[--color-text-muted] border-[--color-bg-accent]"}`}
            >
              {CAT_META[cat]?.label ?? cat} ({items.length})
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto max-h-[60vh]">
        {(data.analysis[activeCategory as keyof typeof data.analysis] ?? []).map((issue, i) => (
          <IssueCard key={i} issue={issue} cat={activeCategory} />
        ))}
        {(data.analysis[activeCategory as keyof typeof data.analysis] ?? []).length === 0 && (
          <p className="text-sm text-[--color-text-muted] italic text-center py-4">No issues in this category.</p>
        )}
      </div>
    </motion.div>
  );
}

function ChunkRow({
  chunk,
  selected,
  onClick,
}: {
  chunk: DevEditChunk;
  selected: boolean;
  onClick: () => void;
}) {
  const max = Math.max(chunk.total_issues, 1);
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-3 flex flex-col gap-2 transition-colors ${
        selected
          ? "border-[--color-accent] bg-[--color-bg-accent]"
          : "border-[--color-bg-accent] bg-[--color-bg-card] hover:border-[--color-accent]/40"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-[--color-text-primary] truncate flex-1">{chunk.chapter || "(untitled)"}</span>
        <span className="text-[10px] text-[--color-text-muted] shrink-0">{chunk.total_issues} issues</span>
      </div>
      {/* Mini bar */}
      <div className="flex gap-1 h-1.5">
        {(["priority_fixes","pacing_notes","clarity_issues","character_notes","structure_notes","continuity_flags"] as const).map((cat) => {
          const count = chunk.categories[cat] ?? 0;
          if (!count) return null;
          const w = Math.max(4, Math.round((count / max) * 100));
          return (
            <div
              key={cat}
              style={{ width: `${w}%` }}
              className={`h-full rounded-full ${CAT_META[cat]?.color?.split(" ")[0] ?? "bg-[--color-accent]"}`}
              title={`${CAT_META[cat]?.label}: ${count}`}
            />
          );
        })}
      </div>
    </button>
  );
}

export function CraftStudioView() {
  const [selected, setSelected] = useState<number | null>(null);
  const { activeBookId } = useProjectStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dev-edit-summary", activeBookId],
    queryFn: () => studio.getDevEdit(activeBookId ?? undefined),
    staleTime: 60_000,
  });

  const d = data as import("../../api/client.ts").DevEditSummary | undefined;

  return (
    <div className="flex gap-6 max-w-7xl mx-auto">
      {/* Left panel */}
      <div className="flex flex-col gap-4 w-72 shrink-0">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-2xl font-bold text-[--color-text-primary]">Craft Studio</h1>
          <p className="text-sm text-[--color-text-muted] mt-0.5">
            Dev edit analysis · {d ? `${d.totals.issues} issues` : "Loading…"}
            {!activeBookId ? " · select a book" : ""}
          </p>
        </motion.div>

        {/* Totals */}
        {d && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
            className="rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] p-4 flex flex-col gap-3"
          >
            <div className="text-[10px] uppercase tracking-widest text-[--color-text-muted] font-semibold">Issue Breakdown</div>
            {Object.entries(d.totals.by_category).filter(([, v]) => v > 0).map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between">
                <CategoryBadge cat={cat} />
                <span className="text-xs font-medium text-[--color-text-secondary]">{count}</span>
              </div>
            ))}
            {d.totals.ai_risks > 0 && (
              <div className="mt-1 pt-2 border-t border-[--color-bg-accent] flex items-center justify-between">
                <span className="text-[10px] text-rose-400">AI Detection Risks</span>
                <span className="text-xs font-medium text-rose-400">{d.totals.ai_risks}</span>
              </div>
            )}
          </motion.div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-24">
            <div className="w-5 h-5 border-2 border-[--color-accent] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {isError && <p className="text-sm text-[--color-accent]">Failed to load dev edit data.</p>}

        {/* Chapter list */}
        {d && (
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-320px)]">
            {d.chunks.filter((c) => c.total_issues > 0).map((chunk, i) => (
              <motion.div
                key={chunk.chunk_index}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.015 }}
              >
                <ChunkRow
                  chunk={chunk}
                  selected={selected === chunk.chunk_index}
                  onClick={() => setSelected(selected === chunk.chunk_index ? null : chunk.chunk_index)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Right panel — issue detail */}
      <AnimatePresence>
        {selected !== null && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className="flex-1 min-w-0 rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-widest text-[--color-text-muted] font-semibold">Dev Edit Issues</span>
              <button
                onClick={() => setSelected(null)}
                className="text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ChunkDetail chunkIndex={selected} bookId={activeBookId} />
          </motion.div>
        )}
      </AnimatePresence>

      {selected === null && d && d.chunks.filter(c => c.total_issues > 0).length > 0 && (
        <div className="flex-1 flex items-center justify-center text-[--color-text-muted]">
          <p className="text-sm italic">Select a chapter to review its issues.</p>
        </div>
      )}
    </div>
  );
}
