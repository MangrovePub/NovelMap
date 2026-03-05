import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProjectStore } from "../../stores/project-store.ts";
import { useUIStore, THEMES, type Theme } from "../../stores/ui-store.ts";
import { useProjects } from "../../hooks/use-projects.ts";
import { ImportDialog } from "../shared/ImportDialog.tsx";
import { ExportDialog } from "../shared/ExportDialog.tsx";
import { studio, type WarRoomData } from "../../api/client.ts";

const THEME_SWATCHES: Record<Theme, { bg: string; accent: string }> = {
  night:  { bg: "#161c28", accent: "#3b9eff" },
  amber:  { bg: "#241c12", accent: "#e8941e" },
  studio: { bg: "#ffffff", accent: "#d43b56" },
};

function ThemePicker() {
  const { theme, setTheme } = useUIStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const current = THEMES.find((t) => t.id === theme)!;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Change theme"
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[--color-bg-body] border border-[--color-bg-accent] text-[--color-text-muted] hover:text-[--color-text-secondary] hover:border-[--color-text-muted] transition-colors text-xs"
      >
        <span
          className="w-3 h-3 rounded-full shrink-0 border border-white/20"
          style={{ background: THEME_SWATCHES[theme].accent }}
        />
        <span className="hidden sm:inline text-[--color-text-secondary]">{current.label}</span>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] shadow-xl p-1.5 flex flex-col gap-0.5 min-w-[130px]">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id); setOpen(false); }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left w-full
                ${theme === t.id
                  ? "bg-[--color-bg-accent] text-[--color-text-primary]"
                  : "text-[--color-text-secondary] hover:bg-[--color-bg-accent] hover:text-[--color-text-primary]"
                }`}
            >
              <span
                className="w-4 h-4 rounded-full shrink-0 border border-white/10 flex items-center justify-center"
                style={{ background: THEME_SWATCHES[t.id].bg, boxShadow: `0 0 0 2px ${THEME_SWATCHES[t.id].accent}` }}
              />
              <span>{t.label}</span>
              {theme === t.id && (
                <svg className="w-3 h-3 ml-auto text-[--color-accent]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const [exportOpen, setExportOpen] = useState(false);
  const { activeProjectId, activeBookId, setActiveBook } = useProjectStore();
  const { data: warRoom } = useQuery<WarRoomData>({
    queryKey: ["war-room"],
    queryFn: () => studio.getWarRoom(),
    staleTime: 60_000,
  });

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 border-b border-[--color-bg-accent] bg-[--color-bg-card]">
      <select
        className="bg-[--color-bg-body] text-[--color-text-primary] border border-[--color-bg-accent] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[--color-accent] min-w-[180px]"
        value={activeBookId ?? ""}
        onChange={(e) => setActiveBook(e.target.value || null)}
      >
        <option value="">Select a book...</option>
        {warRoom?.universes.map((u) => (
          <optgroup key={u.universe_key} label={u.universe_name}>
            {u.books.map((b) => (
              <option key={b.book_id} value={b.book_id}>{b.title}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Cmd+K search trigger */}
      <button
        onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
        className="flex items-center gap-2 px-3 py-1.5 bg-[--color-bg-body] border border-[--color-bg-accent] rounded-lg text-sm text-[--color-text-muted] hover:text-[--color-text-secondary] hover:border-[--color-text-muted] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-[--color-bg-card] border border-[--color-bg-accent] rounded">⌘K</kbd>
      </button>

      <ThemePicker />

      <div className="flex-1" />

      <button
        onClick={() => setExportOpen(true)}
        disabled={!activeProjectId}
        className="flex items-center gap-2 px-3 py-1.5 bg-[--color-bg-accent] text-[--color-text-primary] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
        Export
      </button>

      {/* Logout */}
      <button
        onClick={() => { localStorage.removeItem("studio-token"); window.location.reload(); }}
        title="Sign out"
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-[--color-bg-body] border border-[--color-bg-accent] text-[--color-text-muted] hover:text-[--color-text-secondary] hover:border-[--color-text-muted] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
        </svg>
      </button>

      {exportOpen && activeProjectId && (
        <ExportDialog projectId={activeProjectId} onClose={() => setExportOpen(false)} />
      )}
    </header>
  );
}
