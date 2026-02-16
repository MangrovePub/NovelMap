import type { FastifyInstance } from "fastify";
import {
  extractEntityCandidates,
  detectEntitiesFullProject,
  runPipeline,
  toExtractionResult,
  estimateClassificationCost,
  type LLMClassifierConfig,
} from "@novelmap/core";
import { db } from "../db.js";

export function registerExtractionRoutes(server: FastifyInstance) {
  // Extract entity candidates from all manuscripts in a project
  // Now uses the enhanced pipeline (gazetteer + classifier)
  server.post<{ Params: { pid: string } }>(
    "/api/projects/:pid/extract",
    async (req) => {
      const pid = Number(req.params.pid);

      // Load ignored names for this project
      const ignoredRows = db.db
        .prepare("SELECT name FROM ignored_entity WHERE project_id = ?")
        .all(pid) as { name: string }[];
      const ignoredNames = new Set(ignoredRows.map((r) => r.name.toLowerCase()));

      // Run existing scanner
      const scannerResult = extractEntityCandidates(db, pid);

      // Count chapters for the pipeline
      const chapterCount = (db.db
        .prepare(
          "SELECT COUNT(*) as cnt FROM chapter c JOIN manuscript m ON c.manuscript_id = m.id WHERE m.project_id = ?"
        )
        .get(pid) as { cnt: number }).cnt;

      // Run through enhanced pipeline (no LLM — sync classification)
      const pipelineResult = await runPipeline(scannerResult, chapterCount);

      // Build result and filter out ignored names
      const result = toExtractionResult(pipelineResult, scannerResult.existingEntities);
      result.candidates = result.candidates.filter(
        (c) => !ignoredNames.has(c.text.toLowerCase())
      );

      return result;
    }
  );

  // LLM-enhanced classification for ambiguous entities
  server.post<{ Params: { pid: string } }>(
    "/api/projects/:pid/extract/enhance",
    async (req) => {
      const pid = Number(req.params.pid);
      const { apiKey, bookTitle, genre } = req.body as {
        apiKey: string;
        bookTitle?: string;
        genre?: string;
      };

      if (!apiKey) {
        throw new Error("API key required for LLM enhancement");
      }

      // Run scanner + full pipeline with LLM
      const scannerResult = extractEntityCandidates(db, pid);
      const chapterCount = (db.db
        .prepare(
          "SELECT COUNT(*) as cnt FROM chapter c JOIN manuscript m ON c.manuscript_id = m.id WHERE m.project_id = ?"
        )
        .get(pid) as { cnt: number }).cnt;

      const pipelineResult = await runPipeline(scannerResult, chapterCount, {
        enableLLM: true,
        llmConfig: { apiKey } as LLMClassifierConfig,
        bookTitle,
        genre,
        confidenceThreshold: 50,
      });

      return {
        ...toExtractionResult(pipelineResult, scannerResult.existingEntities),
        stats: pipelineResult.stats,
      };
    }
  );

  // Cost estimate for LLM enhancement
  server.get<{ Params: { pid: string } }>(
    "/api/projects/:pid/extract/estimate",
    async (req) => {
      const pid = Number(req.params.pid);
      const scannerResult = extractEntityCandidates(db, pid);
      const chapterCount = (db.db
        .prepare(
          "SELECT COUNT(*) as cnt FROM chapter c JOIN manuscript m ON c.manuscript_id = m.id WHERE m.project_id = ?"
        )
        .get(pid) as { cnt: number }).cnt;

      // Run pipeline without LLM to find review candidates
      const pipelineResult = await runPipeline(scannerResult, chapterCount);
      const estimate = estimateClassificationCost(pipelineResult.needsReview.length);

      return {
        candidatesNeedingReview: pipelineResult.needsReview.length,
        ...estimate,
      };
    }
  );

  // Extract entity candidates from a single manuscript
  server.post<{ Params: { pid: string; mid: string } }>(
    "/api/projects/:pid/manuscripts/:mid/extract",
    async (req) => {
      const pid = Number(req.params.pid);
      const mid = Number(req.params.mid);
      return extractEntityCandidates(db, pid, mid);
    }
  );

  // Confirm extraction: batch-create entities from candidates, then run detection
  // Candidates with type "ignore" are saved to the ignore list instead
  server.post<{ Params: { pid: string } }>(
    "/api/projects/:pid/extract/confirm",
    async (req) => {
      const pid = Number(req.params.pid);
      const body = req.body as {
        candidates?: { text: string; type: string; metadata?: Record<string, unknown> }[];
      };
      console.log(`[DEBUG] Confirm extraction body keys: ${Object.keys(body || {})}`);
      if (body?.candidates) {
        console.log(`[DEBUG] Candidates type: ${typeof body.candidates}, isArray: ${Array.isArray(body.candidates)}, length: ${body.candidates.length}`);
      } else {
        console.log(`[DEBUG] Candidates is missing or undefined`);
      }

      const candidates = body.candidates;

      if (!candidates || !Array.isArray(candidates)) {
        throw new Error(
          `Invalid request body. Expected 'candidates' array. Received keys: ${Object.keys(body || {})}`
        );
      }

      const insertEntity = db.db.prepare(
        "INSERT OR IGNORE INTO entity (project_id, type, name, metadata) VALUES (?, ?, ?, ?)"
      );

      const insertIgnored = db.db.prepare(
        "INSERT OR IGNORE INTO ignored_entity (project_id, name) VALUES (?, ?)"
      );

      const created: { id: number; name: string; type: string }[] = [];
      const ignored: string[] = [];
      const tx = db.db.transaction(() => {
        let index = 0;
        for (const c of candidates) {
          try {
            const type = String(c.type).trim().toLowerCase();
            console.log(`[DEBUG] Processing candidate ${index}: "${c.text}", type: "${c.type}" (normalized: "${type}")`);

            // Handle "ignore" type: persist to ignore list
            if (type === "ignore") {
              insertIgnored.run(pid, c.text);
              ignored.push(c.text);
              continue;
            }

            // Validate type against allowed DB values
            const ALLOWED_TYPES = new Set(['character', 'location', 'organization', 'artifact', 'concept', 'event']);
            if (!ALLOWED_TYPES.has(type)) {
              console.warn(`[WARN] Skipping invalid entity type: "${type}" for candidate "${c.text}" (Original: "${c.type}")`);
              continue;
            }

            console.log(`[DEBUG] Inserting entity: "${c.text}", type: "${type}"`);
            const result = insertEntity.run(
              pid,
              type, // Use normalized type
              c.text,
              JSON.stringify(c.metadata ?? {})
            );
            created.push({
              id: Number(result.lastInsertRowid),
              name: c.text,
              type: c.type, // Store original type
            });
            index++;
          } catch (err: any) {
            console.error(`[ERROR] Failed to insert candidate ${index}: ${JSON.stringify(c)}`, err);
            throw new Error(`Failed to insert candidate "${c.text}" (type: ${c.type}): ${err.message}`);
          }
        }
      });
      tx();

      // Run full detection to create appearances for the new entities
      const detection = detectEntitiesFullProject(db, pid);

      return { created, ignored, detection };
    }
  );

  // ── Ignored entities ──────────────────────────────────────────

  // List ignored entity names for a project
  server.get<{ Params: { pid: string } }>(
    "/api/projects/:pid/ignored-entities",
    async (req) => {
      const pid = Number(req.params.pid);
      return db.db
        .prepare("SELECT id, name, created_at FROM ignored_entity WHERE project_id = ? ORDER BY name")
        .all(pid);
    }
  );

  // Add a name to the ignore list
  server.post<{ Params: { pid: string }; Body: { name: string } }>(
    "/api/projects/:pid/ignored-entities",
    async (req) => {
      const pid = Number(req.params.pid);
      const { name } = req.body;
      db.db
        .prepare("INSERT OR IGNORE INTO ignored_entity (project_id, name) VALUES (?, ?)")
        .run(pid, name);
      return { ok: true };
    }
  );

  // Remove a name from the ignore list
  server.delete<{ Params: { id: string } }>(
    "/api/ignored-entities/:id",
    async (req, reply) => {
      db.db
        .prepare("DELETE FROM ignored_entity WHERE id = ?")
        .run(Number(req.params.id));
      return reply.code(204).send();
    }
  );
}
