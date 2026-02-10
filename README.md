# NovelMap

**Local-first story knowledgebase for series authors.**

NovelMap helps authors import manuscripts, organize narrative metadata (characters, locations, organizations, artifacts, events), and explore it through multiple views — without rebuilding everything by hand.

- **Import-first** — Markdown, DOCX, EPUB, Scrivener
- **Entity + relationship driven** — characters, locations, artifacts, orgs, concepts, events
- **Local-first & portable** — SQLite, no cloud dependency
- **Open-source & extensible** — plugin system for custom importers, exporters, analyzers, and views

## Architecture

```text
NovelMap/
├── packages/core/       ← TypeScript library: SQLite storage, parsers, views, plugins
├── packages/server/     ← Fastify API bridging React ↔ SQLite
└── packages/ui/         ← Vite + React SPA with dark theme
```

| Layer         | Tech                                                    |
| ------------- | ------------------------------------------------------- |
| Core          | TypeScript, better-sqlite3, remark, mammoth, JSZip      |
| Server        | Fastify 5, @fastify/cors, @fastify/multipart            |
| UI            | React 19, Vite 6, Tailwind v4, Zustand, TanStack Query  |
| Graph         | @xyflow/react v12 (React Flow)                          |
| 3D Bookshelf  | React Three Fiber + Drei                                |
| Plot Diagrams | Mermaid                                                 |
| Animations    | Framer Motion                                           |

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **npm** >= 10

### Install

```bash
git clone https://github.com/MangrovePublishing/NovelMap.git
cd NovelMap
npm install
```

### Development

Start both the API server and UI dev server:

```bash
npm run dev
```

Or run them separately:

```bash
# API server on :3001
npm run dev:server

# UI on :5173 (proxies /api → :3001)
npm run dev:ui
```

### Test

```bash
npm test
```

Runs 146 tests across 20 test files (128 core library + 18 server API).

### Build

```bash
npm run build
```

Compiles all three packages (core → server → ui).

## Views

| View                    | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| **Bookshelf**           | 2D grid or 3D shelf of manuscripts                       |
| **Entity Dashboard**    | CRUD for characters, locations, artifacts, etc.          |
| **Graph**               | Interactive entity-relationship graph (React Flow)       |
| **Field Guide**         | Searchable dossier cards for every entity                |
| **Timeline**            | Horizontal swimlane of entity appearances per chapter    |
| **Mind Map**            | Freeform canvas for plotting and brainstorming           |
| **Plot Diagram**        | Mermaid-powered flowcharts and sequence diagrams         |
| **Manuscript Explorer** | Chapter reader with inline entity highlighting           |
| **Cross-Book**          | Entities that span multiple manuscripts                  |
| **Insights**            | Genre analysis, character roles, series bible generation |
| **Snapshots**           | Capture, compare, and restore project state              |

## Plugins

NovelMap supports a plugin system with four capabilities:

- **Importer** — custom file format parsers
- **Exporter** — custom export formats (alongside built-in Scrivener, Plottr, JSON)
- **Analyzer** — custom analysis passes over project data
- **View** — custom HTML views rendered in the UI

Plugins live in `~/.novelmap/plugins/` and are loaded automatically. See the plugin documentation for the API.

## Export Formats

- **Scrivener** (.scriv) — Draft folder + Research metadata
- **Plottr** (.pltr) — Characters, locations, plotlines, scene cards
- **NovelMap JSON** — Portable full-project export
- **Plugin exporters** — dynamically discovered from installed plugins

## Contributing

See `CONTRIBUTING.md`.

## License

MIT — see `LICENSE`.

---

Copyright (c) 2026 Robert Cummer, Mangrove Publishing LLC
