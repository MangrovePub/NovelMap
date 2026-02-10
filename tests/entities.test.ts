import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "../src/db/database.js";
import { ProjectStore } from "../src/core/projects.js";
import { EntityStore } from "../src/core/entities.js";

describe("EntityStore", () => {
  let db: Database;
  let projects: ProjectStore;
  let entities: EntityStore;

  beforeEach(() => {
    db = new Database(":memory:");
    projects = new ProjectStore(db);
    entities = new EntityStore(db);
    projects.create("Test Project", "/test");
  });

  afterEach(() => {
    db.close();
  });

  it("creates an entity", () => {
    const entity = entities.create(1, "character", "Alice", { role: "protagonist" });
    expect(entity.id).toBe(1);
    expect(entity.name).toBe("Alice");
    expect(entity.type).toBe("character");
    expect(entity.metadata).toEqual({ role: "protagonist" });
  });

  it("lists entities by project", () => {
    entities.create(1, "character", "Alice");
    entities.create(1, "location", "Wonderland");
    const all = entities.list(1);
    expect(all).toHaveLength(2);
  });

  it("filters entities by type", () => {
    entities.create(1, "character", "Alice");
    entities.create(1, "location", "Wonderland");
    const chars = entities.list(1, { type: "character" });
    expect(chars).toHaveLength(1);
    expect(chars[0].name).toBe("Alice");
  });

  it("updates an entity", () => {
    entities.create(1, "character", "Alice");
    const updated = entities.update(1, { name: "Alice Liddell" });
    expect(updated.name).toBe("Alice Liddell");
  });

  it("deletes an entity", () => {
    entities.create(1, "character", "Alice");
    entities.delete(1);
    expect(() => entities.get(1)).toThrow();
  });

  it("throws on missing entity", () => {
    expect(() => entities.get(999)).toThrow("Entity not found: 999");
  });
});
