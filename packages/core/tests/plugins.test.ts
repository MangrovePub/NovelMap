import { describe, it, expect, beforeEach } from "vitest";
import { PluginRegistry } from "../src/plugins/registry.js";
import type { ImporterPlugin, ExporterPlugin, AnalyzerPlugin } from "../src/plugins/types.js";

const mockImporter: ImporterPlugin = {
  manifest: {
    name: "test-importer",
    version: "1.0.0",
    description: "Test importer",
    capabilities: ["importer"],
  },
  extensions: [".txt", ".text"],
  async parse(buffer, filename) {
    return [{ title: "Untitled", orderIndex: 0, body: buffer.toString("utf-8") }];
  },
};

const mockExporter: ExporterPlugin = {
  manifest: {
    name: "test-exporter",
    version: "1.0.0",
    description: "Test exporter",
    capabilities: ["exporter"],
  },
  format: "txt",
  async export(db, projectId) {
    return "exported text";
  },
};

const mockAnalyzer: AnalyzerPlugin = {
  manifest: {
    name: "test-analyzer",
    version: "1.0.0",
    description: "Test analyzer",
    capabilities: ["analyzer"],
  },
  async analyze(db, projectId) {
    return { title: "Test", summary: "A test analysis", data: { count: 42 } };
  },
};

describe("PluginRegistry", () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  it("registers and lists plugins", () => {
    registry.register(mockImporter);
    registry.register(mockExporter);
    expect(registry.list()).toHaveLength(2);
  });

  it("prevents duplicate registration", () => {
    registry.register(mockImporter);
    expect(() => registry.register(mockImporter)).toThrow("already registered");
  });

  it("unregisters a plugin", () => {
    registry.register(mockImporter);
    registry.unregister("test-importer");
    expect(registry.list()).toHaveLength(0);
  });

  it("throws on unregistering unknown plugin", () => {
    expect(() => registry.unregister("nope")).toThrow("not found");
  });

  it("gets importers", () => {
    registry.register(mockImporter);
    registry.register(mockExporter);
    const importers = registry.getImporters();
    expect(importers).toHaveLength(1);
    expect(importers[0].manifest.name).toBe("test-importer");
  });

  it("gets exporters", () => {
    registry.register(mockExporter);
    const exporters = registry.getExporters();
    expect(exporters).toHaveLength(1);
  });

  it("gets analyzers", () => {
    registry.register(mockAnalyzer);
    const analyzers = registry.getAnalyzers();
    expect(analyzers).toHaveLength(1);
  });

  it("finds importer by extension", () => {
    registry.register(mockImporter);
    const plugin = registry.getImporterForExtension(".txt");
    expect(plugin).toBeDefined();
    expect(plugin!.manifest.name).toBe("test-importer");
  });

  it("returns undefined for unknown extension", () => {
    registry.register(mockImporter);
    expect(registry.getImporterForExtension(".xyz")).toBeUndefined();
  });

  it("finds exporter by format", () => {
    registry.register(mockExporter);
    const plugin = registry.getExporterForFormat("txt");
    expect(plugin).toBeDefined();
  });

  it("importer can parse", async () => {
    const result = await mockImporter.parse(Buffer.from("Hello world"), "test.txt");
    expect(result).toHaveLength(1);
    expect(result[0].body).toBe("Hello world");
  });

  it("exporter can export", async () => {
    const result = await mockExporter.export(null as any, 1);
    expect(result).toBe("exported text");
  });

  it("analyzer can analyze", async () => {
    const result = await mockAnalyzer.analyze(null as any, 1);
    expect(result.title).toBe("Test");
    expect(result.data.count).toBe(42);
  });
});
