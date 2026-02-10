import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "../src/db/database.js";
import { buildTimeline, detectGaps, renderTimelineHtml } from "../src/views/timeline.js";

describe("Timeline", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.db.prepare("INSERT INTO project (name, path) VALUES ('Test', '/test')").run();
    db.db.prepare("INSERT INTO manuscript (project_id, title, file_path) VALUES (1, 'Book One', '/b1.md')").run();
    // 10 chapters
    for (let i = 0; i < 10; i++) {
      db.db.prepare("INSERT INTO chapter (manuscript_id, title, order_index, body) VALUES (1, ?, ?, '')").run(`Chapter ${i + 1}`, i);
    }
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'character', 'Alice', '{}')").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'character', 'Bob', '{}')").run();
    // Alice appears in chapters 1, 2, and 9 (gap of 7)
    db.db.prepare("INSERT INTO appearance (entity_id, manuscript_id, chapter_id) VALUES (1, 1, 1)").run();
    db.db.prepare("INSERT INTO appearance (entity_id, manuscript_id, chapter_id) VALUES (1, 1, 2)").run();
    db.db.prepare("INSERT INTO appearance (entity_id, manuscript_id, chapter_id) VALUES (1, 1, 9)").run();
    // Bob appears in chapter 1 only
    db.db.prepare("INSERT INTO appearance (entity_id, manuscript_id, chapter_id) VALUES (2, 1, 1)").run();
  });

  afterEach(() => {
    db.close();
  });

  it("builds a timeline ordered by chapter", () => {
    const timeline = buildTimeline(db, 1);
    expect(timeline.length).toBe(4);
    expect(timeline[0].chapter_order).toBeLessThanOrEqual(timeline[1].chapter_order);
  });

  it("filters by entity", () => {
    const timeline = buildTimeline(db, 1, { entityId: 1 });
    expect(timeline.length).toBe(3);
    expect(timeline.every((e) => e.entity_name === "Alice")).toBe(true);
  });

  it("filters by manuscript", () => {
    const timeline = buildTimeline(db, 1, { manuscriptId: 1 });
    expect(timeline.length).toBe(4);
  });

  it("detects continuity gaps", () => {
    const timeline = buildTimeline(db, 1);
    const gaps = detectGaps(timeline, 5);
    expect(gaps.length).toBe(1);
    expect(gaps[0].entity_name).toBe("Alice");
    expect(gaps[0].gap_chapters).toBe(7);
  });

  it("no gaps below threshold", () => {
    const timeline = buildTimeline(db, 1);
    const gaps = detectGaps(timeline, 10);
    expect(gaps.length).toBe(0);
  });

  it("renders HTML", () => {
    const timeline = buildTimeline(db, 1);
    const gaps = detectGaps(timeline, 5);
    const html = renderTimelineHtml(timeline, gaps);
    expect(html).toContain("Timeline");
    expect(html).toContain("Alice");
    expect(html).toContain("Bob");
    expect(html).toContain("Continuity Gaps");
    expect(html).toContain("gap of 7 chapters");
  });
});
