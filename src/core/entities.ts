import type { Database as DB } from "../db/database.js";
import type { Entity, EntityType } from "./types.js";

export class EntityStore {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  create(
    projectId: number,
    type: EntityType,
    name: string,
    metadata: Record<string, unknown> = {}
  ): Entity {
    const stmt = this.db.db.prepare(
      "INSERT INTO entity (project_id, type, name, metadata) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(projectId, type, name, JSON.stringify(metadata));
    return this.get(Number(result.lastInsertRowid));
  }

  get(id: number): Entity {
    const row = this.db.db
      .prepare("SELECT * FROM entity WHERE id = ?")
      .get(id) as (Omit<Entity, "metadata"> & { metadata: string }) | undefined;
    if (!row) throw new Error(`Entity not found: ${id}`);
    return { ...row, metadata: JSON.parse(row.metadata) };
  }

  list(
    projectId: number,
    filters?: { type?: EntityType }
  ): Entity[] {
    if (filters?.type) {
      const rows = this.db.db
        .prepare(
          "SELECT * FROM entity WHERE project_id = ? AND type = ? ORDER BY name"
        )
        .all(projectId, filters.type) as (Omit<Entity, "metadata"> & { metadata: string })[];
      return rows.map((r) => ({ ...r, metadata: JSON.parse(r.metadata) }));
    }
    const rows = this.db.db
      .prepare("SELECT * FROM entity WHERE project_id = ? ORDER BY name")
      .all(projectId) as (Omit<Entity, "metadata"> & { metadata: string })[];
    return rows.map((r) => ({ ...r, metadata: JSON.parse(r.metadata) }));
  }

  update(
    id: number,
    fields: Partial<Pick<Entity, "name" | "type" | "metadata">>
  ): Entity {
    const current = this.get(id);
    const name = fields.name ?? current.name;
    const type = fields.type ?? current.type;
    const metadata = fields.metadata ?? current.metadata;
    this.db.db
      .prepare("UPDATE entity SET name = ?, type = ?, metadata = ? WHERE id = ?")
      .run(name, type, JSON.stringify(metadata), id);
    return this.get(id);
  }

  delete(id: number): void {
    const result = this.db.db
      .prepare("DELETE FROM entity WHERE id = ?")
      .run(id);
    if (result.changes === 0) throw new Error(`Entity not found: ${id}`);
  }
}
