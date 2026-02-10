import { useState } from "react";
import { useProjectStore } from "../../stores/project-store.ts";
import { useUIStore } from "../../stores/ui-store.ts";
import { useManuscripts, useCreateProject } from "../../hooks/use-projects.ts";
import { useEntities } from "../../hooks/use-entities.ts";
import { useNavigate } from "react-router";
import { BookGrid } from "./BookGrid.tsx";
import { BookShelf3D } from "./BookShelf3D.tsx";
import { EmptyState } from "../shared/EmptyState.tsx";

export function BookshelfView() {
  const { activeProjectId } = useProjectStore();
  const { bookshelfMode, setBookshelfMode } = useUIStore();
  const { data: manuscripts, isLoading } = useManuscripts(activeProjectId);
  const { data: entities } = useEntities(activeProjectId);
  const createProject = useCreateProject();
  const [newProjectName, setNewProjectName] = useState("");
  const { setActiveProject } = useProjectStore();
  const navigate = useNavigate();

  if (!activeProjectId) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-[--color-text-primary] mb-6">
          Bookshelf
        </h1>
        <div className="bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl p-8 max-w-md">
          <h2 className="text-lg font-semibold text-[--color-text-primary] mb-4">
            Create a Project
          </h2>
          <p className="text-sm text-[--color-text-secondary] mb-4">
            Select a project from the top bar, or create a new one to get started.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newProjectName.trim()) return;
              const project = await createProject.mutateAsync({
                name: newProjectName.trim(),
                path: newProjectName.trim().toLowerCase().replace(/\s+/g, "-"),
              });
              setActiveProject(project.id);
              setNewProjectName("");
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name..."
              className="flex-1 bg-[--color-bg-body] text-[--color-text-primary] border border-[--color-bg-accent] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
            />
            <button
              type="submit"
              disabled={!newProjectName.trim() || createProject.isPending}
              className="px-4 py-1.5 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40"
            >
              Create
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[--color-text-primary]">
          Bookshelf
        </h1>
        <div className="flex items-center gap-1 bg-[--color-bg-card] border border-[--color-bg-accent] rounded-lg p-0.5">
          <button
            onClick={() => setBookshelfMode("2d")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              bookshelfMode === "2d"
                ? "bg-[--color-bg-accent] text-[--color-text-primary]"
                : "text-[--color-text-muted] hover:text-[--color-text-secondary]"
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setBookshelfMode("3d")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              bookshelfMode === "3d"
                ? "bg-[--color-bg-accent] text-[--color-text-primary]"
                : "text-[--color-text-muted] hover:text-[--color-text-secondary]"
            }`}
          >
            3D Shelf
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-[--color-text-muted]">Loading...</p>
      ) : !manuscripts?.length ? (
        <EmptyState
          title="No manuscripts yet"
          description="Import a manuscript using the Import button in the top bar to see it on your bookshelf."
        />
      ) : bookshelfMode === "2d" ? (
        <BookGrid manuscripts={manuscripts} entities={entities ?? []} />
      ) : (
        <BookShelf3D
          manuscripts={manuscripts}
          onSelect={(id) => navigate(`/manuscript/${id}`)}
        />
      )}
    </div>
  );
}
