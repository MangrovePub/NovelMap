import type { FastifyInstance } from "fastify";
import { query } from "../../pg.js";

export function registerStudioSceneRoutes(server: FastifyInstance) {
  // GET /api/studio/scenes?bookId=&characterId=&location=&timeOfDay=&minWords=&q=
  server.get<{
    Querystring: {
      bookId?: string;
      characterId?: string;
      location?: string;
      timeOfDay?: string;
      minWords?: string;
      q?: string;
      limit?: string;
      offset?: string;
    };
  }>("/api/studio/scenes", async (req) => {
    const { bookId, characterId, location, timeOfDay, minWords, q, limit = "50", offset = "0" } = req.query;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (bookId)      { conditions.push(`s.book_id = $${p++}`);               params.push(bookId); }
    if (location)    { conditions.push(`s.location ILIKE $${p++}`);           params.push(`%${location}%`); }
    if (timeOfDay)   { conditions.push(`s.time_of_day ILIKE $${p++}`);        params.push(`%${timeOfDay}%`); }
    if (minWords)    { conditions.push(`s.word_count >= $${p++}`);            params.push(Number(minWords)); }
    if (q)           { conditions.push(`s.scene_text ILIKE $${p++}`);         params.push(`%${q}%`); }
    if (characterId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM public.scene_characters sc
        WHERE sc.scene_id = s.scene_id AND sc.character_id = $${p++}
      )`);
      params.push(characterId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const scenes = await query(`
      SELECT
        s.scene_id, s.book_id, s.chapter_id, s.seq_in_chapter,
        s.subheader, s.location, s.time_of_day, s.word_count,
        s.is_set_piece, s.notes,
        LEFT(s.scene_text, 400) AS preview,
        c.title AS chapter_title, c.chapter_number, c.chapter_index,
        b.title AS book_title, b.universe_key, b.series_key
      FROM public.scenes s
      JOIN public.chapters c ON s.chapter_id = c.chapter_id
      JOIN public.books    b ON s.book_id    = b.book_id
      ${where}
      ORDER BY b.universe_key, b.series_key, b.book_number NULLS LAST, c.chapter_index, s.seq_in_chapter
      LIMIT $${p++} OFFSET $${p++}
    `, [...params, Number(limit), Number(offset)]);

    const [{ total }] = await query<{ total: string }>(`
      SELECT COUNT(*)::text AS total
      FROM public.scenes s
      ${where}
    `, params);

    return { scenes, total: Number(total) };
  });

  // GET /api/studio/scenes/:sceneId — full scene text
  server.get<{ Params: { sceneId: string } }>(
    "/api/studio/scenes/:sceneId",
    async (req) => {
      const [scene] = await query(`
        SELECT s.*, c.title AS chapter_title, b.title AS book_title
        FROM public.scenes s
        JOIN public.chapters c ON s.chapter_id = c.chapter_id
        JOIN public.books    b ON s.book_id    = b.book_id
        WHERE s.scene_id = $1
      `, [req.params.sceneId]);
      if (!scene) throw { statusCode: 404, message: "Scene not found" };
      return scene;
    }
  );

  // PATCH /api/studio/scenes/:sceneId — update scene text (editor save)
  server.patch<{
    Params: { sceneId: string };
    Body: { scene_text?: string; subheader?: string; location?: string; time_of_day?: string; notes?: string };
  }>("/api/studio/scenes/:sceneId", async (req) => {
    const { scene_text, subheader, location, time_of_day, notes } = req.body;
    const sets: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (scene_text  !== undefined) { sets.push(`scene_text  = $${p++}`); params.push(scene_text); }
    if (subheader   !== undefined) { sets.push(`subheader   = $${p++}`); params.push(subheader || null); }
    if (location    !== undefined) { sets.push(`location    = $${p++}`); params.push(location || null); }
    if (time_of_day !== undefined) { sets.push(`time_of_day = $${p++}`); params.push(time_of_day || null); }
    if (notes       !== undefined) { sets.push(`notes       = $${p++}`); params.push(notes || null); }

    if (!sets.length) return { updated: false };

    // Recompute word count if text changed
    if (scene_text !== undefined) {
      sets.push(`word_count = array_length(regexp_split_to_array(trim($${p++}), '\\s+'), 1)`);
      params.push(scene_text);
    }

    params.push(req.params.sceneId);
    const [updated] = await query(`
      UPDATE public.scenes SET ${sets.join(", ")}
      WHERE scene_id = $${p}
      RETURNING scene_id, word_count
    `, params);

    // Keep chapter word_count in sync
    if (updated) {
      await query(`
        UPDATE public.chapters SET word_count = (
          SELECT COALESCE(SUM(word_count), 0) FROM public.scenes WHERE chapter_id = chapters.chapter_id
        )
        WHERE chapter_id = (SELECT chapter_id FROM public.scenes WHERE scene_id = $1)
      `, [req.params.sceneId]);
    }

    return updated ?? { updated: false };
  });

  // DELETE /api/studio/scenes/:sceneId
  server.delete<{ Params: { sceneId: string } }>(
    "/api/studio/scenes/:sceneId",
    async (req) => {
      const [scene] = await query<{ chapter_id: string }>(
        `DELETE FROM public.scenes WHERE scene_id = $1 RETURNING chapter_id`,
        [req.params.sceneId]
      );
      if (scene?.chapter_id) {
        await query(`
          UPDATE public.chapters SET word_count = (
            SELECT COALESCE(SUM(word_count), 0) FROM public.scenes WHERE chapter_id = chapters.chapter_id
          ) WHERE chapter_id = $1
        `, [scene.chapter_id]);
      }
      return { deleted: true };
    }
  );
}
