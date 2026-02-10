import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PluginRegistry } from "./registry.js";
import type { Plugin, PluginManifest } from "./types.js";

/**
 * Plugin Loader.
 *
 * Discovers and loads plugins from a directory. Each plugin lives in its
 * own subdirectory with a `novelmap-plugin.json` manifest and an entry
 * module (default: `index.js`).
 *
 * Directory structure:
 *   ~/.novelmap/plugins/
 *     my-plugin/
 *       novelmap-plugin.json   ← manifest (name, version, description, capabilities, entry)
 *       index.js               ← default entry module (exports the plugin object)
 *       ...
 *
 * Manifest format (novelmap-plugin.json):
 *   {
 *     "name": "my-plugin",
 *     "version": "1.0.0",
 *     "description": "Does something cool",
 *     "capabilities": ["analyzer"],
 *     "entry": "index.js"
 *   }
 */

export interface PluginLoadResult {
  loaded: { name: string; version: string; capabilities: string[] }[];
  errors: { directory: string; error: string }[];
}

export interface PluginManifestFile extends PluginManifest {
  /** Entry module filename (default: "index.js") */
  entry?: string;
}

/**
 * Discover and load all plugins from a directory into a registry.
 */
export async function loadPluginsFromDirectory(
  pluginDir: string,
  registry: PluginRegistry
): Promise<PluginLoadResult> {
  const result: PluginLoadResult = { loaded: [], errors: [] };

  if (!existsSync(pluginDir)) {
    return result;
  }

  let entries: string[];
  try {
    entries = readdirSync(pluginDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return result;
  }

  for (const dir of entries) {
    const pluginPath = join(pluginDir, dir);
    const manifestPath = join(pluginPath, "novelmap-plugin.json");

    try {
      // Read manifest
      if (!existsSync(manifestPath)) {
        result.errors.push({
          directory: dir,
          error: "Missing novelmap-plugin.json manifest",
        });
        continue;
      }

      const manifestRaw = readFileSync(manifestPath, "utf-8");
      const manifest: PluginManifestFile = JSON.parse(manifestRaw);

      // Validate manifest
      if (!manifest.name || !manifest.version || !manifest.capabilities?.length) {
        result.errors.push({
          directory: dir,
          error: "Invalid manifest: requires name, version, and capabilities",
        });
        continue;
      }

      // Load entry module
      const entryFile = manifest.entry ?? "index.js";
      const entryPath = join(pluginPath, entryFile);

      if (!existsSync(entryPath)) {
        result.errors.push({
          directory: dir,
          error: `Entry module not found: ${entryFile}`,
        });
        continue;
      }

      // Dynamic import the plugin module
      const mod = await import(entryPath);
      const plugin: Plugin = mod.default ?? mod.plugin ?? mod;

      // Ensure the loaded module has the manifest attached
      if (!plugin.manifest) {
        (plugin as any).manifest = manifest;
      }

      registry.register(plugin);
      result.loaded.push({
        name: manifest.name,
        version: manifest.version,
        capabilities: manifest.capabilities,
      });
    } catch (err) {
      result.errors.push({
        directory: dir,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}

/**
 * Get the default plugin directory path.
 */
export function getDefaultPluginDir(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "/tmp";
  return join(home, ".novelmap", "plugins");
}
