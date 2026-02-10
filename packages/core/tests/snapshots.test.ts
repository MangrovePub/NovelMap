import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "../src/db/database.js";
import { SnapshotStore } from "../src/core/snapshots.js";

describe("SnapshotStore", () => {
  let db: Database;
  let snapshots: SnapshotStore;

  beforeEach(() => {
    db = new Database(":memory:");
    snapshots = new SnapshotStore(db);
    // Set up a project with data
    db.db.prepare("INSERT INTO project (name, path) VALUES ('Test', '/test')").run();
    db.db.prepare("INSERT INTO manuscript (project_id, title, file_path) VALUES (1, 'Book One', '/b1.md')").run();
    db.db.prepare("INSERT INTO chapter (manuscript_id, title, order_index, body) VALUES (1, 'Ch1', 0, 'text')").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'character', 'Alice', '{\"role\":\"hero\"}')").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'location', 'Wonderland', '{}')").run();
    db.db.prepare("INSERT INTO appearance (entity_id, manuscript_id, chapter_id) VALUES (1, 1, 1)").run();
    db.db.prepare("INSERT INTO relationship (source_entity_id, target_entity_id, type, metadata) VALUES (1, 2, 'Located In', '{}')").run();
  });

  afterEach(() => {
    db.close();
  });

  it("creates a snapshot capturing all state", () => {
    const snap = snapshots.create(1);
    expect(snap.id).toBe(1);
    expect(snap.project_id).toBe(1);
    expect(snap.data.entities).toHaveLength(2);
    expect(snap.data.manuscripts).toHaveLength(1);
    expect(snap.data.chapters).toHaveLength(1);
    expect(snap.data.appearances).toHaveLength(1);
    expect(snap.data.relationships).toHaveLength(1);
  });

  it("lists snapshots for a project", () => {
    snapshots.create(1);
    snapshots.create(1);
    const list = snapshots.list(1);
    expect(list).toHaveLength(2);
  });

  it("restores a snapshot", () => {
    const snap = snapshots.create(1);

    // Modify state: add an entity, delete the old one
    db.db.prepare("DELETE FROM appearance WHERE entity_id = 1").run();
    db.db.prepare("DELETE FROM relationship WHERE source_entity_id = 1").run();
    db.db.prepare("DELETE FROM entity WHERE id = 1").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'character', 'Charlie', '{}')").run();

    // Verify state changed
    const entities = db.db.prepare("SELECT name FROM entity WHERE project_id = 1 ORDER BY name").all() as { name: string }[];
    expect(entities.map((e) => e.name)).toContain("Charlie");
    expect(entities.map((e) => e.name)).not.toContain("Alice");

    // Restore
    snapshots.restore(snap.id);

    // Verify state restored
    const restored = db.db.prepare("SELECT name FROM entity WHERE project_id = 1 ORDER BY name").all() as { name: string }[];
    expect(restored.map((e) => e.name)).toContain("Alice");
    expect(restored.map((e) => e.name)).not.toContain("Charlie");
    expect(db.db.prepare("SELECT * FROM appearance WHERE entity_id = 1").all()).toHaveLength(1);
    expect(db.db.prepare("SELECT * FROM relationship WHERE source_entity_id = 1").all()).toHaveLength(1);
  });

  it("diffs two snapshots", () => {
    const snap1 = snapshots.create(1);

    // Add an entity
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'character', 'Charlie', '{}')").run();
    // Change Alice's metadata
    db.db.prepare("UPDATE entity SET metadata = '{\"role\":\"villain\"}' WHERE name = 'Alice'").run();

    const snap2 = snapshots.create(1);

    const diff = snapshots.diff(snap1.id, snap2.id);
    expect(diff.entities.added).toContain("Charlie");
    expect(diff.entities.removed).toHaveLength(0);
    expect(diff.entities.changed).toContain("Alice");
  });

  it("throws on missing snapshot", () => {
    expect(() => snapshots.get(999)).toThrow("Snapshot not found: 999");
  });
});
