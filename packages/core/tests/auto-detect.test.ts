import { describe, it, expect, beforeEach } from "vitest";
import { Database } from "../src/db/database.js";
import { ProjectStore } from "../src/core/projects.js";
import { EntityStore } from "../src/core/entities.js";
import {
  detectEntities,
  detectEntitiesFullProject,
  getCrossBookPresence,
} from "../src/core/auto-detect.js";

let db: Database;
let projectId: number;

function addManuscript(title: string, chapters: { title: string; body: string }[]) {
  const ms = db.db
    .prepare("INSERT INTO manuscript (project_id, title, file_path) VALUES (?, ?, ?)")
    .run(projectId, title, `${title.toLowerCase()}.md`);
  const msId = Number(ms.lastInsertRowid);

  for (let i = 0; i < chapters.length; i++) {
    db.db
      .prepare("INSERT INTO chapter (manuscript_id, title, order_index, body) VALUES (?, ?, ?, ?)")
      .run(msId, chapters[i].title, i, chapters[i].body);
  }

  return msId;
}

beforeEach(() => {
  db = new Database(":memory:");
  const projects = new ProjectStore(db);
  const project = projects.create("Fantasy Series", "/fantasy");
  projectId = project.id;
});

describe("detectEntities", () => {
  it("detects entity names in manuscript text", () => {
    const entities = new EntityStore(db);
    entities.create(projectId, "character", "Aria Stormwind");
    entities.create(projectId, "location", "Stormhold Castle");

    const msId = addManuscript("Book One", [
      {
        title: "Chapter 1",
        body: "Aria Stormwind walked through the gates of Stormhold Castle.",
      },
    ]);

    const result = detectEntities(db, projectId, msId);

    expect(result.totalMatches).toBe(2);
    expect(result.newAppearances).toBe(2);
    expect(result.details.map((d) => d.entityName)).toContain("Aria Stormwind");
    expect(result.details.map((d) => d.entityName)).toContain("Stormhold Castle");
  });

  it("detects first-name references for characters", () => {
    const entities = new EntityStore(db);
    entities.create(projectId, "character", "Aria Stormwind");

    const msId = addManuscript("Book One", [
      {
        title: "Chapter 1",
        body: "Aria walked through the forest, remembering her childhood.",
      },
    ]);

    const result = detectEntities(db, projectId, msId);

    expect(result.totalMatches).toBeGreaterThanOrEqual(1);
    expect(result.details.some((d) => d.entityName === "Aria Stormwind")).toBe(true);
  });

  it("respects word boundaries — avoids partial matches", () => {
    const entities = new EntityStore(db);
    entities.create(projectId, "character", "Art");

    const msId = addManuscript("Book One", [
      {
        title: "Chapter 1",
        body: "Arthur studied the art of war. Art nodded approvingly.",
      },
    ]);

    const result = detectEntities(db, projectId, msId);

    // "Art" should match "Art nodded" but NOT "Arthur" or "art of war" (lowercase "art" should match as case-insensitive)
    // Actually "art" in "the art of war" would match since it's surrounded by word boundaries
    // But "Arthur" should NOT match
    const artMatches = result.details.filter((d) => d.entityName === "Art");
    expect(artMatches.length).toBeGreaterThanOrEqual(1);

    // Verify no match at the position of "Arthur"
    const arthurPos = "Arthur studied".indexOf("Arthur");
    expect(artMatches.some((d) => d.offset === arthurPos)).toBe(false);
  });

  it("detects aliases from metadata", () => {
    const entities = new EntityStore(db);
    entities.create(projectId, "character", "Aria Stormwind", {
      aliases: "Storm, The Wind Walker",
    });

    const msId = addManuscript("Book One", [
      {
        title: "Chapter 1",
        body: "They called her Storm, the legendary Wind Walker of the North.",
      },
    ]);

    const result = detectEntities(db, projectId, msId);

    expect(result.totalMatches).toBeGreaterThanOrEqual(1);
  });

  it("does not create duplicate appearances", () => {
    const entities = new EntityStore(db);
    const aria = entities.create(projectId, "character", "Aria");

    const msId = addManuscript("Book One", [
      {
        title: "Chapter 1",
        body: "Aria entered the room.",
      },
    ]);

    // Run detection twice
    const result1 = detectEntities(db, projectId, msId);
    const result2 = detectEntities(db, projectId, msId);

    expect(result1.newAppearances).toBe(1);
    expect(result2.newAppearances).toBe(0); // Already exists

    // Verify only one appearance in DB
    const appearances = db.db
      .prepare("SELECT * FROM appearance WHERE entity_id = ? AND manuscript_id = ?")
      .all(aria.id, msId);
    expect(appearances.length).toBe(1);
  });

  it("detects cross-book appearances", () => {
    const entities = new EntityStore(db);
    const aria = entities.create(projectId, "character", "Aria Stormwind");
    entities.create(projectId, "location", "Stormhold Castle");

    // Book 1 — manually create appearances
    const ms1Id = addManuscript("The Rising Storm", [
      {
        title: "Prologue",
        body: "Aria Stormwind stood atop Stormhold Castle.",
      },
    ]);
    detectEntities(db, projectId, ms1Id);

    // Book 2 — Aria appears again!
    const ms2Id = addManuscript("The Gathering Winds", [
      {
        title: "Chapter 1",
        body: "Years later, Aria Stormwind returned to the place where it all began.",
      },
    ]);

    const result = detectEntities(db, projectId, ms2Id);

    expect(result.crossBookEntities.length).toBeGreaterThanOrEqual(1);

    const ariaCross = result.crossBookEntities.find(
      (c) => c.entityName === "Aria Stormwind"
    );
    expect(ariaCross).toBeDefined();
    expect(ariaCross!.existingBooks).toContain("The Rising Storm");
    expect(ariaCross!.newBooks).toContain("The Gathering Winds");
  });
});

describe("detectEntitiesFullProject", () => {
  it("scans all manuscripts in the project", () => {
    const entities = new EntityStore(db);
    entities.create(projectId, "character", "Kael");

    addManuscript("Book One", [
      { title: "Chapter 1", body: "Kael drew his sword." },
    ]);
    addManuscript("Book Two", [
      { title: "Chapter 1", body: "Kael returned from exile." },
    ]);

    const result = detectEntitiesFullProject(db, projectId);

    expect(result.totalMatches).toBe(2);
    expect(result.newAppearances).toBe(2);
  });
});

describe("getCrossBookPresence", () => {
  it("returns manuscript presence per entity", () => {
    const entities = new EntityStore(db);
    entities.create(projectId, "character", "Aria");
    entities.create(projectId, "character", "Kael");

    const ms1 = addManuscript("Book One", [
      { title: "Ch1", body: "Aria and Kael traveled together." },
    ]);
    const ms2 = addManuscript("Book Two", [
      { title: "Ch1", body: "Only Aria continued the journey." },
    ]);

    detectEntities(db, projectId, ms1);
    detectEntities(db, projectId, ms2);

    const presence = getCrossBookPresence(db, projectId);

    const ariaPresence = presence.find((p) => p.entityName === "Aria");
    expect(ariaPresence).toBeDefined();
    expect(ariaPresence!.manuscripts).toHaveLength(2);
    expect(ariaPresence!.manuscripts.map((m) => m.title)).toContain("Book One");
    expect(ariaPresence!.manuscripts.map((m) => m.title)).toContain("Book Two");

    const kaelPresence = presence.find((p) => p.entityName === "Kael");
    expect(kaelPresence).toBeDefined();
    expect(kaelPresence!.manuscripts).toHaveLength(1);
    expect(kaelPresence!.manuscripts[0].title).toBe("Book One");
  });
});
