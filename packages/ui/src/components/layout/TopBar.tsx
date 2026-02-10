import { useState } from "react";
import { useProjectStore } from "../../stores/project-store.ts";
import { useUIStore } from "../../stores/ui-store.ts";
import { useProjects } from "../../hooks/use-projects.ts";
import { ImportDialog } from "../shared/ImportDialog.tsx";
import { ExportDialog } from "../shared/ExportDialog.tsx";

export function TopBar() {
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const { activeProjectId, setActiveProject } = useProjectStore();
  const { theme, toggleTheme } = useUIStore();
  const { data: projects } = useProjects();

  return (
    <header className="flex items-center gap-4 px-6 py-3 border-b border-[--color-bg-accent] bg-[--color-bg-card]">
      <select
        className="bg-[--color-bg-body] text-[--color-text-primary] border border-[--color-bg-accent] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
        value={activeProjectId ?? ""}
        onChange={(e) =>
          setActiveProject(e.target.value ? Number(e.target.value) : null)
        }
      >
        <option value="">Select a project...</option>
        {projects?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
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
        <kbd className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-[--color-bg-card] border border-[--color-bg-accent] rounded">
          ⌘K
        </kbd>
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-[--color-bg-body] border border-[--color-bg-accent] text-[--color-text-muted] hover:text-[--color-text-secondary] hover:border-[--color-text-muted] transition-colors"
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
          </svg>
        )}
      </button>

      <div className="flex-1" />

      <button
        onClick={() => setImportOpen(true)}
        disabled={!activeProjectId}
        className="flex items-center gap-2 px-4 py-1.5 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        Import
      </button>

      <button
        onClick={() => setExportOpen(true)}
        disabled={!activeProjectId}
        className="flex items-center gap-2 px-4 py-1.5 bg-[--color-bg-accent] text-[--color-text-primary] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
        Export
      </button>

      {importOpen && activeProjectId && (
        <ImportDialog
          projectId={activeProjectId}
          onClose={() => setImportOpen(false)}
        />
      )}

      {exportOpen && activeProjectId && (
        <ExportDialog
          projectId={activeProjectId}
          onClose={() => setExportOpen(false)}
        />
      )}
    </header>
  );
}
