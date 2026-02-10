import type { Database as DB } from "../db/database.js";
import type {
  Project,
  Manuscript,
  Chapter,
  Entity,
  Appearance,
  Relationship,
} from "../core/types.js";

export interface NovelMapExport {
  version: "1.0";
  exportedAt: string;
  project: Project;
  manuscripts: (Manuscript & { chapters: Chapter[] })[];
  entities: Entity[];
  appearances: Appearance[];
  relationships: Relationship[];
}

/**
 * Export a complete NovelMap project as a portable JSON bundle.
 * This format preserves all data and can be re-imported into NovelMap
 * or consumed by external tools.
 */
export function exportNovelMapJSON(
  db: DB,
  projectId: number
): NovelMapExport {
  const project = db.db
    .prepare("SELECT * FROM project WHERE id = ?")
    .get(projectId) as Project | undefined;
  if (!project) throw new Error(`Project not found: ${projectId}`);

  const manuscripts = db.db
    .prepare("SELECT * FROM manuscript WHERE project_id = ? ORDER BY id")
    .all(projectId) as Manuscript[];

  const manuscriptsWithChapters = manuscripts.map((m) => {
    const chapters = db.db
      .prepare(
        "SELECT * FROM chapter WHERE manuscript_id = ? ORDER BY order_index"
      )
      .all(m.id) as Chapter[];
    return { ...m, chapters };
  });

  const rawEntities = db.db
    .prepare("SELECT * FROM entity WHERE project_id = ? ORDER BY type, name")
    .all(projectId) as (Omit<Entity, "metadata"> & { metadata: string })[];
  const entities = rawEntities.map((e) => ({
    ...e,
    metadata: JSON.parse(e.metadata),
  }));

  const entityIds = entities.map((e) => e.id);

  const appearances = db.db
    .prepare(
      `SELECT a.* FROM appearance a
       JOIN entity e ON a.entity_id = e.id
       WHERE e.project_id = ?
       ORDER BY a.id`
    )
    .all(projectId) as Appearance[];

  const rawRels = db.db
    .prepare(
      `SELECT r.* FROM relationship r
       WHERE r.source_entity_id IN (SELECT id FROM entity WHERE project_id = ?)
       ORDER BY r.id`
    )
    .all(projectId) as (Omit<Relationship, "metadata"> & {
    metadata: string;
  })[];
  const relationships = rawRels.map((r) => ({
    ...r,
    metadata: JSON.parse(r.metadata),
  }));

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    project,
    manuscripts: manuscriptsWithChapters,
    entities,
    appearances,
    relationships,
  };
}
