import type { ParsedChapter } from "../parsers/markdown.js";
import type { Database } from "../db/database.js";

/**
 * Plugin manifest declaring capabilities.
 */
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  capabilities: PluginCapability[];
}

export type PluginCapability = "importer" | "exporter" | "analyzer" | "view";

/**
 * Importer plugin: reads a file and produces parsed chapters.
 */
export interface ImporterPlugin {
  manifest: PluginManifest;
  /** File extensions this importer handles (e.g., [".md", ".markdown"]) */
  extensions: string[];
  /** Parse a file buffer into chapters */
  parse(buffer: Buffer, filename: string): Promise<ParsedChapter[]>;
}

/**
 * Exporter plugin: renders project data into an output format.
 */
export interface ExporterPlugin {
  manifest: PluginManifest;
  /** Output format identifier (e.g., "pdf", "html", "markdown") */
  format: string;
  /** Human-readable format name */
  formatName?: string;
  /** File extension for downloads */
  fileExtension?: string;
  /** Export project data */
  export(db: Database, projectId: number): Promise<Buffer | string>;
}

/**
 * Analyzer plugin: computes derived data from a project.
 */
export interface AnalyzerPlugin {
  manifest: PluginManifest;
  /** Run analysis and return results */
  analyze(db: Database, projectId: number): Promise<AnalysisResult>;
}

/**
 * View plugin: contributes a custom visualization to the UI.
 * The render method returns HTML that will be embedded in an iframe.
 */
export interface ViewPlugin {
  manifest: PluginManifest;
  /** Display name for the sidebar nav item */
  label: string;
  /** SVG path data for the nav icon (Heroicon-compatible) */
  icon?: string;
  /** Render an HTML view for the given project */
  render(db: Database, projectId: number): Promise<string>;
}

export interface AnalysisResult {
  title: string;
  summary: string;
  data: Record<string, unknown>;
}

export type Plugin = ImporterPlugin | ExporterPlugin | AnalyzerPlugin | ViewPlugin;
