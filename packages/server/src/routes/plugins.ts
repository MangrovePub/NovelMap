import type { FastifyInstance } from "fastify";
import {
  PluginRegistry,
  loadPluginsFromDirectory,
  getDefaultPluginDir,
} from "@novelmap/core";
import type { AnalyzerPlugin, ExporterPlugin, ViewPlugin } from "@novelmap/core";
import { db } from "../db.js";

// Shared plugin registry — initialized on first load
const registry = new PluginRegistry();
let loaded = false;

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  const pluginDir = getDefaultPluginDir();
  const result = await loadPluginsFromDirectory(pluginDir, registry);
  if (result.loaded.length > 0) {
    console.log(
      `Loaded ${result.loaded.length} plugin(s): ${result.loaded.map((p) => p.name).join(", ")}`
    );
  }
  if (result.errors.length > 0) {
    for (const err of result.errors) {
      console.warn(`Plugin load error in ${err.directory}: ${err.error}`);
    }
  }
}

export { registry };

export function registerPluginRoutes(server: FastifyInstance) {
  // List installed plugins
  server.get("/api/plugins", async () => {
    await ensureLoaded();
    return registry.list().map((p) => ({
      name: p.manifest.name,
      version: p.manifest.version,
      description: p.manifest.description,
      capabilities: p.manifest.capabilities,
    }));
  });

  // Reload plugins from disk
  server.post("/api/plugins/reload", async () => {
    // Reset registry
    for (const p of registry.list()) {
      registry.unregister(p.manifest.name);
    }
    loaded = false;
    await ensureLoaded();

    return {
      plugins: registry.list().map((p) => ({
        name: p.manifest.name,
        version: p.manifest.version,
        capabilities: p.manifest.capabilities,
      })),
    };
  });

  // Run a plugin analyzer
  server.get<{ Params: { pid: string; pluginName: string } }>(
    "/api/projects/:pid/plugins/:pluginName/analyze",
    async (req) => {
      await ensureLoaded();
      const pid = Number(req.params.pid);
      const plugin = registry.get(req.params.pluginName);

      if (!plugin) {
        throw new Error(`Plugin not found: ${req.params.pluginName}`);
      }
      if (!plugin.manifest.capabilities.includes("analyzer")) {
        throw new Error(`Plugin ${req.params.pluginName} is not an analyzer`);
      }

      return (plugin as AnalyzerPlugin).analyze(db, pid);
    }
  );

  // Run a plugin exporter
  server.get<{ Params: { pid: string; pluginName: string } }>(
    "/api/projects/:pid/plugins/:pluginName/export",
    async (req, reply) => {
      await ensureLoaded();
      const pid = Number(req.params.pid);
      const plugin = registry.get(req.params.pluginName);

      if (!plugin) {
        throw new Error(`Plugin not found: ${req.params.pluginName}`);
      }
      if (!plugin.manifest.capabilities.includes("exporter")) {
        throw new Error(`Plugin ${req.params.pluginName} is not an exporter`);
      }

      const result = await (plugin as ExporterPlugin).export(db, pid);
      if (Buffer.isBuffer(result)) {
        return reply.type("application/octet-stream").send(result);
      }
      return result;
    }
  );

  // Render a plugin view
  server.get<{ Params: { pid: string; pluginName: string } }>(
    "/api/projects/:pid/plugins/:pluginName/view",
    async (req, reply) => {
      await ensureLoaded();
      const pid = Number(req.params.pid);
      const plugin = registry.get(req.params.pluginName);

      if (!plugin) {
        throw new Error(`Plugin not found: ${req.params.pluginName}`);
      }
      if (!plugin.manifest.capabilities.includes("view")) {
        throw new Error(`Plugin ${req.params.pluginName} is not a view`);
      }

      const html = await (plugin as ViewPlugin).render(db, pid);
      return reply.type("text/html").send(html);
    }
  );

  // List available plugin exporters (for export dialog integration)
  server.get("/api/plugins/exporters", async () => {
    await ensureLoaded();
    return registry.getExporters().map((p) => ({
      name: p.manifest.name,
      description: p.manifest.description,
      format: p.format,
      formatName: p.formatName ?? p.format,
      fileExtension: p.fileExtension ?? `.${p.format}`,
    }));
  });

  // List available plugin views (for sidebar integration)
  server.get("/api/plugins/views", async () => {
    await ensureLoaded();
    return registry.getViews().map((p) => ({
      name: p.manifest.name,
      description: p.manifest.description,
      label: p.label,
      icon: p.icon,
    }));
  });
}
