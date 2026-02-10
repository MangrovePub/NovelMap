import { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export function IdeaNode({ data }: NodeProps) {
  const { label: initialLabel, color } = data as {
    label: string;
    color: string;
  };
  const [label, setLabel] = useState(initialLabel);
  const [editing, setEditing] = useState(false);

  return (
    <div
      className="px-4 py-2.5 rounded-xl shadow-lg min-w-[120px] text-center cursor-pointer"
      style={{
        background: `${color}22`,
        border: `2px solid ${color}`,
      }}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      {editing ? (
        <input
          className="bg-transparent text-[--color-text-primary] text-sm text-center outline-none w-full"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
          autoFocus
        />
      ) : (
        <span className="text-sm font-medium text-[--color-text-primary]">
          {label}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}
