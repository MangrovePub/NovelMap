import type { FastifyInstance } from "fastify";
import { query } from "../../pg.js";

export function registerStudioBookRoutes(server: FastifyInstance) {
  // GET /api/studio/books — all books with stats
  server.get("/api/studio/books", async () => {
    return query(`
      SELECT
        b.book_id, b.title, b.universe_key, b.series_key, b.book_number,
        COUNT(DISTINCT c.chapter_id)::int  AS chapter_count,
        COUNT(DISTINCT s.scene_id)::int    AS scene_count,
        COALESCE(SUM(s.word_count), 0)::int AS word_count
      FROM public.books b
      LEFT JOIN public.chapters c ON c.book_id = b.book_id
      LEFT JOIN public.scenes   s ON s.book_id = b.book_id
      GROUP BY b.book_id, b.title, b.universe_key, b.series_key, b.book_number
      ORDER BY b.universe_key, b.series_key, b.book_number NULLS LAST
    `);
  });

  // GET /api/studio/books/:bookId — single book detail
  server.get<{ Params: { bookId: string } }>(
    "/api/studio/books/:bookId",
    async (req) => {
      const [book] = await query(
        `SELECT * FROM public.books WHERE book_id = $1`,
        [req.params.bookId]
      );
      if (!book) throw { statusCode: 404, message: "Book not found" };

      const [stats] = await query(`
        SELECT
          COUNT(DISTINCT c.chapter_id)::int  AS chapter_count,
          COUNT(DISTINCT s.scene_id)::int    AS scene_count,
          COALESCE(SUM(s.word_count), 0)::int AS word_count
        FROM public.chapters c
        LEFT JOIN public.scenes s ON s.chapter_id = c.chapter_id
        WHERE c.book_id = $1
      `, [req.params.bookId]);

      return { ...book, ...stats };
    }
  );
}
