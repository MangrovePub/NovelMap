import type { Database as DB } from "../db/database.js";
import type { Entity, EntityType, Appearance } from "./types.js";

export interface DetectionResult {
  entityId: number;
  entityName: string;
  entityType: EntityType;
  manuscriptId: number;
  chapterId: number;
  chapterTitle: string;
  /** Character offset of the match in the chapter body */
  offset: number;
  /** Whether this entity already had an appearance in this chapter */
  isNew: boolean;
}

export interface DetectionSummary {
  /** Total matches found across all chapters */
  totalMatches: number;
  /** New appearances created (didn't exist before) */
  newAppearances: number;
  /** Entities that were found in books they weren't previously in */
  crossBookEntities: {
    entityId: number;
    entityName: string;
    entityType: EntityType;
    /** Manuscripts this entity was already in */
    existingBooks: string[];
    /** New manuscripts where the entity was detected */
    newBooks: string[];
  }[];
  /** All individual detection results */
  details: DetectionResult[];
}

/**
 * Scan all chapters in a manuscript for mentions of existing project entities.
 * Automatically creates appearances for any matches found.
 *
 * This is the core of NovelMap's automatic cross-book entity detection —
 * when you import a second novel and a character from book 1 appears in book 2,
 * NovelMap finds it without you having to manually map it.
 */
export function detectEntities(
  db: DB,
  projectId: number,
  manuscriptId: number
): DetectionSummary {
  // Get all entities in this project
  const rawEntities = db.db
    .prepare("SELECT * FROM entity WHERE project_id = ? ORDER BY name")
    .all(projectId) as (Omit<Entity, "metadata"> & { metadata: string })[];

  const entities = rawEntities.map((e) => ({
    ...e,
    metadata: JSON.parse(e.metadata) as Record<string, unknown>,
  }));

  if (entities.length === 0) {
    return { totalMatches: 0, newAppearances: 0, crossBookEntities: [], details: [] };
  }

  // Get all chapters in this manuscript
  const chapters = db.db
    .prepare("SELECT * FROM chapter WHERE manuscript_id = ? ORDER BY order_index")
    .all(manuscriptId) as { id: number; manuscript_id: number; title: string; order_index: number; body: string }[];

  // Get existing appearances so we don't double-count
  const existingAppearances = new Set(
    (
      db.db
        .prepare(
          "SELECT entity_id, chapter_id FROM appearance WHERE manuscript_id = ?"
        )
        .all(manuscriptId) as { entity_id: number; chapter_id: number }[]
    ).map((a) => `${a.entity_id}-${a.chapter_id}`)
  );

  // Build search patterns from entity names
  // Include aliases from metadata if present (e.g., metadata.aliases, metadata.nickname)
  const searchTerms = buildSearchTerms(entities);

  const details: DetectionResult[] = [];
  let newAppearances = 0;

  const insertAppearance = db.db.prepare(
    "INSERT INTO appearance (entity_id, manuscript_id, chapter_id, text_range_start, text_range_end, notes) VALUES (?, ?, ?, ?, ?, ?)"
  );

  // Scan each chapter
  for (const chapter of chapters) {
    const bodyLower = chapter.body.toLowerCase();

    for (const { entity, terms } of searchTerms) {
      // Try each search term for this entity — longest first.
      // Once we find a match, record it and move on to the next entity.
      let found = false;

      for (const term of terms) {
        if (found) break;

        let searchFrom = 0;
        while (true) {
          const idx = bodyLower.indexOf(term, searchFrom);
          if (idx === -1) break;

          // Check word boundaries to avoid partial matches
          const before = idx > 0 ? bodyLower[idx - 1] : " ";
          const after =
            idx + term.length < bodyLower.length
              ? bodyLower[idx + term.length]
              : " ";

          if (isWordBoundary(before) && isWordBoundary(after)) {
            const key = `${entity.id}-${chapter.id}`;
            const isNew = !existingAppearances.has(key);

            details.push({
              entityId: entity.id,
              entityName: entity.name,
              entityType: entity.type as EntityType,
              manuscriptId,
              chapterId: chapter.id,
              chapterTitle: chapter.title,
              offset: idx,
              isNew,
            });

            // Create appearance if it doesn't exist
            if (isNew) {
              insertAppearance.run(
                entity.id,
                manuscriptId,
                chapter.id,
                idx,
                idx + term.length,
                "Auto-detected"
              );
              existingAppearances.add(key);
              newAppearances++;
            }

            found = true;
            break;
          }

          searchFrom = idx + 1;
        }
      }
    }
  }

  // Build cross-book summary
  const crossBookEntities = buildCrossBookSummary(db, projectId, manuscriptId, details);

  return {
    totalMatches: details.length,
    newAppearances,
    crossBookEntities,
    details,
  };
}

/**
 * Scan ALL manuscripts in a project for entity mentions.
 * Useful for a full re-scan after adding new entities.
 */
export function detectEntitiesFullProject(
  db: DB,
  projectId: number
): DetectionSummary {
  const manuscripts = db.db
    .prepare("SELECT id FROM manuscript WHERE project_id = ?")
    .all(projectId) as { id: number }[];

  const allDetails: DetectionResult[] = [];
  let totalNew = 0;
  const allCrossBook: DetectionSummary["crossBookEntities"] = [];

  for (const ms of manuscripts) {
    const result = detectEntities(db, projectId, ms.id);
    allDetails.push(...result.details);
    totalNew += result.newAppearances;
    allCrossBook.push(...result.crossBookEntities);
  }

  // Deduplicate cross-book entities
  const deduped = new Map<number, (typeof allCrossBook)[0]>();
  for (const cb of allCrossBook) {
    if (!deduped.has(cb.entityId)) {
      deduped.set(cb.entityId, cb);
    } else {
      const existing = deduped.get(cb.entityId)!;
      existing.newBooks = [
        ...new Set([...existing.newBooks, ...cb.newBooks]),
      ];
    }
  }

  return {
    totalMatches: allDetails.length,
    newAppearances: totalNew,
    crossBookEntities: Array.from(deduped.values()),
    details: allDetails,
  };
}

/**
 * Get cross-book presence for all entities in a project.
 * Returns which manuscripts each entity appears in.
 */
export function getCrossBookPresence(
  db: DB,
  projectId: number
): {
  entityId: number;
  entityName: string;
  entityType: EntityType;
  manuscripts: { id: number; title: string; chapterCount: number }[];
}[] {
  const entities = db.db
    .prepare("SELECT id, name, type FROM entity WHERE project_id = ? ORDER BY type, name")
    .all(projectId) as { id: number; name: string; type: EntityType }[];

  return entities.map((entity) => {
    const manuscripts = db.db
      .prepare(`
        SELECT m.id, m.title, COUNT(DISTINCT a.chapter_id) as chapter_count
        FROM appearance a
        JOIN manuscript m ON a.manuscript_id = m.id
        WHERE a.entity_id = ?
        GROUP BY m.id, m.title
        ORDER BY m.id
      `)
      .all(entity.id) as { id: number; title: string; chapter_count: number }[];

    return {
      entityId: entity.id,
      entityName: entity.name,
      entityType: entity.type,
      manuscripts: manuscripts.map((m) => ({
        id: m.id,
        title: m.title,
        chapterCount: m.chapter_count,
      })),
    };
  });
}

// --- Internal helpers ---

interface SearchEntry {
  entity: Entity;
  terms: string[];
}

function buildSearchTerms(
  entities: Entity[]
): SearchEntry[] {
  return entities.map((entity) => {
    const terms: string[] = [];

    // Primary name (lowercased)
    terms.push(entity.name.toLowerCase());

    // Extract aliases from metadata
    const meta = entity.metadata;
    if (meta) {
      for (const key of ["aliases", "alias", "nicknames", "nickname", "aka", "also_known_as"]) {
        const val = meta[key];
        if (typeof val === "string") {
          for (const alias of val.split(",").map((s) => s.trim().toLowerCase())) {
            if (alias.length >= 2) terms.push(alias);
          }
        }
        if (Array.isArray(val)) {
          for (const alias of val) {
            if (typeof alias === "string" && alias.length >= 2) {
              terms.push(alias.toLowerCase());
            }
          }
        }
      }

      // First name for characters (if the name has multiple parts)
      if (entity.type === "character") {
        const parts = entity.name.split(/\s+/);
        if (parts.length > 1 && parts[0].length >= 3) {
          terms.push(parts[0].toLowerCase());
        }
      }
    }

    // Deduplicate and sort longest first (prefer longer matches)
    const unique = [...new Set(terms)].sort((a, b) => b.length - a.length);

    return { entity, terms: unique };
  });
}

function isWordBoundary(char: string): boolean {
  return /[\s.,;:!?'"()\[\]{}\-—–\/\\<>]/.test(char) || char === " ";
}

function buildCrossBookSummary(
  db: DB,
  projectId: number,
  newManuscriptId: number,
  details: DetectionResult[]
): DetectionSummary["crossBookEntities"] {
  // Get manuscript titles
  const manuscripts = db.db
    .prepare("SELECT id, title FROM manuscript WHERE project_id = ?")
    .all(projectId) as { id: number; title: string }[];
  const msMap = new Map(manuscripts.map((m) => [m.id, m.title]));

  // Find entities that appear in the new manuscript
  const detectedEntityIds = new Set(details.map((d) => d.entityId));
  const result: DetectionSummary["crossBookEntities"] = [];

  for (const entityId of detectedEntityIds) {
    // Get all manuscripts this entity appears in
    const allAppearances = db.db
      .prepare(`
        SELECT DISTINCT manuscript_id FROM appearance WHERE entity_id = ?
      `)
      .all(entityId) as { manuscript_id: number }[];

    const existingMsIds = allAppearances
      .map((a) => a.manuscript_id)
      .filter((id) => id !== newManuscriptId);

    // Only report if entity exists in at least one OTHER book
    if (existingMsIds.length > 0) {
      const detail = details.find((d) => d.entityId === entityId)!;
      result.push({
        entityId,
        entityName: detail.entityName,
        entityType: detail.entityType,
        existingBooks: existingMsIds.map((id) => msMap.get(id) ?? `Manuscript #${id}`),
        newBooks: [msMap.get(newManuscriptId) ?? `Manuscript #${newManuscriptId}`],
      });
    }
  }

  return result;
}
