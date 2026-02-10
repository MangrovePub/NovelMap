import type { FastifyInstance } from "fastify";
import { EntityStore, searchEntities } from "@novelmap/core";
import { db } from "../db.js";
import type { EntityType } from "@novelmap/core";

const store = new EntityStore(db);

export function registerEntityRoutes(server: FastifyInstance) {
  server.get<{ Params: { pid: string }; Querystring: { type?: string; search?: string } }>(
    "/api/projects/:pid/entities",
    async (req) => {
      const pid = Number(req.params.pid);
      const { type, search } = req.query;

      if (search) {
        return searchEntities(db, pid, search, {
          type: type as EntityType | undefined,
        });
      }

      return store.list(pid, {
        type: type as EntityType | undefined,
      });
    }
  );

  server.post<{
    Params: { pid: string };
    Body: { name: string; type: EntityType; metadata?: Record<string, unknown> };
  }>("/api/projects/:pid/entities", async (req) => {
    const pid = Number(req.params.pid);
    const { name, type, metadata } = req.body;
    return store.create(pid, type, name, metadata);
  });

  server.put<{
    Params: { id: string };
    Body: { name?: string; type?: EntityType; metadata?: Record<string, unknown> };
  }>("/api/entities/:id", async (req) => {
    return store.update(Number(req.params.id), req.body);
  });

  server.delete<{ Params: { id: string } }>(
    "/api/entities/:id",
    async (req, reply) => {
      store.delete(Number(req.params.id));
      return reply.code(204).send();
    }
  );
}
