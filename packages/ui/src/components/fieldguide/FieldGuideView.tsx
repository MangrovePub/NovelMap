import { useState } from "react";
import { useProjectStore } from "../../stores/project-store.ts";
import { useFieldGuide } from "../../hooks/use-entities.ts";
import { DossierCard } from "./DossierCard.tsx";
import { EmptyState } from "../shared/EmptyState.tsx";
import type { EntityType } from "../../api/client.ts";

const ENTITY_TYPES: EntityType[] = [
  "character",
  "location",
  "organization",
  "artifact",
  "concept",
  "event",
];

export function FieldGuideView() {
  const { activeProjectId } = useProjectStore();
  const { data: dossiers, isLoading } = useFieldGuide(activeProjectId);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<EntityType | "all">("all");

  if (!activeProjectId) {
    return (
      <EmptyState
        title="No project selected"
        description="Select a project from the top bar to view the field guide."
      />
    );
  }

  const filtered = dossiers?.filter((d) => {
    if (typeFilter !== "all" && d.entity.type !== typeFilter) return false;
    if (search && !d.entity.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-[--color-text-primary] mb-6">
        Field Guide
      </h1>

      <div className="flex items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search entities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[--color-bg-card] text-[--color-text-primary] border border-[--color-bg-accent] rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as EntityType | "all")}
          className="bg-[--color-bg-card] text-[--color-text-primary] border border-[--color-bg-accent] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
        >
          <option value="all">All Types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-[--color-text-muted]">Loading...</p>
      ) : !filtered?.length ? (
        <EmptyState
          title="No entities found"
          description={
            search || typeFilter !== "all"
              ? "Try adjusting your search or filters."
              : "Create entities to build your field guide."
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((d) => (
            <DossierCard key={d.entity.id} dossier={d} />
          ))}
        </div>
      )}
    </div>
  );
}
