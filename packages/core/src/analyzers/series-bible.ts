import type { Database as DB } from "../db/database.js";
import type { EntityType } from "../core/types.js";
import { classifyRoles, type CharacterRole } from "./role-classifier.js";
import { analyzeProjectGenre } from "./genre-detector.js";
import { getCrossBookPresence } from "../core/auto-detect.js";

/**
 * Series Bible Generator.
 *
 * One-click comprehensive export of everything NovelMap knows about your
 * series: characters (with roles, arcs, appearances), locations, organizations,
 * artifacts, timeline, relationships, genre analysis, and cross-book presence.
 *
 * Outputs structured data that can be rendered as HTML, PDF, or Markdown.
 */

export interface SeriesBibleCharacter {
  id: number;
  name: string;
  role: CharacterRole;
  confidence: number;
  metadata: Record<string, unknown>;
  peakAct: string;
  appearances: {
    manuscriptTitle: string;
    chapters: string[];
  }[];
  relationships: {
    targetName: string;
    targetType: EntityType;
    type: string;
    direction: "outgoing" | "incoming";
  }[];
}

export interface SeriesBibleEntity {
  id: number;
  name: string;
  type: EntityType;
  metadata: Record<string, unknown>;
  appearances: {
    manuscriptTitle: string;
    chapters: string[];
  }[];
  relationships: {
    targetName: string;
    targetType: EntityType;
    type: string;
    direction: "outgoing" | "incoming";
  }[];
}

export interface SeriesBibleManuscript {
  id: number;
  title: string;
  chapterCount: number;
  wordCount: number;
  characterCount: number;
  entityCount: number;
}

export interface SeriesBible {
  projectName: string;
  generatedAt: string;
  /** Series-level metadata */
  series: {
    bookCount: number;
    totalWordCount: number;
    totalCharacters: number;
    totalEntities: number;
    primaryGenre: string;
    genres: { genre: string; confidence: number }[];
    recurringThemes: string[];
    genreConsistency: string;
  };
  /** Manuscript summaries */
  manuscripts: SeriesBibleManuscript[];
  /** Characters with full role analysis */
  characters: SeriesBibleCharacter[];
  /** Role shifts across books */
  roleShifts: {
    characterName: string;
    shifts: { manuscriptTitle: string; role: CharacterRole }[];
  }[];
  /** Non-character entities grouped by type */
  locations: SeriesBibleEntity[];
  organizations: SeriesBibleEntity[];
  artifacts: SeriesBibleEntity[];
  concepts: SeriesBibleEntity[];
  events: SeriesBibleEntity[];
  /** Cross-book entity presence */
  crossBookPresence: {
    entityName: string;
    entityType: EntityType;
    books: string[];
  }[];
  /** All relationships */
  relationships: {
    source: string;
    sourceType: EntityType;
    target: string;
    targetType: EntityType;
    type: string;
  }[];
}

/**
 * Generate a comprehensive series bible from all project data.
 */
export function generateSeriesBible(
  db: DB,
  projectId: number
): SeriesBible {
  // Project info
  const project = db.db
    .prepare("SELECT * FROM project WHERE id = ?")
    .get(projectId) as { id: number; name: string } | undefined;

  if (!project) throw new Error(`Project ${projectId} not found`);

  // Manuscripts
  const manuscripts = db.db
    .prepare("SELECT * FROM manuscript WHERE project_id = ? ORDER BY id")
    .all(projectId) as { id: number; title: string }[];

  // Chapters with word counts
  const msDetails: SeriesBibleManuscript[] = manuscripts.map((ms) => {
    const chapters = db.db
      .prepare("SELECT body FROM chapter WHERE manuscript_id = ?")
      .all(ms.id) as { body: string }[];

    const wordCount = chapters.reduce((sum, c) => sum + c.body.split(/\s+/).length, 0);

    const entityCount = db.db
      .prepare("SELECT COUNT(DISTINCT entity_id) as cnt FROM appearance WHERE manuscript_id = ?")
      .get(ms.id) as { cnt: number };

    const charCount = db.db
      .prepare(`
        SELECT COUNT(DISTINCT a.entity_id) as cnt
        FROM appearance a
        JOIN entity e ON a.entity_id = e.id
        WHERE a.manuscript_id = ? AND e.type = 'character'
      `)
      .get(ms.id) as { cnt: number };

    return {
      id: ms.id,
      title: ms.title,
      chapterCount: chapters.length,
      wordCount,
      characterCount: charCount.cnt,
      entityCount: entityCount.cnt,
    };
  });

  // Genre analysis
  const genreAnalysis = analyzeProjectGenre(db, projectId);

  // Role classification
  const roleAnalysis = classifyRoles(db, projectId);

  // All entities
  const allEntities = db.db
    .prepare("SELECT * FROM entity WHERE project_id = ? ORDER BY type, name")
    .all(projectId) as { id: number; name: string; type: EntityType; metadata: string }[];

  // All relationships
  const allRelationships = db.db
    .prepare(`
      SELECT r.*, s.name as source_name, s.type as source_type, t.name as target_name, t.type as target_type
      FROM relationship r
      JOIN entity s ON r.source_entity_id = s.id
      JOIN entity t ON r.target_entity_id = t.id
      WHERE s.project_id = ?
      ORDER BY s.name, t.name
    `)
    .all(projectId) as {
      source_entity_id: number; target_entity_id: number; type: string;
      source_name: string; source_type: EntityType; target_name: string; target_type: EntityType;
    }[];

  // Build appearance map: entity → manuscripts → chapters
  const appearanceMap = buildAppearanceMap(db, projectId);

  // Build relationship map: entity → relationships
  const relMap = buildRelationshipMap(allRelationships, allEntities);

  // Characters with role data
  const characters: SeriesBibleCharacter[] = roleAnalysis.characters.map((rc) => {
    const entity = allEntities.find((e) => e.id === rc.entityId);
    return {
      id: rc.entityId,
      name: rc.entityName,
      role: rc.role,
      confidence: rc.confidence,
      metadata: entity ? JSON.parse(entity.metadata) : {},
      peakAct: rc.peakAct,
      appearances: appearanceMap.get(rc.entityId) ?? [],
      relationships: relMap.get(rc.entityId) ?? [],
    };
  });

  // Non-character entities
  function buildEntityGroup(type: EntityType): SeriesBibleEntity[] {
    return allEntities
      .filter((e) => e.type === type)
      .map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        metadata: JSON.parse(e.metadata),
        appearances: appearanceMap.get(e.id) ?? [],
        relationships: relMap.get(e.id) ?? [],
      }));
  }

  // Cross-book presence
  const crossBook = getCrossBookPresence(db, projectId);
  const crossBookPresence = crossBook
    .filter((e) => e.manuscripts.length > 1)
    .map((e) => ({
      entityName: e.entityName,
      entityType: e.entityType,
      books: e.manuscripts.map((m) => m.title),
    }));

  // Totals
  const totalWordCount = msDetails.reduce((sum, ms) => sum + ms.wordCount, 0);
  const totalCharacters = allEntities.filter((e) => e.type === "character").length;
  const totalEntities = allEntities.length;

  return {
    projectName: project.name,
    generatedAt: new Date().toISOString(),
    series: {
      bookCount: manuscripts.length,
      totalWordCount,
      totalCharacters,
      totalEntities,
      primaryGenre: genreAnalysis.seriesGenre,
      genres: genreAnalysis.manuscripts.flatMap((m) =>
        m.genres.map((g) => ({ genre: g.genre, confidence: g.confidence }))
      ).reduce<{ genre: string; confidence: number }[]>((acc, g) => {
        const existing = acc.find((a) => a.genre === g.genre);
        if (existing) {
          existing.confidence = Math.max(existing.confidence, g.confidence);
        } else {
          acc.push(g);
        }
        return acc;
      }, []).sort((a, b) => b.confidence - a.confidence),
      recurringThemes: genreAnalysis.recurringThemes,
      genreConsistency: genreAnalysis.genreConsistency,
    },
    manuscripts: msDetails,
    characters,
    roleShifts: roleAnalysis.roleShifts.map((rs) => ({
      characterName: rs.entityName,
      shifts: rs.shifts,
    })),
    locations: buildEntityGroup("location"),
    organizations: buildEntityGroup("organization"),
    artifacts: buildEntityGroup("artifact"),
    concepts: buildEntityGroup("concept"),
    events: buildEntityGroup("event"),
    crossBookPresence,
    relationships: allRelationships.map((r) => ({
      source: r.source_name,
      sourceType: r.source_type,
      target: r.target_name,
      targetType: r.target_type,
      type: r.type,
    })),
  };
}

/**
 * Render the series bible as formatted HTML.
 */
export function renderSeriesBibleHtml(bible: SeriesBible): string {
  const h = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const roleColors: Record<CharacterRole, string> = {
    protagonist: "#e94560",
    deuteragonist: "#a0c4ff",
    antagonist: "#e9a045",
    supporting: "#45e9a0",
    minor: "#888",
    mentioned: "#555",
  };

  const typeColors: Record<EntityType, string> = {
    character: "#e94560",
    location: "#0f3460",
    organization: "#533483",
    artifact: "#e9a045",
    concept: "#45e9a0",
    event: "#4560e9",
  };

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${h(bible.projectName)} — Series Bible</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; color: #e0e0e0; font-family: 'Georgia', serif; line-height: 1.6; padding: 40px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 2.5em; color: #e94560; border-bottom: 2px solid #0f3460; padding-bottom: 10px; margin-bottom: 20px; }
    h2 { font-size: 1.8em; color: #a0c4ff; margin: 40px 0 15px; border-bottom: 1px solid #0f3460; padding-bottom: 8px; }
    h3 { font-size: 1.3em; color: #e94560; margin: 25px 0 10px; }
    h4 { font-size: 1.1em; color: #a0a0a0; margin: 15px 0 8px; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.1em; margin-left: 8px; }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 15px 0; }
    .stat-card { background: #16213e; border: 1px solid #0f3460; border-radius: 12px; padding: 15px; text-align: center; }
    .stat-card .value { font-size: 2em; font-weight: bold; color: #e94560; }
    .stat-card .label { font-size: 0.8em; color: #888; text-transform: uppercase; letter-spacing: 0.1em; }
    .card { background: #16213e; border: 1px solid #0f3460; border-radius: 12px; padding: 20px; margin: 10px 0; }
    .meta-row { display: flex; gap: 20px; flex-wrap: wrap; margin: 8px 0; }
    .meta-row .key { color: #888; font-size: 0.9em; }
    .meta-row .val { color: #e0e0e0; font-size: 0.9em; }
    .appearances { margin-top: 10px; }
    .appearances li { font-size: 0.9em; color: #a0a0a0; margin: 3px 0; }
    .appearances .ms-title { color: #a0c4ff; }
    .relationship { font-size: 0.9em; margin: 3px 0; }
    .theme-tag { display: inline-block; padding: 3px 12px; background: #0f3460; border-radius: 20px; margin: 3px; font-size: 0.8em; color: #a0c4ff; }
    .genre-bar { background: #0f3460; border-radius: 6px; height: 8px; margin: 4px 0; }
    .genre-fill { background: #e94560; border-radius: 6px; height: 100%; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #0f3460; font-size: 0.9em; }
    th { color: #888; text-transform: uppercase; font-size: 0.75em; letter-spacing: 0.1em; }
    .toc { list-style: none; }
    .toc li { margin: 6px 0; }
    .toc a { color: #a0c4ff; text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    @media print { body { background: white; color: #333; } h1, h3 { color: #333; } h2 { color: #555; } .card { border-color: #ddd; background: #f9f9f9; } }
  </style>
</head>
<body>
  <h1>${h(bible.projectName)}</h1>
  <p style="color: #888; margin-bottom: 30px;">Series Bible &mdash; Generated ${new Date(bible.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

  <h2>Table of Contents</h2>
  <ul class="toc">
    <li><a href="#overview">Series Overview</a></li>
    <li><a href="#genre">Genre Analysis</a></li>
    <li><a href="#manuscripts">Manuscripts</a></li>
    <li><a href="#characters">Characters</a></li>
    <li><a href="#locations">Locations</a></li>
    <li><a href="#organizations">Organizations</a></li>
    <li><a href="#artifacts">Artifacts & Items</a></li>
    <li><a href="#crossbook">Cross-Book Presence</a></li>
    <li><a href="#relationships">Relationships</a></li>
  </ul>

  <h2 id="overview">Series Overview</h2>
  <div class="stat-grid">
    <div class="stat-card"><div class="value">${bible.series.bookCount}</div><div class="label">Books</div></div>
    <div class="stat-card"><div class="value">${(bible.series.totalWordCount / 1000).toFixed(0)}k</div><div class="label">Total Words</div></div>
    <div class="stat-card"><div class="value">${bible.series.totalCharacters}</div><div class="label">Characters</div></div>
    <div class="stat-card"><div class="value">${bible.series.totalEntities}</div><div class="label">Total Entities</div></div>
  </div>
  ${bible.series.recurringThemes.length > 0 ? `
  <h4>Recurring Themes</h4>
  <div>${bible.series.recurringThemes.map((t) => `<span class="theme-tag">${h(t)}</span>`).join("")}</div>
  ` : ""}

  <h2 id="genre">Genre Analysis</h2>
  <p style="margin-bottom:10px;">${h(bible.series.genreConsistency)}</p>
  ${bible.series.genres.map((g) => `
  <div style="margin:8px 0;">
    <span style="display:inline-block;width:150px;">${h(g.genre)}</span>
    <span style="display:inline-block;width:50px;text-align:right;color:#888;">${Math.round(g.confidence * 100)}%</span>
    <div class="genre-bar" style="display:inline-block;width:200px;vertical-align:middle;margin-left:10px;">
      <div class="genre-fill" style="width:${Math.round(g.confidence * 100)}%"></div>
    </div>
  </div>
  `).join("")}

  <h2 id="manuscripts">Manuscripts</h2>
  <table>
    <tr><th>Title</th><th>Chapters</th><th>Words</th><th>Characters</th><th>Entities</th></tr>
    ${bible.manuscripts.map((ms) => `
    <tr>
      <td>${h(ms.title)}</td>
      <td>${ms.chapterCount}</td>
      <td>${ms.wordCount.toLocaleString()}</td>
      <td>${ms.characterCount}</td>
      <td>${ms.entityCount}</td>
    </tr>
    `).join("")}
  </table>

  <h2 id="characters">Characters</h2>`;

  // Group by role
  const roleOrder: CharacterRole[] = ["protagonist", "deuteragonist", "antagonist", "supporting", "minor"];
  for (const role of roleOrder) {
    const chars = bible.characters.filter((c) => c.role === role);
    if (chars.length === 0) continue;

    html += `\n  <h3>${role.charAt(0).toUpperCase() + role.slice(1)}s</h3>`;
    for (const char of chars) {
      html += `\n  <div class="card">
    <h4>${h(char.name)} <span class="badge" style="background:${roleColors[char.role]}22;color:${roleColors[char.role]};border:1px solid ${roleColors[char.role]}">${char.role}</span></h4>`;

      const metaEntries = Object.entries(char.metadata);
      if (metaEntries.length > 0) {
        html += `\n    <div class="meta-row">${metaEntries.map(([k, v]) => `<span><span class="key">${h(k)}:</span> <span class="val">${h(Array.isArray(v) ? v.join(", ") : String(v))}</span></span>`).join("")}</div>`;
      }

      if (char.appearances.length > 0) {
        html += `\n    <ul class="appearances">`;
        for (const app of char.appearances) {
          html += `\n      <li><span class="ms-title">${h(app.manuscriptTitle)}</span>: ${app.chapters.slice(0, 5).map((c) => h(c)).join(", ")}${app.chapters.length > 5 ? ` +${app.chapters.length - 5} more` : ""}</li>`;
        }
        html += `\n    </ul>`;
      }

      if (char.relationships.length > 0) {
        html += `\n    <div style="margin-top:8px;">`;
        for (const rel of char.relationships) {
          const arrow = rel.direction === "outgoing" ? "&rarr;" : "&larr;";
          html += `\n      <div class="relationship">${arrow} <strong>${h(rel.type)}</strong> ${h(rel.targetName)} <span style="color:#888">(${rel.targetType})</span></div>`;
        }
        html += `\n    </div>`;
      }

      html += `\n  </div>`;
    }
  }

  // Entity sections
  const sections: { id: string; title: string; entities: SeriesBibleEntity[] }[] = [
    { id: "locations", title: "Locations", entities: bible.locations },
    { id: "organizations", title: "Organizations", entities: bible.organizations },
    { id: "artifacts", title: "Artifacts & Items", entities: bible.artifacts },
  ];

  for (const section of sections) {
    if (section.entities.length === 0) continue;
    html += `\n\n  <h2 id="${section.id}">${section.title}</h2>`;
    for (const ent of section.entities) {
      html += `\n  <div class="card">
    <h4>${h(ent.name)} <span class="badge" style="background:${typeColors[ent.type]}22;color:${typeColors[ent.type]};border:1px solid ${typeColors[ent.type]}">${ent.type}</span></h4>`;

      const metaEntries = Object.entries(ent.metadata);
      if (metaEntries.length > 0) {
        html += `\n    <div class="meta-row">${metaEntries.map(([k, v]) => `<span><span class="key">${h(k)}:</span> <span class="val">${h(Array.isArray(v) ? v.join(", ") : String(v))}</span></span>`).join("")}</div>`;
      }

      if (ent.appearances.length > 0) {
        html += `\n    <ul class="appearances">`;
        for (const app of ent.appearances) {
          html += `\n      <li><span class="ms-title">${h(app.manuscriptTitle)}</span>: ${app.chapters.map((c) => h(c)).join(", ")}</li>`;
        }
        html += `\n    </ul>`;
      }

      html += `\n  </div>`;
    }
  }

  // Cross-book
  if (bible.crossBookPresence.length > 0) {
    html += `\n\n  <h2 id="crossbook">Cross-Book Presence</h2>
  <p style="color:#888;margin-bottom:10px;">Entities that appear in more than one book.</p>
  <table>
    <tr><th>Entity</th><th>Type</th><th>Books</th></tr>
    ${bible.crossBookPresence.map((e) => `
    <tr>
      <td>${h(e.entityName)}</td>
      <td><span class="badge" style="background:${typeColors[e.entityType]}22;color:${typeColors[e.entityType]};border:1px solid ${typeColors[e.entityType]}">${e.entityType}</span></td>
      <td>${e.books.map((b) => h(b)).join(", ")}</td>
    </tr>
    `).join("")}
  </table>`;
  }

  // Relationships
  if (bible.relationships.length > 0) {
    html += `\n\n  <h2 id="relationships">Relationships</h2>
  <table>
    <tr><th>Source</th><th>Relationship</th><th>Target</th></tr>
    ${bible.relationships.map((r) => `
    <tr>
      <td>${h(r.source)} <span style="color:#888">(${r.sourceType})</span></td>
      <td>${h(r.type)}</td>
      <td>${h(r.target)} <span style="color:#888">(${r.targetType})</span></td>
    </tr>
    `).join("")}
  </table>`;
  }

  html += `
</body>
</html>`;

  return html;
}

// --- Internal helpers ---

function buildAppearanceMap(
  db: DB,
  projectId: number
): Map<number, { manuscriptTitle: string; chapters: string[] }[]> {
  const appearances = db.db
    .prepare(`
      SELECT a.entity_id, m.title as manuscript_title, c.title as chapter_title, m.id as manuscript_id
      FROM appearance a
      JOIN chapter c ON a.chapter_id = c.id
      JOIN manuscript m ON a.manuscript_id = m.id
      WHERE m.project_id = ?
      ORDER BY m.id, c.order_index
    `)
    .all(projectId) as {
      entity_id: number;
      manuscript_title: string;
      chapter_title: string;
      manuscript_id: number;
    }[];

  const map = new Map<number, Map<string, string[]>>();

  for (const a of appearances) {
    if (!map.has(a.entity_id)) map.set(a.entity_id, new Map());
    const msMap = map.get(a.entity_id)!;
    if (!msMap.has(a.manuscript_title)) msMap.set(a.manuscript_title, []);
    const chapters = msMap.get(a.manuscript_title)!;
    if (!chapters.includes(a.chapter_title)) {
      chapters.push(a.chapter_title);
    }
  }

  const result = new Map<number, { manuscriptTitle: string; chapters: string[] }[]>();
  for (const [entityId, msMap] of map) {
    result.set(
      entityId,
      [...msMap.entries()].map(([title, chapters]) => ({
        manuscriptTitle: title,
        chapters,
      }))
    );
  }

  return result;
}

function buildRelationshipMap(
  relationships: {
    source_entity_id: number; target_entity_id: number; type: string;
    source_name: string; source_type: EntityType; target_name: string; target_type: EntityType;
  }[],
  allEntities: { id: number; name: string; type: EntityType }[]
): Map<number, SeriesBibleEntity["relationships"]> {
  const map = new Map<number, SeriesBibleEntity["relationships"]>();

  for (const r of relationships) {
    // Outgoing from source
    if (!map.has(r.source_entity_id)) map.set(r.source_entity_id, []);
    map.get(r.source_entity_id)!.push({
      targetName: r.target_name,
      targetType: r.target_type,
      type: r.type,
      direction: "outgoing",
    });

    // Incoming to target
    if (!map.has(r.target_entity_id)) map.set(r.target_entity_id, []);
    map.get(r.target_entity_id)!.push({
      targetName: r.source_name,
      targetType: r.source_type,
      type: r.type,
      direction: "incoming",
    });
  }

  return map;
}
