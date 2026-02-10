import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "../src/db/database.js";
import { searchEntities } from "../src/core/search.js";

describe("searchEntities", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.db.prepare("INSERT INTO project (name, path) VALUES ('Test', '/test')").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'character', 'Alice Liddell', '{}')").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'character', 'Bob Smith', '{}')").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'location', 'Wonderland', '{}')").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'artifact', 'Looking Glass', '{}')").run();

    // Add manuscript + chapter + appearance for manuscript filtering
    db.db.prepare("INSERT INTO manuscript (project_id, title, file_path) VALUES (1, 'Book One', '/b1.md')").run();
    db.db.prepare("INSERT INTO chapter (manuscript_id, title, order_index, body) VALUES (1, 'Ch1', 0, '')").run();
    db.db.prepare("INSERT INTO appearance (entity_id, manuscript_id, chapter_id) VALUES (1, 1, 1)").run();
    db.db.prepare("INSERT INTO appearance (entity_id, manuscript_id, chapter_id) VALUES (3, 1, 1)").run();
  });

  afterEach(() => {
    db.close();
  });

  it("searches by name substring", () => {
    const results = searchEntities(db, 1, "Alice");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Alice Liddell");
  });

  it("is case-insensitive", () => {
    const results = searchEntities(db, 1, "alice");
    expect(results).toHaveLength(1);
  });

  it("returns multiple matches", () => {
    const results = searchEntities(db, 1, "l");
    // Alice Liddell, Wonderland, Looking Glass
    expect(results.length).toBeGreaterThanOrEqual(3);
  });

  it("returns empty for no matches", () => {
    const results = searchEntities(db, 1, "zzzzz");
    expect(results).toHaveLength(0);
  });

  it("filters by type", () => {
    const results = searchEntities(db, 1, "l", { type: "location" });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Wonderland");
  });

  it("filters by manuscript", () => {
    const results = searchEntities(db, 1, "", { manuscriptId: 1 });
    // Only Alice and Wonderland have appearances in manuscript 1
    expect(results).toHaveLength(2);
  });

  it("combines type and manuscript filters", () => {
    const results = searchEntities(db, 1, "", { type: "character", manuscriptId: 1 });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Alice Liddell");
  });
});
