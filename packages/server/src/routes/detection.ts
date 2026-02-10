import type { FastifyInstance } from "fastify";
import { detectEntities, detectEntitiesFullProject, getCrossBookPresence } from "@novelmap/core";
import { db } from "../db.js";

export function registerDetectionRoutes(server: FastifyInstance) {
  // Run auto-detection on a single manuscript
  server.post<{ Params: { pid: string; mid: string } }>(
    "/api/projects/:pid/manuscripts/:mid/detect",
    async (req) => {
      const pid = Number(req.params.pid);
      const mid = Number(req.params.mid);
      return detectEntities(db, pid, mid);
    }
  );

  // Run full-project detection across all manuscripts
  server.post<{ Params: { pid: string } }>(
    "/api/projects/:pid/detect",
    async (req) => {
      const pid = Number(req.params.pid);
      return detectEntitiesFullProject(db, pid);
    }
  );

  // Get cross-book presence for all entities
  server.get<{ Params: { pid: string } }>(
    "/api/projects/:pid/cross-book-presence",
    async (req) => {
      const pid = Number(req.params.pid);
      return getCrossBookPresence(db, pid);
    }
  );
}
