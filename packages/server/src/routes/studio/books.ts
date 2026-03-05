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

  // POST /api/studio/books — create a new book
  server.post<{
    Body: { title: string; universe_key: string; series_key: string; book_number: number };
  }>(
    "/api/studio/books",
    async (req) => {
      const { title, universe_key, series_key, book_number } = req.body;
      if (!title?.trim())         throw { statusCode: 400, message: "title is required" };
      if (!universe_key?.trim())  throw { statusCode: 400, message: "universe_key is required" };
      if (!series_key?.trim())    throw { statusCode: 400, message: "series_key is required" };
      if (book_number == null)    throw { statusCode: 400, message: "book_number is required" };
      const [book] = await query(
        `INSERT INTO public.books (title, universe_key, series_key, book_number)
         VALUES ($1, $2, $3, $4)
         RETURNING book_id, title, universe_key, series_key, book_number`,
        [title.trim(), universe_key.trim(), series_key.trim(), book_number]
      );
      return book;
    }
  );

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
