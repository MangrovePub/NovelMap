import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  studio,
  type DevEditChunk,
  type DevEditDetail,
  type DevEditIssue,
  type ChunkScene,
  type DevEditResolution,
} from "../../api/client.ts";
import { useProjectStore } from "../../stores/project-store.ts";

// ── Category metadata ────────────────────────────────────────────────────────

const CAT_META: Record<string, { label: string; color: string; bar: string }> = {
  priority_fixes:    { label: "Priority Fixes", color: "bg-red-800/60 text-red-300 border-red-700",       bar: "bg-red-500" },
  pacing_notes:      { label: "Pacing",          color: "bg-amber-800/60 text-amber-300 border-amber-700", bar: "bg-amber-500" },
  clarity_issues:    { label: "Clarity",         color: "bg-orange-800/60 text-orange-300 border-orange-700", bar: "bg-orange-500" },
  character_notes:   { label: "Character",       color: "bg-blue-800/60 text-blue-300 border-blue-700",    bar: "bg-blue-500" },
  structure_notes:   { label: "Structure",       color: "bg-purple-800/60 text-purple-300 border-purple-700", bar: "bg-purple-500" },
  continuity_flags:  { label: "Continuity",      color: "bg-cyan-800/60 text-cyan-300 border-cyan-700",    bar: "bg-cyan-500" },
  ai_detection_risks:{ label: "AI Risk",         color: "bg-rose-800/60 text-rose-300 border-rose-700",    bar: "bg-rose-500" },
  strengths:         { label: "Strengths",       color: "bg-emerald-800/60 text-emerald-300 border-emerald-700", bar: "bg-emerald-500" },
};

const WORK_CATEGORIES = [
  "priority_fixes", "pacing_notes", "clarity_issues",
  "character_notes", "structure_notes", "continuity_flags", "ai_detection_risks",
] as const;

// ── Resolution types ─────────────────────────────────────────────────────────

type ResolutionStatus = "resolved" | "dismissed" | "noted";
type ResolutionKey = string; // `${category}-${issueIndex}`
interface LocalResolution {
  status: ResolutionStatus;
  customNote: string | null;
  chosenRewrite: string | null;
}

// ── Pandoc artifact cleaner ───────────────────────────────────────────────────
// Belt-and-suspenders: DB was already cleaned but new data might have these

function cleanText(text: string): string {
  return text
    .replace(/\\--/g, "\u2014")     // \-- → em dash
    .replace(/\\'/g, "\u2019")      // \' → right single quote
    .replace(/\\"/g, "\u201D")      // \" → right double quote
    .replace(/\\\*/g, "*")
    .replace(/\\_/g, "_")
    .replace(/\{[^}]*\}/g, "")      // pandoc span attrs {.underline} etc
    .replace(/\\(.)/g, "$1");       // any remaining \X → X
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resKey(cat: string, idx: number): ResolutionKey {
  return `${cat}-${idx}`;
}

function CategoryBadge({ cat }: { cat: string }) {
  const m = CAT_META[cat] ?? { label: cat, color: "bg-[--color-bg-accent] text-[--color-text-muted] border-[--color-bg-accent]" };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${m.color}`}>
      {m.label}
    </span>
  );
}

function StatusBadge({ status }: { status: ResolutionStatus }) {
  if (status === "resolved")  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-400 border border-emerald-700 font-medium">✓ Resolved</span>;
  if (status === "dismissed") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-600 font-medium">— Dismissed</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-400 border border-purple-700 font-medium">✎ Noted</span>;
}

// ── Scene text with anchor highlight ─────────────────────────────────────────

function renderWithHighlight(text: string, anchor: string | undefined): React.ReactNode {
  if (!anchor) return text;
  const idx = text.indexOf(anchor);
  if (idx === -1) return text;
  return (
    <>
      {text.substring(0, idx)}
      <mark id="craft-anchor" className="bg-amber-400/30 text-inherit rounded px-0.5 outline outline-1 outline-amber-400/50">
        {anchor}
      </mark>
      {text.substring(idx + anchor.length)}
    </>
  );
}

function SceneTextPanel({
  scenes,
  anchor,
  editMode,
  draftTexts,
  onTextChange,
}: {
  scenes: ChunkScene[];
  anchor: string | undefined;
  editMode: boolean;
  draftTexts: Record<string, string>;
  onTextChange: (sceneId: string, text: string) => void;
}) {
  useEffect(() => {
    if (!anchor || editMode) return;
    const el = document.getElementById("craft-anchor");
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }, [anchor, editMode]);

  if (!scenes.length) {
    return (
      <p className="text-sm text-[--color-text-muted] italic text-center py-12">
        No scene text found for this chapter.
        <br />
        <span className="text-[11px]">This section may be embedded within another scene.</span>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {scenes.map((scene, si) => {
        const text = cleanText(draftTexts[scene.scene_id] ?? scene.scene_text);
        const isDirty = scene.scene_id in draftTexts;

        return (
          <div key={scene.scene_id}>
            {(scene.subheader || scenes.length > 1) && (
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-[--color-bg-accent]" />
                <span className={`text-[10px] uppercase tracking-widest ${isDirty ? "text-amber-400" : "text-[--color-text-muted]"}`}>
                  {scene.subheader ?? `Scene ${si + 1}`}
                  {isDirty && " · edited"}
                </span>
                <div className="h-px flex-1 bg-[--color-bg-accent]" />
              </div>
            )}

            {editMode ? (
              <textarea
                value={draftTexts[scene.scene_id] ?? scene.scene_text}
                onChange={(e) => onTextChange(scene.scene_id, e.target.value)}
                className="w-full font-serif text-sm leading-[1.85] text-[--color-text-secondary] bg-[--color-bg-card] border border-[--color-accent]/30 rounded p-3 resize-none focus:outline-none focus:border-[--color-accent]/60 min-h-[200px]"
                style={{ height: "auto" }}
                rows={Math.max(8, (draftTexts[scene.scene_id] ?? scene.scene_text).split("\n").length + 2)}
              />
            ) : (
              <div className="text-sm leading-[1.85] text-[--color-text-secondary] font-serif">
                {text.split(/\n\n+/).map((para, pi) => (
                  <p key={pi} className="mb-4">
                    {renderWithHighlight(para, anchor)}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Issue card (interactive) ─────────────────────────────────────────────────

function IssueCard({
  issue,
  cat,
  idx,
  resolution,
  onResolve,
  isExpanded,
  onToggle,
}: {
  issue: DevEditIssue;
  cat: string;
  idx: number;
  resolution: LocalResolution | undefined;
  onResolve: (status: ResolutionStatus, note: string, rewrite: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [draft, setDraft] = useState(resolution?.customNote ?? "");

  // Reset draft when expanding a new card or when resolution changes
  useEffect(() => {
    if (isExpanded) setDraft(resolution?.customNote ?? "");
  }, [isExpanded, resolution?.customNote]);

  const isDone = resolution?.status === "resolved" || resolution?.status === "dismissed";

  return (
    <div
      className={`rounded-lg border transition-colors ${
        isDone
          ? "border-[--color-bg-accent]/50 bg-[--color-bg-body]/50 opacity-60"
          : isExpanded
          ? "border-[--color-accent]/50 bg-[--color-bg-body]"
          : "border-[--color-bg-accent] bg-[--color-bg-body] hover:border-[--color-accent]/30"
      }`}
    >
      {/* Collapsed header — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left p-3 flex flex-col gap-1.5"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryBadge cat={cat} />
          {resolution && <StatusBadge status={resolution.status} />}
          <span className="ml-auto text-[--color-text-muted] text-xs">{isExpanded ? "▲" : "▼"}</span>
        </div>
        {issue.anchor_quote && (
          <span className="text-[11px] text-[--color-text-muted] italic line-clamp-1">
            "{issue.anchor_quote.substring(0, 90)}{issue.anchor_quote.length > 90 ? "…" : ""}"
          </span>
        )}
        <p className="text-xs text-[--color-text-secondary] leading-relaxed line-clamp-2">
          {issue.issue}
        </p>
        {resolution?.customNote && (
          <p className="text-[11px] text-purple-400 italic line-clamp-1">Note: {resolution.customNote}</p>
        )}
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-3 pb-3 flex flex-col gap-3 border-t border-[--color-bg-accent] pt-3">
          {/* Full issue */}
          <p className="text-sm text-[--color-text-secondary] leading-relaxed">{issue.issue}</p>

          {/* Where */}
          {issue.paragraph_hint && (
            <p className="text-[11px] text-[--color-text-muted]">
              <span className="font-semibold text-[--color-text-secondary]">Where: </span>
              {issue.paragraph_hint}
            </p>
          )}

          {/* Anchor quote */}
          {issue.anchor_quote && (
            <blockquote className="border-l-2 border-amber-500/60 pl-3 italic text-[11px] text-[--color-text-muted]">
              "{issue.anchor_quote}"
            </blockquote>
          )}

          {/* Rewrite options */}
          {(issue.rewrite_a || issue.rewrite_b) && (
            <div className="flex flex-col gap-2">
              {issue.rewrite_a && (
                <div className="rounded border border-[--color-bg-accent] bg-[--color-bg-card] p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] uppercase tracking-widest text-[--color-text-muted] font-semibold">Rewrite A</span>
                    <button
                      onClick={() => setDraft(issue.rewrite_a!)}
                      className="text-[10px] px-2 py-0.5 rounded border border-[--color-accent]/40 text-[--color-accent] hover:bg-[--color-accent]/10 transition-colors"
                    >
                      Load →
                    </button>
                  </div>
                  <p className="text-[11px] text-[--color-text-secondary] leading-relaxed">{issue.rewrite_a}</p>
                </div>
              )}
              {issue.rewrite_b && (
                <div className="rounded border border-[--color-bg-accent] bg-[--color-bg-card] p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] uppercase tracking-widest text-[--color-text-muted] font-semibold">Rewrite B</span>
                    <button
                      onClick={() => setDraft(issue.rewrite_b!)}
                      className="text-[10px] px-2 py-0.5 rounded border border-[--color-accent]/40 text-[--color-accent] hover:bg-[--color-accent]/10 transition-colors"
                    >
                      Load →
                    </button>
                  </div>
                  <p className="text-[11px] text-[--color-text-secondary] leading-relaxed">{issue.rewrite_b}</p>
                </div>
              )}
            </div>
          )}

          {/* Custom textarea */}
          <div>
            <label className="text-[9px] uppercase tracking-widest text-[--color-text-muted] font-semibold block mb-1">
              Your response / working note
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write your own version, edit a rewrite, or leave a note…"
              rows={4}
              className="w-full rounded border border-[--color-bg-accent] bg-[--color-bg-card] text-[11px] text-[--color-text-secondary] p-2 leading-relaxed resize-y focus:outline-none focus:border-[--color-accent]/50 placeholder:text-[--color-text-muted]/50"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onResolve("dismissed", draft, "")}
              className="text-[11px] px-3 py-1.5 rounded border border-zinc-600 text-zinc-400 hover:bg-zinc-800/50 transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={() => onResolve("noted", draft, "")}
              className="text-[11px] px-3 py-1.5 rounded border border-purple-700 text-purple-400 hover:bg-purple-900/20 transition-colors"
            >
              Save Note
            </button>
            <button
              onClick={() => onResolve("resolved", draft, "")}
              className="text-[11px] px-3 py-1.5 rounded border border-emerald-700 text-emerald-400 hover:bg-emerald-900/20 transition-colors font-medium"
            >
              ✓ Mark Resolved
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Issue panel (right column) ────────────────────────────────────────────────

function IssuePanel({
  detail,
  resolutions,
  expandedIssue,
  onToggle,
  onResolve,
  onCategoryChange,
  activeCategory,
}: {
  detail: DevEditDetail;
  resolutions: Record<ResolutionKey, LocalResolution>;
  expandedIssue: { cat: string; idx: number } | null;
  onToggle: (cat: string, idx: number) => void;
  onResolve: (cat: string, idx: number, status: ResolutionStatus, note: string, rewrite: string) => void;
  onCategoryChange: (cat: string) => void;
  activeCategory: string;
}) {
  const categories = Object.entries(detail.analysis).filter(
    ([, items]) => items.length > 0
  );

  const activeIssues =
    (detail.analysis[activeCategory as keyof typeof detail.analysis] ?? []);

  const doneCount = activeIssues.filter(
    (_, i) => resolutions[resKey(activeCategory, i)]
  ).length;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map(([cat, items]) => {
          const resolved = items.filter((_, i) => resolutions[resKey(cat, i)]?.status === "resolved").length;
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-opacity ${
                activeCategory === cat ? "opacity-100" : "opacity-40 hover:opacity-70"
              } ${CAT_META[cat]?.color ?? "bg-[--color-bg-accent] text-[--color-text-muted] border-[--color-bg-accent]"}`}
            >
              {CAT_META[cat]?.label ?? cat} ({resolved}/{items.length})
            </button>
          );
        })}
      </div>

      {/* Show resolved toggle (future) + progress */}
      <div className="text-[10px] text-[--color-text-muted]">
        {doneCount} of {activeIssues.length} actioned
        {doneCount === activeIssues.length && activeIssues.length > 0 && (
          <span className="ml-2 text-emerald-400">✓ All done</span>
        )}
      </div>

      {/* Issue list */}
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
        {activeIssues.map((issue, i) => (
          <IssueCard
            key={i}
            issue={issue}
            cat={activeCategory}
            idx={i}
            resolution={resolutions[resKey(activeCategory, i)]}
            isExpanded={expandedIssue?.cat === activeCategory && expandedIssue?.idx === i}
            onToggle={() => onToggle(activeCategory, i)}
            onResolve={(status, note, rewrite) => onResolve(activeCategory, i, status, note, rewrite)}
          />
        ))}
        {activeIssues.length === 0 && (
          <p className="text-sm text-[--color-text-muted] italic text-center py-6">
            No issues in this category.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Chapter row (left panel) ──────────────────────────────────────────────────

function ChunkRow({
  chunk,
  selected,
  onClick,
}: {
  chunk: DevEditChunk;
  selected: boolean;
  onClick: () => void;
}) {
  const remaining = chunk.total_issues - (chunk.resolved_count ?? 0);
  const pct = chunk.total_issues > 0
    ? Math.round(((chunk.resolved_count ?? 0) / chunk.total_issues) * 100)
    : 0;

  return (
    <button
      onClick={onClick}
      className={`text-left rounded-lg border p-2.5 flex flex-col gap-1.5 transition-colors w-full ${
        selected
          ? "border-[--color-accent] bg-[--color-bg-accent]"
          : "border-[--color-bg-accent] bg-[--color-bg-card] hover:border-[--color-accent]/40"
      }`}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-xs font-medium text-[--color-text-primary] truncate flex-1">
          {chunk.chapter || "(untitled)"}
        </span>
        <span className="text-[10px] text-[--color-text-muted] shrink-0">{remaining} left</span>
      </div>
      {/* Progress bar */}
      <div className="h-1 rounded-full bg-[--color-bg-accent] overflow-hidden">
        <div
          className="h-full bg-emerald-600/70 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Category mini-bars */}
      <div className="flex gap-0.5 h-1">
        {(["priority_fixes", "pacing_notes", "clarity_issues", "character_notes", "structure_notes", "continuity_flags"] as const).map((cat) => {
          const count = chunk.categories[cat] ?? 0;
          if (!count) return null;
          const w = Math.max(4, Math.round((count / Math.max(chunk.total_issues, 1)) * 100));
          return (
            <div
              key={cat}
              style={{ width: `${w}%` }}
              className={`h-full rounded-full ${CAT_META[cat]?.bar ?? "bg-[--color-accent]"}`}
              title={`${CAT_META[cat]?.label}: ${count}`}
            />
          );
        })}
      </div>
    </button>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function CraftStudioView() {
  const [selectedChunk, setSelectedChunk] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("priority_fixes");
  const [expandedIssue, setExpandedIssue] = useState<{ cat: string; idx: number } | null>(null);
  const [resolutions, setResolutions] = useState<Record<ResolutionKey, LocalResolution>>({});
  const [editMode, setEditMode] = useState(false);
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>({});
  const [saveConfirm, setSaveConfirm] = useState(false);

  const { activeBookId } = useProjectStore();
  const queryClient = useQueryClient();

  // Summary (left panel)
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dev-edit-summary", activeBookId],
    queryFn: () => studio.getDevEdit(activeBookId ?? undefined),
    staleTime: 30_000,
  });
  const summary = data as import("../../api/client.ts").DevEditSummary | undefined;

  // Detail (issues)
  const { data: detail } = useQuery({
    queryKey: ["dev-edit-chunk", selectedChunk, activeBookId],
    queryFn: () => studio.getDevEditChunk(selectedChunk!, activeBookId ?? undefined),
    staleTime: 60_000,
    enabled: selectedChunk !== null,
  });

  // Scene text
  const { data: scenesData, isLoading: scenesLoading } = useQuery({
    queryKey: ["dev-edit-scenes", selectedChunk, activeBookId],
    queryFn: () => studio.getDevEditScenes(selectedChunk!, activeBookId ?? undefined),
    staleTime: 300_000,
    enabled: selectedChunk !== null,
  });

  // Resolutions from server
  const { data: resolutionsData } = useQuery({
    queryKey: ["dev-edit-resolutions", selectedChunk, activeBookId],
    queryFn: () => studio.getDevEditResolutions(selectedChunk!, activeBookId ?? undefined),
    staleTime: 30_000,
    enabled: selectedChunk !== null,
  });

  // Sync server resolutions into local state
  useEffect(() => {
    if (!resolutionsData?.resolutions) return;
    const map: Record<ResolutionKey, LocalResolution> = {};
    for (const r of resolutionsData.resolutions) {
      map[resKey(r.category, r.issue_index)] = {
        status: r.status,
        customNote: r.custom_note,
        chosenRewrite: r.chosen_rewrite,
      };
    }
    setResolutions(map);
  }, [resolutionsData]);

  // Reset issue + edit state when chunk changes
  useEffect(() => {
    setExpandedIssue(null);
    setResolutions({});
    setEditMode(false);
    setDraftTexts({});
    setSaveConfirm(false);
    // Pick the first non-empty category as default
    if (detail) {
      const first = Object.entries(detail.analysis).find(([, items]) => items.length > 0)?.[0];
      if (first) setActiveCategory(first);
    }
  }, [selectedChunk]);

  useEffect(() => {
    if (!detail) return;
    const first = Object.entries(detail.analysis).find(([, items]) => items.length > 0)?.[0];
    if (first && !detail.analysis[activeCategory as keyof typeof detail.analysis]?.length) {
      setActiveCategory(first);
    }
  }, [detail]);

  // Scene save mutation
  const saveMutation = useMutation({
    mutationFn: async (scenes: { sceneId: string; text: string }[]) => {
      for (const { sceneId, text } of scenes) {
        await studio.updateScene(sceneId, { scene_text: text });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dev-edit-scenes", selectedChunk, activeBookId] });
      setDraftTexts({});
      setEditMode(false);
      setSaveConfirm(false);
    },
  });

  const dirtyScenes = Object.entries(draftTexts);

  const handleSaveConfirm = () => {
    saveMutation.mutate(dirtyScenes.map(([sceneId, text]) => ({ sceneId, text })));
  };

  const handleDiscardEdits = () => {
    setDraftTexts({});
    setEditMode(false);
  };

  // Persist mutation
  const resolveMutation = useMutation({
    mutationFn: studio.resolveDevEditIssue,
    onSuccess: () => {
      // Refresh summary to update resolved counts in chapter list
      queryClient.invalidateQueries({ queryKey: ["dev-edit-summary", activeBookId] });
    },
  });

  const handleToggle = useCallback((cat: string, idx: number) => {
    setExpandedIssue((prev) =>
      prev?.cat === cat && prev?.idx === idx ? null : { cat, idx }
    );
  }, []);

  const handleResolve = useCallback(
    (cat: string, idx: number, status: ResolutionStatus, note: string) => {
      const key = resKey(cat, idx);
      // Optimistic local update
      setResolutions((prev) => ({
        ...prev,
        [key]: { status, customNote: note || null, chosenRewrite: null },
      }));
      // Collapse after action
      setExpandedIssue(null);
      // Persist
      resolveMutation.mutate({
        bookId: activeBookId ?? undefined,
        chunkIndex: selectedChunk!,
        category: cat,
        issueIndex: idx,
        status,
        customNote: note || undefined,
      });
    },
    [activeBookId, selectedChunk, resolveMutation]
  );

  const anchor =
    expandedIssue && detail
      ? (detail.analysis[expandedIssue.cat as keyof typeof detail.analysis]?.[expandedIssue.idx]?.anchor_quote)
      : undefined;

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 max-w-[1600px] mx-auto overflow-hidden">

      {/* ── Left: Chapter list ──────────────────────────────────────────── */}
      <div className="w-56 shrink-0 flex flex-col gap-3 pr-3 border-r border-[--color-bg-accent] overflow-y-auto">
        <div>
          <h1 className="font-serif text-xl font-bold text-[--color-text-primary]">Craft Studio</h1>
          <p className="text-[11px] text-[--color-text-muted] mt-0.5">
            {summary
              ? `${summary.totals.resolved ?? 0}/${summary.totals.issues} resolved`
              : "Loading…"}
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-16">
            <div className="w-4 h-4 border-2 border-[--color-accent] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {isError && <p className="text-xs text-[--color-accent]">Failed to load.</p>}

        {summary?.chunks
          .filter((c) => c.total_issues > 0)
          .map((chunk) => (
            <ChunkRow
              key={chunk.chunk_index}
              chunk={chunk}
              selected={selectedChunk === chunk.chunk_index}
              onClick={() => setSelectedChunk(
                selectedChunk === chunk.chunk_index ? null : chunk.chunk_index
              )}
            />
          ))}
      </div>

      {/* ── Center: Scene text ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedChunk !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 min-w-0 px-8 overflow-y-auto border-r border-[--color-bg-accent]"
          >
            {detail && (
              <div className="sticky top-0 bg-[--color-bg-body] pb-3 pt-1 mb-4 border-b border-[--color-bg-accent] z-10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-[--color-text-primary]">{detail.chapter}</h2>
                    <p className="text-[11px] text-[--color-text-muted]">
                      {detail.total_issues} issues · {scenesData?.scenes.length ?? 0} scenes
                      {expandedIssue && anchor && !editMode && (
                        <span className="ml-2 text-amber-400">· quote highlighted below</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {editMode ? (
                      <>
                        <button
                          onClick={handleDiscardEdits}
                          className="text-[11px] px-3 py-1.5 rounded border border-zinc-600 text-zinc-400 hover:bg-zinc-800/50 transition-colors"
                        >
                          Discard
                        </button>
                        {dirtyScenes.length > 0 && (
                          <button
                            onClick={() => setSaveConfirm(true)}
                            className="text-[11px] px-3 py-1.5 rounded border border-emerald-700 text-emerald-400 hover:bg-emerald-900/20 transition-colors font-medium"
                          >
                            Save {dirtyScenes.length} change{dirtyScenes.length !== 1 ? "s" : ""}…
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => { setEditMode(true); setExpandedIssue(null); }}
                        className="text-[11px] px-3 py-1.5 rounded border border-[--color-bg-accent] text-[--color-text-muted] hover:border-[--color-accent]/40 hover:text-[--color-text-primary] transition-colors"
                      >
                        ✎ Edit
                      </button>
                    )}
                  </div>
                </div>
                {editMode && (
                  <p className="text-[10px] text-amber-400/70 mt-1">
                    Editing mode — changes are local until you save to database
                  </p>
                )}
              </div>
            )}

            {scenesLoading && (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-[--color-accent] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {scenesData && (
              <SceneTextPanel
                scenes={scenesData.scenes}
                anchor={anchor}
                editMode={editMode}
                draftTexts={draftTexts}
                onTextChange={(sceneId, text) => setDraftTexts((prev) => ({ ...prev, [sceneId]: text }))}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Placeholder when nothing selected ───────────────────────────── */}
      {selectedChunk === null && summary && (
        <div className="flex-1 flex items-center justify-center text-[--color-text-muted]">
          <p className="text-sm italic">Select a chapter to begin editing.</p>
        </div>
      )}

      {/* ── Right: Issue panel ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedChunk !== null && detail && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className="w-[400px] shrink-0 pl-4 flex flex-col gap-2 overflow-hidden"
          >
            <IssuePanel
              detail={detail}
              resolutions={resolutions}
              expandedIssue={expandedIssue}
              onToggle={handleToggle}
              onResolve={handleResolve}
              onCategoryChange={(cat) => {
                setActiveCategory(cat);
                setExpandedIssue(null);
              }}
              activeCategory={activeCategory}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Save confirmation modal ──────────────────────────────────────── */}
      {saveConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[--color-bg-card] rounded-xl border border-[--color-bg-accent] p-6 max-w-sm mx-4 shadow-xl"
          >
            <h3 className="font-serif text-base font-bold text-[--color-text-primary] mb-1">
              Save changes to database?
            </h3>
            <p className="text-sm text-[--color-text-muted] mb-5">
              This will update {dirtyScenes.length} scene{dirtyScenes.length !== 1 ? "s" : ""} for <span className="text-[--color-text-secondary] font-medium">{detail?.chapter}</span> in the database.
              This action can be undone by editing again.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSaveConfirm(false)}
                className="text-sm px-4 py-2 rounded border border-[--color-bg-accent] text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfirm}
                disabled={saveMutation.isPending}
                className="text-sm px-4 py-2 rounded border border-emerald-700 text-emerald-400 hover:bg-emerald-900/20 transition-colors font-medium disabled:opacity-50"
              >
                {saveMutation.isPending ? "Saving…" : "Save to Database"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
