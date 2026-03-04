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
}
