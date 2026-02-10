import { useNavigate } from "react-router";
import type { Manuscript } from "../../api/client.ts";

// Generate a deterministic color from the manuscript title
function titleToColor(title: string): string {
  const colors = [
    "from-[#e94560] to-[#533483]",
    "from-[#0f3460] to-[#533483]",
    "from-[#e9a045] to-[#e94560]",
    "from-[#45e9a0] to-[#0f3460]",
    "from-[#4560e9] to-[#e94560]",
    "from-[#533483] to-[#e9a045]",
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

export function BookCard({
  manuscript,
  entityCount,
}: {
  manuscript: Manuscript;
  entityCount: number;
}) {
  const navigate = useNavigate();
  const gradient = titleToColor(manuscript.title);

  return (
    <button
      onClick={() => navigate(`/manuscript/${manuscript.id}`)}
      className="group text-left bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl overflow-hidden hover:border-[--color-accent]/50 transition-colors"
    >
      {/* Cover placeholder */}
      <div
        className={`h-44 bg-gradient-to-br ${gradient} flex items-end p-4`}
      >
        <h3 className="text-white font-semibold text-lg leading-tight drop-shadow-md">
          {manuscript.title}
        </h3>
      </div>

      {/* Details */}
      <div className="p-4">
        <p className="text-xs text-[--color-text-muted] mb-2">
          {new Date(manuscript.created_at).toLocaleDateString()}
        </p>
        <div className="flex items-center gap-3 text-xs text-[--color-text-secondary]">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            {entityCount} entities
          </span>
        </div>
      </div>
    </button>
  );
}
