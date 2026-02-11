import { useState } from "react";
import { useNavigate } from "react-router";
import type { Manuscript } from "../../api/client.ts";
import { resolveCoverUrl } from "../../api/client.ts";
import { CoverDialog } from "../shared/CoverDialog.tsx";

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
  const [coverOpen, setCoverOpen] = useState(false);
  const gradient = titleToColor(manuscript.title);
  const coverUrl = resolveCoverUrl(manuscript.cover_url);

  return (
    <>
      <button
        onClick={() => navigate(`/manuscript/${manuscript.id}`)}
        className="group text-left bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl overflow-hidden hover:border-[--color-accent]/50 transition-colors relative"
      >
        {/* Cover */}
        {coverUrl ? (
          <div className="h-44 overflow-hidden relative">
            <img
              src={coverUrl}
              alt={`${manuscript.title} cover`}
              className="w-full h-full object-cover"
              style={{ objectPosition: "100% center" }}
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
              <h3 className="text-white font-semibold text-lg leading-tight drop-shadow-md">
                {manuscript.title}
              </h3>
            </div>
          </div>
        ) : (
          <div
            className={`h-44 bg-gradient-to-br ${gradient} flex items-end p-4`}
          >
            <h3 className="text-white font-semibold text-lg leading-tight drop-shadow-md">
              {manuscript.title}
            </h3>
          </div>
        )}

        {/* Series order badge */}
        {manuscript.series_order != null && (
          <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-[--color-accent] text-white text-xs font-bold flex items-center justify-center shadow-md z-10">
            {manuscript.series_order}
          </div>
        )}

        {/* Cover edit button (hover) */}
        <div
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setCoverOpen(true);
          }}
        >
          <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
          </div>
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

      {coverOpen && (
        <CoverDialog
          manuscriptId={manuscript.id}
          currentCoverUrl={manuscript.cover_url}
          onClose={() => setCoverOpen(false)}
        />
      )}
    </>
  );
}
