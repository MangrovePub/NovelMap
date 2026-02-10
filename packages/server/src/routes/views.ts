import type { FastifyInstance } from "fastify";
import {
  buildGraph,
  buildTimeline,
  detectGaps,
  buildFieldGuide,
  buildDossier,
} from "@novelmap/core";
import { db } from "../db.js";
import type { EntityType } from "@novelmap/core";

export function registerViewRoutes(server: FastifyInstance) {
  // Graph data
  server.get<{
    Params: { pid: string };
    Querystring: { type?: string; manuscriptId?: string };
  }>("/api/projects/:pid/graph", async (req) => {
    const pid = Number(req.params.pid);
    const { type, manuscriptId } = req.query;
    return buildGraph(db, pid, {
      type: type as EntityType | undefined,
      manuscriptId: manuscriptId ? Number(manuscriptId) : undefined,
    });
  });

  // Timeline data
  server.get<{
    Params: { pid: string };
    Querystring: { entityId?: string; manuscriptId?: string };
  }>("/api/projects/:pid/timeline", async (req) => {
    const pid = Number(req.params.pid);
    const { entityId, manuscriptId } = req.query;
    return buildTimeline(db, pid, {
      entityId: entityId ? Number(entityId) : undefined,
      manuscriptId: manuscriptId ? Number(manuscriptId) : undefined,
    });
  });

  // Field Guide (all dossiers)
  server.get<{ Params: { pid: string } }>(
    "/api/projects/:pid/fieldguide",
    async (req) => {
      return buildFieldGuide(db, Number(req.params.pid));
    }
  );

  // Single entity dossier
  server.get<{ Params: { id: string } }>(
    "/api/entities/:id/dossier",
    async (req) => {
      return buildDossier(db, Number(req.params.id));
    }
  );
}
