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

export function registerStudioDevEditRoutes(server: FastifyInstance) {
  // GET /api/studio/dev-edit?bookId= — summary by chapter
  server.get<{ Querystring: { bookId?: string } }>(
    "/api/studio/dev-edit",
    async (req) => {
      const { bookId } = req.query;

      // Resolve series_key + book_number from bookId
      let seriesKey: string | null = null;
      let bookNumber: number | null = null;
      if (bookId) {
        const [book] = await query(
          `SELECT series_key, book_number FROM public.books WHERE book_id = $1`,
          [bookId]
        );
        seriesKey = (book?.series_key as string) ?? null;
        bookNumber = (book?.book_number as number) ?? null;
      }

      const conditions: string[] = [];
      const params: unknown[] = [];
      let p = 1;
      if (seriesKey) { conditions.push(`series_key = $${p++}`); params.push(seriesKey); }
      if (bookNumber != null) { conditions.push(`book_number = $${p++}`); params.push(bookNumber); }
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      const rows = await query(`
        SELECT chunk_index, chapter, total_issue_count, ai_risk_count, payload
        FROM public.dev_edit_cache
        ${where}
        ORDER BY chunk_index
      `, params) as { chunk_index: number; chapter: string; total_issue_count: number; ai_risk_count: number; payload: unknown }[];

      // Parse payload and aggregate per chunk
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
          categories: cats,
        };
      });

      const totals = {
        chunks: chunks.length,
        issues: chunks.reduce((s, c) => s + c.total_issues, 0),
        ai_risks: chunks.reduce((s, c) => s + c.ai_risk_count, 0),
        by_category: {} as Record<string, number>,
      };
      for (const cat of CATEGORIES) {
        totals.by_category[cat] = chunks.reduce((s, c) => s + c.categories[cat], 0);
      }

      return { chunks, totals, book: { seriesKey, bookNumber } };
    }
  );

  // GET /api/studio/dev-edit/:chunkIndex?bookId= — full issues for one chunk
  server.get<{
    Params: { chunkIndex: string };
    Querystring: { bookId?: string };
  }>("/api/studio/dev-edit/:chunkIndex", async (req) => {
    const chunkIndex = parseInt(req.params.chunkIndex, 10);
    const { bookId } = req.query;

    let seriesKey: string | null = null;
    let bookNumber: number | null = null;
    if (bookId) {
      const [book] = await query(
        `SELECT series_key, book_number FROM public.books WHERE book_id = $1`,
        [bookId]
      );
      seriesKey = (book?.series_key as string) ?? null;
      bookNumber = (book?.book_number as number) ?? null;
    }

    const conditions: string[] = [`chunk_index = $1`];
    const params: unknown[] = [chunkIndex];
    let p = 2;
    if (seriesKey) { conditions.push(`series_key = $${p++}`); params.push(seriesKey); }
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
        strengths: analysis.strengths ?? [],
        priority_fixes: analysis.priority_fixes ?? [],
        pacing_notes: analysis.pacing_notes ?? [],
        clarity_issues: analysis.clarity_issues ?? [],
        character_notes: analysis.character_notes ?? [],
        structure_notes: analysis.structure_notes ?? [],
        continuity_flags: analysis.continuity_flags ?? [],
        ai_detection_risks: analysis.ai_detection_risks ?? [],
      },
    };
  });
}
