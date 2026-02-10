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
}
