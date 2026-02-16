import type { FastifyInstance } from "fastify";
import { db } from "../db.js";

export function registerChapterRoutes(server: FastifyInstance) {
  server.get<{ Params: { mid: string } }>(
    "/api/manuscripts/:mid/chapters",
    async (req) => {
      return db.db
        .prepare(
          "SELECT * FROM chapter WHERE manuscript_id = ? ORDER BY order_index"
        )
        .all(Number(req.params.mid));
    }
  );

  server.patch<{ Params: { id: string }; Body: { summary: string } }>(
    "/api/chapters/:id",
    async (req) => {
      const id = Number(req.params.id);
      const { summary } = req.body;

      const info = db.db
        .prepare("UPDATE chapter SET summary = ? WHERE id = ?")
        .run(summary, id);

      if (info.changes === 0) {
        throw new Error("Chapter not found");
      }

      return { id, summary };
    }
  );
}
