import type {
  Plugin,
  ImporterPlugin,
  ExporterPlugin,
  AnalyzerPlugin,
  ViewPlugin,
} from "./types.js";

/**
 * Plugin registry: registers and looks up plugins by capability.
 */
export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.manifest.name)) {
      throw new Error(`Plugin already registered: ${plugin.manifest.name}`);
    }
    this.plugins.set(plugin.manifest.name, plugin);
  }

  unregister(name: string): void {
    if (!this.plugins.delete(name)) {
      throw new Error(`Plugin not found: ${name}`);
    }
  }

  getImporters(): ImporterPlugin[] {
    return [...this.plugins.values()].filter(
      (p): p is ImporterPlugin => p.manifest.capabilities.includes("importer")
    );
  }

  getExporters(): ExporterPlugin[] {
    return [...this.plugins.values()].filter(
      (p): p is ExporterPlugin => p.manifest.capabilities.includes("exporter")
    );
  }

  getAnalyzers(): AnalyzerPlugin[] {
    return [...this.plugins.values()].filter(
      (p): p is AnalyzerPlugin => p.manifest.capabilities.includes("analyzer")
    );
  }

  getViews(): ViewPlugin[] {
    return [...this.plugins.values()].filter(
      (p): p is ViewPlugin => p.manifest.capabilities.includes("view")
    );
  }

  getImporterForExtension(ext: string): ImporterPlugin | undefined {
    return this.getImporters().find((p) => p.extensions.includes(ext));
  }

  getExporterForFormat(format: string): ExporterPlugin | undefined {
    return this.getExporters().find((p) => p.format === format);
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  list(): Plugin[] {
    return [...this.plugins.values()];
  }
}
