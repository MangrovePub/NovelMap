import { describe, it, expect, beforeEach } from "vitest";
import { Database } from "../src/db/database.js";
import { ProjectStore } from "../src/core/projects.js";
import { EntityStore } from "../src/core/entities.js";
import { RelationshipStore } from "../src/core/relationships.js";
import { AppearanceStore } from "../src/core/appearances.js";
import { exportScrivener } from "../src/exporters/scrivener.js";
import { exportPlottr } from "../src/exporters/plottr.js";
import { exportNovelMapJSON } from "../src/exporters/novelmap-json.js";

let db: Database;
let projectId: number;

beforeEach(() => {
  db = new Database(":memory:");
  const projects = new ProjectStore(db);
  const entities = new EntityStore(db);
  const relationships = new RelationshipStore(db);
  const appearances = new AppearanceStore(db);

  // Create a project with manuscripts, entities, relationships
  const project = projects.create("Test Series", "/test");
  projectId = project.id;

  // Add a manuscript with chapters
  const ms = db.db
    .prepare("INSERT INTO manuscript (project_id, title, file_path) VALUES (?, ?, ?)")
    .run(projectId, "Book One", "book-one.md");
  const msId = Number(ms.lastInsertRowid);

  db.db
    .prepare("INSERT INTO chapter (manuscript_id, title, order_index, body) VALUES (?, ?, ?, ?)")
    .run(msId, "Chapter 1", 0, "The story begins.");
  const ch1Id = Number(
    db.db
      .prepare("SELECT id FROM chapter WHERE manuscript_id = ? AND order_index = 0")
      .get(msId)!.id
  );

  db.db
    .prepare("INSERT INTO chapter (manuscript_id, title, order_index, body) VALUES (?, ?, ?, ?)")
    .run(msId, "Chapter 2", 1, "The plot thickens.");

  // Create entities
  const hero = entities.create(projectId, "character", "Aria", {
    role: "Protagonist",
    age: 28,
  });
  const city = entities.create(projectId, "location", "Stormhold", {
    region: "Northern Coast",
  });
  const guild = entities.create(projectId, "organization", "The Order", {
    founded: "500 years ago",
  });

  // Create relationships
  relationships.create(hero.id, city.id, "Located In");
  relationships.create(hero.id, guild.id, "Member Of");

  // Create appearances
  appearances.create(hero.id, msId, ch1Id);
  appearances.create(city.id, msId, ch1Id);
});

describe("Scrivener exporter", () => {
  it("produces a valid bundle structure", () => {
    const bundle = exportScrivener(db, projectId);

    expect(bundle.scrivxFilename).toBe("Test Series.scrivx");
    expect(bundle.scrivxContent).toContain("<ScrivenerProject");
    expect(bundle.scrivxContent).toContain("<Title>Manuscript</Title>");
    expect(bundle.scrivxContent).toContain("<Title>Book One</Title>");
    expect(bundle.scrivxContent).toContain("<Title>Chapter 1</Title>");
    expect(bundle.scrivxContent).toContain("<Title>Chapter 2</Title>");
  });

  it("includes entity metadata in Research folder", () => {
    const bundle = exportScrivener(db, projectId);

    expect(bundle.scrivxContent).toContain("<Title>NovelMap Entities</Title>");
    expect(bundle.scrivxContent).toContain("<Title>Character</Title>");
    expect(bundle.scrivxContent).toContain("<Title>Aria</Title>");
    expect(bundle.scrivxContent).toContain("<Title>Stormhold</Title>");
  });

  it("generates RTF content files", () => {
    const bundle = exportScrivener(db, projectId);

    // Should have content files for chapters + entities
    const rtfFiles = Array.from(bundle.files.keys()).filter((p) =>
      p.endsWith("content.rtf")
    );
    // 2 chapters + 3 entities = 5 RTF files
    expect(rtfFiles.length).toBe(5);

    // Chapter content should be in RTF format
    const chapterRtf = Array.from(bundle.files.values()).find((v) =>
      v.includes("The story begins")
    );
    expect(chapterRtf).toBeDefined();
    expect(chapterRtf).toContain("{\\rtf1");
  });

  it("includes relationships in entity documents", () => {
    const bundle = exportScrivener(db, projectId);

    // Find Aria's entity RTF
    const ariaRtf = Array.from(bundle.files.values()).find(
      (v) => v.includes("Aria") && v.includes("Protagonist")
    );
    expect(ariaRtf).toBeDefined();
    expect(ariaRtf).toContain("Located In");
    expect(ariaRtf).toContain("Member Of");
  });
});

describe("Plottr exporter", () => {
  it("produces valid .pltr structure with required top-level keys", () => {
    const pltr = exportPlottr(db, projectId);

    expect(pltr.file).toBeDefined();
    expect(pltr.series).toBeDefined();
    expect(pltr.books).toBeDefined();
    expect(pltr.characters).toBeDefined();
    expect(pltr.places).toBeDefined();
    expect(pltr.cards).toBeDefined();
    expect(pltr.lines).toBeDefined();
    expect(pltr.beats).toBeDefined();
    expect(pltr.tags).toBeDefined();
    expect(pltr.notes).toBeDefined();
  });

  it("maps characters correctly", () => {
    const pltr = exportPlottr(db, projectId);
    const chars = pltr.characters as { name: string; color: string }[];

    expect(chars).toHaveLength(1);
    expect(chars[0].name).toBe("Aria");
    expect(chars[0].color).toBe("#e94560");
  });

  it("maps locations to places", () => {
    const pltr = exportPlottr(db, projectId);
    const places = pltr.places as { name: string }[];

    expect(places).toHaveLength(1);
    expect(places[0].name).toBe("Stormhold");
  });

  it("maps organizations to notes", () => {
    const pltr = exportPlottr(db, projectId);
    const notes = pltr.notes as { title: string }[];

    expect(notes).toHaveLength(1);
    expect(notes[0].title).toContain("The Order");
    expect(notes[0].title).toContain("organization");
  });

  it("creates books from manuscripts", () => {
    const pltr = exportPlottr(db, projectId);
    const books = pltr.books as { allIds: number[]; [key: string]: unknown };

    expect(books.allIds).toHaveLength(1);
    expect((books["1"] as { title: string }).title).toBe("Book One");
  });

  it("creates beats from chapters", () => {
    const pltr = exportPlottr(db, projectId);
    const beats = pltr.beats as Record<string, { index: Record<string, { title: string }> }>;

    const book1Beats = beats["1"];
    expect(book1Beats).toBeDefined();

    const beatEntries = Object.values(book1Beats.index);
    expect(beatEntries).toHaveLength(2);
    expect(beatEntries.map((b) => b.title)).toContain("Chapter 1");
    expect(beatEntries.map((b) => b.title)).toContain("Chapter 2");
  });

  it("creates cards with character and place references from appearances", () => {
    const pltr = exportPlottr(db, projectId);
    const cards = pltr.cards as {
      title: string;
      characters: number[];
      places: number[];
    }[];

    // Chapter 1 has appearances for Aria (character) and Stormhold (location)
    const ch1Card = cards.find((c) => c.title === "Chapter 1");
    expect(ch1Card).toBeDefined();
    expect(ch1Card!.characters.length).toBeGreaterThan(0);
    expect(ch1Card!.places.length).toBeGreaterThan(0);
  });
});

describe("NovelMap JSON exporter", () => {
  it("exports complete project data", () => {
    const exported = exportNovelMapJSON(db, projectId);

    expect(exported.version).toBe("1.0");
    expect(exported.exportedAt).toBeDefined();
    expect(exported.project.name).toBe("Test Series");
  });

  it("includes manuscripts with chapters", () => {
    const exported = exportNovelMapJSON(db, projectId);

    expect(exported.manuscripts).toHaveLength(1);
    expect(exported.manuscripts[0].title).toBe("Book One");
    expect(exported.manuscripts[0].chapters).toHaveLength(2);
    expect(exported.manuscripts[0].chapters[0].body).toBe("The story begins.");
  });

  it("includes entities with parsed metadata", () => {
    const exported = exportNovelMapJSON(db, projectId);

    expect(exported.entities).toHaveLength(3);
    const aria = exported.entities.find((e) => e.name === "Aria");
    expect(aria).toBeDefined();
    expect(aria!.metadata).toEqual({ role: "Protagonist", age: 28 });
  });

  it("includes relationships", () => {
    const exported = exportNovelMapJSON(db, projectId);

    expect(exported.relationships).toHaveLength(2);
    expect(exported.relationships.map((r) => r.type)).toContain("Located In");
    expect(exported.relationships.map((r) => r.type)).toContain("Member Of");
  });

  it("includes appearances", () => {
    const exported = exportNovelMapJSON(db, projectId);

    expect(exported.appearances).toHaveLength(2);
  });
});
