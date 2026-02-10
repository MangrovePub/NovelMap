import type { FastifyInstance } from "fastify";
import {
  analyzeGenre,
  analyzeProjectGenre,
  classifyRoles,
  generateSeriesBible,
  renderSeriesBibleHtml,
} from "@novelmap/core";
import { db } from "../db.js";

export function registerAnalyzerRoutes(server: FastifyInstance) {
  // Genre analysis for a single manuscript
  server.get<{ Params: { mid: string } }>(
    "/api/manuscripts/:mid/genre",
    async (req) => {
      const mid = Number(req.params.mid);
      return analyzeGenre(db, mid);
    }
  );

  // Genre analysis for entire project
  server.get<{ Params: { pid: string } }>(
    "/api/projects/:pid/genre",
    async (req) => {
      const pid = Number(req.params.pid);
      return analyzeProjectGenre(db, pid);
    }
  );

  // Character role classification
  server.get<{ Params: { pid: string } }>(
    "/api/projects/:pid/roles",
    async (req) => {
      const pid = Number(req.params.pid);
      return classifyRoles(db, pid);
    }
  );

  // Series Bible — JSON data
  server.get<{ Params: { pid: string } }>(
    "/api/projects/:pid/bible",
    async (req) => {
      const pid = Number(req.params.pid);
      return generateSeriesBible(db, pid);
    }
  );

  // Series Bible — rendered HTML
  server.get<{ Params: { pid: string } }>(
    "/api/projects/:pid/bible/html",
    async (req, reply) => {
      const pid = Number(req.params.pid);
      const bible = generateSeriesBible(db, pid);
      const html = renderSeriesBibleHtml(bible);
      return reply.type("text/html").send(html);
    }
  );
}
