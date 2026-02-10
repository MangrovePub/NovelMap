export type EntityType =
  | "character"
  | "location"
  | "organization"
  | "artifact"
  | "concept"
  | "event";

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
  created_at: string;
}

export interface Chapter {
  id: number;
  manuscript_id: number;
  title: string;
  order_index: number;
  body: string;
}

export interface Entity {
  id: number;
  project_id: number;
  type: EntityType;
  name: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Appearance {
  id: number;
  entity_id: number;
  manuscript_id: number;
  chapter_id: number;
  text_range_start: number | null;
  text_range_end: number | null;
  notes: string | null;
}

export interface Relationship {
  id: number;
  source_entity_id: number;
  target_entity_id: number;
  type: string;
  metadata: Record<string, unknown>;
}
