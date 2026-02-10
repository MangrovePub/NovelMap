import type { Database as DB } from "../db/database.js";
import type { Entity, EntityType } from "./types.js";

export interface SearchFilters {
  type?: EntityType;
  manuscriptId?: number;
}

/**
 * Search entities by name (prefix match) with optional type and manuscript filters.
 */
export function searchEntities(
  db: DB,
  projectId: number,
  query: string,
  filters?: SearchFilters
): Entity[] {
  const pattern = `%${query}%`;

  if (filters?.manuscriptId) {
    // Find entities that have appearances in a specific manuscript
    const sql = filters.type
      ? `SELECT DISTINCT e.* FROM entity e
         JOIN appearance a ON e.id = a.entity_id
         WHERE e.project_id = ? AND e.name LIKE ? AND e.type = ? AND a.manuscript_id = ?
         ORDER BY e.name`
      : `SELECT DISTINCT e.* FROM entity e
         JOIN appearance a ON e.id = a.entity_id
         WHERE e.project_id = ? AND e.name LIKE ? AND a.manuscript_id = ?
         ORDER BY e.name`;

    const params = filters.type
      ? [projectId, pattern, filters.type, filters.manuscriptId]
      : [projectId, pattern, filters.manuscriptId];

    const rows = db.db.prepare(sql).all(...params) as (Omit<Entity, "metadata"> & { metadata: string })[];
    return rows.map((r) => ({ ...r, metadata: JSON.parse(r.metadata) }));
  }

  if (filters?.type) {
    const rows = db.db
      .prepare(
        "SELECT * FROM entity WHERE project_id = ? AND name LIKE ? AND type = ? ORDER BY name"
      )
      .all(projectId, pattern, filters.type) as (Omit<Entity, "metadata"> & { metadata: string })[];
    return rows.map((r) => ({ ...r, metadata: JSON.parse(r.metadata) }));
  }

  const rows = db.db
    .prepare("SELECT * FROM entity WHERE project_id = ? AND name LIKE ? ORDER BY name")
    .all(projectId, pattern) as (Omit<Entity, "metadata"> & { metadata: string })[];
  return rows.map((r) => ({ ...r, metadata: JSON.parse(r.metadata) }));
}
