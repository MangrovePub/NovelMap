import type { Database as DB } from "../db/database.js";
import type { Project } from "./types.js";

export class ProjectStore {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  create(name: string, path: string): Project {
    const stmt = this.db.db.prepare(
      "INSERT INTO project (name, path) VALUES (?, ?)"
    );
    const result = stmt.run(name, path);
    return this.get(Number(result.lastInsertRowid));
  }

  get(id: number): Project {
    const row = this.db.db
      .prepare("SELECT * FROM project WHERE id = ?")
      .get(id) as Project | undefined;
    if (!row) throw new Error(`Project not found: ${id}`);
    return row;
  }

  list(): Project[] {
    return this.db.db
      .prepare("SELECT * FROM project ORDER BY created_at DESC")
      .all() as Project[];
  }

  update(id: number, fields: Partial<Pick<Project, "name" | "path">>): Project {
    const current = this.get(id);
    const name = fields.name ?? current.name;
    const path = fields.path ?? current.path;
    this.db.db
      .prepare("UPDATE project SET name = ?, path = ? WHERE id = ?")
      .run(name, path, id);
    return this.get(id);
  }

  delete(id: number): void {
    const result = this.db.db
      .prepare("DELETE FROM project WHERE id = ?")
      .run(id);
    if (result.changes === 0) throw new Error(`Project not found: ${id}`);
  }
}
