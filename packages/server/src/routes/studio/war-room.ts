import type { FastifyInstance } from "fastify";
import { query } from "../../pg.js";

const UNIVERSE_LABELS: Record<string, string> = {
  knox_ramsey_universe: "Knox Ramsey Universe",
  dunlap_universe:      "Dunlap / Blackwood Universe",
  dahl_universe:        "Jackson Dahl Universe",
};

const UNIVERSE_ORDER = ["knox_ramsey_universe", "dunlap_universe", "dahl_universe"];

const WORD_TARGETS: Record<string, number> = {
  knox_ramsey:     100_000,
  dunlap_saga:      90_000,
  blackwood:        90_000,
  jackson_dahl_pi:  40_000,
};

export function registerWarRoomRoutes(server: FastifyInstance) {
  // GET /api/studio/war-room — full dashboard payload
  server.get("/api/studio/war-room", async () => {
    const books = await query<{
      book_id: string;
      title: string;
      universe_key: string;
      series_key: string;
      book_number: number | null;
      chapter_count: string;
      scene_count: string;
      word_count: string;
    }>(`
      SELECT
        b.book_id,
        b.title,
        b.universe_key,
        b.series_key,
        b.book_number,
        COUNT(DISTINCT c.chapter_id)::text  AS chapter_count,
        COUNT(DISTINCT s.scene_id)::text    AS scene_count,
        COALESCE(SUM(s.word_count), 0)::text AS word_count
      FROM public.books b
      LEFT JOIN public.chapters c ON c.book_id = b.book_id
      LEFT JOIN public.scenes   s ON s.book_id = b.book_id
      GROUP BY b.book_id, b.title, b.universe_key, b.series_key, b.book_number
      ORDER BY b.universe_key, b.series_key, b.book_number NULLS LAST
    `);

    // Dev edit issue counts (best-effort — table may not have book linkage yet)
    let issuesByBook: Record<string, number> = {};
    try {
      const issues = await query<{ book_id: string; cnt: string }>(`
        SELECT c.book_id, COUNT(*)::text AS cnt
        FROM public.dev_edit_cache d
        JOIN public.chapters c ON c.chapter_id = d.chapter_id
        GROUP BY c.book_id
      `);
      issuesByBook = Object.fromEntries(issues.map((r) => [r.book_id, Number(r.cnt)]));
    } catch {
      // dev_edit_cache not linked to chapters yet — skip silently
    }

    // Group into universe buckets
    const universeMap = new Map<string, {
      universe_key: string;
      universe_name: string;
      total_words: number;
      total_chapters: number;
      total_scenes: number;
      books: unknown[];
    }>();

    for (const b of books) {
      const wc = Number(b.word_count);
      const cc = Number(b.chapter_count);
      const sc = Number(b.scene_count);
      const target = WORD_TARGETS[b.series_key] ?? 90_000;

      if (!universeMap.has(b.universe_key)) {
        universeMap.set(b.universe_key, {
          universe_key:  b.universe_key,
          universe_name: UNIVERSE_LABELS[b.universe_key] ?? b.universe_key,
          total_words:    0,
          total_chapters: 0,
          total_scenes:   0,
          books:          [],
        });
      }

      const u = universeMap.get(b.universe_key)!;
      u.total_words    += wc;
      u.total_chapters += cc;
      u.total_scenes   += sc;
      u.books.push({
        book_id:       b.book_id,
        title:         b.title,
        series_key:    b.series_key,
        book_number:   b.book_number,
        word_count:    wc,
        word_target:   target,
        chapter_count: cc,
        scene_count:   sc,
        dev_edit_issues: issuesByBook[b.book_id] ?? 0,
      });
    }

    const universes = UNIVERSE_ORDER
      .map((k) => universeMap.get(k))
      .filter(Boolean);

    const totals = {
      universes: universes.length,
      books:     books.length,
      words:     universes.reduce((s, u) => s + (u?.total_words ?? 0), 0),
      chapters:  universes.reduce((s, u) => s + (u?.total_chapters ?? 0), 0),
      scenes:    universes.reduce((s, u) => s + (u?.total_scenes ?? 0), 0),
    };

    return { universes, totals };
  });
}
