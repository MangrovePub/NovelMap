import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  studio,
  type StudioBook,
  type StudioChapter,
  type StudioChapterScene,
  type StudioSceneDetail,
} from "../../api/client";

// ── helpers ────────────────────────────────────────────────────────────────────

function cleanText(t: string) {
  return t
    .replace(/\\--/g, "\u2014")
    .replace(/\\'/g, "'")
    .replace(/\{\.underline\}/g, "");
}

function countWords(t: string) {
  const s = t.trim();
  return s ? s.split(/\s+/).length : 0;
}

function chapterLabel(ch: StudioChapter) {
  if (ch.is_prologue) return "Prologue";
  if (ch.is_epilogue) return "Epilogue";
  if (ch.chapter_number != null) return `Ch. ${ch.chapter_number}`;
  return (ch.section_type ?? "section").replace(/_/g, " ");
}

function chapterDisplayName(ch: StudioChapter) {
  const label = chapterLabel(ch);
  return ch.title ? `${label}: ${ch.title}` : label;
}

type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

// ── ChapterItem ────────────────────────────────────────────────────────────────

interface ChapterItemProps {
  chapter: StudioChapter;
  expanded: boolean;
  scenes: StudioChapterScene[] | undefined;
  selectedSceneId: string | null;
  onToggle: () => void;
  onSceneSelect: (sceneId: string) => void;
  onAddScene: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDeleteScene: (sceneId: string, label: string) => void;
}

function ChapterItem({
  chapter, expanded, scenes, selectedSceneId,
  onToggle, onSceneSelect, onAddScene, onRename, onDelete, onDeleteScene,
}: ChapterItemProps) {
  return (
    <div>
      <div
        className="group flex items-center gap-1 px-3 py-1.5 hover:bg-[--color-bg-body] cursor-pointer select-none"
        onClick={onToggle}
      >
        <span className="text-[--color-text-muted] w-3 text-xs shrink-0">
          {expanded ? "▾" : "▸"}
        </span>
        <span
          className="flex-1 text-xs text-[--color-text-primary] truncate"
          title={chapterDisplayName(chapter)}
        >
          {chapterDisplayName(chapter)}
        </span>
        <span className="text-[10px] text-[--color-text-muted] tabular-nums shrink-0 mr-1">
          {chapter.scene_count}
        </span>
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button
            title="Rename"
            onClick={e => { e.stopPropagation(); onRename(); }}
            className="p-0.5 rounded text-[--color-text-muted] hover:text-[--color-accent]"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
            </svg>
          </button>
          <button
            title="Add scene"
            onClick={e => { e.stopPropagation(); onAddScene(); }}
            className="p-0.5 rounded text-[--color-text-muted] hover:text-[--color-accent]"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          <button
            title="Delete chapter"
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-0.5 rounded text-[--color-text-muted] hover:text-red-500"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="ml-3 border-l border-[--color-bg-accent]">
          {scenes === undefined ? (
            <div className="px-3 py-1 text-[10px] text-[--color-text-muted]">Loading…</div>
          ) : scenes.length === 0 ? (
            <div className="px-3 py-1 text-[10px] text-[--color-text-muted]">No scenes yet.</div>
          ) : (
            scenes.map(sc => (
              <div
                key={sc.scene_id}
                className={`group flex items-center gap-1 px-3 py-1 cursor-pointer text-xs ${
                  selectedSceneId === sc.scene_id
                    ? "text-[--color-accent] bg-[--color-bg-accent]"
                    : "text-[--color-text-secondary] hover:bg-[--color-bg-body] hover:text-[--color-text-primary]"
                }`}
                onClick={() => onSceneSelect(sc.scene_id)}
              >
                <span className="flex-1 truncate">
                  {sc.subheader ?? `Scene ${sc.seq_in_chapter}`}
                </span>
                <span className="text-[10px] text-[--color-text-muted] shrink-0 tabular-nums">
                  {sc.word_count > 0 ? `${sc.word_count.toLocaleString()}w` : ""}
                </span>
                <button
                  title="Delete scene"
                  onClick={e => { e.stopPropagation(); onDeleteScene(sc.scene_id, sc.subheader ?? `Scene ${sc.seq_in_chapter}`); }}
                  className="hidden group-hover:block p-0.5 rounded text-[--color-text-muted] hover:text-red-500"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────────

export function ManuscriptEditorView() {
  // ── Book ──────────────────────────────────────────────────────────────────
  const [bookId, setBookId] = useState<string | null>(null);

  const { data: booksData } = useQuery({
    queryKey: ["studio-books"],
    queryFn: () => studio.listBooks(),
  });
  const books: StudioBook[] = booksData ?? [];

  // ── Chapters ──────────────────────────────────────────────────────────────
  const { data: chaptersData, refetch: refetchChapters } = useQuery({
    queryKey: ["studio-chapters", bookId],
    queryFn: () => (bookId ? studio.listChapters(bookId) : Promise.resolve([])),
    enabled: !!bookId,
  });
  const chapters: StudioChapter[] = chaptersData ?? [];

  // ── Chapter/scene nav state ───────────────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [chapterScenes, setChapterScenes] = useState<Record<string, StudioChapterScene[]>>({});

  const loadChapterScenes = useCallback(async (chapterId: string) => {
    const detail = await studio.getChapter(chapterId);
    setChapterScenes(prev => ({ ...prev, [chapterId]: detail.scenes }));
  }, []);

  const toggleChapter = (chapterId: string) => {
    if (expandedIds.has(chapterId)) {
      setExpandedIds(prev => { const s = new Set(prev); s.delete(chapterId); return s; });
    } else {
      setExpandedIds(prev => new Set(prev).add(chapterId));
      if (!chapterScenes[chapterId]) {
        loadChapterScenes(chapterId);
      }
    }
  };

  // ── Editor state ──────────────────────────────────────────────────────────
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [sceneDetail, setSceneDetail] = useState<StudioSceneDetail | null>(null);
  const [loadingScene, setLoadingScene] = useState(false);

  const [draftText,      setDraftText]      = useState("");
  const [draftSubheader, setDraftSubheader] = useState("");
  const [draftLocation,  setDraftLocation]  = useState("");
  const [draftTimeOfDay, setDraftTimeOfDay] = useState("");
  const [draftNotes,     setDraftNotes]     = useState("");

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs so autosave timer always gets fresh values
  const latestSceneIdRef = useRef<string | null>(null);
  const latestDraftRef = useRef({ scene_text: "", subheader: "", location: "", time_of_day: "", notes: "" });

  useEffect(() => { latestSceneIdRef.current = selectedSceneId; }, [selectedSceneId]);
  useEffect(() => {
    latestDraftRef.current = {
      scene_text:  draftText,
      subheader:   draftSubheader,
      location:    draftLocation,
      time_of_day: draftTimeOfDay,
      notes:       draftNotes,
    };
  }, [draftText, draftSubheader, draftLocation, draftTimeOfDay, draftNotes]);

  const doSave = useCallback(async () => {
    const id = latestSceneIdRef.current;
    if (!id) return;
    setSaveStatus("saving");
    try {
      await studio.updateScene(id, latestDraftRef.current);
      setSaveStatus("saved");
      // Update nav word count (optimistic)
      setChapterScenes(prev => {
        const next = { ...prev };
        for (const cid of Object.keys(next)) {
          next[cid] = next[cid].map(sc =>
            sc.scene_id === id
              ? { ...sc, word_count: countWords(latestDraftRef.current.scene_text), subheader: latestDraftRef.current.subheader || sc.subheader }
              : sc
          );
        }
        return next;
      });
    } catch {
      setSaveStatus("error");
    }
  }, []);

  const scheduleAutosave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("unsaved");
    saveTimerRef.current = setTimeout(doSave, 1500);
  }, [doSave]);

  const selectScene = useCallback(async (sceneId: string) => {
    // Save immediately before switching
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (latestSceneIdRef.current && latestSceneIdRef.current !== sceneId) {
      await doSave();
    }

    setSelectedSceneId(sceneId);
    setLoadingScene(true);
    setSaveStatus("idle");
    try {
      const detail = await studio.getSceneDetail(sceneId);
      setSceneDetail(detail);
      setDraftText(cleanText(detail.scene_text ?? ""));
      setDraftSubheader(detail.subheader ?? "");
      setDraftLocation(detail.location ?? "");
      setDraftTimeOfDay(detail.time_of_day ?? "");
      setDraftNotes(detail.notes ?? "");
    } finally {
      setLoadingScene(false);
    }
  }, [doSave]);

  // ── Chapter rename ────────────────────────────────────────────────────────
  const [renameModal, setRenameModal] = useState<{ chapter: StudioChapter } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const updateChapterMutation = useMutation({
    mutationFn: ({ chapterId, title }: { chapterId: string; title: string }) =>
      studio.updateChapter(chapterId, { title }),
    onSuccess: () => {
      refetchChapters();
      setRenameModal(null);
    },
  });

  // ── Chapter creation ──────────────────────────────────────────────────────
  const createChapterMutation = useMutation({
    mutationFn: () => studio.createChapter(bookId!, {}),
    onSuccess: async (chapter) => {
      await refetchChapters();
      setExpandedIds(prev => new Set(prev).add(chapter.chapter_id));
      await loadChapterScenes(chapter.chapter_id);
      // Immediately open rename dialog
      setRenameModal({ chapter: { ...chapter, scene_count: 0 } as StudioChapter });
      setRenameValue(chapter.title ?? "");
    },
  });

  // ── Scene creation ────────────────────────────────────────────────────────
  const createSceneMutation = useMutation({
    mutationFn: (chapterId: string) => studio.createScene(chapterId, {}),
    onSuccess: async (scene, chapterId) => {
      setExpandedIds(prev => new Set(prev).add(chapterId));
      await loadChapterScenes(chapterId);
      refetchChapters();
      // Load the new scene in editor
      const detail = await studio.getSceneDetail(scene.scene_id);
      setSelectedSceneId(scene.scene_id);
      setSceneDetail(detail);
      setDraftText("");
      setDraftSubheader("");
      setDraftLocation("");
      setDraftTimeOfDay("");
      setDraftNotes("");
      setSaveStatus("idle");
    },
  });

  // ── Delete ────────────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "chapter" | "scene";
    id: string;
    name: string;
    chapterId?: string;
  } | null>(null);

  const deleteChapterMutation = useMutation({
    mutationFn: (chapterId: string) => studio.deleteChapter(chapterId),
    onSuccess: (_, chapterId) => {
      refetchChapters();
      setChapterScenes(prev => { const n = { ...prev }; delete n[chapterId]; return n; });
      setExpandedIds(prev => { const s = new Set(prev); s.delete(chapterId); return s; });
      if (sceneDetail?.chapter_id === chapterId) {
        setSelectedSceneId(null);
        setSceneDetail(null);
        setSaveStatus("idle");
      }
      setDeleteConfirm(null);
    },
  });

  const deleteSceneMutation = useMutation({
    mutationFn: ({ sceneId }: { sceneId: string; chapterId: string }) =>
      studio.deleteScene(sceneId),
    onSuccess: async (_, { sceneId, chapterId }) => {
      await loadChapterScenes(chapterId);
      refetchChapters();
      if (selectedSceneId === sceneId) {
        setSelectedSceneId(null);
        setSceneDetail(null);
        setSaveStatus("idle");
      }
      setDeleteConfirm(null);
    },
  });

  // ── Book change: reset editor ─────────────────────────────────────────────
  useEffect(() => {
    setExpandedIds(new Set());
    setChapterScenes({});
    setSelectedSceneId(null);
    setSceneDetail(null);
    setDraftText("");
    setSaveStatus("idle");
  }, [bookId]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex"
      style={{ margin: "-24px", height: "calc(100% + 48px)" }}
    >
      {/* ── Left nav ── */}
      <div className="w-60 shrink-0 flex flex-col bg-[--color-bg-card] border-r border-[--color-bg-accent] h-full">
        {/* Book selector */}
        <div className="p-3 border-b border-[--color-bg-accent]">
          <select
            value={bookId ?? ""}
            onChange={e => setBookId(e.target.value || null)}
            className="w-full text-xs bg-[--color-bg-body] border border-[--color-bg-accent] rounded px-2 py-1.5 text-[--color-text-primary]"
          >
            <option value="">Select a book…</option>
            {books.map(b => (
              <option key={b.book_id} value={b.book_id}>{b.title}</option>
            ))}
          </select>
        </div>

        {/* Chapter / scene tree */}
        <div className="flex-1 overflow-y-auto py-1">
          {chapters.map(ch => (
            <ChapterItem
              key={ch.chapter_id}
              chapter={ch}
              expanded={expandedIds.has(ch.chapter_id)}
              scenes={chapterScenes[ch.chapter_id]}
              selectedSceneId={selectedSceneId}
              onToggle={() => toggleChapter(ch.chapter_id)}
              onSceneSelect={sceneId => selectScene(sceneId)}
              onAddScene={() => createSceneMutation.mutate(ch.chapter_id)}
              onRename={() => { setRenameModal({ chapter: ch }); setRenameValue(ch.title ?? ""); }}
              onDelete={() => setDeleteConfirm({ type: "chapter", id: ch.chapter_id, name: chapterDisplayName(ch) })}
              onDeleteScene={(sceneId, label) => setDeleteConfirm({ type: "scene", id: sceneId, name: label, chapterId: ch.chapter_id })}
            />
          ))}
          {bookId && chapters.length === 0 && (
            <div className="px-4 py-3 text-xs text-[--color-text-muted]">No chapters yet.</div>
          )}
          {!bookId && (
            <div className="px-4 py-6 text-xs text-[--color-text-muted] text-center leading-relaxed">
              Choose a book to start writing.
            </div>
          )}
        </div>

        {/* New chapter button */}
        {bookId && (
          <div className="p-2 border-t border-[--color-bg-accent]">
            <button
              onClick={() => createChapterMutation.mutate()}
              disabled={createChapterMutation.isPending}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-[--color-text-muted] hover:text-[--color-text-primary] rounded border border-dashed border-[--color-bg-accent] hover:border-[--color-text-muted] transition-colors disabled:opacity-50"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {createChapterMutation.isPending ? "Creating…" : "New Chapter"}
            </button>
          </div>
        )}
      </div>

      {/* ── Editor ── */}
      <div className="flex-1 flex overflow-hidden">
        {!sceneDetail ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[--color-text-muted]">
            <svg className="w-12 h-12 opacity-20" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
            <span className="text-sm">
              {!bookId ? "Select a book to begin." : "Select a scene, or add one to a chapter."}
            </span>
          </div>
        ) : (
          <>
            {/* Prose editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-[720px] mx-auto px-10 pt-10 pb-6">
                  {/* Chapter context line */}
                  <div className="text-xs text-[--color-text-muted] mb-2 uppercase tracking-widest">
                    {sceneDetail.chapter_title}
                  </div>

                  {/* Scene title / subheader */}
                  <input
                    type="text"
                    value={draftSubheader}
                    onChange={e => { setDraftSubheader(e.target.value); scheduleAutosave(); }}
                    placeholder="Scene title…"
                    className="w-full text-xl font-semibold text-[--color-text-primary] bg-transparent border-none outline-none mb-8 placeholder:text-[--color-text-muted]/30"
                    style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
                    disabled={loadingScene}
                  />

                  {/* Prose */}
                  <textarea
                    value={draftText}
                    onChange={e => { setDraftText(e.target.value); scheduleAutosave(); }}
                    className="w-full bg-transparent border-none outline-none resize-none text-[--color-text-primary] placeholder:text-[--color-text-muted]/25"
                    style={{
                      fontFamily: "'Libre Baskerville', Georgia, serif",
                      fontSize: "16px",
                      lineHeight: "1.9",
                      minHeight: "60vh",
                    }}
                    placeholder={loadingScene ? "Loading…" : "Begin writing…"}
                    disabled={loadingScene}
                    autoFocus={!loadingScene}
                    spellCheck
                  />
                </div>
              </div>

              {/* Status bar */}
              <div className="flex items-center gap-4 px-10 py-2 border-t border-[--color-bg-accent] text-xs text-[--color-text-muted] bg-[--color-bg-card]">
                <span className="tabular-nums">{countWords(draftText).toLocaleString()} words</span>
                <span>
                  {saveStatus === "saving"  && <span className="text-[--color-accent]">Saving…</span>}
                  {saveStatus === "saved"   && <span className="text-emerald-500">Saved</span>}
                  {saveStatus === "unsaved" && <span className="text-amber-500">Unsaved</span>}
                  {saveStatus === "error"   && <span className="text-red-500">Save failed</span>}
                </span>
                {(saveStatus === "unsaved" || saveStatus === "error") && (
                  <button
                    onClick={doSave}
                    className="text-xs text-[--color-accent] hover:underline"
                  >
                    Save now
                  </button>
                )}
              </div>
            </div>

            {/* Metadata panel */}
            <div className="w-52 shrink-0 border-l border-[--color-bg-accent] overflow-y-auto bg-[--color-bg-card]">
              <div className="p-4 flex flex-col gap-4">
                <div className="text-[10px] font-semibold text-[--color-text-muted] uppercase tracking-wider">
                  Scene Metadata
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-[--color-text-muted]">Location</span>
                  <input
                    type="text"
                    value={draftLocation}
                    onChange={e => { setDraftLocation(e.target.value); scheduleAutosave(); }}
                    placeholder="e.g. Shanghai"
                    className="text-xs bg-[--color-bg-body] border border-[--color-bg-accent] rounded px-2 py-1.5 text-[--color-text-primary] placeholder:text-[--color-text-muted]/40"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-[--color-text-muted]">Time of Day</span>
                  <input
                    type="text"
                    value={draftTimeOfDay}
                    onChange={e => { setDraftTimeOfDay(e.target.value); scheduleAutosave(); }}
                    placeholder="e.g. Dawn"
                    className="text-xs bg-[--color-bg-body] border border-[--color-bg-accent] rounded px-2 py-1.5 text-[--color-text-primary] placeholder:text-[--color-text-muted]/40"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-[--color-text-muted]">Notes</span>
                  <textarea
                    value={draftNotes}
                    onChange={e => { setDraftNotes(e.target.value); scheduleAutosave(); }}
                    placeholder="Story notes…"
                    rows={5}
                    className="text-xs bg-[--color-bg-body] border border-[--color-bg-accent] rounded px-2 py-1.5 text-[--color-text-primary] resize-none placeholder:text-[--color-text-muted]/40"
                  />
                </label>

                <div className="pt-2 border-t border-[--color-bg-accent]">
                  <button
                    onClick={() => setDeleteConfirm({
                      type: "scene",
                      id: sceneDetail.scene_id,
                      name: sceneDetail.subheader ?? "this scene",
                      chapterId: sceneDetail.chapter_id,
                    })}
                    className="text-xs text-red-500 hover:text-red-400 transition-colors"
                  >
                    Delete scene
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Rename modal ── */}
      {renameModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setRenameModal(null)}
        >
          <div
            className="bg-[--color-bg-card] rounded-xl p-6 w-96 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-[--color-text-primary] mb-4">
              Rename Chapter
            </h3>
            <input
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              className="w-full text-sm bg-[--color-bg-body] border border-[--color-bg-accent] rounded px-3 py-2 text-[--color-text-primary] mb-4 outline-none focus:border-[--color-accent]"
              onKeyDown={e => {
                if (e.key === "Enter") updateChapterMutation.mutate({ chapterId: renameModal.chapter.chapter_id, title: renameValue });
                if (e.key === "Escape") setRenameModal(null);
              }}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRenameModal(null)}
                className="px-3 py-1.5 text-xs text-[--color-text-secondary] hover:text-[--color-text-primary]"
              >
                Cancel
              </button>
              <button
                onClick={() => updateChapterMutation.mutate({ chapterId: renameModal.chapter.chapter_id, title: renameValue })}
                disabled={updateChapterMutation.isPending}
                className="px-3 py-1.5 text-xs bg-[--color-accent] text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {updateChapterMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-[--color-bg-card] rounded-xl p-6 w-96 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-[--color-text-primary] mb-2">
              Delete {deleteConfirm.type}?
            </h3>
            <p className="text-xs text-[--color-text-muted] mb-5 leading-relaxed">
              <span className="font-medium text-[--color-text-secondary]">"{deleteConfirm.name}"</span> will be permanently deleted.
              {deleteConfirm.type === "chapter" && " All scenes in this chapter will also be deleted."}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 text-xs text-[--color-text-secondary] hover:text-[--color-text-primary]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === "chapter") {
                    deleteChapterMutation.mutate(deleteConfirm.id);
                  } else {
                    deleteSceneMutation.mutate({ sceneId: deleteConfirm.id, chapterId: deleteConfirm.chapterId! });
                  }
                }}
                disabled={deleteChapterMutation.isPending || deleteSceneMutation.isPending}
                className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-500 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
