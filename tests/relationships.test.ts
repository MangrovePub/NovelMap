import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "../src/db/database.js";
import { RelationshipStore } from "../src/core/relationships.js";

describe("RelationshipStore", () => {
  let db: Database;
  let rels: RelationshipStore;

  beforeEach(() => {
    db = new Database(":memory:");
    db.db.prepare("INSERT INTO project (name, path) VALUES ('Test', '/test')").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'character', 'Alice', '{}')").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'character', 'Bob', '{}')").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'location', 'Wonderland', '{}')").run();
    rels = new RelationshipStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates a relationship", () => {
    const rel = rels.create(1, 2, "Knows", { since: "chapter 1" });
    expect(rel.id).toBe(1);
    expect(rel.source_entity_id).toBe(1);
    expect(rel.target_entity_id).toBe(2);
    expect(rel.type).toBe("Knows");
    expect(rel.metadata).toEqual({ since: "chapter 1" });
  });

  it("gets a relationship by id", () => {
    rels.create(1, 2, "Knows");
    const rel = rels.get(1);
    expect(rel.type).toBe("Knows");
  });

  it("lists all relationships for an entity (both directions)", () => {
    rels.create(1, 2, "Knows");
    rels.create(3, 1, "Located In");
    const all = rels.listForEntity(1);
    expect(all).toHaveLength(2);
  });

  it("lists by source only", () => {
    rels.create(1, 2, "Knows");
    rels.create(2, 1, "Knows");
    const outgoing = rels.listBySource(1);
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0].target_entity_id).toBe(2);
  });

  it("lists by target only", () => {
    rels.create(1, 2, "Knows");
    rels.create(3, 2, "Located In");
    const incoming = rels.listByTarget(2);
    expect(incoming).toHaveLength(2);
  });

  it("updates a relationship", () => {
    rels.create(1, 2, "Knows");
    const updated = rels.update(1, { type: "Allied With", metadata: { strength: "strong" } });
    expect(updated.type).toBe("Allied With");
    expect(updated.metadata).toEqual({ strength: "strong" });
  });

  it("deletes a relationship", () => {
    rels.create(1, 2, "Knows");
    rels.delete(1);
    expect(() => rels.get(1)).toThrow();
  });

  it("throws on missing relationship", () => {
    expect(() => rels.get(999)).toThrow("Relationship not found: 999");
  });

  it("throws on deleting missing relationship", () => {
    expect(() => rels.delete(999)).toThrow("Relationship not found: 999");
  });
});
