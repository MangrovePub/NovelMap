# NovelMap
**Architecture & Design Specification**

## 1. Vision

**NovelMap** is an open-source, local-first story architecture platform for authors writing complex narratives—especially multi-book series.

It is designed for writers who need more than index cards and less friction than rebuilding their entire story inside a rigid storyboard tool. NovelMap treats a manuscript, its metadata, and its worldbuilding as a **connected system**, not separate silos.

At its core, NovelMap is a **story knowledgebase**:
- You import your work.
- The system indexes structure and entities.
- Everything is connected through a queryable graph.
- You explore the same data through multiple views: timelines, boards, dossiers, relationship maps, and field-guide-style references.

NovelMap is inspired by how a **software engineer turned novelist** naturally organizes creative work: structured, versioned, inspectable, but still writer-friendly.

---

## 2. Design Goals

### Primary Goals
- **Import-first**: authors should not have to recreate their work by hand
- **Series-native**: multi-book continuity is a first-class concern
- **Entity-driven**: characters, locations, organizations, and artifacts are core data
- **Multiple views, one source of truth**
- **Local-first & portable**: no cloud lock-in, no proprietary formats
- **Open-source & extensible**: plugins, themes, importers, exporters

### Explicit Non-Goals
- Replacing writing tools (Scrivener, Word, Google Docs)
- Forcing a single plotting methodology
- Becoming a "card-only" storyboard app
- Real-time collaborative editing (initially)

---

## 3. Core Mental Model

NovelMap is a **Field Guide for your story universe**.

Think:
- A visual trapper keeper
- A dossier system
- A canonical reference desk
- A navigable map of narrative truth

Everything lives in a **Project**.
Everything in the project is an **Entity** or relates to one.

---

## 4. Core Concepts & Data Model

### 4.1 Project
A **Project** represents a single narrative universe. It may contain:
- One or more books
- Multiple manuscripts or drafts
- Shared characters, locations, organizations, and lore

A project is stored locally as:
- A SQLite database
- A structured filesystem for text, assets, and exports

### 4.2 Manuscript
A **Manuscript** is an imported or linked body of text.

Supported inputs (via plugins, phased):
- Markdown
- DOCX
- Plain text
- Future: Scrivener exports, Plottr, OPML, Fountain

A manuscript is parsed into:
- Books
- Parts (optional)
- Chapters
- Scenes (optional / inferred)

NovelMap never "owns" the manuscript—it **indexes and references** it.

### 4.3 Entities
An **Entity** is anything worth tracking.

Built-in entity types:
- Character
- Location
- Organization
- Artifact / Object
- Concept / Theme
- Event

Entities are typed and extensible. Custom types may be added via plugins.

### 4.4 Appearances
An **Appearance** links an Entity to a location in the manuscript.

An appearance records:
- Entity ID
- Manuscript ID
- Chapter / Scene
- Text offset/range (when available)
- Optional notes/tags

Appearances enable:
- Character timelines
- "Where was this artifact last seen?"
- Series-wide continuity checks

### 4.5 Relationships
Entities are connected by **typed relationships** (directional edges).

Examples:
- Knows
- Works For
- Sibling Of
- Located In
- Opposes
- Alias Of

Relationships may include metadata (notes, dates, certainty).

Together, entities + relationships form the **story graph**.

---

## 5. Views

All views are projections of the same underlying graph.

### 5.1 Field Guide View (Core)
- Entity dossiers
- Appearance lists (jump to manuscript)
- Relationship summaries
- Cross-book references

### 5.2 Timeline View
- Chronological ordering of events and appearances
- Per-entity or per-book timelines
- Flags potential continuity conflicts

### 5.3 Board View
- Acts / plot beats / arcs
- Drag-and-drop reordering
- Optional linkage to manuscript sections

### 5.4 Graph View
- Visual relationship maps
- Zoomable, filterable networks

### 5.5 Manuscript Explorer
- Structured outline view
- Entity highlights within text
- Jump: entity → appearance → scene

---

## 6. Versioning: Snapshots & Variants (Phased)

### 6.1 Snapshots
A **Snapshot** is an immutable capture of:
- Manuscript structure
- Entity state
- Relationships
- Appearances

Supports rollback and comparison.

### 6.2 Draft Lines
A **Draft Line** is a named progression of snapshots (e.g., Main Draft, Editor Pass).

### 6.3 Variants (Future / Power Feature)
Variants are forked draft lines ("Alternate Ending", "Act II Rebuild").
Under the hood it can be Git-like; in UI it stays writer-language.

---

## 7. Plugin Architecture

Plugin types:
- Importers (DOCX, Scrivener, Plottr)
- Exporters (Markdown, PDF, HTML)
- Entity types
- Views
- Analysis tools

Principles:
- Plugins declare capabilities
- Plugins may add metadata; core data remains stable

---

## 8. Storage & Portability

- SQLite for structured data
- Plain-text where possible
- Assets in predictable folders
- Entire project is a folder (zip/back up/version easily)

---

## 9. Proposed Stack (Tentative)

- Desktop-first (Tauri or Electron)
- TypeScript core
- SQLite storage
- View-layer agnostic

---

## 10. Open Source Philosophy

NovelMap is:
- Permissively licensed
- Documentation-first
- Contributor-friendly
- Useful to nerds and non-nerds

NovelMap is a map of your narrative mind—built once, explored endlessly.
