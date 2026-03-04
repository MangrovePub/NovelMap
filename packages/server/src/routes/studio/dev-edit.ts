import type { FastifyInstance } from "fastify";
import { query } from "../../pg.js";

interface IssueItem {
  issue: string;
  anchor_quote?: string;
  paragraph_hint?: string;
  rewrite_a?: string;
  rewrite_b?: string;
}

interface Analysis {
  strengths?: IssueItem[];
  pacing_notes?: IssueItem[];
  clarity_issues?: IssueItem[];
  priority_fixes?: IssueItem[];
  character_notes?: IssueItem[];
  structure_notes?: IssueItem[];
  continuity_flags?: IssueItem[];
  ai_detection_risks?: IssueItem[];
}

const CATEGORIES = [
  "priority_fixes",
  "pacing_notes",
  "clarity_issues",
  "character_notes",
  "structure_notes",
  "continuity_flags",
  "ai_detection_risks",
] as const;

async function resolveBook(bookId: string | undefined) {
  if (!bookId) return { seriesKey: null, bookNumber: null };
  const [book] = await query(
    `SELECT series_key, book_number FROM public.books WHERE book_id = $1`,
    [bookId]
  );
  return {
    seriesKey: (book?.series_key as string) ?? null,
    bookNumber: (book?.book_number as number) ?? null,
  };
}

export async function registerStudioDevEditRoutes(server: FastifyInstance) {
  // Ensure resolutions table exists
  await query(`
    CREATE TABLE IF NOT EXISTS public.dev_edit_resolutions (
      id           SERIAL PRIMARY KEY,
      series_key   TEXT    NOT NULL,
      book_number  INTEGER NOT NULL,
      chunk_index  INTEGER NOT NULL,
      category     TEXT    NOT NULL,
      issue_index  INTEGER NOT NULL,
      status       TEXT    NOT NULL CHECK(status IN ('resolved', 'dismissed', 'noted')),
      custom_note  TEXT,
      chosen_rewrite TEXT,
      created_at   TIMESTAMPTZ DEFAULT now(),
      updated_at   TIMESTAMPTZ DEFAULT now(),
      UNIQUE(series_key, book_number, chunk_index, category, issue_index)
    )
  `);

  // ── GET /api/studio/dev-edit?bookId= — summary by chapter ──────────────────
  server.get<{ Querystring: { bookId?: string } }>(
    "/api/studio/dev-edit",
    async (req) => {
      const { seriesKey, bookNumber } = await resolveBook(req.query.bookId);

      const conditions: string[] = [];
      const params: unknown[] = [];
      let p = 1;
      if (seriesKey)      { conditions.push(`series_key = $${p++}`);  params.push(seriesKey); }
      if (bookNumber != null) { conditions.push(`book_number = $${p++}`); params.push(bookNumber); }
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      const rows = await query(`
        SELECT chunk_index, chapter, total_issue_count, ai_risk_count, payload
        FROM public.dev_edit_cache
        ${where}
        ORDER BY chunk_index
      `, params) as { chunk_index: number; chapter: string; total_issue_count: number; ai_risk_count: number; payload: unknown }[];

      // Resolution counts per chunk
      let resolvedMap: Record<number, number> = {};
      if (seriesKey && bookNumber != null) {
        const resRows = await query(`
          SELECT chunk_index, COUNT(*) AS cnt
          FROM public.dev_edit_resolutions
          WHERE series_key = $1 AND book_number = $2 AND status = 'resolved'
          GROUP BY chunk_index
        `, [seriesKey, bookNumber]) as { chunk_index: number; cnt: string }[];
        for (const r of resRows) resolvedMap[r.chunk_index] = Number(r.cnt);
      }

      const chunks = rows.map((row) => {
        const items: { analysis?: Analysis }[] = Array.isArray(row.payload)
          ? row.payload as { analysis?: Analysis }[]
          : [row.payload as { analysis?: Analysis }];
        const analysis: Analysis = items[0]?.analysis ?? {};

        const cats: Record<string, number> = {};
        for (const cat of CATEGORIES) {
          cats[cat] = (analysis[cat] ?? []).length;
        }

        return {
          chunk_index: row.chunk_index,
          chapter: row.chapter || "(untitled)",
          total_issues: row.total_issue_count,
          ai_risk_count: row.ai_risk_count,
          resolved_count: resolvedMap[row.chunk_index] ?? 0,
          categories: cats,
        };
      });

      const totals = {
        chunks: chunks.length,
        issues: chunks.reduce((s, c) => s + c.total_issues, 0),
        ai_risks: chunks.reduce((s, c) => s + c.ai_risk_count, 0),
        resolved: chunks.reduce((s, c) => s + c.resolved_count, 0),
        by_category: {} as Record<string, number>,
      };
      for (const cat of CATEGORIES) {
        totals.by_category[cat] = chunks.reduce((s, c) => s + c.categories[cat], 0);
      }

      return { chunks, totals, book: { seriesKey, bookNumber } };
    }
  );

  // ── GET /api/studio/dev-edit/:chunkIndex?bookId= — full issues for one chunk
  server.get<{
    Params: { chunkIndex: string };
    Querystring: { bookId?: string };
  }>("/api/studio/dev-edit/:chunkIndex", async (req) => {
    const chunkIndex = parseInt(req.params.chunkIndex, 10);
    const { seriesKey, bookNumber } = await resolveBook(req.query.bookId);

    const conditions: string[] = [`chunk_index = $1`];
    const params: unknown[] = [chunkIndex];
    let p = 2;
    if (seriesKey)      { conditions.push(`series_key = $${p++}`);  params.push(seriesKey); }
    if (bookNumber != null) { conditions.push(`book_number = $${p++}`); params.push(bookNumber); }

    const [row] = await query(
      `SELECT chunk_index, chapter, total_issue_count, ai_risk_count, payload
       FROM public.dev_edit_cache
       WHERE ${conditions.join(" AND ")}`,
      params
    );
    if (!row) throw { statusCode: 404, message: "Chunk not found" };

    const items: { analysis?: Analysis }[] = Array.isArray(row.payload)
      ? row.payload as { analysis?: Analysis }[]
      : [row.payload as { analysis?: Analysis }];
    const analysis: Analysis = items[0]?.analysis ?? {};

    return {
      chunk_index: row.chunk_index,
      chapter: row.chapter || "(untitled)",
      total_issues: row.total_issue_count,
      ai_risk_count: row.ai_risk_count,
      analysis: {
        strengths:          analysis.strengths          ?? [],
        priority_fixes:     analysis.priority_fixes     ?? [],
        pacing_notes:       analysis.pacing_notes       ?? [],
        clarity_issues:     analysis.clarity_issues     ?? [],
        character_notes:    analysis.character_notes    ?? [],
        structure_notes:    analysis.structure_notes    ?? [],
        continuity_flags:   analysis.continuity_flags   ?? [],
        ai_detection_risks: analysis.ai_detection_risks ?? [],
      },
    };
  });

  // ── GET /api/studio/dev-edit/:chunkIndex/scenes — scene text for a chunk ──
  server.get<{
    Params: { chunkIndex: string };
    Querystring: { bookId?: string };
  }>("/api/studio/dev-edit/:chunkIndex/scenes", async (req) => {
    const chunkIndex = parseInt(req.params.chunkIndex, 10);
    const { seriesKey, bookNumber } = await resolveBook(req.query.bookId);
    if (!seriesKey || bookNumber == null) return { chapter: null, scenes: [] };

    const [chunk] = await query(
      `SELECT chapter FROM public.dev_edit_cache
       WHERE chunk_index = $1 AND series_key = $2 AND book_number = $3`,
      [chunkIndex, seriesKey, bookNumber]
    ) as { chapter: string }[];
    if (!chunk) return { chapter: null, scenes: [] };

    const scenes = await query(`
      SELECT s.scene_id, s.seq_in_chapter, s.subheader,
             s.word_count, s.scene_text, s.location, s.time_of_day
      FROM public.scenes s
      JOIN public.chapters c ON s.chapter_id = c.chapter_id
      JOIN public.books    b ON s.book_id    = b.book_id
      WHERE b.series_key = $1 AND b.book_number = $2 AND c.title ILIKE $3
      ORDER BY s.seq_in_chapter
    `, [seriesKey, bookNumber, chunk.chapter]);

    return { chapter: chunk.chapter, scenes };
  });

  // ── GET /api/studio/dev-edit/:chunkIndex/resolutions ──────────────────────
  server.get<{
    Params: { chunkIndex: string };
    Querystring: { bookId?: string };
  }>("/api/studio/dev-edit/:chunkIndex/resolutions", async (req) => {
    const chunkIndex = parseInt(req.params.chunkIndex, 10);
    const { seriesKey, bookNumber } = await resolveBook(req.query.bookId);
    if (!seriesKey || bookNumber == null) return { resolutions: [] };

    const resolutions = await query(`
      SELECT category, issue_index, status, custom_note, chosen_rewrite
      FROM public.dev_edit_resolutions
      WHERE series_key = $1 AND book_number = $2 AND chunk_index = $3
    `, [seriesKey, bookNumber, chunkIndex]);

    return { resolutions };
  });

  // ── POST /api/studio/dev-edit/resolve — upsert a resolution ───────────────
  server.post<{
    Body: {
      bookId?: string;
      chunkIndex: number;
      category: string;
      issueIndex: number;
      status: string;
      customNote?: string;
      chosenRewrite?: string;
    };
  }>("/api/studio/dev-edit/resolve", async (req) => {
    const { bookId, chunkIndex, category, issueIndex, status, customNote, chosenRewrite } = req.body;
    const { seriesKey, bookNumber } = await resolveBook(bookId);
    if (!seriesKey || bookNumber == null) throw { statusCode: 400, message: "bookId required" };

    await query(`
      INSERT INTO public.dev_edit_resolutions
        (series_key, book_number, chunk_index, category, issue_index, status, custom_note, chosen_rewrite, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
      ON CONFLICT (series_key, book_number, chunk_index, category, issue_index)
      DO UPDATE SET
        status         = EXCLUDED.status,
        custom_note    = EXCLUDED.custom_note,
        chosen_rewrite = EXCLUDED.chosen_rewrite,
        updated_at     = now()
    `, [seriesKey, bookNumber, chunkIndex, category, issueIndex, status, customNote ?? null, chosenRewrite ?? null]);

    return { ok: true };
  });
}
