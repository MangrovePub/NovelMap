export function MindMapToolbar({
  onAddNode,
}: {
  onAddNode: (type: "plot" | "character" | "note") => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onAddNode("plot")}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[--color-bg-card] border border-[--color-bg-accent] text-[--color-text-secondary] hover:text-[--color-text-primary] hover:border-[#e94560]/50 transition-colors"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-[#e94560]" />
        Plot Thread
      </button>
      <button
        onClick={() => onAddNode("character")}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[--color-bg-card] border border-[--color-bg-accent] text-[--color-text-secondary] hover:text-[--color-text-primary] hover:border-[#4560e9]/50 transition-colors"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-[#4560e9]" />
        Character Arc
      </button>
      <button
        onClick={() => onAddNode("note")}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[--color-bg-card] border border-[--color-bg-accent] text-[--color-text-secondary] hover:text-[--color-text-primary] hover:border-[#e9a045]/50 transition-colors"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-[#e9a045]" />
        Note
      </button>
    </div>
  );
}
