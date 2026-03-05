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
      // universe_key lives on books table, not characters
      if (universeKey) { conditions.push(`b.universe_key = $${p++}`); params.push(universeKey); }
      if (bookId)      { conditions.push(`c.book_id = $${p++}`);      params.push(bookId); }
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      return query(`
        SELECT
          c.character_id, c.name, c.role, b.universe_key, c.book_id,
          c.is_series_regular, c.notes, c.description,
          COUNT(DISTINCT sc.scene_id)::int AS scene_count,
          COUNT(DISTINCT s.book_id)::int   AS book_count
        FROM public.characters c
        JOIN public.books b ON c.book_id = b.book_id
        LEFT JOIN public.scene_characters sc ON sc.character_id = c.character_id
        LEFT JOIN public.scenes            s  ON sc.scene_id = s.scene_id
        ${where}
        GROUP BY c.character_id, c.name, c.role, b.universe_key, c.book_id, c.is_series_regular, c.notes, c.description
        ORDER BY scene_count DESC, c.name
      `, params);
    }
  );

  // POST /api/studio/characters?bookId=<uuid> — create a character
  server.post<{
    Querystring: { bookId: string };
    Body: { name: string; role?: string; notes?: string; description?: string; is_series_regular?: boolean };
  }>(
    "/api/studio/characters",
    async (req) => {
      const { bookId } = req.query;
      const { name, role, notes, description, is_series_regular } = req.body;
      if (!bookId) throw { statusCode: 400, message: "bookId is required" };
      if (!name?.trim()) throw { statusCode: 400, message: "name is required" };
      const [character] = await query(
        `INSERT INTO public.characters (book_id, name, role, notes, description, is_series_regular)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING character_id, name, role, notes, description, book_id, is_series_regular`,
        [bookId, name.trim(), role ?? null, notes ?? null, description ?? null, is_series_regular ?? false]
      );
      return character;
    }
  );

  // PATCH /api/studio/characters/:characterId — update a character
  server.patch<{
    Params: { characterId: string };
    Body: { name?: string; role?: string; notes?: string; description?: string; is_series_regular?: boolean };
  }>(
    "/api/studio/characters/:characterId",
    async (req) => {
      const { name, role, notes, description, is_series_regular } = req.body;
      const sets: string[] = [];
      const params: unknown[] = [];
      let p = 1;
      if (name        !== undefined) { sets.push(`name = $${p++}`);              params.push(name.trim()); }
      if (role        !== undefined) { sets.push(`role = $${p++}`);              params.push(role); }
      if (notes       !== undefined) { sets.push(`notes = $${p++}`);             params.push(notes); }
      if (description !== undefined) { sets.push(`description = $${p++}`);       params.push(description); }
      if (is_series_regular !== undefined) { sets.push(`is_series_regular = $${p++}`); params.push(is_series_regular); }
      if (sets.length === 0) throw { statusCode: 400, message: "No fields to update" };
      params.push(req.params.characterId);
      const [character] = await query(
        `UPDATE public.characters SET ${sets.join(", ")} WHERE character_id = $${p}
         RETURNING character_id, name, role, notes, description, book_id, is_series_regular`,
        params
      );
      if (!character) throw { statusCode: 404, message: "Character not found" };
      return character;
    }
  );

  // DELETE /api/studio/characters/:characterId
  server.delete<{ Params: { characterId: string } }>(
    "/api/studio/characters/:characterId",
    async (req) => {
      await query(`DELETE FROM public.characters WHERE character_id = $1`, [req.params.characterId]);
      return { deleted: true };
    }
  );

  // GET /api/studio/characters/:characterId/dossier — full dossier
  server.get<{ Params: { characterId: string } }>(
    "/api/studio/characters/:characterId/dossier",
    async (req) => {
      const { characterId } = req.params;

      const [character] = await query(
        `SELECT c.*, b.universe_key FROM public.characters c
         JOIN public.books b ON c.book_id = b.book_id
         WHERE c.character_id = $1`,
        [characterId]
      );
      if (!character) throw { statusCode: 404, message: "Character not found" };

      // All scenes, with chapter + book context
      const appearances = await query(`
        SELECT
          s.scene_id, s.location, s.time_of_day, s.word_count, s.seq_in_chapter,
          s.subheader, LEFT(s.scene_text, 300) AS preview,
          c.chapter_id, c.title AS chapter_title, c.chapter_number, c.chapter_index,
          b.book_id, b.title AS book_title, b.book_number, b.series_key, b.universe_key
        FROM public.scene_characters sc
        JOIN public.scenes   s ON sc.scene_id   = s.scene_id
        JOIN public.chapters c ON s.chapter_id  = c.chapter_id
        JOIN public.books    b ON s.book_id     = b.book_id
        WHERE sc.character_id = $1
        ORDER BY b.book_number NULLS LAST, c.chapter_index, s.seq_in_chapter
      `, [characterId]);

      // Distinct locations (filtered to real places)
      const locations = await query(`
        SELECT DISTINCT s.location, b.title AS book_title, COUNT(*)::int AS scene_count
        FROM public.scene_characters sc
        JOIN public.scenes s ON sc.scene_id = s.scene_id
        JOIN public.books  b ON s.book_id   = b.book_id
        WHERE sc.character_id = $1
          AND s.location IS NOT NULL
          AND s.location !~ '^Chapter '
          AND s.location !~ '(A\\.M\\.|P\\.M\\.)'
          AND s.location !~ '[0-9]+:[0-9]+'
          AND s.location !~ '^[0-9]'
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
