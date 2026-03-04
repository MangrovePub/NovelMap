import type { FastifyInstance } from "fastify";
import { query } from "../../pg.js";

export function registerStudioCharacterRoutes(server: FastifyInstance) {
  // GET /api/studio/characters?universeKey=&bookId=
  server.get<{ Querystring: { universeKey?: string; bookId?: string } }>(
    "/api/studio/characters",
    async (req) => {
      const { universeKey, bookId } = req.query;
      const conditions: string[] = [];
      const params: unknown[] = [];
      let p = 1;
      if (universeKey) { conditions.push(`c.universe_key = $${p++}`); params.push(universeKey); }
      if (bookId)      { conditions.push(`c.book_id = $${p++}`);      params.push(bookId); }
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      return query(`
        SELECT
          c.character_id, c.name, c.role, c.universe_key, c.book_id,
          COUNT(DISTINCT sc.scene_id)::int AS scene_count,
          COUNT(DISTINCT s.book_id)::int   AS book_count
        FROM public.characters c
        LEFT JOIN public.scene_characters sc ON sc.character_id = c.character_id
        LEFT JOIN public.scenes            s  ON sc.scene_id = s.scene_id
        ${where}
        GROUP BY c.character_id, c.name, c.role, c.universe_key, c.book_id
        ORDER BY scene_count DESC, c.name
      `, params);
    }
  );

  // GET /api/studio/characters/:characterId/dossier — full dossier
  server.get<{ Params: { characterId: string } }>(
    "/api/studio/characters/:characterId/dossier",
    async (req) => {
      const { characterId } = req.params;

      const [character] = await query(
        `SELECT * FROM public.characters WHERE character_id = $1`,
        [characterId]
      );
      if (!character) throw { statusCode: 404, message: "Character not found" };

      // All scenes, with chapter + book context
      const appearances = await query(`
        SELECT
          s.scene_id, s.location, s.time_of_day, s.word_count, s.seq_in_chapter,
          LEFT(s.scene_text, 300) AS preview,
          c.chapter_id, c.title AS chapter_title, c.chapter_number, c.chapter_index,
          b.book_id, b.title AS book_title, b.book_number, b.series_key, b.universe_key
        FROM public.scene_characters sc
        JOIN public.scenes   s ON sc.scene_id   = s.scene_id
        JOIN public.chapters c ON s.chapter_id  = c.chapter_id
        JOIN public.books    b ON s.book_id     = b.book_id
        WHERE sc.character_id = $1
        ORDER BY b.book_number NULLS LAST, c.chapter_index, s.seq_in_chapter
      `, [characterId]);

      // Distinct locations
      const locations = await query(`
        SELECT DISTINCT s.location, b.title AS book_title, COUNT(*)::int AS scene_count
        FROM public.scene_characters sc
        JOIN public.scenes s ON sc.scene_id = s.scene_id
        JOIN public.books  b ON s.book_id   = b.book_id
        WHERE sc.character_id = $1 AND s.location IS NOT NULL
        GROUP BY s.location, b.title
        ORDER BY scene_count DESC
      `, [characterId]);

      // Books present in
      const books = await query(`
        SELECT DISTINCT b.book_id, b.title, b.book_number, b.series_key,
               COUNT(DISTINCT s.scene_id)::int AS scene_count
        FROM public.scene_characters sc
        JOIN public.scenes s ON sc.scene_id = s.scene_id
        JOIN public.books  b ON s.book_id   = b.book_id
        WHERE sc.character_id = $1
        GROUP BY b.book_id, b.title, b.book_number, b.series_key
        ORDER BY b.book_number NULLS LAST
      `, [characterId]);

      return { character, appearances, locations, books };
    }
  );
}
