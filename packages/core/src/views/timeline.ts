import type { Database as DB } from "../db/database.js";
import type { EntityType } from "../core/types.js";

export interface TimelineEntry {
  entity_id: number;
  entity_name: string;
  entity_type: EntityType;
  manuscript_title: string;
  chapter_title: string;
  chapter_order: number;
  manuscript_id: number;
  chapter_id: number;
  notes: string | null;
}

/**
 * Build a timeline of entity appearances ordered by manuscript and chapter.
 */
export function buildTimeline(
  db: DB,
  projectId: number,
  filters?: { entityId?: number; manuscriptId?: number }
): TimelineEntry[] {
  let sql = `
    SELECT
      e.id as entity_id, e.name as entity_name, e.type as entity_type,
      m.title as manuscript_title, m.id as manuscript_id,
      c.title as chapter_title, c.order_index as chapter_order, c.id as chapter_id,
      a.notes
    FROM appearance a
    JOIN entity e ON a.entity_id = e.id
    JOIN manuscript m ON a.manuscript_id = m.id
    JOIN chapter c ON a.chapter_id = c.id
    WHERE e.project_id = ?
  `;
  const params: (number | string)[] = [projectId];

  if (filters?.entityId) {
    sql += " AND e.id = ?";
    params.push(filters.entityId);
  }
  if (filters?.manuscriptId) {
    sql += " AND m.id = ?";
    params.push(filters.manuscriptId);
  }

  sql += " ORDER BY m.title, c.order_index, e.name";

  return db.db.prepare(sql).all(...params) as TimelineEntry[];
}

/**
 * Detect continuity gaps: entities that appear in early chapters but
 * vanish for long stretches (configurable threshold).
 */
export function detectGaps(
  timeline: TimelineEntry[],
  gapThreshold: number = 5
): { entity_name: string; last_seen: string; gap_chapters: number }[] {
  // Group by entity
  const byEntity = new Map<number, TimelineEntry[]>();
  for (const entry of timeline) {
    const list = byEntity.get(entry.entity_id) ?? [];
    list.push(entry);
    byEntity.set(entry.entity_id, list);
  }

  const gaps: { entity_name: string; last_seen: string; gap_chapters: number }[] = [];

  for (const [, entries] of byEntity) {
    if (entries.length < 2) continue;
    for (let i = 1; i < entries.length; i++) {
      const gap = entries[i].chapter_order - entries[i - 1].chapter_order;
      if (gap >= gapThreshold) {
        gaps.push({
          entity_name: entries[0].entity_name,
          last_seen: `${entries[i - 1].manuscript_title} — ${entries[i - 1].chapter_title}`,
          gap_chapters: gap,
        });
      }
    }
  }

  return gaps;
}

/**
 * Render the Timeline as a standalone HTML page.
 */
export function renderTimelineHtml(
  entries: TimelineEntry[],
  gaps: { entity_name: string; last_seen: string; gap_chapters: number }[] = []
): string {
  // Group by manuscript then chapter
  const grouped = new Map<string, Map<string, TimelineEntry[]>>();
  for (const e of entries) {
    if (!grouped.has(e.manuscript_title)) grouped.set(e.manuscript_title, new Map());
    const chapters = grouped.get(e.manuscript_title)!;
    if (!chapters.has(e.chapter_title)) chapters.set(e.chapter_title, []);
    chapters.get(e.chapter_title)!.push(e);
  }

  let timelineHtml = "";
  for (const [manuscript, chapters] of grouped) {
    timelineHtml += `<div class="manuscript-group"><h2>${esc(manuscript)}</h2>`;
    for (const [chapter, chapterEntries] of chapters) {
      const entities = chapterEntries
        .map(
          (e) =>
            `<span class="entity-pill" data-type="${esc(e.entity_type)}">${esc(e.entity_name)}</span>`
        )
        .join(" ");
      timelineHtml += `<div class="chapter-row"><span class="chapter-label">${esc(chapter)}</span><div class="entities">${entities}</div></div>`;
    }
    timelineHtml += `</div>`;
  }

  const gapHtml = gaps.length
    ? `<div class="gaps"><h2>Continuity Gaps</h2><ul>${gaps
        .map(
          (g) =>
            `<li><strong>${esc(g.entity_name)}</strong> last seen in ${esc(g.last_seen)} — gap of ${g.gap_chapters} chapters</li>`
        )
        .join("")}</ul></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NovelMap — Timeline</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; background: #1a1a2e; color: #e0e0e0; padding: 2rem; }
  h1 { color: #e0e0e0; margin-bottom: 2rem; }
  h2 { color: #e94560; font-size: 1.2rem; margin: 1.5rem 0 0.8rem; }
  .manuscript-group { margin-bottom: 2rem; }
  .chapter-row { display: flex; align-items: flex-start; gap: 1rem; padding: 0.5rem 0; border-bottom: 1px solid #16213e; }
  .chapter-label { min-width: 140px; color: #a0c4ff; font-size: 0.9rem; flex-shrink: 0; }
  .entities { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .entity-pill { padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem; }
  .entity-pill[data-type="character"] { background: rgba(233,69,96,0.2); border: 1px solid #e94560; }
  .entity-pill[data-type="location"] { background: rgba(15,52,96,0.4); border: 1px solid #0f3460; }
  .entity-pill[data-type="organization"] { background: rgba(83,52,131,0.3); border: 1px solid #533483; }
  .entity-pill[data-type="artifact"] { background: rgba(233,160,69,0.2); border: 1px solid #e9a045; }
  .entity-pill[data-type="concept"] { background: rgba(69,233,160,0.2); border: 1px solid #45e9a0; }
  .entity-pill[data-type="event"] { background: rgba(69,96,233,0.2); border: 1px solid #4560e9; }
  .gaps { margin-top: 2rem; padding: 1.5rem; background: #16213e; border-radius: 8px; border: 1px solid #e9a045; }
  .gaps h2 { color: #e9a045; }
  .gaps ul { list-style: none; margin-top: 0.5rem; }
  .gaps li { padding: 0.3rem 0; font-size: 0.9rem; }
</style>
</head>
<body>
<h1>Timeline</h1>
${timelineHtml || "<p>No appearances found.</p>"}
${gapHtml}
</body>
</html>`;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
