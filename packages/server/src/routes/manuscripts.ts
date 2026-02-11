import type { FastifyInstance } from "fastify";
import { readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { parseMarkdown, parseDocx, parseEpub, parseScrivener, detectEntities } from "@novelmap/core";
import { db, dataDir } from "../db.js";

export function registerManuscriptRoutes(server: FastifyInstance) {
  // List manuscripts for a project
  server.get<{ Params: { pid: string } }>(
    "/api/projects/:pid/manuscripts",
    async (req) => {
      const pid = Number(req.params.pid);
      return db.db
        .prepare("SELECT * FROM manuscript WHERE project_id = ? ORDER BY COALESCE(series_order, 999999), created_at ASC")
        .all(pid);
    }
  );

  // Import a manuscript file
  server.post<{ Params: { pid: string } }>(
    "/api/projects/:pid/manuscripts/import",
    async (req) => {
      const pid = Number(req.params.pid);
      const data = await req.file();
      if (!data) throw new Error("No file uploaded");

      const buffer = await data.toBuffer();
      const filename = data.filename;
      const ext = filename.split(".").pop()?.toLowerCase() ?? "";

      let chapters: { title: string; orderIndex: number; body: string }[];

      if (ext === "md") {
        chapters = parseMarkdown(buffer.toString("utf-8"));
      } else if (ext === "docx") {
        chapters = await parseDocx(buffer);
      } else if (ext === "epub") {
        chapters = await parseEpub(buffer);
      } else if (ext === "scriv" || ext === "scrivx") {
        // Save to temp dir and parse
        const tempDir = join(tmpdir(), `novelmap-${randomUUID()}`);
        mkdirSync(tempDir, { recursive: true });
        // For a .scriv bundle, we'd need the whole directory, but for single-file upload
        // we handle the scrivx case
        writeFileSync(join(tempDir, filename), buffer);
        chapters = parseScrivener(tempDir);
      } else {
        throw new Error(`Unsupported file format: .${ext}`);
      }

      // Create the manuscript record
      const title = filename.replace(/\.[^.]+$/, "");
      const manuscript = db.db
        .prepare("INSERT INTO manuscript (project_id, title, file_path) VALUES (?, ?, ?)")
        .run(pid, title, filename);
      const manuscriptId = Number(manuscript.lastInsertRowid);

      // Insert chapters
      const insertChapter = db.db.prepare(
        "INSERT INTO chapter (manuscript_id, title, order_index, body) VALUES (?, ?, ?, ?)"
      );
      for (const ch of chapters) {
        insertChapter.run(manuscriptId, ch.title, ch.orderIndex, ch.body);
      }

      // Auto-detect entity appearances in the newly imported manuscript
      const detection = detectEntities(db, pid, manuscriptId);

      const ms = db.db
        .prepare("SELECT * FROM manuscript WHERE id = ?")
        .get(manuscriptId);

      return { manuscript: ms, detection };
    }
  );

  // Upload a cover image
  server.put<{ Params: { id: string } }>(
    "/api/manuscripts/:id/cover",
    async (req) => {
      const id = Number(req.params.id);
      const data = await req.file();
      if (!data) throw new Error("No file uploaded");

      const buffer = await data.toBuffer();
      const ext = data.filename.split(".").pop()?.toLowerCase() ?? "webp";
      const filename = `m-${id}-${randomUUID()}.${ext}`;
      const coversDir = join(dataDir, "covers");
      mkdirSync(coversDir, { recursive: true });
      writeFileSync(join(coversDir, filename), buffer);

      // Clean up old local cover
      const existing = db.db.prepare("SELECT cover_url FROM manuscript WHERE id = ?").get(id) as { cover_url: string | null } | undefined;
      if (existing?.cover_url && !existing.cover_url.startsWith("http")) {
        try { unlinkSync(join(coversDir, existing.cover_url)); } catch { /* ignore */ }
      }

      db.db.prepare("UPDATE manuscript SET cover_url = ? WHERE id = ?").run(filename, id);
      return db.db.prepare("SELECT * FROM manuscript WHERE id = ?").get(id);
    }
  );

  // Set an external URL as cover
  server.put<{ Params: { id: string } }>(
    "/api/manuscripts/:id/cover-url",
    async (req) => {
      const id = Number(req.params.id);
      const { url } = req.body as { url: string };

      // Clean up old local cover
      const existing = db.db.prepare("SELECT cover_url FROM manuscript WHERE id = ?").get(id) as { cover_url: string | null } | undefined;
      if (existing?.cover_url && !existing.cover_url.startsWith("http")) {
        const coversDir = join(dataDir, "covers");
        try { unlinkSync(join(coversDir, existing.cover_url)); } catch { /* ignore */ }
      }

      db.db.prepare("UPDATE manuscript SET cover_url = ? WHERE id = ?").run(url, id);
      return db.db.prepare("SELECT * FROM manuscript WHERE id = ?").get(id);
    }
  );

  // Batch reorder manuscripts
  server.put<{ Params: { pid: string } }>(
    "/api/projects/:pid/manuscripts/reorder",
    async (req) => {
      const pid = Number(req.params.pid);
      const { order } = req.body as { order: { id: number; series_order: number }[] };
      const update = db.db.prepare("UPDATE manuscript SET series_order = ? WHERE id = ? AND project_id = ?");
      const tx = db.db.transaction(() => {
        for (const item of order) {
          update.run(item.series_order, item.id, pid);
        }
      });
      tx();
      return db.db
        .prepare("SELECT * FROM manuscript WHERE project_id = ? ORDER BY COALESCE(series_order, 999999), created_at ASC")
        .all(pid);
    }
  );

  // Remove cover
  server.delete<{ Params: { id: string } }>(
    "/api/manuscripts/:id/cover",
    async (req, reply) => {
      const id = Number(req.params.id);
      const existing = db.db.prepare("SELECT cover_url FROM manuscript WHERE id = ?").get(id) as { cover_url: string | null } | undefined;
      if (existing?.cover_url && !existing.cover_url.startsWith("http")) {
        const coversDir = join(dataDir, "covers");
        try { unlinkSync(join(coversDir, existing.cover_url)); } catch { /* ignore */ }
      }
      db.db.prepare("UPDATE manuscript SET cover_url = NULL WHERE id = ?").run(id);
      reply.code(204).send();
    }
  );
}
