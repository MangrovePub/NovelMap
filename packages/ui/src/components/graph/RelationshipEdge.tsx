import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "#e94560" : "#555",
          strokeWidth: selected ? 2 : 1.5,
          transition: "stroke 0.2s, stroke-width 0.2s",
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="px-2 py-0.5 rounded bg-[--color-bg-card]/90 border border-[--color-bg-accent] text-[10px] text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors cursor-default"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
