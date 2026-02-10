import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { IdeaNode } from "./IdeaNode.tsx";
import { MindMapToolbar } from "./MindMapToolbar.tsx";

const nodeTypes = { idea: IdeaNode };

let nextId = 1;

function createNode(
  label: string,
  color: string,
  x: number,
  y: number
): Node {
  return {
    id: `mind-${nextId++}`,
    type: "idea",
    position: { x, y },
    data: { label, color },
  };
}

const defaultNodes: Node[] = [
  createNode("Central Idea", "#e94560", 400, 300),
];

export function MindMapView() {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...params, style: { stroke: "#555" }, animated: true },
          eds
        )
      ),
    [setEdges]
  );

  const addNode = useCallback(
    (type: "plot" | "character" | "note") => {
      const colors = {
        plot: "#e94560",
        character: "#4560e9",
        note: "#e9a045",
      };
      const labels = {
        plot: "Plot Thread",
        character: "Character Arc",
        note: "Note",
      };
      const node = createNode(
        labels[type],
        colors[type],
        200 + Math.random() * 600,
        100 + Math.random() * 400
      );
      setNodes((nds) => [...nds, node]);
    },
    [setNodes]
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[--color-text-primary]">
          Mind Map
        </h1>
        <MindMapToolbar onAddNode={addNode} />
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-[--color-bg-accent]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ background: "#1a1a2e" }}
        >
          <Background color="#0f3460" gap={24} />
          <Controls
            style={{ background: "#16213e", borderColor: "#0f3460" }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
