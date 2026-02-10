import type { Database as DB } from "../db/database.js";
import type { Entity, Manuscript, Chapter } from "../core/types.js";
import { randomUUID } from "node:crypto";

export interface ScrivenerBundle {
  /** Filename for the .scrivx binder XML */
  scrivxFilename: string;
  /** The .scrivx XML content */
  scrivxContent: string;
  /** Map of relative file paths → file contents within the .scriv bundle */
  files: Map<string, string>;
}

/**
 * Export a NovelMap project as a Scrivener 3 .scriv bundle structure.
 *
 * Produces the binder XML (.scrivx), chapter content files (RTF),
 * and a Research folder containing entity metadata as plain text documents.
 */
export function exportScrivener(
  db: DB,
  projectId: number
): ScrivenerBundle {
  const project = db.db
    .prepare("SELECT * FROM project WHERE id = ?")
    .get(projectId) as { id: number; name: string; path: string } | undefined;
  if (!project) throw new Error(`Project not found: ${projectId}`);

  const manuscripts = db.db
    .prepare("SELECT * FROM manuscript WHERE project_id = ? ORDER BY id")
    .all(projectId) as Manuscript[];

  const entities = db.db
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
      metadata: string;
      source_name: string;
      target_name: string;
    }[];

  const files = new Map<string, string>();
  const binderItems: string[] = [];
  const uuidMap = new Map<string, string>();

  // Helper to generate and track UUIDs
  function getUUID(key: string): string {
    if (!uuidMap.has(key)) uuidMap.set(key, randomUUID().toUpperCase());
    return uuidMap.get(key)!;
  }

  // --- Draft Folder: manuscripts and chapters ---
  const draftUUID = getUUID("draft");
  const draftChildren: string[] = [];

  for (const manuscript of manuscripts) {
    const msUUID = getUUID(`ms-${manuscript.id}`);
    const chapters = db.db
      .prepare("SELECT * FROM chapter WHERE manuscript_id = ? ORDER BY order_index")
      .all(manuscript.id) as Chapter[];

    const chapterItems: string[] = [];
    for (const ch of chapters) {
      const chUUID = getUUID(`ch-${ch.id}`);

      // Write chapter content as RTF
      const rtf = textToRtf(ch.body);
      files.set(`Files/Data/${chUUID}/content.rtf`, rtf);

      chapterItems.push(`
                <BinderItem UUID="${chUUID}" Type="Text" Created="${isoNow()}" Modified="${isoNow()}">
                    <Title>${escXml(ch.title)}</Title>
                    <MetaData>
                        <IncludeInCompile>Yes</IncludeInCompile>
                    </MetaData>
                </BinderItem>`);
    }

    draftChildren.push(`
            <BinderItem UUID="${msUUID}" Type="Folder" Created="${isoNow()}" Modified="${isoNow()}">
                <Title>${escXml(manuscript.title)}</Title>
                <Children>${chapterItems.join("")}
                </Children>
            </BinderItem>`);
  }

  // --- Research Folder: entity metadata as documents ---
  const researchUUID = getUUID("research");
  const entityFolder = getUUID("entity-folder");
  const entityItems: string[] = [];

  // Group entities by type
  const byType = new Map<string, typeof entities>();
  for (const e of entities) {
    const list = byType.get(e.type) ?? [];
    list.push(e);
    byType.set(e.type, list);
  }

  for (const [type, typeEntities] of byType) {
    const typeFolderUUID = getUUID(`type-${type}`);
    const typeItems: string[] = [];

    for (const entity of typeEntities) {
      const eUUID = getUUID(`entity-${entity.id}`);
      const meta = JSON.parse(entity.metadata);

      // Build entity document with metadata
      const entityRels = relationships.filter(
        (r) =>
          r.source_entity_id === entity.id ||
          r.target_entity_id === entity.id
      );

      let doc = `${entity.name}\n${"=".repeat(entity.name.length)}\n\n`;
      doc += `Type: ${entity.type}\n`;

      if (Object.keys(meta).length > 0) {
        doc += `\nMetadata:\n`;
        for (const [k, v] of Object.entries(meta)) {
          doc += `  ${k}: ${String(v)}\n`;
        }
      }

      if (entityRels.length > 0) {
        doc += `\nRelationships:\n`;
        for (const r of entityRels) {
          if (r.source_entity_id === entity.id) {
            doc += `  → ${r.type}: ${r.target_name}\n`;
          } else {
            doc += `  ← ${r.type}: ${r.source_name}\n`;
          }
        }
      }

      // Get appearances
      const appearances = db.db
        .prepare(`
          SELECT a.notes, c.title as chapter_title, m.title as manuscript_title
          FROM appearance a
          JOIN chapter c ON a.chapter_id = c.id
          JOIN manuscript m ON a.manuscript_id = m.id
          WHERE a.entity_id = ?
          ORDER BY m.title, c.order_index
        `)
        .all(entity.id) as { notes: string | null; chapter_title: string; manuscript_title: string }[];

      if (appearances.length > 0) {
        doc += `\nAppearances:\n`;
        for (const a of appearances) {
          doc += `  ${a.manuscript_title} > ${a.chapter_title}`;
          if (a.notes) doc += ` (${a.notes})`;
          doc += `\n`;
        }
      }

      files.set(`Files/Data/${eUUID}/content.rtf`, textToRtf(doc));

      typeItems.push(`
                    <BinderItem UUID="${eUUID}" Type="Text" Created="${isoNow()}" Modified="${isoNow()}">
                        <Title>${escXml(entity.name)}</Title>
                        <MetaData>
                            <IncludeInCompile>No</IncludeInCompile>
                            <CustomMetaData>
                                <MetaDataItem>
                                    <FieldID>entityType</FieldID>
                                    <Value>${escXml(entity.type)}</Value>
                                </MetaDataItem>
                            </CustomMetaData>
                        </MetaData>
                    </BinderItem>`);
    }

    entityItems.push(`
                <BinderItem UUID="${typeFolderUUID}" Type="Folder" Created="${isoNow()}" Modified="${isoNow()}">
                    <Title>${escXml(type.charAt(0).toUpperCase() + type.slice(1))}</Title>
                    <Children>${typeItems.join("")}
                    </Children>
                </BinderItem>`);
  }

  // --- Assemble the .scrivx ---
  const scrivxContent = `<?xml version="1.0" encoding="UTF-8"?>
<ScrivenerProject Identifier="${getUUID("project")}" Version="2.0">
    <Binder>
        <BinderItem UUID="${draftUUID}" Type="DraftFolder" Created="${isoNow()}" Modified="${isoNow()}">
            <Title>Manuscript</Title>
            <Children>${draftChildren.join("")}
            </Children>
        </BinderItem>
        <BinderItem UUID="${researchUUID}" Type="ResearchFolder" Created="${isoNow()}" Modified="${isoNow()}">
            <Title>Research</Title>
            <Children>
                <BinderItem UUID="${entityFolder}" Type="Folder" Created="${isoNow()}" Modified="${isoNow()}">
                    <Title>NovelMap Entities</Title>
                    <Children>${entityItems.join("")}
                    </Children>
                </BinderItem>
            </Children>
        </BinderItem>
        <BinderItem UUID="${getUUID("trash")}" Type="TrashFolder" Created="${isoNow()}" Modified="${isoNow()}">
            <Title>Trash</Title>
        </BinderItem>
    </Binder>
    <ProjectProperties>
        <ProjectTitle>${escXml(project.name)}</ProjectTitle>
    </ProjectProperties>
</ScrivenerProject>`;

  const safeName = project.name.replace(/[^a-zA-Z0-9_\- ]/g, "");
  const scrivxFilename = `${safeName}.scrivx`;

  return {
    scrivxFilename,
    scrivxContent,
    files,
  };
}

/**
 * Convert plain text to minimal RTF.
 */
function textToRtf(text: string): string {
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\n/g, "\\par\n");

  return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fswiss Helvetica;}}\\f0\\fs24 ${escaped}}`;
}

function escXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isoNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}
