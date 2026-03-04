import type { FastifyInstance } from "fastify";
import { query } from "../../pg.js";

export function registerStudioChapterRoutes(server: FastifyInstance) {
  // GET /api/studio/books/:bookId/chapters
  server.get<{ Params: { bookId: string } }>(
    "/api/studio/books/:bookId/chapters",
    async (req) => {
      return query(`
        SELECT
          c.chapter_id, c.book_id, c.chapter_index, c.chapter_number,
          c.title, c.is_prologue, c.is_epilogue, c.section_type,
          c.word_count,
          COUNT(s.scene_id)::int AS scene_count
        FROM public.chapters c
        LEFT JOIN public.scenes s ON s.chapter_id = c.chapter_id
        WHERE c.book_id = $1
        GROUP BY c.chapter_id
        ORDER BY c.chapter_index
      `, [req.params.bookId]);
    }
  );

  // GET /api/studio/chapters/:chapterId — single chapter with scenes
  server.get<{ Params: { chapterId: string } }>(
    "/api/studio/chapters/:chapterId",
    async (req) => {
      const [chapter] = await query(
        `SELECT * FROM public.chapters WHERE chapter_id = $1`,
        [req.params.chapterId]
      );
      if (!chapter) throw { statusCode: 404, message: "Chapter not found" };

      const scenes = await query(`
        SELECT scene_id, seq_in_chapter, subheader, location,
               time_of_day, word_count, is_set_piece, notes
        FROM public.scenes
        WHERE chapter_id = $1
        ORDER BY seq_in_chapter
      `, [req.params.chapterId]);

      return { ...chapter, scenes };
    }
  );

  // POST /api/studio/books/:bookId/chapters — create chapter
  server.post<{
    Params: { bookId: string };
    Body: { title?: string; section_type?: string };
  }>("/api/studio/books/:bookId/chapters", async (req) => {
    const bookId = req.params.bookId;
    const { title, section_type = "chapter" } = req.body ?? {};

    const [{ max_idx }] = await query<{ max_idx: string | null }>(
      `SELECT MAX(chapter_index)::text AS max_idx FROM public.chapters WHERE book_id = $1`,
      [bookId]
    );
    const chapterIndex = Number(max_idx ?? 0) + 1;

    let chapterNumber: number | null = null;
    if (section_type === "chapter") {
      const [{ max_num }] = await query<{ max_num: string | null }>(
        `SELECT MAX(chapter_number)::text AS max_num FROM public.chapters WHERE book_id = $1 AND section_type = 'chapter'`,
        [bookId]
      );
      chapterNumber = Number(max_num ?? 0) + 1;
    }

    const is_prologue = section_type === "prologue";
    const is_epilogue = section_type === "epilogue";

    const [chapter] = await query(`
      INSERT INTO public.chapters
        (book_id, chapter_index, chapter_number, title, section_type, is_prologue, is_epilogue, word_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
      RETURNING *
    `, [bookId, chapterIndex, chapterNumber, title ?? "Untitled Chapter", section_type, is_prologue, is_epilogue]);

    return chapter;
  });

  // PATCH /api/studio/chapters/:chapterId — update chapter title / type
  server.patch<{
    Params: { chapterId: string };
    Body: { title?: string; section_type?: string };
  }>("/api/studio/chapters/:chapterId", async (req) => {
    const { title, section_type } = req.body ?? {};
    const sets: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    if (title        !== undefined) { sets.push(`title        = $${p++}`); params.push(title); }
    if (section_type !== undefined) { sets.push(`section_type = $${p++}`); params.push(section_type); }
    if (!sets.length) return { updated: false };
    params.push(req.params.chapterId);
    const [updated] = await query(
      `UPDATE public.chapters SET ${sets.join(", ")} WHERE chapter_id = $${p} RETURNING *`,
      params
    );
    return updated ?? { updated: false };
  });

  // DELETE /api/studio/chapters/:chapterId
  server.delete<{ Params: { chapterId: string } }>(
    "/api/studio/chapters/:chapterId",
    async (req) => {
      await query(`DELETE FROM public.scenes   WHERE chapter_id  = $1`, [req.params.chapterId]);
      await query(`DELETE FROM public.chapters WHERE chapter_id  = $1`, [req.params.chapterId]);
      return { deleted: true };
    }
  );

  // POST /api/studio/chapters/:chapterId/scenes — create scene
  server.post<{
    Params: { chapterId: string };
    Body: { subheader?: string; scene_text?: string; location?: string; time_of_day?: string };
  }>("/api/studio/chapters/:chapterId/scenes", async (req) => {
    const { subheader, scene_text = "", location, time_of_day } = req.body ?? {};

    const [chapter] = await query<{ book_id: string }>(
      `SELECT book_id FROM public.chapters WHERE chapter_id = $1`,
      [req.params.chapterId]
    );
    if (!chapter) throw { statusCode: 404, message: "Chapter not found" };

    const [{ max_seq }] = await query<{ max_seq: string | null }>(
      `SELECT MAX(seq_in_chapter)::text AS max_seq FROM public.scenes WHERE chapter_id = $1`,
      [req.params.chapterId]
    );
    const seqInChapter = Number(max_seq ?? 0) + 1;
    const wordCount = scene_text.trim() ? scene_text.trim().split(/\s+/).length : 0;

    const [scene] = await query(`
      INSERT INTO public.scenes
        (book_id, chapter_id, seq_in_chapter, subheader, scene_text, location, time_of_day, word_count, is_set_piece)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
      RETURNING *
    `, [chapter.book_id, req.params.chapterId, seqInChapter,
        subheader ?? null, scene_text, location ?? null, time_of_day ?? null, wordCount]);

    return scene;
  });
}
