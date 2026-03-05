import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  studio,
  type StoryboardData,
  type StudioArc,
  type StoryboardScene,
  type StoryboardChapter,
} from "../../api/client.ts";
import { useProjectStore } from "../../stores/project-store.ts";

// ── Color palette (assigned by arc index) ─────────────────────────────────────
const PALETTE = [
  { card: "bg-blue-800/70 border-blue-600",    label: "bg-blue-900/80 text-blue-200",    dot: "bg-blue-400"    },
  { card: "bg-amber-800/70 border-amber-600",   label: "bg-amber-900/80 text-amber-200",   dot: "bg-amber-400"   },
  { card: "bg-emerald-800/70 border-emerald-600", label: "bg-emerald-900/80 text-emerald-200", dot: "bg-emerald-400" },
  { card: "bg-red-800/70 border-red-600",       label: "bg-red-900/80 text-red-200",       dot: "bg-red-400"     },
  { card: "bg-purple-800/70 border-purple-600", label: "bg-purple-900/80 text-purple-200", dot: "bg-purple-400"  },
  { card: "bg-teal-800/70 border-teal-600",     label: "bg-teal-900/80 text-teal-200",     dot: "bg-teal-400"    },
  { card: "bg-pink-800/70 border-pink-600",     label: "bg-pink-900/80 text-pink-200",     dot: "bg-pink-400"    },
  { card: "bg-indigo-800/70 border-indigo-600", label: "bg-indigo-900/80 text-indigo-200", dot: "bg-indigo-400"  },
];
function palette(i: number) { return PALETTE[i % PALETTE.length]; }

// ── Chapter label ─────────────────────────────────────────────────────────────
function chapterLabel(ch: StoryboardChapter): string {
  if (ch.is_prologue) return "Prologue";
  if (ch.is_epilogue) return "Epilogue";
  if (ch.section_type === "front_matter") return "Front";
  if (ch.section_type === "back_matter")  return "Back";
  if (ch.chapter_number != null) return `Ch ${ch.chapter_number}`;
  return `#${ch.chapter_index}`;
}

// ── Scene card ────────────────────────────────────────────────────────────────
function SceneCard({
  scene,
  colorClass,
  selected,
  onClick,
}: {
  scene: StoryboardScene;
  colorClass: string;
  selected: boolean;
  onClick: () => void;
}) {
  const label = scene.subheader?.trim() || `Scene ${scene.seq_in_chapter}`;
  return (
    <button
      onClick={onClick}
      title={`${label} · ${scene.word_count}w${scene.location ? " · " + scene.location : ""}`}
      className={`w-full text-left px-2 py-1.5 rounded border text-[10px] leading-snug transition-all
        ${colorClass}
        ${selected ? "ring-2 ring-white/60 ring-offset-1 ring-offset-[--color-bg-body]" : "hover:brightness-110"}`}
    >
      <div className="font-medium truncate">{label}</div>
      <div className="text-[9px] opacity-60 mt-0.5">{scene.word_count}w</div>
    </button>
  );
}

// ── Scene detail / arc assignment panel ──────────────────────────────────────
function ScenePanel({
  scene,
  arcs,
  arcColorMap,
  bookId,
  onClose,
}: {
  scene: StoryboardScene;
  arcs: StudioArc[];
  arcColorMap: Map<string, { dot: string }>;
  bookId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const assign = useMutation({
    mutationFn: ({ arcId }: { arcId: string }) => studio.assignSceneToArc(scene.scene_id, arcId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storyboard", bookId] }),
  });
  const unassign = useMutation({
    mutationFn: ({ arcId }: { arcId: string }) => studio.removeSceneFromArc(scene.scene_id, arcId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storyboard", bookId] }),
  });

  const toggle = (arcId: string, assigned: boolean) => {
    if (assigned) unassign.mutate({ arcId });
    else assign.mutate({ arcId });
  };

  const label = scene.subheader?.trim() || `Scene ${scene.seq_in_chapter}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="w-72 shrink-0 rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] p-4 flex flex-col gap-4 self-start sticky top-0"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-serif text-sm font-bold text-[--color-text-primary] leading-snug">{label}</div>
          <div className="text-[11px] text-[--color-text-muted] mt-0.5">{scene.word_count}w{scene.location ? ` · ${scene.location}` : ""}</div>
        </div>
        <button onClick={onClose} className="text-[--color-text-muted] hover:text-[--color-text-primary] shrink-0 mt-0.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-[--color-text-muted] font-semibold mb-2">Arc Assignments</div>
        {arcs.length === 0 ? (
          <p className="text-[11px] text-[--color-text-muted] italic">No arcs defined yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {arcs.map((arc) => {
              const assigned = scene.arc_ids.includes(arc.arc_id);
              const col = arcColorMap.get(arc.arc_id);
              return (
                <label key={arc.arc_id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={assigned}
                    onChange={() => toggle(arc.arc_id, assigned)}
                    className="accent-[--color-accent] w-3.5 h-3.5"
                  />
                  {col && <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.dot}`} />}
                  <span className="text-[11px] text-[--color-text-secondary] group-hover:text-[--color-text-primary] transition-colors leading-none">
                    {arc.arc_name}
                    <span className="ml-1 text-[--color-text-muted] text-[9px]">({arc.arc_type})</span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── New Arc modal ─────────────────────────────────────────────────────────────
function NewArcModal({
  bookId,
  onClose,
}: {
  bookId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"main" | "subplot">("subplot");
  const [desc, setDesc] = useState("");
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: () => studio.createArc(bookId, { arc_name: name.trim(), arc_type: type, description: desc.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["storyboard", bookId] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-96 rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] p-6 flex flex-col gap-4"
      >
        <h2 className="font-serif text-base font-bold text-[--color-text-primary]">New Arc / Subplot</h2>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[--color-text-muted] font-semibold block mb-1">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Knox / Liu Wei main plot"
              className="w-full px-3 py-2 bg-[--color-bg-body] border border-[--color-bg-accent] rounded-lg text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-[--color-text-muted] font-semibold block mb-1">Type</label>
            <div className="flex gap-3">
              {(["main", "subplot"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={type === t} onChange={() => setType(t)} className="accent-[--color-accent]" />
                  <span className="text-sm text-[--color-text-secondary] capitalize">{t}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-[--color-text-muted] font-semibold block mb-1">Description <span className="normal-case font-normal">(optional)</span></label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-[--color-bg-body] border border-[--color-bg-accent] rounded-lg text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-accent] resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors">Cancel</button>
          <button
            onClick={() => create.mutate()}
            disabled={!name.trim() || create.isPending}
            className="px-4 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {create.isPending ? "Creating…" : "Create Arc"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Arc row header (with edit/delete) ─────────────────────────────────────────
function ArcRowHeader({
  arc,
  colors,
  bookId,
}: {
  arc: StudioArc;
  colors: { card: string; dot: string };
  bookId: string;
}) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => studio.deleteArc(arc.arc_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storyboard", bookId] }),
  });

  return (
    <td className="sticky left-0 z-10 bg-[--color-bg-card] border-r border-b border-[--color-bg-accent] px-3 py-2 min-w-[180px] max-w-[180px]">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[--color-text-primary] truncate">{arc.arc_name}</div>
          <div className="text-[9px] text-[--color-text-muted] capitalize">{arc.arc_type}</div>
        </div>
        <button
          onClick={() => { if (confirm(`Delete arc "${arc.arc_name}"?`)) del.mutate(); }}
          className="text-[--color-text-muted] hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
          title="Delete arc"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </td>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export function PlotArchitectView() {
  const { activeBookId } = useProjectStore();
  const [showNewArc, setShowNewArc] = useState(false);
  const [selectedScene, setSelectedScene] = useState<{ scene: StoryboardScene; chapterId: string } | null>(null);

  const { data, isLoading, isError } = useQuery<StoryboardData>({
    queryKey: ["storyboard", activeBookId],
    queryFn: () => studio.getStoryboard(activeBookId!),
    staleTime: 30_000,
    enabled: !!activeBookId,
  });

  // Build arc→color map
  const arcColorMap = new Map<string, typeof PALETTE[0]>();
  (data?.arcs ?? []).forEach((arc, i) => arcColorMap.set(arc.arc_id, palette(i)));

  const totalScenes = data?.chapters.reduce((s, c) => s + c.scenes.length, 0) ?? 0;
  const totalWords  = data?.chapters.reduce((s, c) => s + c.scenes.reduce((ss, sc) => ss + sc.word_count, 0), 0) ?? 0;

  // Filter to chapters with actual content (scenes), optionally show empty
  const chapters = data?.chapters ?? [];

  // Compute unassigned scenes
  const unassignedByChapter = new Map<string, StoryboardScene[]>();
  for (const ch of chapters) {
    const unassigned = ch.scenes.filter((s) => s.arc_ids.length === 0);
    if (unassigned.length > 0) unassignedByChapter.set(ch.chapter_id, unassigned);
  }
  const hasUnassigned = unassignedByChapter.size > 0;

  if (!activeBookId) {
    return (
      <div className="flex items-center justify-center h-64 text-[--color-text-muted]">
        <p className="text-sm italic">Select a book in the top bar.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[--color-accent] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-[--color-text-muted]">
        <p className="text-sm">Failed to load storyboard.</p>
      </div>
    );
  }

  const arcs = data.arcs;
  const selectedSceneDetail = selectedScene
    ? chapters.find((c) => c.chapter_id === selectedScene.chapterId)?.scenes.find((s) => s.scene_id === selectedScene.scene.scene_id)
    : null;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[--color-text-primary]">Plot Architect</h1>
          <p className="text-sm text-[--color-text-muted] mt-0.5">
            {chapters.length} chapters · {totalScenes} scenes · {(totalWords / 1000).toFixed(0)}k words
            {arcs.length > 0 && ` · ${arcs.length} arcs`}
          </p>
        </div>
        <button
          onClick={() => setShowNewArc(true)}
          className="flex items-center gap-2 px-3 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Arc
        </button>
      </motion.div>

      {/* No arcs yet */}
      {arcs.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center gap-4 py-16 rounded-xl border border-dashed border-[--color-bg-accent]"
        >
          <svg className="w-10 h-10 text-[--color-text-muted]/40" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
          </svg>
          <div className="text-center">
            <p className="text-sm font-medium text-[--color-text-secondary]">No arcs yet</p>
            <p className="text-xs text-[--color-text-muted] mt-1">Create a main plot line and subplots, then assign scenes to them.</p>
          </div>
          <button
            onClick={() => setShowNewArc(true)}
            className="px-4 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Create First Arc
          </button>
        </motion.div>
      )}

      {/* Storyboard grid + side panel */}
      {arcs.length > 0 && (
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Grid */}
          <div className="flex-1 overflow-auto rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card]">
            <table className="border-collapse text-left" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 180, minWidth: 180 }} />
                {chapters.map((ch) => (
                  <col key={ch.chapter_id} style={{ width: 96, minWidth: 96 }} />
                ))}
              </colgroup>

              {/* Chapter header row */}
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-[--color-bg-card] border-r border-b border-[--color-bg-accent] px-3 py-2">
                    <span className="text-[9px] uppercase tracking-widest text-[--color-text-muted] font-semibold">Arc</span>
                  </th>
                  {chapters.map((ch) => (
                    <th
                      key={ch.chapter_id}
                      className="border-r border-b border-[--color-bg-accent] px-1 py-2 align-bottom"
                      title={ch.chapter_title ?? chapterLabel(ch)}
                    >
                      <div
                        className="text-[9px] text-[--color-text-muted] whitespace-nowrap overflow-hidden"
                        style={{
                          writingMode: "vertical-rl",
                          transform: "rotate(180deg)",
                          maxHeight: 72,
                        }}
                      >
                        <span className="font-semibold">{chapterLabel(ch)}</span>
                        {ch.chapter_title && (
                          <span className="opacity-60">: {ch.chapter_title.substring(0, 16)}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Arc rows */}
                {arcs.map((arc, arcIdx) => {
                  const colors = palette(arcIdx);
                  return (
                    <tr key={arc.arc_id} className="group">
                      <ArcRowHeader arc={arc} colors={colors} bookId={activeBookId} />
                      {chapters.map((ch) => {
                        const scenes = ch.scenes.filter((s) => s.arc_ids.includes(arc.arc_id));
                        return (
                          <td
                            key={ch.chapter_id}
                            className="border-r border-b border-[--color-bg-accent] px-1 py-1 align-top"
                          >
                            <div className="flex flex-col gap-1">
                              {scenes.map((scene) => (
                                <SceneCard
                                  key={scene.scene_id}
                                  scene={scene}
                                  colorClass={colors.card}
                                  selected={selectedScene?.scene.scene_id === scene.scene_id}
                                  onClick={() =>
                                    setSelectedScene(
                                      selectedScene?.scene.scene_id === scene.scene_id
                                        ? null
                                        : { scene, chapterId: ch.chapter_id }
                                    )
                                  }
                                />
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Unassigned row */}
                {hasUnassigned && (
                  <tr>
                    <td className="sticky left-0 z-10 bg-[--color-bg-card] border-r border-b border-[--color-bg-accent] px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-[--color-text-muted]/40" />
                        <div>
                          <div className="text-xs font-semibold text-[--color-text-muted]">Unassigned</div>
                          <div className="text-[9px] text-[--color-text-muted]/60">not on any arc</div>
                        </div>
                      </div>
                    </td>
                    {chapters.map((ch) => {
                      const scenes = unassignedByChapter.get(ch.chapter_id) ?? [];
                      return (
                        <td key={ch.chapter_id} className="border-r border-b border-[--color-bg-accent] px-1 py-1 align-top">
                          <div className="flex flex-col gap-1">
                            {scenes.map((scene) => (
                              <SceneCard
                                key={scene.scene_id}
                                scene={scene}
                                colorClass="bg-[--color-bg-accent] border-[--color-bg-accent] text-[--color-text-muted]"
                                selected={selectedScene?.scene.scene_id === scene.scene_id}
                                onClick={() =>
                                  setSelectedScene(
                                    selectedScene?.scene.scene_id === scene.scene_id
                                      ? null
                                      : { scene, chapterId: ch.chapter_id }
                                  )
                                }
                              />
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Scene detail panel */}
          <AnimatePresence>
            {selectedSceneDetail && selectedScene && (
              <ScenePanel
                scene={selectedSceneDetail}
                arcs={arcs}
                arcColorMap={arcColorMap}
                bookId={activeBookId}
                onClose={() => setSelectedScene(null)}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      {/* New Arc modal */}
      <AnimatePresence>
        {showNewArc && <NewArcModal bookId={activeBookId} onClose={() => setShowNewArc(false)} />}
      </AnimatePresence>
    </div>
  );
}
