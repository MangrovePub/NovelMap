import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "../src/db/database.js";

describe("Database", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("initializes with all tables", () => {
    const tables = db.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all() as { name: string }[];

    const names = tables.map((t) => t.name);
    expect(names).toContain("project");
    expect(names).toContain("manuscript");
    expect(names).toContain("chapter");
    expect(names).toContain("entity");
    expect(names).toContain("appearance");
    expect(names).toContain("relationship");
  });

  it("has cover_url column on manuscript table", () => {
    const cols = db.db.pragma("table_info(manuscript)") as { name: string }[];
    expect(cols.map((c) => c.name)).toContain("cover_url");
  });

  it("has series_order column on manuscript table", () => {
    const cols = db.db.pragma("table_info(manuscript)") as { name: string }[];
    expect(cols.map((c) => c.name)).toContain("series_order");
  });

  it("enforces foreign keys", () => {
    expect(() => {
      db.db
        .prepare(
          "INSERT INTO manuscript (project_id, title, file_path) VALUES (999, 'test', '/test.md')"
        )
        .run();
    }).toThrow();
  });
});
