import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "../src/db/database.js";
import { buildGraph, renderGraphHtml } from "../src/views/graph.js";

describe("Graph View", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.db.prepare("INSERT INTO project (name, path) VALUES ('Test', '/test')").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'character', 'Alice', '{}')").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'character', 'Bob', '{}')").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'location', 'Wonderland', '{}')").run();
    db.db.prepare("INSERT INTO relationship (source_entity_id, target_entity_id, type, metadata) VALUES (1, 2, 'Knows', '{}')").run();
    db.db.prepare("INSERT INTO relationship (source_entity_id, target_entity_id, type, metadata) VALUES (1, 3, 'Located In', '{}')").run();

    // Manuscript + appearance for filtering
    db.db.prepare("INSERT INTO manuscript (project_id, title, file_path) VALUES (1, 'Book One', '/b1.md')").run();
    db.db.prepare("INSERT INTO chapter (manuscript_id, title, order_index, body) VALUES (1, 'Ch1', 0, '')").run();
    db.db.prepare("INSERT INTO appearance (entity_id, manuscript_id, chapter_id) VALUES (1, 1, 1)").run();
    db.db.prepare("INSERT INTO appearance (entity_id, manuscript_id, chapter_id) VALUES (2, 1, 1)").run();
  });

  afterEach(() => {
    db.close();
  });

  it("builds graph with all entities and relationships", () => {
    const graph = buildGraph(db, 1);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(2);
  });

  it("filters by entity type", () => {
    const graph = buildGraph(db, 1, { type: "character" });
    expect(graph.nodes).toHaveLength(2);
    // Only the Knows edge (both endpoints are characters)
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].type).toBe("Knows");
  });

  it("filters by manuscript", () => {
    const graph = buildGraph(db, 1, { manuscriptId: 1 });
    // Only Alice and Bob appear in Book One
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
  });

  it("renders HTML with D3", () => {
    const graph = buildGraph(db, 1);
    const html = renderGraphHtml(graph);
    expect(html).toContain("d3.v7.min.js");
    expect(html).toContain("Alice");
    expect(html).toContain("Knows");
    expect(html).toContain("forceSimulation");
  });

  it("handles empty graph", () => {
    const db2 = new Database(":memory:");
    db2.db.prepare("INSERT INTO project (name, path) VALUES ('Empty', '/empty')").run();
    const graph = buildGraph(db2, 1);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
    const html = renderGraphHtml(graph);
    expect(html).toContain("Graph View");
    db2.close();
  });
});
