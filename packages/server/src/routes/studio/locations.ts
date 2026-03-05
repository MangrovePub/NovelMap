import type { FastifyInstance } from "fastify";
import { query } from "../../pg.js";

export function registerStudioLocationRoutes(server: FastifyInstance) {
  // GET /api/studio/locations — all distinct locations with scene counts
  server.get<{ Querystring: { universeKey?: string; bookId?: string } }>(
    "/api/studio/locations",
    async (req) => {
      const { universeKey, bookId } = req.query;
      const conditions: string[] = [
        "s.location IS NOT NULL",
        "length(trim(s.location)) >= 3",
        // Filter out chapter heading artifacts, timestamps, and non-place entries
        "s.location !~ '^Chapter '",
        "s.location !~ '(A\\.M\\.|P\\.M\\.)'",
        "s.location !~ '[0-9]+:[0-9]+'",
        "s.location !~ '^[0-9]'",
        "s.location !~ '(hours after|Author''s Note|Briefing Day|Asset Seven|Blowback|Aftermath|Operation)'",
      ];
      const params: unknown[] = [];
      let p = 1;
      if (universeKey) { conditions.push(`b.universe_key = $${p++}`); params.push(universeKey); }
      if (bookId)      { conditions.push(`s.book_id = $${p++}`);      params.push(bookId); }
      const where = `WHERE ${conditions.join(" AND ")}`;

      return query(`
        SELECT
          s.location,
          COUNT(DISTINCT s.scene_id)::int   AS scene_count,
          COUNT(DISTINCT s.book_id)::int    AS book_count,
          COUNT(DISTINCT sc.character_id)::int AS character_count
        FROM public.scenes s
        JOIN public.books b ON s.book_id = b.book_id
        LEFT JOIN public.scene_characters sc ON sc.scene_id = s.scene_id
        ${where}
        GROUP BY s.location
        ORDER BY scene_count DESC
      `, params);
    }
  );

  // GET /api/studio/locations/:location — all scenes at a location (URL-encoded)
  server.get<{
    Params: { location: string };
    Querystring: { bookId?: string; characterId?: string };
  }>("/api/studio/locations/:location", async (req) => {
    const location = decodeURIComponent(req.params.location);
    const { bookId, characterId } = req.query;

    const conditions: string[] = ["s.location ILIKE $1"];
    const params: unknown[] = [`%${location}%`];
    let p = 2;

    if (bookId) { conditions.push(`s.book_id = $${p++}`); params.push(bookId); }
    if (characterId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM public.scene_characters sc
        WHERE sc.scene_id = s.scene_id AND sc.character_id = $${p++}
      )`);
      params.push(characterId);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const scenes = await query(`
      SELECT
        s.scene_id, s.location, s.time_of_day, s.word_count,
        s.subheader, LEFT(s.scene_text, 400) AS preview,
        c.chapter_id, c.title AS chapter_title, c.chapter_number, c.chapter_index,
        b.book_id, b.title AS book_title, b.book_number, b.universe_key, b.series_key
      FROM public.scenes s
      JOIN public.chapters c ON s.chapter_id = c.chapter_id
      JOIN public.books    b ON s.book_id    = b.book_id
      ${where}
      ORDER BY b.book_number NULLS LAST, c.chapter_index, s.seq_in_chapter
    `, params);

    // Characters who appear at this location
    const characters = await query(`
      SELECT DISTINCT
        ch.character_id, ch.name, ch.role,
        COUNT(DISTINCT s.scene_id)::int AS scene_count
      FROM public.scene_characters sc
      JOIN public.characters ch ON sc.character_id = ch.character_id
      JOIN public.scenes     s  ON sc.scene_id     = s.scene_id
      WHERE s.location ILIKE $1
      GROUP BY ch.character_id, ch.name, ch.role
      ORDER BY scene_count DESC
    `, [`%${location}%`]);

    // Books where this location appears
    const books = await query(`
      SELECT DISTINCT
        b.book_id, b.title, b.book_number, b.universe_key,
        COUNT(DISTINCT s.scene_id)::int AS scene_count
      FROM public.scenes s
      JOIN public.books b ON s.book_id = b.book_id
      WHERE s.location ILIKE $1
      GROUP BY b.book_id, b.title, b.book_number, b.universe_key
      ORDER BY b.book_number NULLS LAST
    `, [`%${location}%`]);

    return { location, scenes, characters, books };
  });
}
