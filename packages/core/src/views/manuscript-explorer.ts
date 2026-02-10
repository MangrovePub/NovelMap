import type { Database as DB } from "../db/database.js";
import type { Chapter, Appearance } from "../core/types.js";

interface ChapterWithHighlights extends Chapter {
  highlights: { entity_id: number; entity_name: string; entity_type: string; start: number; end: number; notes: string | null }[];
}

/**
 * Build the manuscript explorer data: chapters with entity highlights.
 */
export function buildManuscriptExplorer(
  db: DB,
  manuscriptId: number
): ChapterWithHighlights[] {
  const chapters = db.db
    .prepare("SELECT * FROM chapter WHERE manuscript_id = ? ORDER BY order_index")
    .all(manuscriptId) as Chapter[];

  return chapters.map((chapter) => {
    const highlights = db.db
      .prepare(`
        SELECT a.text_range_start as start, a.text_range_end as end, a.notes,
               e.id as entity_id, e.name as entity_name, e.type as entity_type
        FROM appearance a
        JOIN entity e ON a.entity_id = e.id
        WHERE a.chapter_id = ? AND a.text_range_start IS NOT NULL
        ORDER BY a.text_range_start
      `)
      .all(chapter.id) as ChapterWithHighlights["highlights"];

    return { ...chapter, highlights };
  });
}

/**
 * Render the Manuscript Explorer as a standalone HTML page.
 */
export function renderManuscriptExplorerHtml(
  title: string,
  chapters: ChapterWithHighlights[]
): string {
  const nav = chapters
    .map(
      (c) =>
        `<li><a href="#chapter-${c.id}">${esc(c.title)}</a></li>`
    )
    .join("\n");

  const content = chapters
    .map((c) => {
      const body = applyHighlights(c.body, c.highlights);
      return `
    <section class="chapter" id="chapter-${c.id}">
      <h2>${esc(c.title)}</h2>
      <div class="chapter-body">${body}</div>
    </section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NovelMap — ${esc(title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #1a1a2e; color: #e0e0e0; display: flex; }
  .sidebar { width: 250px; background: #16213e; padding: 1.5rem; height: 100vh; position: fixed; overflow-y: auto; border-right: 1px solid #0f3460; }
  .sidebar h1 { font-size: 1.2rem; color: #e94560; margin-bottom: 1rem; }
  .sidebar ul { list-style: none; }
  .sidebar li { margin-bottom: 0.5rem; }
  .sidebar a { color: #a0c4ff; text-decoration: none; font-size: 0.9rem; }
  .sidebar a:hover { color: #e94560; }
  .main { margin-left: 250px; padding: 2rem; flex: 1; max-width: 800px; }
  .chapter { margin-bottom: 3rem; }
  .chapter h2 { color: #e94560; margin-bottom: 1rem; font-size: 1.4rem; }
  .chapter-body { line-height: 1.8; font-size: 1rem; white-space: pre-wrap; }
  .entity-highlight { background: rgba(233, 69, 96, 0.2); border-bottom: 2px solid #e94560; cursor: pointer; position: relative; }
  .entity-highlight:hover::after { content: attr(data-entity); position: absolute; bottom: 100%; left: 0; background: #0f3460; color: #e0e0e0; padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.75rem; white-space: nowrap; }
</style>
</head>
<body>
<nav class="sidebar">
  <h1>${esc(title)}</h1>
  <ul>${nav}</ul>
</nav>
<main class="main">
${content || "<p>No chapters found.</p>"}
</main>
</body>
</html>`;
}

/**
 * Apply entity highlights to chapter body text.
 * Highlights are inserted as spans around the matched text ranges.
 */
function applyHighlights(
  body: string,
  highlights: ChapterWithHighlights["highlights"]
): string {
  if (highlights.length === 0) return esc(body);

  // Sort by start position descending so we can insert spans without offset issues
  const sorted = [...highlights].sort((a, b) => b.start - a.start);

  let result = body;
  for (const h of sorted) {
    if (h.start >= 0 && h.end <= result.length && h.start < h.end) {
      const before = esc(result.slice(0, h.start));
      const highlighted = esc(result.slice(h.start, h.end));
      const after = esc(result.slice(h.end));
      result = `${before}<span class="entity-highlight" data-entity="${esc(h.entity_name)} (${esc(h.entity_type)})" data-entity-id="${h.entity_id}">${highlighted}</span>${after}`;
      // Since we're building the final HTML in one pass from the end,
      // and we've already escaped, mark that we shouldn't double-escape
      return result;
    }
  }

  return esc(body);
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
