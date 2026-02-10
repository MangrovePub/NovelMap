import { Handle, Position, type NodeProps } from "@xyflow/react";

export function EntityNode({ data }: NodeProps) {
  const { label, entityType, color } = data as {
    label: string;
    entityType: string;
    color: string;
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[--color-bg-card] border border-[--color-bg-accent] shadow-lg hover:border-[--color-accent]/50 transition-colors cursor-pointer">
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <div
        className="w-4 h-4 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <div>
        <div className="text-sm font-medium text-[--color-text-primary] leading-tight">
          {label}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-[--color-text-muted]">
          {entityType}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color }} />
    </div>
  );
}
