import type { Database as DB } from "../db/database.js";

export interface Snapshot {
  id: number;
  project_id: number;
  created_at: string;
  data: SnapshotData;
}

export interface SnapshotData {
  entities: Record<string, unknown>[];
  relationships: Record<string, unknown>[];
  appearances: Record<string, unknown>[];
  manuscripts: Record<string, unknown>[];
  chapters: Record<string, unknown>[];
}

export interface SnapshotDiff {
  entities: { added: string[]; removed: string[]; changed: string[] };
  relationships: { added: number; removed: number };
  appearances: { added: number; removed: number };
}

export class SnapshotStore {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
    this.ensureTable();
  }

  private ensureTable(): void {
    this.db.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshot (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        data TEXT NOT NULL
      )
    `);
  }

  create(projectId: number): Snapshot {
    const data = this.captureState(projectId);
    const result = this.db.db
      .prepare("INSERT INTO snapshot (project_id, data) VALUES (?, ?)")
      .run(projectId, JSON.stringify(data));
    return this.get(Number(result.lastInsertRowid));
  }

  get(id: number): Snapshot {
    const row = this.db.db
      .prepare("SELECT * FROM snapshot WHERE id = ?")
      .get(id) as { id: number; project_id: number; created_at: string; data: string } | undefined;
    if (!row) throw new Error(`Snapshot not found: ${id}`);
    return { ...row, data: JSON.parse(row.data) };
  }

  list(projectId: number): Snapshot[] {
    const rows = this.db.db
      .prepare("SELECT * FROM snapshot WHERE project_id = ? ORDER BY created_at DESC")
      .all(projectId) as { id: number; project_id: number; created_at: string; data: string }[];
    return rows.map((r) => ({ ...r, data: JSON.parse(r.data) }));
  }

  restore(snapshotId: number): void {
    const snapshot = this.get(snapshotId);
    const projectId = snapshot.project_id;
    const data = snapshot.data;

    const tx = this.db.db.transaction(() => {
      // Clear current state
      this.db.db.prepare("DELETE FROM appearance WHERE entity_id IN (SELECT id FROM entity WHERE project_id = ?)").run(projectId);
      this.db.db.prepare("DELETE FROM relationship WHERE source_entity_id IN (SELECT id FROM entity WHERE project_id = ?)").run(projectId);
      this.db.db.prepare("DELETE FROM entity WHERE project_id = ?").run(projectId);
      this.db.db.prepare("DELETE FROM chapter WHERE manuscript_id IN (SELECT id FROM manuscript WHERE project_id = ?)").run(projectId);
      this.db.db.prepare("DELETE FROM manuscript WHERE project_id = ?").run(projectId);

      // Restore manuscripts
      for (const m of data.manuscripts) {
        this.db.db.prepare("INSERT INTO manuscript (id, project_id, title, file_path, cover_url, series_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(m.id, m.project_id, m.title, m.file_path, m.cover_url ?? null, m.series_order ?? null, m.created_at);
      }

      // Restore chapters
      for (const c of data.chapters) {
        this.db.db.prepare("INSERT INTO chapter (id, manuscript_id, title, order_index, body) VALUES (?, ?, ?, ?, ?)").run(c.id, c.manuscript_id, c.title, c.order_index, c.body);
      }

      // Restore entities
      for (const e of data.entities) {
        this.db.db.prepare("INSERT INTO entity (id, project_id, type, name, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(e.id, e.project_id, e.type, e.name, e.metadata, e.created_at);
      }

      // Restore relationships
      for (const r of data.relationships) {
        this.db.db.prepare("INSERT INTO relationship (id, source_entity_id, target_entity_id, type, metadata) VALUES (?, ?, ?, ?, ?)").run(r.id, r.source_entity_id, r.target_entity_id, r.type, r.metadata);
      }

      // Restore appearances
      for (const a of data.appearances) {
        this.db.db.prepare("INSERT INTO appearance (id, entity_id, manuscript_id, chapter_id, text_range_start, text_range_end, notes) VALUES (?, ?, ?, ?, ?, ?, ?)").run(a.id, a.entity_id, a.manuscript_id, a.chapter_id, a.text_range_start, a.text_range_end, a.notes);
      }
    });

    tx();
  }

  diff(snapshotA: number, snapshotB: number): SnapshotDiff {
    const a = this.get(snapshotA).data;
    const b = this.get(snapshotB).data;

    const namesA = new Set((a.entities as { name: string }[]).map((e) => e.name));
    const namesB = new Set((b.entities as { name: string }[]).map((e) => e.name));

    const added = [...namesB].filter((n) => !namesA.has(n));
    const removed = [...namesA].filter((n) => !namesB.has(n));

    // Changed: same name but different metadata
    const metaA = new Map((a.entities as { name: string; metadata: string }[]).map((e) => [e.name, e.metadata]));
    const metaB = new Map((b.entities as { name: string; metadata: string }[]).map((e) => [e.name, e.metadata]));
    const changed = [...namesA].filter((n) => namesB.has(n) && metaA.get(n) !== metaB.get(n));

    return {
      entities: { added, removed, changed },
      relationships: {
        added: Math.max(0, b.relationships.length - a.relationships.length),
        removed: Math.max(0, a.relationships.length - b.relationships.length),
      },
      appearances: {
        added: Math.max(0, b.appearances.length - a.appearances.length),
        removed: Math.max(0, a.appearances.length - b.appearances.length),
      },
    };
  }

  private captureState(projectId: number): SnapshotData {
    const entities = this.db.db.prepare("SELECT * FROM entity WHERE project_id = ?").all(projectId) as Record<string, unknown>[];
    const manuscripts = this.db.db.prepare("SELECT * FROM manuscript WHERE project_id = ?").all(projectId) as Record<string, unknown>[];
    const manuscriptIds = manuscripts.map((m) => m.id as number);

    let chapters: Record<string, unknown>[] = [];
    let appearances: Record<string, unknown>[] = [];
    if (manuscriptIds.length > 0) {
      const placeholders = manuscriptIds.map(() => "?").join(",");
      chapters = this.db.db.prepare(`SELECT * FROM chapter WHERE manuscript_id IN (${placeholders})`).all(...manuscriptIds) as Record<string, unknown>[];
      appearances = this.db.db.prepare(`SELECT * FROM appearance WHERE manuscript_id IN (${placeholders})`).all(...manuscriptIds) as Record<string, unknown>[];
    }

    const entityIds = entities.map((e) => e.id as number);
    let relationships: Record<string, unknown>[] = [];
    if (entityIds.length > 0) {
      const placeholders = entityIds.map(() => "?").join(",");
      relationships = this.db.db.prepare(`SELECT * FROM relationship WHERE source_entity_id IN (${placeholders})`).all(...entityIds) as Record<string, unknown>[];
    }

    return { entities, relationships, appearances, manuscripts, chapters };
  }
}
