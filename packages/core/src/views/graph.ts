import type { Database as DB } from "../db/database.js";
import type { EntityType } from "../core/types.js";

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

/**
 * Build the graph data for a project: entities as nodes, relationships as edges.
 */
export function buildGraph(
  db: DB,
  projectId: number,
  filters?: { type?: EntityType; manuscriptId?: number }
): GraphData {
  let entitySql = "SELECT id, name, type FROM entity WHERE project_id = ?";
  const entityParams: (number | string)[] = [projectId];

  if (filters?.type) {
    entitySql += " AND type = ?";
    entityParams.push(filters.type);
  }

  if (filters?.manuscriptId) {
    entitySql = `SELECT DISTINCT e.id, e.name, e.type FROM entity e
      JOIN appearance a ON e.id = a.entity_id
      WHERE e.project_id = ? AND a.manuscript_id = ?`;
    entityParams.length = 0;
    entityParams.push(projectId, filters.manuscriptId);
    if (filters.type) {
      entitySql += " AND e.type = ?";
      entityParams.push(filters.type);
    }
  }

  const nodes = db.db.prepare(entitySql).all(...entityParams) as GraphNode[];
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Get all relationships where both endpoints are in the node set
  const allRels = db.db
    .prepare(
      "SELECT source_entity_id as source, target_entity_id as target, type FROM relationship"
    )
    .all() as GraphEdge[];

  const edges = allRels.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  return { nodes, edges };
}

/**
 * Render the graph as a standalone HTML page with an interactive D3 force layout.
 */
export function renderGraphHtml(data: GraphData): string {
  const typeColors: Record<string, string> = {
    character: "#e94560",
    location: "#0f3460",
    organization: "#533483",
    artifact: "#e9a045",
    concept: "#45e9a0",
    event: "#4560e9",
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NovelMap — Graph View</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a2e; overflow: hidden; font-family: system-ui, sans-serif; }
  svg { width: 100vw; height: 100vh; }
  .node circle { stroke: #e0e0e0; stroke-width: 1.5px; cursor: pointer; }
  .node text { fill: #e0e0e0; font-size: 11px; pointer-events: none; }
  .edge { stroke: #555; stroke-opacity: 0.6; }
  .edge-label { fill: #888; font-size: 9px; pointer-events: none; }
  .legend { position: fixed; top: 1rem; right: 1rem; background: #16213e; padding: 1rem; border-radius: 8px; border: 1px solid #0f3460; }
  .legend-item { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; color: #e0e0e0; font-size: 0.8rem; }
  .legend-dot { width: 12px; height: 12px; border-radius: 50%; }
  h2 { color: #e0e0e0; font-size: 1rem; margin-bottom: 0.5rem; }
</style>
</head>
<body>
<div class="legend">
  <h2>Entity Types</h2>
  ${Object.entries(typeColors)
    .map(
      ([type, color]) =>
        `<div class="legend-item"><div class="legend-dot" style="background:${color}"></div>${type}</div>`
    )
    .join("\n  ")}
</div>
<svg id="graph"></svg>
<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
const data = ${JSON.stringify(data)};
const colors = ${JSON.stringify(typeColors)};

const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#graph")
  .attr("viewBox", [0, 0, width, height]);

const simulation = d3.forceSimulation(data.nodes)
  .force("link", d3.forceLink(data.edges).id(d => d.id).distance(120))
  .force("charge", d3.forceManyBody().strength(-300))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collision", d3.forceCollide().radius(30));

const edge = svg.append("g")
  .selectAll("line")
  .data(data.edges)
  .join("line")
  .attr("class", "edge")
  .attr("stroke-width", 1.5);

const edgeLabel = svg.append("g")
  .selectAll("text")
  .data(data.edges)
  .join("text")
  .attr("class", "edge-label")
  .attr("text-anchor", "middle")
  .text(d => d.type);

const node = svg.append("g")
  .selectAll("g")
  .data(data.nodes)
  .join("g")
  .attr("class", "node")
  .call(d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended));

node.append("circle")
  .attr("r", 10)
  .attr("fill", d => colors[d.type] || "#888");

node.append("text")
  .attr("dx", 14)
  .attr("dy", 4)
  .text(d => d.name);

simulation.on("tick", () => {
  edge
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);
  edgeLabel
    .attr("x", d => (d.source.x + d.target.x) / 2)
    .attr("y", d => (d.source.y + d.target.y) / 2);
  node.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
});

function dragstarted(event) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  event.subject.fx = event.subject.x;
  event.subject.fy = event.subject.y;
}
function dragged(event) {
  event.subject.fx = event.x;
  event.subject.fy = event.y;
}
function dragended(event) {
  if (!event.active) simulation.alphaTarget(0);
  event.subject.fx = null;
  event.subject.fy = null;
}
</script>
</body>
</html>`;
}
