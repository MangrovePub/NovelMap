import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { studio, type StudioBook, type StudioUniverse, type WarRoomData } from "../../api/client.ts";

type StatusBadge = { label: string; color: string };

const STATUS_MAP: Record<string, Record<number, StatusBadge>> = {
  knox_ramsey: {
    1: { label: "Published",  color: "bg-emerald-800/60 text-emerald-300 border-emerald-700" },
    2: { label: "July 2026",  color: "bg-amber-800/60  text-amber-300  border-amber-700"  },
  },
};

const PLANNED: StatusBadge = { label: "Planned", color: "bg-[--color-bg-accent] text-[--color-text-muted] border-[--color-bg-accent]" };
const IN_PROGRESS: StatusBadge = { label: "In Progress", color: "bg-blue-800/60 text-blue-300 border-blue-700" };

function bookStatus(book: StudioBook): StatusBadge {
  const byBook = STATUS_MAP[book.series_key];
  if (byBook && book.book_number != null && byBook[book.book_number]) return byBook[book.book_number];
  if (book.word_count > 0) return IN_PROGRESS;
  return PLANNED;
}

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function ProgressBar({ value, max, color = "bg-[--color-accent]" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="relative h-1.5 rounded-full bg-[--color-bg-body] overflow-hidden">
      <motion.div
        className={`absolute inset-y-0 left-0 rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

function BookCard({ book }: { book: StudioBook }) {
  const status = bookStatus(book);
  const pct = book.word_target > 0 ? Math.min(100, Math.round((book.word_count / book.word_target) * 100)) : 0;
  const hasIssues = book.dev_edit_issues > 0;

  return (
    <div className="rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] p-4 flex flex-col gap-3 hover:border-[--color-accent]/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-sm font-semibold text-[--color-text-primary] leading-snug">
          {book.title}
        </h3>
        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>

      {book.word_count > 0 ? (
        <>
          <div className="flex items-center justify-between text-xs text-[--color-text-muted]">
            <span className="text-[--color-text-secondary] font-medium">{fmt(book.word_count)}w</span>
            <span>/ {fmt(book.word_target)}w target</span>
          </div>
          <ProgressBar value={book.word_count} max={book.word_target} />
          <div className="flex gap-4 text-[11px] text-[--color-text-muted]">
            <span>{book.chapter_count} ch</span>
            <span>{book.scene_count} sc</span>
            {hasIssues && (
              <span className="text-amber-400 ml-auto flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                {book.dev_edit_issues} issues
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="text-xs text-[--color-text-muted] italic">No content yet</div>
      )}
    </div>
  );
}

function UniverseSection({ universe, index }: { universe: StudioUniverse; index: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-serif text-base font-bold text-[--color-text-primary]">
          {universe.universe_name}
        </h2>
        <div className="flex gap-4 text-xs text-[--color-text-muted]">
          <span>{fmt(universe.total_words)}w</span>
          <span>{universe.total_chapters} ch</span>
          <span>{universe.total_scenes} sc</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {universe.books.map((book) => (
          <BookCard key={book.book_id} book={book} />
        ))}
      </div>
    </motion.section>
  );
}

function TotalBar({ data }: { data: WarRoomData }) {
  const { totals } = data;
  return (
    <div className="flex flex-wrap gap-6 px-5 py-3 rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] text-sm">
      {[
        { label: "Universes",  value: totals.universes },
        { label: "Books",      value: totals.books },
        { label: "Total Words",value: fmt(totals.words) },
        { label: "Chapters",   value: totals.chapters },
        { label: "Scenes",     value: totals.scenes },
      ].map(({ label, value }) => (
        <div key={label} className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-[--color-text-muted]">{label}</span>
          <span className="font-serif text-lg font-bold text-[--color-accent]">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function WarRoomView() {
  const { data, isLoading, isError } = useQuery<WarRoomData>({
    queryKey: ["war-room"],
    queryFn: () => studio.getWarRoom(),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[--color-text-muted]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[--color-accent] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading War Room…</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-[--color-text-muted]">
        <div className="text-center">
          <p className="text-[--color-accent] font-serif text-lg mb-2">Failed to load</p>
          <p className="text-sm">Could not reach the database. Check server logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-baseline justify-between"
      >
        <div>
          <h1 className="font-serif text-2xl font-bold text-[--color-text-primary]">War Room</h1>
          <p className="text-sm text-[--color-text-muted] mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </motion.div>

      {/* Totals bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
        <TotalBar data={data} />
      </motion.div>

      {/* Universe sections */}
      <div className="flex flex-col gap-8">
        {data.universes.map((universe, i) => (
          <UniverseSection key={universe.universe_key} universe={universe} index={i} />
        ))}
      </div>
    </div>
  );
}
