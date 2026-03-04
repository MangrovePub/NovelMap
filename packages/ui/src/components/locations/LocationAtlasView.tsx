import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { studio, type StudioLocation } from "../../api/client.ts";
import { useProjectStore } from "../../stores/project-store.ts";

function LocationCard({
  loc,
  onClick,
  selected,
}: {
  loc: StudioLocation;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-4 flex flex-col gap-2 transition-colors ${
        selected
          ? "border-[--color-accent] bg-[--color-bg-accent]"
          : "border-[--color-bg-accent] bg-[--color-bg-card] hover:border-[--color-accent]/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-sm font-semibold text-[--color-text-primary] leading-snug">
          {loc.location}
        </h3>
        {loc.book_count > 1 && (
          <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full border bg-blue-800/60 text-blue-300 border-blue-700 font-medium">
            Cross-book
          </span>
        )}
      </div>
      <div className="flex gap-4 text-[11px] text-[--color-text-muted]">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          {loc.scene_count} {loc.scene_count === 1 ? "scene" : "scenes"}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
          {loc.book_count} {loc.book_count === 1 ? "book" : "books"}
        </span>
        {loc.character_count > 0 && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            {loc.character_count} chars
          </span>
        )}
      </div>
    </button>
  );
}

function LocationDetail({ location }: { location: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["location-detail", location],
    queryFn: () => studio.getLocation(location),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-[--color-text-muted]">
        <div className="w-5 h-5 border-2 border-[--color-accent] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const d = data as {
    location: string;
    scenes: { scene_id: string; subheader: string | null; preview: string; chapter_title: string; book_title: string; time_of_day: string | null; word_count: number }[];
    characters: { character_id: string; name: string; role: string | null; scene_count: number }[];
    books: { book_id: string; title: string; scene_count: number }[];
  } | undefined;

  if (!d) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-4"
    >
      <div>
        <h2 className="font-serif text-lg font-bold text-[--color-text-primary]">{d.location}</h2>
        <div className="flex gap-3 mt-1 text-xs text-[--color-text-muted]">
          {d.books.map((b) => (
            <span key={b.book_id}>{b.title} ({b.scene_count})</span>
          ))}
        </div>
      </div>

      {d.characters.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[--color-text-muted] font-semibold mb-2">Characters here</div>
          <div className="flex flex-wrap gap-2">
            {d.characters.map((c) => (
              <span key={c.character_id} className="text-[11px] px-2 py-0.5 rounded-full bg-[--color-bg-accent] text-[--color-text-secondary] border border-[--color-bg-accent]">
                {c.name} <span className="opacity-60">×{c.scene_count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-[10px] uppercase tracking-widest text-[--color-text-muted] font-semibold mb-2">Scenes ({d.scenes.length})</div>
        <div className="flex flex-col gap-2">
          {d.scenes.map((s) => (
            <div key={s.scene_id} className="rounded-lg border border-[--color-bg-accent] bg-[--color-bg-body] p-3">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-[--color-text-secondary]">
                  {s.subheader || s.chapter_title}
                </span>
                <span className="text-[10px] text-[--color-text-muted] shrink-0">{s.word_count}w</span>
              </div>
              <div className="flex gap-2 text-[10px] text-[--color-text-muted] mb-1.5">
                <span>{s.book_title}</span>
                {s.time_of_day && <span>· {s.time_of_day}</span>}
              </div>
              <p className="text-[11px] text-[--color-text-muted] leading-relaxed line-clamp-3">
                {s.preview}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function LocationAtlasView() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { activeBookId } = useProjectStore();

  const { data: locations, isLoading, isError } = useQuery<StudioLocation[]>({
    queryKey: ["studio-locations", activeBookId],
    queryFn: () => studio.listLocations(activeBookId ? { bookId: activeBookId } : {}),
    staleTime: 30_000,
  });

  const filtered = (locations ?? []).filter((l) =>
    l.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex gap-6 max-w-7xl mx-auto">
      {/* Left column — list */}
      <div className="flex flex-col gap-4 flex-1 min-w-0">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-baseline justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[--color-text-primary]">Location Atlas</h1>
            <p className="text-sm text-[--color-text-muted] mt-0.5">
              {locations ? `${locations.length} locations` : "Loading…"}
              {activeBookId ? " · filtered to active book" : " · all books"}
            </p>
          </div>
        </motion.div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search locations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[--color-bg-card] border border-[--color-bg-accent] rounded-lg text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
          />
        </div>

        {/* Grid */}
        {isLoading && (
          <div className="flex items-center justify-center h-48 text-[--color-text-muted]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[--color-accent] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading locations…</span>
            </div>
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center h-48 text-[--color-text-muted]">
            <p className="text-sm text-[--color-accent]">Failed to load locations.</p>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex items-center justify-center h-48 text-[--color-text-muted]">
            <p className="text-sm italic">No locations found.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((loc, i) => (
            <motion.div
              key={loc.location}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <LocationCard
                loc={loc}
                selected={selected === loc.location}
                onClick={() => setSelected(selected === loc.location ? null : loc.location)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right column — detail */}
      <AnimatePresence>
        {selected && (
          <motion.aside
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 360 }}
            exit={{ opacity: 0, width: 0 }}
            className="shrink-0 overflow-hidden"
          >
            <div className="w-[360px] rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] p-5 overflow-y-auto max-h-[calc(100vh-120px)] sticky top-0">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-widest text-[--color-text-muted] font-semibold">Location Detail</span>
                <button
                  onClick={() => setSelected(null)}
                  className="text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <LocationDetail location={selected} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
