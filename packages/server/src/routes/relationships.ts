import type { FastifyInstance } from "fastify";
import { RelationshipStore } from "@novelmap/core";
import { db } from "../db.js";

const store = new RelationshipStore(db);

export function registerRelationshipRoutes(server: FastifyInstance) {
  server.get<{ Params: { pid: string } }>(
    "/api/projects/:pid/relationships",
    async (req) => {
      // Get all entities for this project, then get all their relationships
      const entities = db.db
        .prepare("SELECT id FROM entity WHERE project_id = ?")
        .all(Number(req.params.pid)) as { id: number }[];

      const relationships = new Map<number, unknown>();
      for (const e of entities) {
        for (const r of store.listForEntity(e.id)) {
          relationships.set(r.id, r);
        }
      }
      return Array.from(relationships.values());
    }
  );

  server.post<{
    Params: { pid: string };
    Body: { source_entity_id: number; target_entity_id: number; type: string; metadata?: Record<string, unknown> };
  }>("/api/projects/:pid/relationships", async (req) => {
    const { source_entity_id, target_entity_id, type, metadata } = req.body;
    return store.create(source_entity_id, target_entity_id, type, metadata);
  });

  server.delete<{ Params: { id: string } }>(
    "/api/relationships/:id",
    async (req, reply) => {
      store.delete(Number(req.params.id));
      return reply.code(204).send();
    }
  );
}
