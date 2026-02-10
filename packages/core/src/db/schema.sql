-- NovelMap core schema

CREATE TABLE IF NOT EXISTS project (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS manuscript (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chapter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manuscript_id INTEGER NOT NULL REFERENCES manuscript(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  body TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS entity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('character','location','organization','artifact','concept','event')),
  name TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS appearance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  manuscript_id INTEGER NOT NULL REFERENCES manuscript(id) ON DELETE CASCADE,
  chapter_id INTEGER NOT NULL REFERENCES chapter(id) ON DELETE CASCADE,
  text_range_start INTEGER,
  text_range_end INTEGER,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS relationship (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_entity_id INTEGER NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  target_entity_id INTEGER NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_manuscript_project ON manuscript(project_id);
CREATE INDEX IF NOT EXISTS idx_chapter_manuscript ON chapter(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_entity_project ON entity(project_id);
CREATE INDEX IF NOT EXISTS idx_entity_type ON entity(project_id, type);
CREATE INDEX IF NOT EXISTS idx_appearance_entity ON appearance(entity_id);
CREATE INDEX IF NOT EXISTS idx_appearance_chapter ON appearance(chapter_id);
CREATE INDEX IF NOT EXISTS idx_relationship_source ON relationship(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationship_target ON relationship(target_entity_id);
