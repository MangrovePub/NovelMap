import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "../src/db/database.js";
import { buildManuscriptExplorer, renderManuscriptExplorerHtml } from "../src/views/manuscript-explorer.js";

describe("Manuscript Explorer", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.db.prepare("INSERT INTO project (name, path) VALUES ('Test', '/test')").run();
    db.db.prepare("INSERT INTO manuscript (project_id, title, file_path) VALUES (1, 'Book One', '/book1.md')").run();
    db.db.prepare("INSERT INTO chapter (manuscript_id, title, order_index, body) VALUES (1, 'Chapter 1', 0, 'Alice fell down the rabbit hole.')").run();
    db.db.prepare("INSERT INTO chapter (manuscript_id, title, order_index, body) VALUES (1, 'Chapter 2', 1, 'She met the Cheshire Cat.')").run();
    db.db.prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (1, 'character', 'Alice', '{}')").run();
    db.db.prepare("INSERT INTO appearance (entity_id, manuscript_id, chapter_id, text_range_start, text_range_end, notes) VALUES (1, 1, 1, 0, 5, 'Name mention')").run();
  });

  afterEach(() => {
    db.close();
  });

  it("builds chapters with highlights", () => {
    const chapters = buildManuscriptExplorer(db, 1);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe("Chapter 1");
    expect(chapters[0].highlights).toHaveLength(1);
    expect(chapters[0].highlights[0].entity_name).toBe("Alice");
    expect(chapters[0].highlights[0].start).toBe(0);
    expect(chapters[0].highlights[0].end).toBe(5);
    expect(chapters[1].highlights).toHaveLength(0);
  });

  it("renders HTML with sidebar and content", () => {
    const chapters = buildManuscriptExplorer(db, 1);
    const html = renderManuscriptExplorerHtml("Book One", chapters);
    expect(html).toContain("Book One");
    expect(html).toContain("Chapter 1");
    expect(html).toContain("Chapter 2");
    expect(html).toContain("entity-highlight");
    expect(html).toContain("sidebar");
  });

  it("handles chapters with no highlights", () => {
    const chapters = buildManuscriptExplorer(db, 1);
    const html = renderManuscriptExplorerHtml("Book One", chapters);
    expect(html).toContain("Cheshire Cat");
  });
});
