import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "../src/db/database.js";
import { extractEntityCandidates } from "../src/core/entity-extraction.js";

describe("extractEntityCandidates", () => {
  let db: Database;
  let projectId: number;

  const FICTION_TEXT_CH1 = `The guard at the inner door checked two credentials. Liu Wei passed beneath a wall map of the United States. Red diodes pricked Chicago, Detroit, Portland, Austin, Sacramento.

"Procurement asks if we will require additional greenhouse controllers for the Canadian pilots," Liu said. "Distribution beats footprint."

Wu nodded once. "What harms them instructs us. We should never forget the lesson." The argument was simple enough to believe: harden the nation's food security by proving how easily an adversary could be bent.

He scrolled through Ramsey's architecture: cloud-warmed edges, third-party plugins, convenience stacked like dry kindling. "They built a nervous system for plants and gave us write access."

Wu followed the line of his cursor, then the map. "The long memory of the Party favors patience, not appetite," she said, voice so even it sounded like a citation. "We are not the Americans."`;

  const FICTION_TEXT_CH2 = `Dr. Wu knocked once on the metal doorframe and stepped inside without waiting. Agent Ramsey sat at his desk in the Detroit field office, reviewing signal intercepts.

"The MSS tracks everything," Ramsey said. "Every packet in and out of Facility Seventeen."

Liu arrived from Shanghai that morning, carrying a diplomatic pouch. The PLA had moved assets into position near the Taiwan Strait.

General Zhang paused in the doorway. He was reading the same feed on a wall display. He didn't say or do anything. Then, he left. The room grew quiet again.`;

  const FICTION_TEXT_CH3 = `Ramsey drove through Chicago at dawn. The city felt different now—every traffic camera a possible eye. Liu had warned him about the surveillance grid.

"You can't eyeball the canopy," the American said to Wu over an encrypted line. "You measure. Then you let the model learn what your eyes can't."

Wu gathered the folder. "Cyber Intelligence Research Facility Seventeen," she repeated in English, then in Chinese, as if confirming an incantation. "We'll keep it boring."

Outside the glass, the guard checked two credentials and let someone else into the hum.`;

  beforeEach(() => {
    db = new Database(":memory:");
    const result = db.db
      .prepare("INSERT INTO project (name, path) VALUES (?, ?)")
      .run("Test Series", "test-series");
    projectId = Number(result.lastInsertRowid);

    // Create manuscript and chapters
    const ms = db.db
      .prepare("INSERT INTO manuscript (project_id, title, file_path) VALUES (?, ?, ?)")
      .run(projectId, "Book One", "book-one.md");
    const msId = Number(ms.lastInsertRowid);

    const insertChapter = db.db.prepare(
      "INSERT INTO chapter (manuscript_id, title, order_index, body) VALUES (?, ?, ?, ?)"
    );
    insertChapter.run(msId, "Chapter 1", 0, FICTION_TEXT_CH1);
    insertChapter.run(msId, "Chapter 2", 1, FICTION_TEXT_CH2);
    insertChapter.run(msId, "Chapter 3", 2, FICTION_TEXT_CH3);
  });

  afterEach(() => {
    db.close();
  });

  it("extracts character candidates from fiction text", () => {
    const result = extractEntityCandidates(db, projectId);
    const names = result.candidates.map((c) => c.text);

    // Key characters should be found
    expect(names).toContain("Ramsey");
    expect(names).toContain("Wu");
  });

  it("extracts location candidates", () => {
    const result = extractEntityCandidates(db, projectId);
    const locations = result.candidates
      .filter((c) => c.suggestedType === "location")
      .map((c) => c.text);

    // Known cities should be classified as locations
    expect(locations).toContain("Chicago");
    expect(locations).toContain("Detroit");
  });

  it("extracts organization acronyms", () => {
    const result = extractEntityCandidates(db, projectId);
    const orgs = result.candidates
      .filter((c) => c.suggestedType === "organization")
      .map((c) => c.text);

    expect(orgs).toContain("MSS");
    expect(orgs).toContain("PLA");
  });

  it("assigns confidence levels", () => {
    const result = extractEntityCandidates(db, projectId);
    const ramsey = result.candidates.find((c) => c.text === "Ramsey");
    expect(ramsey).toBeDefined();
    expect(["high", "medium"]).toContain(ramsey!.confidence);
  });

  it("provides sample contexts", () => {
    const result = extractEntityCandidates(db, projectId);
    const ramsey = result.candidates.find((c) => c.text === "Ramsey");
    expect(ramsey).toBeDefined();
    expect(ramsey!.sampleContexts.length).toBeGreaterThan(0);
  });

  it("filters out common words", () => {
    const result = extractEntityCandidates(db, projectId);
    const names = result.candidates.map((c) => c.text.toLowerCase());
    // Common words should not appear even though they start sentences
    expect(names).not.toContain("the");
    expect(names).not.toContain("he");
    expect(names).not.toContain("then");
  });

  it("excludes already-existing entities", () => {
    // Create an entity named "Ramsey"
    db.db
      .prepare("INSERT INTO entity (project_id, type, name, metadata) VALUES (?, ?, ?, ?)")
      .run(projectId, "character", "Ramsey", "{}");

    const result = extractEntityCandidates(db, projectId);
    const names = result.candidates.map((c) => c.text);
    expect(names).not.toContain("Ramsey");
    expect(result.existingEntities).toContain("Ramsey");
  });

  it("handles empty chapters", () => {
    // Create a project with no chapters
    const p2 = db.db
      .prepare("INSERT INTO project (name, path) VALUES (?, ?)")
      .run("Empty Project", "empty");
    const pid2 = Number(p2.lastInsertRowid);

    const result = extractEntityCandidates(db, pid2);
    expect(result.candidates).toHaveLength(0);
  });

  it("classifies multi-word names as characters", () => {
    const result = extractEntityCandidates(db, projectId);
    const liuWei = result.candidates.find((c) => c.text === "Liu Wei");
    if (liuWei) {
      expect(liuWei.suggestedType).toBe("character");
    }
  });

  it("tracks chapter spread", () => {
    const result = extractEntityCandidates(db, projectId);
    const ramsey = result.candidates.find((c) => c.text === "Ramsey");
    expect(ramsey).toBeDefined();
    expect(ramsey!.chapterSpread).toBeGreaterThanOrEqual(2);
  });
});
