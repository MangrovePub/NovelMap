import type { FastifyInstance } from "fastify";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { parseMarkdown, parseDocx, parseEpub, parseScrivener, detectEntities } from "@novelmap/core";
import { db } from "../db.js";

export function registerManuscriptRoutes(server: FastifyInstance) {
  // List manuscripts for a project
  server.get<{ Params: { pid: string } }>(
    "/api/projects/:pid/manuscripts",
    async (req) => {
      const pid = Number(req.params.pid);
      return db.db
        .prepare("SELECT * FROM manuscript WHERE project_id = ? ORDER BY created_at DESC")
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
}
