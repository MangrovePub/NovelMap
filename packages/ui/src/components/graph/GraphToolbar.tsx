import type { EntityType } from "../../api/client.ts";

const ENTITY_TYPES: EntityType[] = [
  "character",
  "location",
  "organization",
  "artifact",
  "concept",
  "event",
];

const TYPE_COLORS: Record<EntityType, string> = {
  character: "#e94560",
  location: "#0f3460",
  organization: "#533483",
  artifact: "#e9a045",
  concept: "#45e9a0",
  event: "#4560e9",
};

export function GraphToolbar({
  typeFilter,
  onTypeFilterChange,
}: {
  typeFilter: EntityType | undefined;
  onTypeFilterChange: (type: EntityType | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onTypeFilterChange(undefined)}
        className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
          !typeFilter
            ? "bg-[--color-bg-accent] text-[--color-text-primary]"
            : "text-[--color-text-muted] hover:text-[--color-text-secondary]"
        }`}
      >
        All
      </button>
      {ENTITY_TYPES.map((type) => (
        <button
          key={type}
          onClick={() =>
            onTypeFilterChange(typeFilter === type ? undefined : type)
          }
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors ${
            typeFilter === type
              ? "bg-[--color-bg-accent] text-[--color-text-primary]"
              : "text-[--color-text-muted] hover:text-[--color-text-secondary]"
          }`}
        >
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: TYPE_COLORS[type] }}
          />
          {type}
        </button>
      ))}
    </div>
  );
}
