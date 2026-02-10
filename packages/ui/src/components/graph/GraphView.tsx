import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useProjectStore } from "../../stores/project-store.ts";
import { useGraph } from "../../hooks/use-graph.ts";
import { EntityNode } from "./EntityNode.tsx";
import { RelationshipEdge } from "./RelationshipEdge.tsx";
import { GraphToolbar } from "./GraphToolbar.tsx";
import { EmptyState } from "../shared/EmptyState.tsx";
import type { EntityType } from "../../api/client.ts";
import { useState } from "react";

const TYPE_COLORS: Record<EntityType, string> = {
  character: "#e94560",
  location: "#0f3460",
  organization: "#533483",
  artifact: "#e9a045",
  concept: "#45e9a0",
  event: "#4560e9",
};

const nodeTypes = { entity: EntityNode };
const edgeTypes = { relationship: RelationshipEdge };

export function GraphView() {
  const { activeProjectId } = useProjectStore();
  const [typeFilter, setTypeFilter] = useState<EntityType | undefined>();
  const { data } = useGraph(activeProjectId, { type: typeFilter });

  const initialNodes: Node[] = useMemo(() => {
    if (!data) return [];
    const count = data.nodes.length;
    const radius = Math.max(300, count * 30);
    return data.nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / count;
      return {
        id: String(n.id),
        type: "entity",
        position: {
          x: 500 + radius * Math.cos(angle),
          y: 400 + radius * Math.sin(angle),
        },
        data: { label: n.name, entityType: n.type, color: TYPE_COLORS[n.type] },
      };
    });
  }, [data]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!data) return [];
    return data.edges.map((e, i) => ({
      id: `e-${i}`,
      source: String(e.source),
      target: String(e.target),
      label: e.type,
      type: "relationship",
    }));
  }, [data]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes/edges when data changes
  const nodesKey = useMemo(() => JSON.stringify(initialNodes.map((n) => n.id)), [initialNodes]);
  const edgesKey = useMemo(() => JSON.stringify(initialEdges.map((e) => e.id)), [initialEdges]);

  if (!activeProjectId) {
    return (
      <EmptyState
        title="No project selected"
        description="Select a project from the top bar to view the entity graph."
      />
    );
  }

  if (!data?.nodes.length) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-[--color-text-primary] mb-6">
          Entity Graph
        </h1>
        <EmptyState
          title="No entities yet"
          description="Import a manuscript and create entities to see them as a graph."
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[--color-text-primary]">
          Entity Graph
        </h1>
        <GraphToolbar typeFilter={typeFilter} onTypeFilterChange={setTypeFilter} />
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-[--color-bg-accent]">
        <ReactFlow
          key={`${nodesKey}-${edgesKey}`}
          nodes={initialNodes}
          edges={initialEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ background: "#1a1a2e" }}
        >
          <Background color="#0f3460" gap={24} />
          <Controls
            style={{ background: "#16213e", borderColor: "#0f3460" }}
          />
          <MiniMap
            nodeColor={(n) => (n.data?.color as string) ?? "#888"}
            maskColor="rgba(26,26,46,0.7)"
            style={{ background: "#16213e", borderColor: "#0f3460" }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
