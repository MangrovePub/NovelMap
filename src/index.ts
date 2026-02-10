// Core
export { Database } from "./db/database.js";
export { ProjectStore } from "./core/projects.js";
export { EntityStore } from "./core/entities.js";
export { AppearanceStore } from "./core/appearances.js";
export { RelationshipStore } from "./core/relationships.js";
export { SnapshotStore } from "./core/snapshots.js";
export { searchEntities } from "./core/search.js";

// Parsers
export { parseMarkdown } from "./parsers/markdown.js";
export { parseDocx } from "./parsers/docx.js";

// Views
export { buildDossier, buildFieldGuide, renderFieldGuideHtml } from "./views/fieldguide.js";
export { buildManuscriptExplorer, renderManuscriptExplorerHtml } from "./views/manuscript-explorer.js";
export { buildGraph, renderGraphHtml } from "./views/graph.js";
export { buildTimeline, detectGaps, renderTimelineHtml } from "./views/timeline.js";

// Plugins
export { PluginRegistry } from "./plugins/registry.js";

// Types
export type {
  Project,
  Manuscript,
  Chapter,
  Entity,
  Appearance,
  Relationship,
  EntityType,
} from "./core/types.js";
export type { ParsedChapter } from "./parsers/markdown.js";
export type { SearchFilters } from "./core/search.js";
export type { Snapshot, SnapshotData, SnapshotDiff } from "./core/snapshots.js";
export type { DossierEntry } from "./views/fieldguide.js";
export type { GraphData, GraphNode, GraphEdge } from "./views/graph.js";
export type { TimelineEntry } from "./views/timeline.js";
export type {
  Plugin,
  PluginManifest,
  PluginCapability,
  ImporterPlugin,
  ExporterPlugin,
  AnalyzerPlugin,
  AnalysisResult,
} from "./plugins/types.js";
