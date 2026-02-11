const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export interface Project {
  id: number;
  name: string;
  path: string;
  created_at: string;
}

export interface Manuscript {
  id: number;
  project_id: number;
  title: string;
  file_path: string;
  cover_url: string | null;
  series_order: number | null;
  created_at: string;
}

export interface Chapter {
  id: number;
  manuscript_id: number;
  title: string;
  order_index: number;
  body: string;
}

export type EntityType =
  | "character"
  | "location"
  | "organization"
  | "artifact"
  | "concept"
  | "event";

export interface Entity {
  id: number;
  project_id: number;
  type: EntityType;
  name: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Relationship {
  id: number;
  source_entity_id: number;
  target_entity_id: number;
  type: string;
  metadata: Record<string, unknown>;
}

export interface GraphNode {
  id: number;
  name: string;
  type: EntityType;
}

export interface GraphEdge {
  source: number;
  target: number;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface TimelineEntry {
  entity_id: number;
  entity_name: string;
  entity_type: EntityType;
  manuscript_title: string;
  chapter_title: string;
  chapter_order: number;
  manuscript_id: number;
  chapter_id: number;
  notes: string | null;
}

export interface DossierEntry {
  entity: Entity;
  appearances: { chapter_title: string; manuscript_title: string; notes: string | null }[];
  relationships: { entity: Entity; type: string; direction: "outgoing" | "incoming" }[];
}

export interface DetectionResult {
  entityId: number;
  entityName: string;
  entityType: EntityType;
  manuscriptId: number;
  chapterId: number;
  chapterTitle: string;
  offset: number;
  isNew: boolean;
}

export interface DetectionSummary {
  totalMatches: number;
  newAppearances: number;
  crossBookEntities: {
    entityId: number;
    entityName: string;
    entityType: EntityType;
    existingBooks: string[];
    newBooks: string[];
  }[];
  details: DetectionResult[];
}

export interface CrossBookEntry {
  entityId: number;
  entityName: string;
  entityType: EntityType;
  manuscripts: { id: number; title: string; chapterCount: number }[];
}

export type CharacterRole =
  | "protagonist"
  | "deuteragonist"
  | "antagonist"
  | "supporting"
  | "minor"
  | "mentioned";

export interface GenreSignal {
  genre: string;
  subGenres: string[];
  confidence: number;
  markers: string[];
}

export interface ProjectGenreAnalysis {
  projectId: number;
  manuscripts: {
    manuscriptId: number;
    manuscriptTitle: string;
    primaryGenre: string;
    genres: GenreSignal[];
    wordCount: number;
    suggestedCategories: string[];
    themes: string[];
  }[];
  seriesGenre: string;
  recurringThemes: string[];
  genreConsistency: string;
}

export interface CharacterRoleResult {
  entityId: number;
  entityName: string;
  role: CharacterRole;
  confidence: number;
  presenceRatio: number;
  narrativeWeight: number;
  peakAct: "opening" | "middle" | "climax" | "throughout";
  antagonistSignals: string[];
  perManuscript: {
    manuscriptId: number;
    manuscriptTitle: string;
    role: CharacterRole;
    chapterAppearances: number;
    totalChapters: number;
  }[];
}

export interface RoleAnalysis {
  projectId: number;
  characters: CharacterRoleResult[];
  roleShifts: {
    entityId: number;
    entityName: string;
    shifts: { manuscriptTitle: string; role: CharacterRole }[];
  }[];
}

export interface SeriesBible {
  projectName: string;
  generatedAt: string;
  series: {
    bookCount: number;
    totalWordCount: number;
    totalCharacters: number;
    totalEntities: number;
    primaryGenre: string;
    genres: { genre: string; confidence: number }[];
    recurringThemes: string[];
    genreConsistency: string;
  };
  manuscripts: {
    id: number;
    title: string;
    chapterCount: number;
    wordCount: number;
    characterCount: number;
    entityCount: number;
  }[];
  characters: unknown[];
  crossBookPresence: { entityName: string; entityType: EntityType; books: string[] }[];
  relationships: { source: string; sourceType: EntityType; target: string; targetType: EntityType; type: string }[];
}

export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
}

export interface PluginExporterInfo {
  name: string;
  description: string;
  format: string;
  formatName: string;
  fileExtension: string;
}

export interface SnapshotData {
  entities: Record<string, unknown>[];
  relationships: Record<string, unknown>[];
  appearances: Record<string, unknown>[];
  manuscripts: Record<string, unknown>[];
  chapters: Record<string, unknown>[];
}

export interface SnapshotSummary {
  id: number;
  project_id: number;
  created_at: string;
  data: SnapshotData;
}

export interface SnapshotDiff {
  entities: { added: string[]; removed: string[]; changed: string[] };
  relationships: { added: number; removed: number };
  appearances: { added: number; removed: number };
}

export interface ExtractionCandidate {
  text: string;
  suggestedType: EntityType;
  confidence: "high" | "medium" | "low";
  score: number;
  occurrences: number;
  chapterSpread: number;
  sampleContexts: string[];
  relatedCandidates: string[];
}

export interface ExtractionResult {
  candidates: ExtractionCandidate[];
  existingEntities: string[];
}

export interface ExtractionConfirmResult {
  created: { id: number; name: string; type: string }[];
  detection: DetectionSummary;
}

export interface PluginViewInfo {
  name: string;
  description: string;
  label: string;
  icon?: string;
}

// Projects
export const api = {
  listProjects: () => request<Project[]>("/projects"),

  createProject: (data: { name: string; path: string }) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getProject: (id: number) => request<Project>(`/projects/${id}`),

  // Manuscripts
  listManuscripts: (projectId: number) =>
    request<Manuscript[]>(`/projects/${projectId}/manuscripts`),

  importManuscript: async (projectId: number, file: File): Promise<Manuscript> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE}/projects/${projectId}/manuscripts/import`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`Import failed: ${await res.text()}`);
    return res.json();
  },

  // Chapters
  listChapters: (manuscriptId: number) =>
    request<Chapter[]>(`/manuscripts/${manuscriptId}/chapters`),

  // Entities
  listEntities: (projectId: number, params?: { type?: EntityType; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set("type", params.type);
    if (params?.search) qs.set("search", params.search);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<Entity[]>(`/projects/${projectId}/entities${suffix}`);
  },

  createEntity: (projectId: number, data: { name: string; type: EntityType; metadata?: Record<string, unknown> }) =>
    request<Entity>(`/projects/${projectId}/entities`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateEntity: (id: number, data: Partial<{ name: string; type: EntityType; metadata: Record<string, unknown> }>) =>
    request<Entity>(`/entities/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteEntity: (id: number) =>
    request<void>(`/entities/${id}`, { method: "DELETE" }),

  // Relationships
  listRelationships: (projectId: number) =>
    request<Relationship[]>(`/projects/${projectId}/relationships`),

  createRelationship: (projectId: number, data: { source_entity_id: number; target_entity_id: number; type: string }) =>
    request<Relationship>(`/projects/${projectId}/relationships`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Views
  getGraph: (projectId: number, params?: { type?: EntityType; manuscriptId?: number }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set("type", params.type);
    if (params?.manuscriptId) qs.set("manuscriptId", String(params.manuscriptId));
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<GraphData>(`/projects/${projectId}/graph${suffix}`);
  },

  getTimeline: (projectId: number, params?: { entityId?: number; manuscriptId?: number }) => {
    const qs = new URLSearchParams();
    if (params?.entityId) qs.set("entityId", String(params.entityId));
    if (params?.manuscriptId) qs.set("manuscriptId", String(params.manuscriptId));
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<TimelineEntry[]>(`/projects/${projectId}/timeline${suffix}`);
  },

  getFieldGuide: (projectId: number) =>
    request<DossierEntry[]>(`/projects/${projectId}/fieldguide`),

  getDossier: (entityId: number) =>
    request<DossierEntry>(`/entities/${entityId}/dossier`),

  // Detection
  detectManuscript: (projectId: number, manuscriptId: number) =>
    request<DetectionSummary>(`/projects/${projectId}/manuscripts/${manuscriptId}/detect`, {
      method: "POST",
    }),

  detectFullProject: (projectId: number) =>
    request<DetectionSummary>(`/projects/${projectId}/detect`, {
      method: "POST",
    }),

  getCrossBookPresence: (projectId: number) =>
    request<CrossBookEntry[]>(`/projects/${projectId}/cross-book-presence`),

  // Analyzers
  getProjectGenre: (projectId: number) =>
    request<ProjectGenreAnalysis>(`/projects/${projectId}/genre`),

  getCharacterRoles: (projectId: number) =>
    request<RoleAnalysis>(`/projects/${projectId}/roles`),

  getSeriesBible: (projectId: number) =>
    request<SeriesBible>(`/projects/${projectId}/bible`),

  // Plugins
  listPlugins: () =>
    request<PluginInfo[]>("/plugins"),

  reloadPlugins: () =>
    request<{ plugins: PluginInfo[] }>("/plugins/reload", { method: "POST" }),

  runPluginAnalyzer: (projectId: number, pluginName: string) =>
    request<{ title: string; summary: string; data: Record<string, unknown> }>(
      `/projects/${projectId}/plugins/${pluginName}/analyze`
    ),

  listPluginExporters: () =>
    request<PluginExporterInfo[]>("/plugins/exporters"),

  listPluginViews: () =>
    request<PluginViewInfo[]>("/plugins/views"),

  // Snapshots
  listSnapshots: (projectId: number) =>
    request<SnapshotSummary[]>(`/projects/${projectId}/snapshots`),

  createSnapshot: (projectId: number) =>
    request<SnapshotSummary>(`/projects/${projectId}/snapshots`, { method: "POST" }),

  restoreSnapshot: (projectId: number, snapshotId: number) =>
    request<{ restored: boolean; snapshotId: number }>(
      `/projects/${projectId}/snapshots/${snapshotId}/restore`,
      { method: "POST" }
    ),

  diffSnapshots: (projectId: number, sidA: number, sidB: number) =>
    request<SnapshotDiff>(`/projects/${projectId}/snapshots/${sidA}/diff/${sidB}`),

  deleteSnapshot: (projectId: number, snapshotId: number) =>
    request<{ deleted: boolean }>(`/projects/${projectId}/snapshots/${snapshotId}`, {
      method: "DELETE",
    }),

  // Covers
  uploadCover: async (manuscriptId: number, file: File): Promise<Manuscript> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE}/manuscripts/${manuscriptId}/cover`, {
      method: "PUT",
      body: formData,
    });
    if (!res.ok) throw new Error(`Cover upload failed: ${await res.text()}`);
    return res.json();
  },

  setCoverUrl: (manuscriptId: number, url: string) =>
    request<Manuscript>(`/manuscripts/${manuscriptId}/cover-url`, {
      method: "PUT",
      body: JSON.stringify({ url }),
    }),

  deleteCover: (manuscriptId: number) =>
    request<void>(`/manuscripts/${manuscriptId}/cover`, { method: "DELETE" }),

  // Manuscript ordering
  reorderManuscripts: (projectId: number, order: { id: number; series_order: number }[]) =>
    request<Manuscript[]>(`/projects/${projectId}/manuscripts/reorder`, {
      method: "PUT",
      body: JSON.stringify({ order }),
    }),

  // Entity extraction
  extractProject: (projectId: number) =>
    request<ExtractionResult>(`/projects/${projectId}/extract`, { method: "POST", body: "{}" }),

  extractManuscript: (projectId: number, manuscriptId: number) =>
    request<ExtractionResult>(`/projects/${projectId}/manuscripts/${manuscriptId}/extract`, {
      method: "POST",
      body: "{}",
    }),

  confirmExtraction: (projectId: number, candidates: { text: string; type: EntityType; metadata?: Record<string, unknown> }[]) =>
    request<ExtractionConfirmResult>(`/projects/${projectId}/extract/confirm`, {
      method: "POST",
      body: JSON.stringify({ candidates }),
    }),
};

export function resolveCoverUrl(coverUrl: string | null): string | null {
  if (!coverUrl) return null;
  if (coverUrl.startsWith("http://") || coverUrl.startsWith("https://")) return coverUrl;
  return `${BASE}/covers/${coverUrl}`;
}
