import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "../src/db/database.js";
import { ProjectStore } from "../src/core/projects.js";
import { EntityStore } from "../src/core/entities.js";
import { AppearanceStore } from "../src/core/appearances.js";

describe("AppearanceStore", () => {
  let db: Database;
  let appearances: AppearanceStore;

  beforeEach(() => {
    db = new Database(":memory:");
    const projects = new ProjectStore(db);
    const entities = new EntityStore(db);

    // Set up test data
    projects.create("Test Project", "/test");
    // Insert a manuscript
    db.db
      .prepare(
        "INSERT INTO manuscript (project_id, title, file_path) VALUES (1, 'Book One', '/book1.md')"
      )
      .run();
    // Insert chapters
    db.db
      .prepare(
        "INSERT INTO chapter (manuscript_id, title, order_index, body) VALUES (1, 'Chapter 1', 0, 'Alice fell down the rabbit hole.')"
      )
      .run();
    db.db
      .prepare(
        "INSERT INTO chapter (manuscript_id, title, order_index, body) VALUES (1, 'Chapter 2', 1, 'She met the Cheshire Cat.')"
      )
      .run();
    // Insert an entity
    entities.create(1, "character", "Alice");

    appearances = new AppearanceStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates an appearance", () => {
    const app = appearances.create(1, 1, 1, { start: 0, end: 5 }, "First mention");
    expect(app.id).toBe(1);
    expect(app.entity_id).toBe(1);
    expect(app.chapter_id).toBe(1);
    expect(app.text_range_start).toBe(0);
    expect(app.text_range_end).toBe(5);
    expect(app.notes).toBe("First mention");
  });

  it("creates an appearance without text range", () => {
    const app = appearances.create(1, 1, 1);
    expect(app.text_range_start).toBeNull();
    expect(app.text_range_end).toBeNull();
    expect(app.notes).toBeNull();
  });

  it("lists appearances for an entity", () => {
    appearances.create(1, 1, 1);
    appearances.create(1, 1, 2);
    const list = appearances.listForEntity(1);
    expect(list).toHaveLength(2);
  });

  it("lists appearances for a chapter", () => {
    appearances.create(1, 1, 1);
    const list = appearances.listForChapter(1);
    expect(list).toHaveLength(1);
  });

  it("deletes an appearance", () => {
    appearances.create(1, 1, 1);
    appearances.delete(1);
    expect(() => appearances.get(1)).toThrow();
  });

  it("throws on missing appearance", () => {
    expect(() => appearances.get(999)).toThrow("Appearance not found: 999");
  });
});
