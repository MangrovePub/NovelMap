import { describe, it, expect, beforeEach } from "vitest";
import { Database } from "../src/db/database.js";
import { ProjectStore } from "../src/core/projects.js";
import { EntityStore } from "../src/core/entities.js";
import { detectEntities } from "../src/core/auto-detect.js";
import { analyzeGenre, analyzeProjectGenre } from "../src/analyzers/genre-detector.js";
import { classifyRoles } from "../src/analyzers/role-classifier.js";
import { generateSeriesBible, renderSeriesBibleHtml } from "../src/analyzers/series-bible.js";

let db: Database;
let projectId: number;

function addManuscript(title: string, chapters: { title: string; body: string }[]) {
  const ms = db.db
    .prepare("INSERT INTO manuscript (project_id, title, file_path) VALUES (?, ?, ?)")
    .run(projectId, title, `${title.toLowerCase().replace(/\s+/g, "-")}.md`);
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
  const project = projects.create("Geopolitical Series", "/geopolitical");
  projectId = project.id;
});

// --- Genre Detector ---

describe("analyzeGenre", () => {
  it("detects thriller genre from keyword presence", () => {
    const msId = addManuscript("Shadow Protocol", [
      {
        title: "Chapter 1",
        body: "The operative moved through the surveillance network, aware that hostile intelligence assets were tracking his every move. The classified protocol demanded immediate extraction from the safehouse. His handler had gone dark.",
      },
      {
        title: "Chapter 2",
        body: "Agent Cole reached the dead drop, her tactical vest concealed beneath civilian clothes. The target had been compromised. She initiated the abort sequence and contacted the agency for backup.",
      },
    ]);

    const result = analyzeGenre(db, msId);

    expect(result.primaryGenre).toBe("Thriller");
    expect(result.genres.length).toBeGreaterThanOrEqual(1);
    expect(result.genres[0].genre).toBe("Thriller");
    expect(result.genres[0].confidence).toBeGreaterThan(0);
    expect(result.genres[0].markers.length).toBeGreaterThan(0);
  });

  it("detects techno-thriller sub-genre", () => {
    const msId = addManuscript("Zero Day", [
      {
        title: "Chapter 1",
        body: "The cyber attack crippled the server farm. Every firewall had been breached by the malware. The encryption was useless against the quantum-enhanced algorithm. Artificial intelligence had been weaponized, turning drone swarms against their own operators.",
      },
    ]);

    const result = analyzeGenre(db, msId);

    expect(result.primaryGenre).toBe("Thriller");
    const thrillerGenre = result.genres.find((g) => g.genre === "Thriller");
    expect(thrillerGenre).toBeDefined();
    expect(thrillerGenre!.subGenres).toContain("Techno-Thriller");
  });

  it("detects fantasy genre", () => {
    const msId = addManuscript("The Dragon's Oath", [
      {
        title: "Chapter 1",
        body: "The wizard cast his spell, sending a bolt of arcane energy toward the dragon. The ancient creature shielded itself with a magical ward. In the distance, the kingdom awaited news from the knight who carried the enchanted sword on his quest to fulfill the prophecy.",
      },
    ]);

    const result = analyzeGenre(db, msId);

    expect(result.primaryGenre).toBe("Fantasy");
  });

  it("detects themes in manuscript text", () => {
    const msId = addManuscript("The Long War", [
      {
        title: "Chapter 1",
        body: "The war had ravaged the countryside. Every soldier knew the battle was lost, but they fought on. Civilians fled as the invasion consumed everything. The casualties mounted daily, yet the ceasefire never came. Power and corruption defined the regime that sent these young men to die.",
      },
    ]);

    const result = analyzeGenre(db, msId);

    expect(result.themes.length).toBeGreaterThanOrEqual(1);
  });

  it("provides BISAC category suggestions", () => {
    const msId = addManuscript("Code Red", [
      {
        title: "Chapter 1",
        body: "The operative secured the classified intel, bypassing the firewall with a zero-day exploit. The president's chief of staff had authorized the covert mission through a back channel to the embassy. The geopolitical implications of the cyber operation were staggering.",
      },
    ]);

    const result = analyzeGenre(db, msId);

    expect(result.suggestedCategories.length).toBeGreaterThanOrEqual(1);
    expect(result.suggestedCategories.some((c) => c.includes("Thriller"))).toBe(true);
  });
});

describe("analyzeProjectGenre", () => {
  it("aggregates genre across multiple manuscripts", () => {
    addManuscript("Book One", [
      { title: "Ch1", body: "The operative extracted the classified asset from the embassy compound under heavy surveillance." },
    ]);
    addManuscript("Book Two", [
      { title: "Ch1", body: "Agent Reeves analyzed the intelligence report. The target was compromised. She initiated the tactical extraction protocol." },
    ]);

    const result = analyzeProjectGenre(db, projectId);

    expect(result.seriesGenre).toBe("Thriller");
    expect(result.manuscripts.length).toBe(2);
  });
});

// --- Role Classifier ---

describe("classifyRoles", () => {
  it("classifies a frequently appearing character as protagonist", () => {
    const entities = new EntityStore(db);
    entities.create(projectId, "character", "Aria Stormwind");
    entities.create(projectId, "character", "Background Guard");

    const msId = addManuscript("The Rising Storm", [
      { title: "Chapter 1", body: "Aria Stormwind rode into town. The Background Guard watched from afar." },
      { title: "Chapter 2", body: "Aria Stormwind confronted her rival in the marketplace." },
      { title: "Chapter 3", body: "Aria Stormwind climbed the tower at midnight." },
      { title: "Chapter 4", body: "Aria Stormwind faced the final challenge alone." },
      { title: "Chapter 5", body: "Aria Stormwind emerged victorious as dawn broke." },
    ]);

    detectEntities(db, projectId, msId);
    const result = classifyRoles(db, projectId);

    const aria = result.characters.find((c) => c.entityName === "Aria Stormwind");
    expect(aria).toBeDefined();
    expect(aria!.role).toBe("protagonist");

    const guard = result.characters.find((c) => c.entityName === "Background Guard");
    expect(guard).toBeDefined();
    expect(["minor", "supporting"]).toContain(guard!.role);
  });

  it("detects antagonist signals from context words", () => {
    const entities = new EntityStore(db);
    entities.create(projectId, "character", "Lord Vex");

    const msId = addManuscript("Dark Reign", [
      { title: "Chapter 1", body: "Lord Vex was the greatest enemy the realm had ever faced. His sinister scheme would destroy everything." },
      { title: "Chapter 2", body: "Lord Vex continued to manipulate the court, his ruthless methods terrorizing all." },
      { title: "Chapter 3", body: "Lord Vex plotted against the alliance, the threat growing with every passing day." },
    ]);

    detectEntities(db, projectId, msId);
    const result = classifyRoles(db, projectId);

    const vex = result.characters.find((c) => c.entityName === "Lord Vex");
    expect(vex).toBeDefined();
    expect(vex!.antagonistSignals.length).toBeGreaterThanOrEqual(2);
  });

  it("detects role shifts across manuscripts", () => {
    const entities = new EntityStore(db);
    entities.create(projectId, "character", "Kael");

    // Book 1: Kael appears in all chapters (protagonist)
    const ms1 = addManuscript("Book One", [
      { title: "Ch1", body: "Kael set out on his journey." },
      { title: "Ch2", body: "Kael crossed the mountains." },
      { title: "Ch3", body: "Kael arrived at the fortress." },
    ]);

    // Book 2: Kael barely appears (minor/supporting)
    const ms2 = addManuscript("Book Two", [
      { title: "Ch1", body: "The new hero took center stage." },
      { title: "Ch2", body: "Struggles continued without Kael." },
      { title: "Ch3", body: "The war raged on." },
      { title: "Ch4", body: "Peace was finally achieved." },
    ]);

    detectEntities(db, projectId, ms1);
    detectEntities(db, projectId, ms2);

    const result = classifyRoles(db, projectId);

    const kael = result.characters.find((c) => c.entityName === "Kael");
    expect(kael).toBeDefined();
    expect(kael!.perManuscript.length).toBeGreaterThanOrEqual(1);
  });
});

// --- Series Bible ---

describe("generateSeriesBible", () => {
  it("produces a comprehensive bible from project data", () => {
    const entities = new EntityStore(db);
    entities.create(projectId, "character", "Commander Blake");
    entities.create(projectId, "location", "Blacksite Omega");
    entities.create(projectId, "organization", "Shadow Council");

    const msId = addManuscript("Shadow War", [
      {
        title: "Chapter 1",
        body: "Commander Blake infiltrated Blacksite Omega under orders from the Shadow Council. The classified mission required precise tactical coordination.",
      },
      {
        title: "Chapter 2",
        body: "Commander Blake discovered the intelligence was compromised. The Shadow Council had been infiltrated by a double agent.",
      },
    ]);

    detectEntities(db, projectId, msId);

    const bible = generateSeriesBible(db, projectId);

    expect(bible.projectName).toBe("Geopolitical Series");
    expect(bible.series.bookCount).toBe(1);
    expect(bible.series.totalCharacters).toBe(1);
    expect(bible.manuscripts.length).toBe(1);
    expect(bible.manuscripts[0].title).toBe("Shadow War");
    expect(bible.characters.length).toBe(1);
    expect(bible.characters[0].name).toBe("Commander Blake");
    expect(bible.locations.length).toBe(1);
    expect(bible.organizations.length).toBe(1);
  });

  it("includes genre analysis in the bible", () => {
    addManuscript("Thriller Novel", [
      {
        title: "Chapter 1",
        body: "The operative moved through hostile territory. Surveillance drones tracked every extraction point. The intelligence was classified at the highest level.",
      },
    ]);

    const bible = generateSeriesBible(db, projectId);

    expect(bible.series.primaryGenre).toBeDefined();
    expect(bible.series.genres.length).toBeGreaterThanOrEqual(0);
  });
});

describe("renderSeriesBibleHtml", () => {
  it("produces valid HTML with all sections", () => {
    const entities = new EntityStore(db);
    entities.create(projectId, "character", "Ana Torres");

    const msId = addManuscript("The Network", [
      { title: "Chapter 1", body: "Ana Torres ran the surveillance operation from a remote bunker." },
    ]);

    detectEntities(db, projectId, msId);

    const bible = generateSeriesBible(db, projectId);
    const html = renderSeriesBibleHtml(bible);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Geopolitical Series");
    expect(html).toContain("Ana Torres");
    expect(html).toContain("Table of Contents");
    expect(html).toContain("Series Overview");
    expect(html).toContain("Genre Analysis");
    expect(html).toContain("Characters");
  });
});
