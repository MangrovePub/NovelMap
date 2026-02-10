import type { Database as DB } from "../db/database.js";
import type { Appearance } from "./types.js";

export class AppearanceStore {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  create(
    entityId: number,
    manuscriptId: number,
    chapterId: number,
    textRange?: { start: number; end: number },
    notes?: string
  ): Appearance {
    const stmt = this.db.db.prepare(
      "INSERT INTO appearance (entity_id, manuscript_id, chapter_id, text_range_start, text_range_end, notes) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const result = stmt.run(
      entityId,
      manuscriptId,
      chapterId,
      textRange?.start ?? null,
      textRange?.end ?? null,
      notes ?? null
    );
    return this.get(Number(result.lastInsertRowid));
  }

  get(id: number): Appearance {
    const row = this.db.db
      .prepare("SELECT * FROM appearance WHERE id = ?")
      .get(id) as Appearance | undefined;
    if (!row) throw new Error(`Appearance not found: ${id}`);
    return row;
  }

  listForEntity(entityId: number): Appearance[] {
    return this.db.db
      .prepare("SELECT * FROM appearance WHERE entity_id = ? ORDER BY id")
      .all(entityId) as Appearance[];
  }

  listForChapter(chapterId: number): Appearance[] {
    return this.db.db
      .prepare("SELECT * FROM appearance WHERE chapter_id = ? ORDER BY text_range_start")
      .all(chapterId) as Appearance[];
  }

  delete(id: number): void {
    const result = this.db.db
      .prepare("DELETE FROM appearance WHERE id = ?")
      .run(id);
    if (result.changes === 0) throw new Error(`Appearance not found: ${id}`);
  }
}
