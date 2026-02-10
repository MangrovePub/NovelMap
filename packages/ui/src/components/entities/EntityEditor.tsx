import { useState } from "react";
import type { Entity, EntityType } from "../../api/client.ts";

const ENTITY_TYPES: EntityType[] = [
  "character",
  "location",
  "organization",
  "artifact",
  "concept",
  "event",
];

const COMMON_FIELDS: Record<EntityType, string[]> = {
  character: ["aliases", "role", "age", "gender", "description", "motivation", "arc"],
  location: ["aliases", "region", "terrain", "climate", "description"],
  organization: ["aliases", "type", "leader", "headquarters", "description"],
  artifact: ["aliases", "origin", "power", "description"],
  concept: ["aliases", "domain", "description"],
  event: ["aliases", "date", "duration", "participants", "description"],
};

interface Props {
  entity?: Entity;
  onSave: (data: { name: string; type: EntityType; metadata: Record<string, unknown> }) => void;
  onClose: () => void;
  saving?: boolean;
}

export function EntityEditor({ entity, onSave, onClose, saving }: Props) {
  const [name, setName] = useState(entity?.name ?? "");
  const [type, setType] = useState<EntityType>(entity?.type ?? "character");
  const [metadata, setMetadata] = useState<Record<string, string>>(() => {
    if (!entity?.metadata) return {};
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(entity.metadata)) {
      m[k] = Array.isArray(v) ? v.join(", ") : String(v ?? "");
    }
    return m;
  });
  const [newFieldKey, setNewFieldKey] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    // Convert metadata: split comma-separated values into arrays for aliases-type fields
    const processedMeta: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(metadata)) {
      if (!v.trim()) continue;
      if (["aliases", "alias", "nicknames", "nickname", "aka", "also_known_as", "participants"].includes(k)) {
        processedMeta[k] = v.split(",").map((s) => s.trim()).filter(Boolean);
      } else {
        processedMeta[k] = v;
      }
    }

    onSave({ name: name.trim(), type, metadata: processedMeta });
  }

  function addField(key: string) {
    if (!key.trim() || metadata[key] !== undefined) return;
    setMetadata((m) => ({ ...m, [key]: "" }));
    setNewFieldKey("");
  }

  function removeField(key: string) {
    setMetadata((m) => {
      const next = { ...m };
      delete next[key];
      return next;
    });
  }

  const suggestedFields = COMMON_FIELDS[type].filter(
    (f) => metadata[f] === undefined
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[--color-text-primary] mb-4">
          {entity ? "Edit Entity" : "Create Entity"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[--color-text-secondary] mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aria Stormwind"
              className="w-full px-3 py-2 bg-[--color-bg-body] border border-[--color-bg-accent] rounded-lg text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
              autoFocus
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-[--color-text-secondary] mb-1">
              Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ENTITY_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    type === t
                      ? "bg-[--color-accent] text-white"
                      : "bg-[--color-bg-body] text-[--color-text-secondary] hover:text-[--color-text-primary] border border-[--color-bg-accent]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Metadata fields */}
          <div>
            <label className="block text-sm font-medium text-[--color-text-secondary] mb-2">
              Metadata
            </label>
            <div className="space-y-2">
              {Object.entries(metadata).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2">
                  <label className="w-28 shrink-0 text-xs font-medium text-[--color-text-muted] pt-2.5 capitalize text-right">
                    {key}
                  </label>
                  <textarea
                    value={value}
                    onChange={(e) =>
                      setMetadata((m) => ({ ...m, [key]: e.target.value }))
                    }
                    rows={key === "description" ? 3 : 1}
                    placeholder={
                      ["aliases", "nickname", "aka", "participants"].includes(key)
                        ? "Comma-separated values..."
                        : ""
                    }
                    className="flex-1 px-3 py-2 bg-[--color-bg-body] border border-[--color-bg-accent] rounded-lg text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-accent] resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeField(key)}
                    className="p-2 text-[--color-text-muted] hover:text-[#e94560] transition-colors"
                    title="Remove field"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Add field */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={newFieldKey}
                onChange={(e) => setNewFieldKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addField(newFieldKey);
                  }
                }}
                placeholder="Add custom field..."
                className="flex-1 px-3 py-1.5 bg-[--color-bg-body] border border-[--color-bg-accent] rounded-lg text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
              />
              <button
                type="button"
                onClick={() => addField(newFieldKey)}
                disabled={!newFieldKey.trim()}
                className="px-3 py-1.5 text-sm bg-[--color-bg-accent] text-[--color-text-primary] rounded-lg hover:opacity-90 disabled:opacity-40"
              >
                Add
              </button>
            </div>

            {/* Suggested fields */}
            {suggestedFields.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-xs text-[--color-text-muted] py-1">
                  Suggested:
                </span>
                {suggestedFields.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => addField(f)}
                    className="px-2 py-0.5 text-xs bg-[--color-bg-body] border border-[--color-bg-accent] text-[--color-text-secondary] rounded-full hover:border-[--color-accent] hover:text-[--color-accent] transition-colors capitalize"
                  >
                    + {f}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-sm text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="px-5 py-1.5 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {saving ? "Saving..." : entity ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
