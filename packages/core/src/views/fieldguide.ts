import type { Database as DB } from "../db/database.js";
import type { Entity, Appearance, Relationship } from "../core/types.js";

export interface DossierEntry {
  entity: Entity;
  appearances: (Appearance & { chapter_title: string; manuscript_title: string })[];
  relationships: { entity: Entity; type: string; direction: "outgoing" | "incoming" }[];
}

/**
 * Build a dossier for a single entity: metadata, appearances, and relationships.
 */
export function buildDossier(db: DB, entityId: number): DossierEntry {
  const entity = db.db
    .prepare("SELECT * FROM entity WHERE id = ?")
    .get(entityId) as (Omit<Entity, "metadata"> & { metadata: string }) | undefined;
  if (!entity) throw new Error(`Entity not found: ${entityId}`);

  const appearances = db.db
    .prepare(`
      SELECT a.*, c.title as chapter_title, m.title as manuscript_title
      FROM appearance a
      JOIN chapter c ON a.chapter_id = c.id
      JOIN manuscript m ON a.manuscript_id = m.id
      WHERE a.entity_id = ?
      ORDER BY m.title, c.order_index
    `)
    .all(entityId) as (Appearance & { chapter_title: string; manuscript_title: string })[];

  const outgoing = db.db
    .prepare(`
      SELECT r.type as rel_type, e.id, e.project_id, e.type as entity_type, e.name, e.metadata, e.created_at
      FROM relationship r
      JOIN entity e ON r.target_entity_id = e.id
      WHERE r.source_entity_id = ?
    `)
    .all(entityId) as { rel_type: string; id: number; project_id: number; entity_type: string; name: string; metadata: string; created_at: string }[];

  const incoming = db.db
    .prepare(`
      SELECT r.type as rel_type, e.id, e.project_id, e.type as entity_type, e.name, e.metadata, e.created_at
      FROM relationship r
      JOIN entity e ON r.source_entity_id = e.id
      WHERE r.target_entity_id = ?
    `)
    .all(entityId) as { rel_type: string; id: number; project_id: number; entity_type: string; name: string; metadata: string; created_at: string }[];

  const relationships = [
    ...outgoing.map((r) => ({
      entity: { id: r.id, project_id: r.project_id, type: r.entity_type, name: r.name, metadata: JSON.parse(r.metadata), created_at: r.created_at } as Entity,
      type: r.rel_type,
      direction: "outgoing" as const,
    })),
    ...incoming.map((r) => ({
      entity: { id: r.id, project_id: r.project_id, type: r.entity_type, name: r.name, metadata: JSON.parse(r.metadata), created_at: r.created_at } as Entity,
      type: r.rel_type,
      direction: "incoming" as const,
    })),
  ];

  return {
    entity: { ...entity, metadata: JSON.parse(entity.metadata) },
    appearances,
    relationships,
  };
}

/**
 * Build dossiers for all entities in a project.
 */
export function buildFieldGuide(db: DB, projectId: number): DossierEntry[] {
  const entities = db.db
    .prepare("SELECT id FROM entity WHERE project_id = ? ORDER BY type, name")
    .all(projectId) as { id: number }[];

  return entities.map((e) => buildDossier(db, e.id));
}

/**
 * Render the Field Guide as a standalone HTML page.
 */
export function renderFieldGuideHtml(dossiers: DossierEntry[]): string {
  const cards = dossiers
    .map((d) => {
      const meta = Object.entries(d.entity.metadata)
        .map(([k, v]) => `<div class="meta-item"><strong>${esc(k)}:</strong> ${esc(String(v))}</div>`)
        .join("\n");

      const apps = d.appearances
        .map(
          (a) =>
            `<li><span class="manuscript">${esc(a.manuscript_title)}</span> &rsaquo; <span class="chapter">${esc(a.chapter_title)}</span>${a.notes ? ` <em class="notes">${esc(a.notes)}</em>` : ""}</li>`
        )
        .join("\n");

      const rels = d.relationships
        .map(
          (r) =>
            `<li>${r.direction === "outgoing" ? "&rarr;" : "&larr;"} <strong>${esc(r.type)}</strong> ${esc(r.entity.name)} <span class="entity-type">(${esc(r.entity.type)})</span></li>`
        )
        .join("\n");

      return `
    <div class="dossier" id="entity-${d.entity.id}">
      <div class="dossier-header">
        <h2>${esc(d.entity.name)}</h2>
        <span class="entity-type-badge">${esc(d.entity.type)}</span>
      </div>
      ${meta ? `<div class="meta">${meta}</div>` : ""}
      ${apps ? `<div class="appearances"><h3>Appearances</h3><ul>${apps}</ul></div>` : ""}
      ${rels ? `<div class="relationships"><h3>Relationships</h3><ul>${rels}</ul></div>` : ""}
    </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NovelMap — Field Guide</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #1a1a2e; color: #e0e0e0; padding: 2rem; }
  h1 { color: #e0e0e0; margin-bottom: 2rem; font-size: 1.8rem; }
  .dossier { background: #16213e; border: 1px solid #0f3460; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
  .dossier-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
  .dossier-header h2 { font-size: 1.3rem; color: #e94560; }
  .entity-type-badge { background: #0f3460; color: #e0e0e0; padding: 0.2rem 0.8rem; border-radius: 12px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .entity-type { color: #888; font-size: 0.85rem; }
  .meta { margin-bottom: 1rem; }
  .meta-item { margin-bottom: 0.3rem; font-size: 0.9rem; }
  h3 { font-size: 1rem; color: #a0a0a0; margin-bottom: 0.5rem; border-bottom: 1px solid #333; padding-bottom: 0.3rem; }
  ul { list-style: none; padding-left: 0; }
  li { padding: 0.3rem 0; font-size: 0.9rem; }
  .manuscript { color: #e94560; }
  .chapter { color: #a0c4ff; }
  .notes { color: #888; }
</style>
</head>
<body>
<h1>Field Guide</h1>
${cards || "<p>No entities found.</p>"}
</body>
</html>`;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
