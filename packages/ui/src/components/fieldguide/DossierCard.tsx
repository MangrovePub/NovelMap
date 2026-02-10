import { EntityTypeBadge } from "../shared/EntityTypeBadge.tsx";
import type { DossierEntry } from "../../api/client.ts";

export function DossierCard({ dossier }: { dossier: DossierEntry }) {
  const { entity, appearances, relationships } = dossier;
  const metadata = entity.metadata ?? {};

  return (
    <div className="bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-lg font-semibold text-[--color-accent]">
          {entity.name}
        </h2>
        <EntityTypeBadge type={entity.type} />
      </div>

      {Object.keys(metadata).length > 0 && (
        <div className="mb-3 space-y-1">
          {Object.entries(metadata).map(([key, value]) => (
            <div key={key} className="text-sm">
              <span className="text-[--color-text-secondary] font-medium">
                {key}:
              </span>{" "}
              <span className="text-[--color-text-primary]">
                {String(value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {appearances.length > 0 && (
        <div className="mb-3">
          <h3 className="text-sm font-medium text-[--color-text-secondary] border-b border-[--color-bg-accent] pb-1 mb-2">
            Appearances
          </h3>
          <ul className="space-y-1">
            {appearances.slice(0, 5).map((a, i) => (
              <li key={i} className="text-sm">
                <span className="text-[--color-accent]">
                  {a.manuscript_title}
                </span>{" "}
                <span className="text-[--color-text-muted]">&rsaquo;</span>{" "}
                <span className="text-[--color-link]">{a.chapter_title}</span>
                {a.notes && (
                  <span className="text-[--color-text-muted] italic ml-1">
                    {a.notes}
                  </span>
                )}
              </li>
            ))}
            {appearances.length > 5 && (
              <li className="text-xs text-[--color-text-muted]">
                +{appearances.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}

      {relationships.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[--color-text-secondary] border-b border-[--color-bg-accent] pb-1 mb-2">
            Relationships
          </h3>
          <ul className="space-y-1">
            {relationships.map((r, i) => (
              <li key={i} className="text-sm">
                <span className="text-[--color-text-muted]">
                  {r.direction === "outgoing" ? "\u2192" : "\u2190"}
                </span>{" "}
                <span className="font-medium text-[--color-text-primary]">
                  {r.type}
                </span>{" "}
                <span className="text-[--color-text-secondary]">
                  {r.entity.name}
                </span>{" "}
                <span className="text-[--color-text-muted] text-xs">
                  ({r.entity.type})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
