import type { Database as DB } from "../db/database.js";
import type { Entity, Manuscript, Chapter, EntityType } from "../core/types.js";

/**
 * Export a NovelMap project as a Plottr-compatible .pltr JSON structure.
 *
 * Maps NovelMap concepts to Plottr equivalents:
 *   - Manuscripts → Books
 *   - Chapters → Beats
 *   - Entities (characters) → Characters
 *   - Entities (locations) → Places
 *   - Entities (other) → Notes
 *   - Relationships → Character/Place cross-references on cards
 */
export function exportPlottr(
  db: DB,
  projectId: number
): Record<string, unknown> {
  const project = db.db
    .prepare("SELECT * FROM project WHERE id = ?")
    .get(projectId) as { id: number; name: string; path: string } | undefined;
  if (!project) throw new Error(`Project not found: ${projectId}`);

  const manuscripts = db.db
    .prepare("SELECT * FROM manuscript WHERE project_id = ? ORDER BY id")
    .all(projectId) as Manuscript[];

  const allEntities = db.db
    .prepare("SELECT * FROM entity WHERE project_id = ? ORDER BY type, name")
    .all(projectId) as (Omit<Entity, "metadata"> & { metadata: string })[];

  const relationships = db.db
    .prepare(`
      SELECT r.*, se.name as source_name, te.name as target_name
      FROM relationship r
      JOIN entity se ON r.source_entity_id = se.id
      JOIN entity te ON r.target_entity_id = te.id
      WHERE se.project_id = ?
    `)
    .all(projectId) as {
      id: number;
      source_entity_id: number;
      target_entity_id: number;
      type: string;
      source_name: string;
      target_name: string;
    }[];

  // ID counters
  let nextCharId = 1;
  let nextPlaceId = 1;
  let nextNoteId = 1;
  let nextCardId = 1;
  let nextLineId = 1;
  let nextBeatId = 1;
  let nextTagId = 1;

  // --- Characters: entities of type "character" ---
  const characterEntities = allEntities.filter((e) => e.type === "character");
  const characters = characterEntities.map((e) => {
    const meta = JSON.parse(e.metadata);
    const charId = nextCharId++;
    return {
      id: charId,
      _novelMapId: e.id,
      name: e.name,
      description: metaToRichText(meta),
      notes: "",
      color: entityColor(e.type as EntityType),
      cards: [],
      noteIds: [],
      templates: [],
      tags: [],
      categoryId: null,
      imageId: null,
      bookIds: manuscripts.map((_, i) => i + 1),
    };
  });

  // --- Places: entities of type "location" ---
  const placeEntities = allEntities.filter((e) => e.type === "location");
  const places = placeEntities.map((e) => {
    const meta = JSON.parse(e.metadata);
    const placeId = nextPlaceId++;
    return {
      id: placeId,
      _novelMapId: e.id,
      name: e.name,
      description: metaToRichText(meta),
      notes: "",
      color: entityColor(e.type as EntityType),
      cards: [],
      noteIds: [],
      templates: [],
      tags: [],
      categoryId: null,
      imageId: null,
      bookIds: manuscripts.map((_, i) => i + 1),
    };
  });

  // --- Notes: all other entity types (organization, artifact, concept, event) ---
  const noteEntities = allEntities.filter(
    (e) => e.type !== "character" && e.type !== "location"
  );
  const notes = noteEntities.map((e) => {
    const meta = JSON.parse(e.metadata);
    const noteId = nextNoteId++;

    // Include relationships in the note content
    const entityRels = relationships.filter(
      (r) => r.source_entity_id === e.id || r.target_entity_id === e.id
    );

    const content = [
      ...metaToRichText(meta),
      ...(entityRels.length > 0
        ? [
            { type: "paragraph", children: [{ text: "" }] },
            {
              type: "paragraph",
              children: [{ text: "Relationships:", bold: true }],
            },
            ...entityRels.map((r) => ({
              type: "paragraph",
              children: [
                {
                  text:
                    r.source_entity_id === e.id
                      ? `→ ${r.type}: ${r.target_name}`
                      : `← ${r.type}: ${r.source_name}`,
                },
              ],
            })),
          ]
        : []),
    ];

    return {
      id: noteId,
      _novelMapId: e.id,
      title: `[${e.type}] ${e.name}`,
      content,
      tags: [],
      characters: [],
      places: [],
      lastEdited: Date.now(),
      templates: [],
      imageId: null,
      bookIds: manuscripts.map((_, i) => i + 1),
    };
  });

  // --- Tags from entity types ---
  const entityTypes: EntityType[] = [
    "character",
    "location",
    "organization",
    "artifact",
    "concept",
    "event",
  ];
  const tags = entityTypes.map((type) => ({
    id: nextTagId++,
    title: type,
    color: entityColor(type),
  }));

  // --- Books from manuscripts ---
  const books: Record<string, unknown> = {
    allIds: manuscripts.map((_, i) => i + 1),
  };
  for (let i = 0; i < manuscripts.length; i++) {
    books[String(i + 1)] = {
      id: i + 1,
      title: manuscripts[i].title,
      premise: "",
      genre: "",
      theme: "",
      templates: [],
      timelineTemplates: [],
      imageId: null,
    };
  }

  // --- Lines (plotlines): one default per book ---
  const lines = manuscripts.map((m, i) => ({
    id: nextLineId++,
    bookId: i + 1,
    color: "#6cace4",
    title: "Main Plot",
    position: 0,
    characterId: null,
    expanded: null,
    fromTemplateId: null,
  }));

  // Add a "Relationships" line per book
  for (let i = 0; i < manuscripts.length; i++) {
    lines.push({
      id: nextLineId++,
      bookId: i + 1,
      color: "#e94560",
      title: "Relationships",
      position: 1,
      characterId: null,
      expanded: null,
      fromTemplateId: null,
    });
  }

  // --- Beats (chapters) and Cards (from appearances) ---
  const beats: Record<string, unknown> = {};
  const cards: Record<string, unknown>[] = [];

  for (let bookIdx = 0; bookIdx < manuscripts.length; bookIdx++) {
    const bookId = bookIdx + 1;
    const chapters = db.db
      .prepare(
        "SELECT * FROM chapter WHERE manuscript_id = ? ORDER BY order_index"
      )
      .all(manuscripts[bookIdx].id) as Chapter[];

    const beatChildren: Record<string, number[] | null> = { null: [] };
    const beatHeap: Record<string, null> = {};
    const beatIndex: Record<string, unknown> = {};

    for (const ch of chapters) {
      const beatId = nextBeatId++;
      (beatChildren["null"] as number[]).push(beatId);
      beatHeap[String(beatId)] = null;
      beatIndex[String(beatId)] = {
        id: beatId,
        bookId,
        position: ch.order_index,
        title: ch.title,
        time: 0,
        templates: [],
        autoOutlineSort: true,
        fromTemplateId: null,
        expanded: true,
      };

      // Create cards from appearances in this chapter
      const appearances = db.db
        .prepare(`
          SELECT a.*, e.id as eid, e.type as etype, e.name as ename
          FROM appearance a
          JOIN entity e ON a.entity_id = e.id
          WHERE a.chapter_id = ?
        `)
        .all(ch.id) as {
          id: number;
          entity_id: number;
          notes: string | null;
          eid: number;
          etype: string;
          ename: string;
        }[];

      if (appearances.length > 0) {
        // Group appearances into a single card per chapter
        const charIds = appearances
          .filter((a) => a.etype === "character")
          .map((a) => {
            const c = characters.find((c) => c._novelMapId === a.eid);
            return c?.id;
          })
          .filter(Boolean);

        const placeIds = appearances
          .filter((a) => a.etype === "location")
          .map((a) => {
            const p = places.find((p) => p._novelMapId === a.eid);
            return p?.id;
          })
          .filter(Boolean);

        const notesText = appearances
          .filter((a) => a.notes)
          .map((a) => `${a.ename}: ${a.notes}`)
          .join("\n");

        cards.push({
          id: nextCardId++,
          lineId: lines.find((l) => l.bookId === bookId && l.title === "Main Plot")!.id,
          beatId,
          seriesLineId: null,
          bookId,
          positionWithinLine: 0,
          positionInChapter: 0,
          title: ch.title,
          description: notesText
            ? [{ type: "paragraph", children: [{ text: notesText }] }]
            : [{ type: "paragraph", children: [{ text: "" }] }],
          tags: [],
          characters: charIds,
          places: placeIds,
          templates: [],
          imageId: null,
          color: null,
          fromTemplateId: null,
        });
      }
    }

    beats[String(bookId)] = {
      children: beatChildren,
      heap: beatHeap,
      index: beatIndex,
    };
  }

  // --- Custom attributes ---
  const customAttributes = {
    characters: [
      { name: "Role", type: "text" },
      { name: "NovelMap Type", type: "text" },
    ],
    places: [
      { name: "NovelMap Type", type: "text" },
    ],
    cards: [],
    scenes: [],
    lines: [],
  };

  // --- Categories ---
  const categories = {
    characters: [
      { id: 1, name: "Main" },
      { id: 2, name: "Supporting" },
      { id: 3, name: "Other" },
    ],
    places: [],
    notes: [{ id: 1, name: "Entities" }],
    tags: [{ id: 1, name: "Main" }],
  };

  // --- Assemble full .pltr structure ---
  // Strip internal _novelMapId fields from output
  const cleanCharacters = characters.map(
    ({ _novelMapId, ...rest }) => rest
  );
  const cleanPlaces = places.map(({ _novelMapId, ...rest }) => rest);
  const cleanNotes = notes.map(({ _novelMapId, ...rest }) => rest);

  return {
    file: {
      fileName: `${project.name}.pltr`,
      loaded: true,
      dirty: false,
      version: "2024.10.1",
    },
    ui: {
      currentView: "timeline",
      currentTimeline: 1,
    },
    series: {
      name: project.name,
      premise: "",
      genre: "",
      theme: "",
      templates: [],
    },
    books,
    characters: cleanCharacters,
    places: cleanPlaces,
    cards,
    lines,
    beats,
    tags,
    notes: cleanNotes,
    categories,
    customAttributes,
    images: {},
    hierarchyLevels: {
      "0": {
        name: "Scene",
        level: 0,
        autoNumber: true,
        textSize: 14,
        borderStyle: "pointed",
        backgroundColor: "none",
        textColor: "#6cace4",
        borderColor: "#6cace4",
        dark: { borderColor: "#6cace4", textColor: "#6cace4" },
        light: { borderColor: "#6cace4", textColor: "#6cace4" },
      },
    },
    featureFlags: {},
  };
}

// --- Helpers ---

function entityColor(type: EntityType): string {
  const colors: Record<EntityType, string> = {
    character: "#e94560",
    location: "#0f3460",
    organization: "#533483",
    artifact: "#e9a045",
    concept: "#45e9a0",
    event: "#4560e9",
  };
  return colors[type] ?? "#888888";
}

function metaToRichText(
  meta: Record<string, unknown>
): { type: string; children: { text: string; bold?: boolean }[] }[] {
  const entries = Object.entries(meta);
  if (entries.length === 0) {
    return [{ type: "paragraph", children: [{ text: "" }] }];
  }
  return entries.map(([key, value]) => ({
    type: "paragraph",
    children: [
      { text: `${key}: `, bold: true },
      { text: String(value) },
    ],
  }));
}
