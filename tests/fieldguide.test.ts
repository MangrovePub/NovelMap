import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "../src/db/database.js";
import { buildDossier, buildFieldGuide, renderFieldGuideHtml } from "../src/views/fieldguide.js";

describe("Field Guide", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    // Set up test data
    db.db.prepare("INSERT INTO project (name, path) VALUES ('Test', '/test')").run();
    db.db.prepare("INSERT INTO manuscript (project_id, title, file_path) VALUES (1, 'Book One', '/book1.md')").run();
    db.db.prepare("INSERT INTO chapter (manuscript_id, title, order_index, body) VALUES (1, 'Chapter 1', 0, 'Alice fell down.')").run();
    db.db.prepare("INSERT INTO chapter (manuscript_id, title, order_index, body) VALUES (1, 'Chapter 2', 1, 'She met the Cat.')").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'character', 'Alice', '{\"role\":\"protagonist\"}')").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'location', 'Wonderland', '{}')").run();
    db.db.prepare("INSERT INTO appearance (entity_id, manuscript_id, chapter_id, notes) VALUES (1, 1, 1, 'First scene')").run();
    db.db.prepare("INSERT INTO appearance (entity_id, manuscript_id, chapter_id) VALUES (1, 1, 2)").run();
    db.db.prepare("INSERT INTO relationship (source_entity_id, target_entity_id, type, metadata) VALUES (1, 2, 'Located In', '{}')").run();
  });

  afterEach(() => {
    db.close();
  });

  it("builds a dossier for an entity", () => {
    const dossier = buildDossier(db, 1);
    expect(dossier.entity.name).toBe("Alice");
    expect(dossier.entity.metadata).toEqual({ role: "protagonist" });
    expect(dossier.appearances).toHaveLength(2);
    expect(dossier.appearances[0].chapter_title).toBe("Chapter 1");
    expect(dossier.relationships).toHaveLength(1);
    expect(dossier.relationships[0].type).toBe("Located In");
    expect(dossier.relationships[0].entity.name).toBe("Wonderland");
    expect(dossier.relationships[0].direction).toBe("outgoing");
  });

  it("builds incoming relationships", () => {
    const dossier = buildDossier(db, 2);
    expect(dossier.relationships).toHaveLength(1);
    expect(dossier.relationships[0].direction).toBe("incoming");
    expect(dossier.relationships[0].entity.name).toBe("Alice");
  });

  it("builds a full field guide", () => {
    const guide = buildFieldGuide(db, 1);
    expect(guide).toHaveLength(2);
  });

  it("renders HTML", () => {
    const guide = buildFieldGuide(db, 1);
    const html = renderFieldGuideHtml(guide);
    expect(html).toContain("Field Guide");
    expect(html).toContain("Alice");
    expect(html).toContain("Wonderland");
    expect(html).toContain("protagonist");
    expect(html).toContain("Located In");
  });

  it("throws on missing entity", () => {
    expect(() => buildDossier(db, 999)).toThrow("Entity not found: 999");
  });
});
