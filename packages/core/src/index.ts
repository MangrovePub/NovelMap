/**
 * NovelMap — Local-first story knowledgebase for series authors
 * Copyright (c) 2026 Robert Cummer, Mangrove Publishing LLC
 * Licensed under the MIT License
 */

// Core
export { Database } from "./db/database.js";
export { ProjectStore } from "./core/projects.js";
export { EntityStore } from "./core/entities.js";
export { AppearanceStore } from "./core/appearances.js";
export { RelationshipStore } from "./core/relationships.js";
export { SnapshotStore } from "./core/snapshots.js";
export { searchEntities } from "./core/search.js";
export { detectEntities, detectEntitiesFullProject, getCrossBookPresence } from "./core/auto-detect.js";
export type { DetectionResult, DetectionSummary } from "./core/auto-detect.js";
export { extractEntityCandidates } from "./core/entity-extraction.js";
export type { ExtractionCandidate, ExtractionResult } from "./core/entity-extraction.js";

// Entity extraction pipeline (gazetteer + classifier + optional LLM)
export { runPipeline, toExtractionResult, estimateClassificationCost } from "./core/extraction-pipeline.js";
export type { PipelineResult, PipelineStats, PipelineOptions, ClassifiedEntity, RawCandidate } from "./core/extraction-pipeline.js";
export type { LLMClassifierConfig } from "./core/llm-classifier.js";
export { isNoise, lookup as gazetteerLookup } from "./core/gazetteer.js";
export type { GazetteerHit } from "./core/gazetteer.js";

// Parsers
export { parseMarkdown } from "./parsers/markdown.js";
export { parseDocx } from "./parsers/docx.js";
export { parseScrivener } from "./parsers/scrivener.js";
export { parseEpub } from "./parsers/epub.js";

// Views
export { buildDossier, buildFieldGuide, renderFieldGuideHtml } from "./views/fieldguide.js";
export { buildManuscriptExplorer, renderManuscriptExplorerHtml } from "./views/manuscript-explorer.js";
export { buildGraph, renderGraphHtml } from "./views/graph.js";
export { buildTimeline, detectGaps, renderTimelineHtml } from "./views/timeline.js";

// Exporters
export { exportScrivener } from "./exporters/scrivener.js";
export { exportPlottr } from "./exporters/plottr.js";
export { exportNovelMapJSON } from "./exporters/novelmap-json.js";
export type { ScrivenerBundle } from "./exporters/scrivener.js";
export type { NovelMapExport } from "./exporters/novelmap-json.js";

// Analyzers
export { analyzeGenre, analyzeProjectGenre } from "./analyzers/genre-detector.js";
export type { GenreSignal, GenreAnalysis, ProjectGenreAnalysis } from "./analyzers/genre-detector.js";
export { classifyRoles } from "./analyzers/role-classifier.js";
export type { CharacterRole, CharacterRoleResult, RoleAnalysis } from "./analyzers/role-classifier.js";
export { generateSeriesBible, renderSeriesBibleHtml } from "./analyzers/series-bible.js";
export type { SeriesBible } from "./analyzers/series-bible.js";

// Plugins
export { PluginRegistry } from "./plugins/registry.js";
export { loadPluginsFromDirectory, getDefaultPluginDir } from "./plugins/loader.js";
export type { PluginLoadResult } from "./plugins/loader.js";

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
  ViewPlugin,
  AnalysisResult,
} from "./plugins/types.js";
