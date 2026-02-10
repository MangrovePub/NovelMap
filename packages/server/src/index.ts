/**
 * NovelMap API Server
 * Copyright (c) 2026 Robert Cummer, Mangrove Publishing LLC
 * Licensed under the MIT License
 */

import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
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

const __dirname = dirname(fileURLToPath(import.meta.url));

const server = Fastify({ logger: true });

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

const port = Number(process.env.NOVELMAP_PORT ?? 3001);

try {
  await server.listen({ port, host: "0.0.0.0" });
  console.log(`NovelMap API running on http://localhost:${port}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
