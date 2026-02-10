import { useState } from "react";
import { motion } from "framer-motion";
import { useProjectStore } from "../../stores/project-store.ts";
import {
  useEntities,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
  useDetectFullProject,
} from "../../hooks/use-entities.ts";
import { EntityTypeBadge } from "../shared/EntityTypeBadge.tsx";
import { EntityEditor } from "./EntityEditor.tsx";
import type { Entity, EntityType } from "../../api/client.ts";

const ENTITY_TYPES: EntityType[] = [
  "character",
  "location",
  "organization",
  "artifact",
  "concept",
  "event",
];

export function EntityDashboard() {
  const { activeProjectId } = useProjectStore();
  const [filterType, setFilterType] = useState<EntityType | "all">("all");
  const [search, setSearch] = useState("");
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: entities, isLoading } = useEntities(
    activeProjectId,
    {
      type: filterType === "all" ? undefined : filterType,
      search: search || undefined,
    }
  );
  const createEntity = useCreateEntity();
  const updateEntity = useUpdateEntity();
  const deleteEntity = useDeleteEntity();
  const detectAll = useDetectFullProject();

  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center h-64 text-[--color-text-muted]">
        Select a project to manage entities.
      </div>
    );
  }

  function handleCreate(data: { name: string; type: EntityType; metadata: Record<string, unknown> }) {
    createEntity.mutate(
      { projectId: activeProjectId!, ...data },
      { onSuccess: () => setCreating(false) }
    );
  }

  function handleUpdate(data: { name: string; type: EntityType; metadata: Record<string, unknown> }) {
    if (!editingEntity) return;
    updateEntity.mutate(
      { id: editingEntity.id, ...data },
      { onSuccess: () => setEditingEntity(null) }
    );
  }

  function handleDelete(id: number) {
    deleteEntity.mutate(id);
  }

  function handleDetectAll() {
    detectAll.mutate(activeProjectId!);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[--color-text-primary]">
          Entities
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDetectAll}
            disabled={detectAll.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[--color-bg-accent] text-[--color-text-primary] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            {detectAll.isPending ? "Scanning..." : "Re-scan All Books"}
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Entity
          </button>
        </div>
      </div>

      {/* Detection result banner */}
      {detectAll.isSuccess && detectAll.data && (
        <div className="bg-[#45e9a0]/10 border border-[#45e9a0]/30 rounded-lg p-4">
          <p className="text-sm text-[#45e9a0] font-medium">
            Scan complete: {detectAll.data.totalMatches} matches found,{" "}
            {detectAll.data.newAppearances} new appearances created.
            {detectAll.data.crossBookEntities.length > 0 && (
              <span>
                {" "}
                {detectAll.data.crossBookEntities.length} entities appear
                across multiple books!
              </span>
            )}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entities..."
            className="w-full pl-10 pr-4 py-2 bg-[--color-bg-body] border border-[--color-bg-accent] rounded-lg text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === "all"
                ? "bg-[--color-accent] text-white"
                : "bg-[--color-bg-body] text-[--color-text-secondary] hover:text-[--color-text-primary]"
            }`}
          >
            All
          </button>
          {ENTITY_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filterType === t
                  ? "bg-[--color-accent] text-white"
                  : "bg-[--color-bg-body] text-[--color-text-secondary] hover:text-[--color-text-primary]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Entity list */}
      {isLoading ? (
        <div className="text-center py-12 text-[--color-text-muted]">
          Loading entities...
        </div>
      ) : !entities?.length ? (
        <div className="text-center py-12 text-[--color-text-muted]">
          <p className="text-lg mb-2">No entities yet</p>
          <p className="text-sm">
            Create entities manually or import a manuscript to auto-detect them.
          </p>
        </div>
      ) : (
        <motion.div
          className="grid gap-3"
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
        >
          {entities.map((entity) => (
            <motion.div
              key={entity.id}
              variants={{
                initial: { opacity: 0, y: 12 },
                animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" as const } },
              }}
              className="bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl p-4 flex items-start gap-4 hover:border-[--color-text-muted] transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-base font-semibold text-[--color-accent] truncate">
                    {entity.name}
                  </h3>
                  <EntityTypeBadge type={entity.type} />
                </div>
                {entity.metadata && Object.keys(entity.metadata).length > 0 && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {Object.entries(entity.metadata).map(([key, value]) => (
                      <span key={key} className="text-xs">
                        <span className="text-[--color-text-muted]">{key}:</span>{" "}
                        <span className="text-[--color-text-secondary]">
                          {Array.isArray(value) ? value.join(", ") : String(value)}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingEntity(entity)}
                  className="p-1.5 rounded-lg hover:bg-[--color-bg-accent] text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(entity.id)}
                  className="p-1.5 rounded-lg hover:bg-[#e94560]/20 text-[--color-text-muted] hover:text-[#e94560] transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create / Edit modals */}
      {creating && (
        <EntityEditor
          onSave={handleCreate}
          onClose={() => setCreating(false)}
          saving={createEntity.isPending}
        />
      )}
      {editingEntity && (
        <EntityEditor
          entity={editingEntity}
          onSave={handleUpdate}
          onClose={() => setEditingEntity(null)}
          saving={updateEntity.isPending}
        />
      )}
    </div>
  );
}
