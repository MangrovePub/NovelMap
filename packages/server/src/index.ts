/**
 * Mangrove Publication Studio — API Server
 * Copyright (c) 2026 Robert Cummer, Mangrove Publishing LLC
 * Licensed under the MIT License
 */

// Load .env for local dev (no-op in production where env vars are injected)
import { config } from "node:process";
try {
  const { readFileSync } = await import("node:fs");
  const env = readFileSync(new URL("../../.env", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const [k, ...rest] = line.split("=");
    if (k && !k.startsWith("#") && !(k.trim() in process.env)) {
      process.env[k.trim()] = rest.join("=").trim();
    }
  }
} catch { /* no .env — rely on actual env vars */ }

void config; // suppress unused import lint

import { existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { registerProjectRoutes } from "./routes/projects.js";
import { registerManuscriptRoutes } from "./routes/manuscripts.js";
import { registerChapterRoutes } from "./routes/chapters.js";
import { registerEntityRoutes } from "./routes/entities.js";
import { registerRelationshipRoutes } from "./routes/relationships.js";
import { registerViewRoutes } from "./routes/views.js";
import { registerExportRoutes } from "./routes/exports.js";
import { registerDetectionRoutes } from "./routes/detection.js";
import { registerAnalyzerRoutes } from "./routes/analyzers.js";
import { registerPluginRoutes } from "./routes/plugins.js";
import { registerSnapshotRoutes } from "./routes/snapshots.js";
import { registerExtractionRoutes } from "./routes/extraction.js";
// Studio routes (mangrove_workbench / PostgreSQL)
import { registerWarRoomRoutes } from "./routes/studio/war-room.js";
import { registerStudioBookRoutes } from "./routes/studio/books.js";
import { registerStudioChapterRoutes } from "./routes/studio/chapters.js";
import { registerStudioSceneRoutes } from "./routes/studio/scenes.js";
import { registerStudioCharacterRoutes } from "./routes/studio/characters.js";
import { registerStudioLocationRoutes } from "./routes/studio/locations.js";
import { registerStudioDevEditRoutes } from "./routes/studio/dev-edit.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const server = Fastify({ logger: true });

// ── Simple token auth ─────────────────────────────────────────────────────────
// All /api/* routes require header: x-studio-token: <STUDIO_TOKEN env var>
// The UI login page verifies via GET /api/auth/ping
const STUDIO_TOKEN = process.env.STUDIO_TOKEN?.trim();
if (!STUDIO_TOKEN) {
  console.warn("⚠️  STUDIO_TOKEN not set — API is unprotected");
} else {
  console.log(`Studio auth enabled (token prefix: ${STUDIO_TOKEN.substring(0, 4)}***)`);
}

server.addHook("preHandler", async (req, reply) => {
  if (!STUDIO_TOKEN) return; // dev mode: no auth required
  if (!req.url.startsWith("/api/")) return; // static files pass through
  const token = (req.headers["x-studio-token"] as string ?? "").trim();
  if (token !== STUDIO_TOKEN) {
    reply.code(401).send({ error: "Unauthorized" });
  }
});

// Login check — returns 200 if token is valid, 401 if not (handled by preHandler above)
server.get("/api/auth/ping", async () => ({ ok: true }));

await server.register(cors, { origin: true });
await server.register(multipart, { limits: { fileSize: 100_000_000 } });

// Serve the UI build in production (Docker or `npm start`)
const uiDist = resolve(__dirname, "../../ui/dist");
if (existsSync(uiDist)) {
  await server.register(fastifyStatic, {
    root: uiDist,
    prefix: "/",
    wildcard: false,
  });
  // SPA fallback: serve index.html for non-API routes
  server.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api")) {
      reply.code(404).send({ error: "Not found" });
    } else {
      reply.sendFile("index.html");
    }
  });
}

// Serve uploaded cover images
import { dataDir } from "./db.js";
const coversDir = join(dataDir, "covers");
mkdirSync(coversDir, { recursive: true });
await server.register(fastifyStatic, {
  root: coversDir,
  prefix: "/api/covers/",
  decorateReply: false,
});

registerProjectRoutes(server);
registerManuscriptRoutes(server);
registerChapterRoutes(server);
registerEntityRoutes(server);
registerRelationshipRoutes(server);
registerViewRoutes(server);
registerExportRoutes(server);
registerDetectionRoutes(server);
registerAnalyzerRoutes(server);
registerPluginRoutes(server);
registerSnapshotRoutes(server);
registerExtractionRoutes(server);
// Studio (PostgreSQL / mangrove_workbench)
registerWarRoomRoutes(server);
registerStudioBookRoutes(server);
registerStudioChapterRoutes(server);
registerStudioSceneRoutes(server);
registerStudioCharacterRoutes(server);
registerStudioLocationRoutes(server);
await registerStudioDevEditRoutes(server);

const port = Number(process.env.NOVELMAP_PORT ?? 3001);

try {
  await server.listen({ port, host: "0.0.0.0" });
  console.log(`NovelMap API running on http://localhost:${port}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
