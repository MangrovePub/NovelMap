import type { Database as DB } from "../db/database.js";
import type { EntityType } from "../core/types.js";

/**
 * Character Role Classifier.
 *
 * Analyzes appearance frequency, positional patterns, and narrative
 * context to classify characters as protagonist, antagonist, supporting,
 * or minor. Also detects deuteragonists (secondary leads) and
 * characters whose roles shift across books.
 */

export type CharacterRole =
  | "protagonist"
  | "deuteragonist"
  | "antagonist"
  | "supporting"
  | "minor"
  | "mentioned"; // appears by name but never acts

export interface CharacterRoleResult {
  entityId: number;
  entityName: string;
  role: CharacterRole;
  confidence: number; // 0–1
  /** What percentage of chapters this character appears in */
  presenceRatio: number;
  /** Weighted score: early/late chapter appearances count more */
  narrativeWeight: number;
  /** Position — which portion of the book they appear most in */
  peakAct: "opening" | "middle" | "climax" | "throughout";
  /** Antagonist signals found */
  antagonistSignals: string[];
  /** Per-manuscript breakdown for series tracking */
  perManuscript: {
    manuscriptId: number;
    manuscriptTitle: string;
    role: CharacterRole;
    chapterAppearances: number;
    totalChapters: number;
  }[];
}

export interface RoleAnalysis {
  projectId: number;
  characters: CharacterRoleResult[];
  /** Characters whose roles change across books (e.g., ally → antagonist) */
  roleShifts: {
    entityId: number;
    entityName: string;
    shifts: { manuscriptTitle: string; role: CharacterRole }[];
  }[];
}

// Words that appear near antagonist characters
const ANTAGONIST_CONTEXT_WORDS = [
  "enemy", "threat", "villain", "oppose", "against", "menace",
  "rival", "adversary", "betray", "scheme", "plot against",
  "destroy", "conquer", "dominate", "terrorize", "ruthless",
  "sinister", "malicious", "devious", "manipulate", "deceive",
];

/**
 * Classify all character entities in a project.
 */
export function classifyRoles(
  db: DB,
  projectId: number
): RoleAnalysis {
  // Get all character entities
  const characters = db.db
    .prepare("SELECT * FROM entity WHERE project_id = ? AND type = 'character' ORDER BY name")
    .all(projectId) as { id: number; name: string; type: EntityType; metadata: string }[];

  // Get all manuscripts
  const manuscripts = db.db
    .prepare("SELECT * FROM manuscript WHERE project_id = ? ORDER BY id")
    .all(projectId) as { id: number; title: string }[];

  // Get all chapters with their bodies
  const allChapters = new Map<number, { id: number; manuscript_id: number; order_index: number; body: string; total: number }[]>();
  for (const ms of manuscripts) {
    const chapters = db.db
      .prepare("SELECT id, manuscript_id, order_index, body FROM chapter WHERE manuscript_id = ? ORDER BY order_index")
      .all(ms.id) as { id: number; manuscript_id: number; order_index: number; body: string }[];
    allChapters.set(ms.id, chapters.map((c) => ({ ...c, total: chapters.length })));
  }

  // Get all appearances
  const appearances = db.db
    .prepare(`
      SELECT a.entity_id, a.chapter_id, a.manuscript_id, c.order_index, c.body
      FROM appearance a
      JOIN chapter c ON a.chapter_id = c.id
      WHERE a.entity_id IN (SELECT id FROM entity WHERE project_id = ? AND type = 'character')
    `)
    .all(projectId) as {
      entity_id: number;
      chapter_id: number;
      manuscript_id: number;
      order_index: number;
      body: string;
    }[];

  // Group appearances by entity
  const entityAppearances = new Map<number, typeof appearances>();
  for (const a of appearances) {
    if (!entityAppearances.has(a.entity_id)) {
      entityAppearances.set(a.entity_id, []);
    }
    entityAppearances.get(a.entity_id)!.push(a);
  }

  const results: CharacterRoleResult[] = [];

  for (const char of characters) {
    const charAppearances = entityAppearances.get(char.id) ?? [];
    const charNameLower = char.name.toLowerCase();

    // Per-manuscript analysis
    const perManuscript: CharacterRoleResult["perManuscript"] = [];

    for (const ms of manuscripts) {
      const msChapters = allChapters.get(ms.id) ?? [];
      const msAppearances = charAppearances.filter((a) => a.manuscript_id === ms.id);
      const totalChapters = msChapters.length;
      const chapterAppearances = new Set(msAppearances.map((a) => a.chapter_id)).size;

      if (chapterAppearances === 0) continue;

      const presenceRatio = chapterAppearances / Math.max(totalChapters, 1);
      const msRole = classifySingleRole(presenceRatio, msAppearances, msChapters, charNameLower);

      perManuscript.push({
        manuscriptId: ms.id,
        manuscriptTitle: ms.title,
        role: msRole,
        chapterAppearances,
        totalChapters,
      });
    }

    // Overall analysis across all manuscripts
    const totalChaptersAll = [...allChapters.values()].reduce((sum, chs) => sum + chs.length, 0);
    const uniqueChapterIds = new Set(charAppearances.map((a) => a.chapter_id)).size;
    const presenceRatio = uniqueChapterIds / Math.max(totalChaptersAll, 1);

    // Narrative weight: opening + climax chapters count 2x
    let narrativeWeight = 0;
    for (const a of charAppearances) {
      const msChapters = allChapters.get(a.manuscript_id) ?? [];
      const total = msChapters.length;
      const position = a.order_index / Math.max(total - 1, 1);
      // Opening (first 15%) and climax (last 15%) get 2x weight
      const multiplier = position < 0.15 || position > 0.85 ? 2 : 1;
      narrativeWeight += multiplier;
    }
    narrativeWeight = narrativeWeight / Math.max(totalChaptersAll, 1);

    // Peak act
    const peakAct = detectPeakAct(charAppearances, allChapters);

    // Antagonist signals
    const antagonistSignals = detectAntagonistSignals(charAppearances, charNameLower);

    // Determine overall role
    let role: CharacterRole;
    const confidence = Math.min(1, presenceRatio * 2 + narrativeWeight);

    if (charAppearances.length === 0) {
      role = "mentioned";
    } else if (presenceRatio >= 0.6 && narrativeWeight >= 0.5) {
      role = antagonistSignals.length >= 3 ? "antagonist" : "protagonist";
    } else if (presenceRatio >= 0.35 && narrativeWeight >= 0.3) {
      role = antagonistSignals.length >= 3 ? "antagonist" : "deuteragonist";
    } else if (presenceRatio >= 0.15) {
      role = antagonistSignals.length >= 2 ? "antagonist" : "supporting";
    } else {
      role = "minor";
    }

    results.push({
      entityId: char.id,
      entityName: char.name,
      role,
      confidence: Math.round(confidence * 100) / 100,
      presenceRatio: Math.round(presenceRatio * 100) / 100,
      narrativeWeight: Math.round(narrativeWeight * 100) / 100,
      peakAct,
      antagonistSignals,
      perManuscript,
    });
  }

  // Sort: protagonist first, then by presence
  results.sort((a, b) => {
    const roleOrder: Record<CharacterRole, number> = {
      protagonist: 0, deuteragonist: 1, antagonist: 2,
      supporting: 3, minor: 4, mentioned: 5,
    };
    if (roleOrder[a.role] !== roleOrder[b.role]) {
      return roleOrder[a.role] - roleOrder[b.role];
    }
    return b.presenceRatio - a.presenceRatio;
  });

  // Detect role shifts across books
  const roleShifts = detectRoleShifts(results);

  return { projectId, characters: results, roleShifts };
}

// --- Internal helpers ---

function classifySingleRole(
  presenceRatio: number,
  appearances: { order_index: number }[],
  chapters: { id: number; order_index: number }[],
  _charNameLower: string
): CharacterRole {
  if (appearances.length === 0) return "mentioned";
  if (presenceRatio >= 0.6) return "protagonist";
  if (presenceRatio >= 0.35) return "deuteragonist";
  if (presenceRatio >= 0.15) return "supporting";
  return "minor";
}

function detectPeakAct(
  appearances: { manuscript_id: number; order_index: number }[],
  allChapters: Map<number, { order_index: number; total: number }[]>
): "opening" | "middle" | "climax" | "throughout" {
  if (appearances.length === 0) return "middle";

  let opening = 0, middle = 0, climax = 0;

  for (const a of appearances) {
    const msChapters = allChapters.get(a.manuscript_id) ?? [];
    const total = msChapters.length;
    const position = a.order_index / Math.max(total - 1, 1);

    if (position < 0.33) opening++;
    else if (position < 0.66) middle++;
    else climax++;
  }

  const total = opening + middle + climax;
  const openingRatio = opening / total;
  const middleRatio = middle / total;
  const climaxRatio = climax / total;

  // "Throughout" if roughly evenly distributed
  if (openingRatio > 0.2 && middleRatio > 0.2 && climaxRatio > 0.2) {
    return "throughout";
  }

  if (openingRatio >= middleRatio && openingRatio >= climaxRatio) return "opening";
  if (climaxRatio >= middleRatio) return "climax";
  return "middle";
}

function detectAntagonistSignals(
  appearances: { body: string; chapter_id: number }[],
  charNameLower: string
): string[] {
  const signals: string[] = [];
  const seenChapters = new Set<number>();

  for (const a of appearances) {
    if (seenChapters.has(a.chapter_id)) continue;
    seenChapters.add(a.chapter_id);

    const bodyLower = a.body.toLowerCase();
    const nameIdx = bodyLower.indexOf(charNameLower);
    if (nameIdx === -1) continue;

    // Look at a 500-char window around the character's name
    const windowStart = Math.max(0, nameIdx - 250);
    const windowEnd = Math.min(bodyLower.length, nameIdx + charNameLower.length + 250);
    const window = bodyLower.substring(windowStart, windowEnd);

    for (const word of ANTAGONIST_CONTEXT_WORDS) {
      if (window.includes(word) && !signals.includes(word)) {
        signals.push(word);
      }
    }
  }

  return signals.slice(0, 5);
}

function detectRoleShifts(
  characters: CharacterRoleResult[]
): RoleAnalysis["roleShifts"] {
  const shifts: RoleAnalysis["roleShifts"] = [];

  for (const char of characters) {
    if (char.perManuscript.length < 2) continue;

    const roles = char.perManuscript.map((pm) => pm.role);
    const uniqueRoles = new Set(roles);

    // A shift is when a character's role changes meaningfully
    // (not just minor → supporting, but supporting → antagonist, etc.)
    const significantRoles = new Set(
      roles.filter((r) => r !== "minor" && r !== "mentioned")
    );

    if (significantRoles.size >= 2) {
      shifts.push({
        entityId: char.entityId,
        entityName: char.entityName,
        shifts: char.perManuscript.map((pm) => ({
          manuscriptTitle: pm.manuscriptTitle,
          role: pm.role,
        })),
      });
    }
  }

  return shifts;
}
