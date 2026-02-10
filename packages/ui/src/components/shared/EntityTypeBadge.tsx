import type { EntityType } from "../../api/client.ts";

const typeColors: Record<EntityType, string> = {
  character: "bg-[#e94560]/20 border-[#e94560] text-[#e94560]",
  location: "bg-[#0f3460]/40 border-[#0f3460] text-[#a0c4ff]",
  organization: "bg-[#533483]/30 border-[#533483] text-[#b088d0]",
  artifact: "bg-[#e9a045]/20 border-[#e9a045] text-[#e9a045]",
  concept: "bg-[#45e9a0]/20 border-[#45e9a0] text-[#45e9a0]",
  event: "bg-[#4560e9]/20 border-[#4560e9] text-[#4560e9]",
};

export function EntityTypeBadge({ type }: { type: EntityType }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full border text-xs uppercase tracking-wider ${typeColors[type] ?? "bg-gray-500/20 border-gray-500 text-gray-400"}`}
    >
      {type}
    </span>
  );
}
