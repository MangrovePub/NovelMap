import type { FastifyInstance } from "fastify";
import { ProjectStore } from "@novelmap/core";
import { db } from "../db.js";

const store = new ProjectStore(db);

export function registerProjectRoutes(server: FastifyInstance) {
  server.get("/api/projects", async () => {
    return store.list();
  });

  server.get<{ Params: { id: string } }>("/api/projects/:id", async (req) => {
    return store.get(Number(req.params.id));
  });

  server.post<{ Body: { name: string; path: string } }>(
    "/api/projects",
    async (req) => {
      const { name, path } = req.body;
      return store.create(name, path);
    }
  );

  server.put<{ Params: { id: string }; Body: { name?: string; path?: string } }>(
    "/api/projects/:id",
    async (req) => {
      return store.update(Number(req.params.id), req.body);
    }
  );

  server.delete<{ Params: { id: string } }>(
    "/api/projects/:id",
    async (req, reply) => {
      store.delete(Number(req.params.id));
      return reply.code(204).send();
    }
  );
}
