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

      // Return in existing API format for UI compatibility
      return toExtractionResult(pipelineResult, scannerResult.existingEntities);
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
  server.post<{ Params: { pid: string } }>(
    "/api/projects/:pid/extract/confirm",
    async (req) => {
      const pid = Number(req.params.pid);
      const { candidates } = req.body as {
        candidates: { text: string; type: string; metadata?: Record<string, unknown> }[];
      };

      const insertEntity = db.db.prepare(
        "INSERT INTO entity (project_id, type, name, metadata) VALUES (?, ?, ?, ?)"
      );

      const created: { id: number; name: string; type: string }[] = [];
      const tx = db.db.transaction(() => {
        for (const c of candidates) {
          // Skip if entity with this name already exists
          const existing = db.db
            .prepare("SELECT id FROM entity WHERE project_id = ? AND name = ?")
            .get(pid, c.text) as { id: number } | undefined;
          if (existing) continue;

          const result = insertEntity.run(
            pid,
            c.type,
            c.text,
            JSON.stringify(c.metadata ?? {})
          );
          created.push({
            id: Number(result.lastInsertRowid),
            name: c.text,
            type: c.type,
          });
        }
      });
      tx();

      // Run full detection to create appearances for the new entities
      const detection = detectEntitiesFullProject(db, pid);

      return { created, detection };
    }
  );
}
