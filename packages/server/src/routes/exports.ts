import type { FastifyInstance } from "fastify";
import { exportScrivener, exportPlottr, exportNovelMapJSON } from "@novelmap/core";
import { db } from "../db.js";

export function registerExportRoutes(server: FastifyInstance) {
  // Export as Scrivener .scriv bundle (ZIP)
  server.get<{ Params: { pid: string } }>(
    "/api/projects/:pid/export/scrivener",
    async (req, reply) => {
      const pid = Number(req.params.pid);
      const bundle = exportScrivener(db, pid);

      // Return the bundle data as JSON — the client will assemble the .scriv
      // directory structure or we could ZIP it
      // For simplicity, return structured data
      const filesObj: Record<string, string> = {};
      for (const [path, content] of bundle.files) {
        filesObj[path] = content;
      }

      return {
        scrivxFilename: bundle.scrivxFilename,
        scrivxContent: bundle.scrivxContent,
        files: filesObj,
      };
    }
  );

  // Export as Plottr .pltr JSON
  server.get<{ Params: { pid: string } }>(
    "/api/projects/:pid/export/plottr",
    async (req, reply) => {
      const pid = Number(req.params.pid);
      const pltr = exportPlottr(db, pid);

      const file = pltr.file as { fileName?: string } | undefined;
      const filename = file?.fileName ?? "export.pltr";
      reply.header(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(filename)}"`
      );
      reply.header("Content-Type", "application/json");
      return pltr;
    }
  );

  // Export as NovelMap JSON (portable, round-trippable)
  server.get<{ Params: { pid: string } }>(
    "/api/projects/:pid/export/json",
    async (req, reply) => {
      const pid = Number(req.params.pid);
      const data = exportNovelMapJSON(db, pid);

      const project = data.project;
      const safeName = project.name.replace(/[^a-zA-Z0-9_\- ]/g, "");
      reply.header(
        "Content-Disposition",
        `attachment; filename="${safeName}-novelmap.json"`
      );
      reply.header("Content-Type", "application/json");
      return data;
    }
  );
}
