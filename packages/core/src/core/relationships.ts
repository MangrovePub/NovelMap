import type { Database as DB } from "../db/database.js";
import type { Relationship } from "./types.js";

export class RelationshipStore {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  create(
    sourceEntityId: number,
    targetEntityId: number,
    type: string,
    metadata: Record<string, unknown> = {}
  ): Relationship {
    const stmt = this.db.db.prepare(
      "INSERT INTO relationship (source_entity_id, target_entity_id, type, metadata) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(sourceEntityId, targetEntityId, type, JSON.stringify(metadata));
    return this.get(Number(result.lastInsertRowid));
  }

  get(id: number): Relationship {
    const row = this.db.db
      .prepare("SELECT * FROM relationship WHERE id = ?")
      .get(id) as (Omit<Relationship, "metadata"> & { metadata: string }) | undefined;
    if (!row) throw new Error(`Relationship not found: ${id}`);
    return { ...row, metadata: JSON.parse(row.metadata) };
  }

  listForEntity(entityId: number): Relationship[] {
    const rows = this.db.db
      .prepare(
        "SELECT * FROM relationship WHERE source_entity_id = ? OR target_entity_id = ? ORDER BY id"
      )
      .all(entityId, entityId) as (Omit<Relationship, "metadata"> & { metadata: string })[];
    return rows.map((r) => ({ ...r, metadata: JSON.parse(r.metadata) }));
  }

  listBySource(entityId: number): Relationship[] {
    const rows = this.db.db
      .prepare("SELECT * FROM relationship WHERE source_entity_id = ? ORDER BY id")
      .all(entityId) as (Omit<Relationship, "metadata"> & { metadata: string })[];
    return rows.map((r) => ({ ...r, metadata: JSON.parse(r.metadata) }));
  }

  listByTarget(entityId: number): Relationship[] {
    const rows = this.db.db
      .prepare("SELECT * FROM relationship WHERE target_entity_id = ? ORDER BY id")
      .all(entityId) as (Omit<Relationship, "metadata"> & { metadata: string })[];
    return rows.map((r) => ({ ...r, metadata: JSON.parse(r.metadata) }));
  }

  update(
    id: number,
    fields: Partial<Pick<Relationship, "type" | "metadata">>
  ): Relationship {
    const current = this.get(id);
    const type = fields.type ?? current.type;
    const metadata = fields.metadata ?? current.metadata;
    this.db.db
      .prepare("UPDATE relationship SET type = ?, metadata = ? WHERE id = ?")
      .run(type, JSON.stringify(metadata), id);
    return this.get(id);
  }

  delete(id: number): void {
    const result = this.db.db
      .prepare("DELETE FROM relationship WHERE id = ?")
      .run(id);
    if (result.changes === 0) throw new Error(`Relationship not found: ${id}`);
  }
}
