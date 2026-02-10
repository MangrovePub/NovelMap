# NovelMap Plugin: Word Frequency

Example plugin demonstrating NovelMap's plugin API.

## Installation

Copy this directory to your NovelMap plugins folder:

```bash
cp -r examples/plugin-word-frequency ~/.novelmap/plugins/word-frequency
```

Restart the NovelMap server, or hit "Reload Plugins" in the UI.

## What it does

- **Analyzer**: Counts word frequency across all manuscripts, identifies overused words and unique vocabulary per book
- **View**: Renders an HTML dashboard with bar charts showing word distribution

## Plugin Structure

```
word-frequency/
├── novelmap-plugin.json   ← Plugin manifest (required)
├── index.js               ← Entry module (required)
└── README.md              ← Documentation (optional)
```

## Manifest Format

```json
{
  "name": "word-frequency",
  "version": "1.0.0",
  "description": "Analyzes word frequency across manuscripts.",
  "capabilities": ["analyzer", "view"],
  "entry": "index.js"
}
```

### Capabilities

| Capability | Interface | Description |
|-----------|-----------|-------------|
| `importer` | `ImporterPlugin` | Parse new file formats into chapters |
| `exporter` | `ExporterPlugin` | Export project data to new formats |
| `analyzer` | `AnalyzerPlugin` | Compute derived data from project content |
| `view` | `ViewPlugin` | Render custom HTML visualizations |

## API

Your entry module should export an object matching the plugin interfaces:

### Analyzer

```js
module.exports = {
  manifest: { name, version, description, capabilities: ["analyzer"] },
  async analyze(db, projectId) {
    // db.db is the raw better-sqlite3 instance
    // Query manuscripts, chapters, entities, etc.
    return {
      title: "My Analysis",
      summary: "Found interesting things.",
      data: { /* arbitrary JSON */ }
    };
  }
};
```

### View

```js
module.exports = {
  manifest: { name, version, description, capabilities: ["view"] },
  label: "My View",           // Sidebar nav label
  icon: "M3.75 6.75h16.5...", // Heroicon SVG path (optional)
  async render(db, projectId) {
    return "<html>...</html>";  // Full HTML document
  }
};
```

### Exporter

```js
module.exports = {
  manifest: { name, version, description, capabilities: ["exporter"] },
  format: "csv",
  formatName: "CSV Spreadsheet",
  fileExtension: ".csv",
  async export(db, projectId) {
    return "col1,col2\nval1,val2"; // String or Buffer
  }
};
```

### Importer

```js
module.exports = {
  manifest: { name, version, description, capabilities: ["importer"] },
  extensions: [".rtf", ".odt"],
  async parse(buffer, filename) {
    return [
      { title: "Chapter 1", orderIndex: 0, body: "..." },
    ];
  }
};
```

## Server API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/plugins` | List installed plugins |
| POST | `/api/plugins/reload` | Reload plugins from disk |
| GET | `/api/projects/:pid/plugins/:name/analyze` | Run plugin analyzer |
| GET | `/api/projects/:pid/plugins/:name/export` | Run plugin exporter |
| GET | `/api/projects/:pid/plugins/:name/view` | Render plugin view |
| GET | `/api/plugins/exporters` | List plugin exporters |
| GET | `/api/plugins/views` | List plugin views |
