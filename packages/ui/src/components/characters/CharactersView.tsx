import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { studio, type StudioCharacter } from "../../api/client.ts";
import { useProjectStore } from "../../stores/project-store.ts";

const ROLES = ["protagonist", "deuteragonist", "antagonist", "supporting", "minor", "mentioned"];

const ROLE_COLORS: Record<string, string> = {
  protagonist:    "bg-emerald-800/60 text-emerald-300 border-emerald-700",
  deuteragonist:  "bg-blue-800/60 text-blue-300 border-blue-700",
  antagonist:     "bg-red-800/60 text-red-300 border-red-700",
  supporting:     "bg-amber-800/60 text-amber-300 border-amber-700",
  minor:          "bg-[--color-bg-accent] text-[--color-text-muted] border-[--color-bg-accent]",
  mentioned:      "bg-[--color-bg-accent] text-[--color-text-muted] border-[--color-bg-accent]",
};

function roleBadge(role: string | null) {
  if (!role) return null;
  const color = ROLE_COLORS[role] ?? ROLE_COLORS.minor;
  const label = role.charAt(0).toUpperCase() + role.slice(1);
  return (
    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium ${color}`}>
      {label}
    </span>
  );
}

// ── New / Edit Character modal ─────────────────────────────────────────────────
function CharacterModal({
  bookId,
  character,
  onClose,
}: {
  bookId: string;
  character?: StudioCharacter;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(character?.name ?? "");
  const [role, setRole] = useState(character?.role ?? "");
  const [notes, setNotes] = useState(character?.notes ?? "");
  const [isSeries, setIsSeries] = useState(character?.is_series_regular ?? false);

  const create = useMutation({
    mutationFn: () => studio.createCharacter(bookId, { name, role: role || undefined, notes: notes || undefined, is_series_regular: isSeries }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["studio-characters"] }); onClose(); },
  });

  const update = useMutation({
    mutationFn: () => studio.updateCharacter(character!.character_id, { name, role: role || undefined, notes: notes || undefined, is_series_regular: isSeries }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["studio-characters"] }); onClose(); },
  });

  const save = () => character ? update.mutate() : create.mutate();
  const isPending = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-96 rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] p-6 flex flex-col gap-4"
      >
        <h2 className="font-serif text-base font-bold text-[--color-text-primary]">
          {character ? "Edit Character" : "New Character"}
        </h2>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[--color-text-muted] font-semibold block mb-1">Name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Character name"
              className="w-full px-3 py-2 bg-[--color-bg-body] border border-[--color-bg-accent] rounded-lg text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-[--color-text-muted] font-semibold block mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 bg-[--color-bg-body] border border-[--color-bg-accent] rounded-lg text-sm text-[--color-text-primary] focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
            >
              <option value="">— no role —</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-[--color-text-muted] font-semibold block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-[--color-bg-body] border border-[--color-bg-accent] rounded-lg text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-accent] resize-none"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isSeries}
              onChange={(e) => setIsSeries(e.target.checked)}
              className="accent-[--color-accent] w-3.5 h-3.5"
            />
            <span className="text-sm text-[--color-text-secondary]">Series regular (appears across books)</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors">Cancel</button>
          <button
            onClick={save}
            disabled={!name.trim() || isPending}
            className="px-4 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? "Saving…" : character ? "Save" : "Create"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CharacterCard({
  char,
  selected,
  onClick,
  onEdit,
}: {
  char: StudioCharacter;
  selected: boolean;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group text-left rounded-xl border p-4 flex flex-col gap-2 transition-colors ${
        selected
          ? "border-[--color-accent] bg-[--color-bg-accent]"
          : "border-[--color-bg-accent] bg-[--color-bg-card] hover:border-[--color-accent]/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-sm font-semibold text-[--color-text-primary] leading-snug">
          {char.name}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {roleBadge(char.role)}
          <button
            onClick={onEdit}
            title="Edit character"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[--color-text-muted] hover:text-[--color-text-primary]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex gap-4 text-[11px] text-[--color-text-muted]">
        <span>{char.scene_count} {char.scene_count === 1 ? "scene" : "scenes"}</span>
        {char.book_count > 1 && (
          <span className="text-blue-400">{char.book_count} books</span>
        )}
        {char.book_count === 1 && <span>1 book</span>}
        {char.is_series_regular && (
          <span className="text-[--color-accent]">series</span>
        )}
      </div>
    </button>
  );
}

function CharacterDetail({ characterId }: { characterId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["character-dossier", characterId],
    queryFn: () => studio.getCharacterDossier(characterId),
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
    character: { character_id: string; name: string; role: string | null; notes: string | null; universe_key: string; book_id: string | null };
    appearances: { scene_id: string; subheader: string | null; preview: string; chapter_title: string; book_title: string; location: string | null; word_count: number }[];
    locations: { location: string; book_title: string; scene_count: number }[];
    books: { book_id: string; title: string; book_number: number | null; scene_count: number }[];
  } | undefined;

  if (!d) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-4"
    >
      <div>
        <h2 className="font-serif text-lg font-bold text-[--color-text-primary]">{d.character.name}</h2>
        <div className="flex gap-2 mt-1 flex-wrap">
          {roleBadge(d.character.role)}
          {d.books.map((b) => (
            <span key={b.book_id} className="text-[11px] px-2 py-0.5 rounded-full bg-[--color-bg-accent] text-[--color-text-muted] border border-[--color-bg-accent]">
              {b.title} ({b.scene_count})
            </span>
          ))}
        </div>
        {d.character.notes && (
          <p className="mt-2 text-xs text-[--color-text-muted] leading-relaxed">{d.character.notes}</p>
        )}
      </div>

      {d.locations.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[--color-text-muted] font-semibold mb-2">Locations</div>
          <div className="flex flex-wrap gap-2">
            {d.locations.map((l, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-[--color-bg-accent] text-[--color-text-secondary] border border-[--color-bg-accent]">
                {l.location} <span className="opacity-60">×{l.scene_count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-[10px] uppercase tracking-widest text-[--color-text-muted] font-semibold mb-2">
          Appearances ({d.appearances.length})
        </div>
        <div className="flex flex-col gap-2">
          {d.appearances.map((s) => (
            <div key={s.scene_id} className="rounded-lg border border-[--color-bg-accent] bg-[--color-bg-body] p-3">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-[--color-text-secondary]">
                  {s.subheader || s.chapter_title}
                </span>
                <span className="text-[10px] text-[--color-text-muted] shrink-0">{s.word_count}w</span>
              </div>
              <div className="flex gap-2 text-[10px] text-[--color-text-muted] mb-1.5">
                <span>{s.book_title}</span>
                {s.location && <span>· {s.location}</span>}
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

export function CharactersView() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<StudioCharacter | null | "new">(null);
  const { activeBookId } = useProjectStore();

  const { data: characters, isLoading, isError } = useQuery<StudioCharacter[]>({
    queryKey: ["studio-characters", activeBookId],
    queryFn: () => studio.listCharacters(activeBookId ? { bookId: activeBookId } : {}),
    staleTime: 30_000,
  });

  const allRoles = ["all", ...ROLES];

  const filtered = (characters ?? []).filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || c.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="flex gap-6 max-w-7xl mx-auto">
      {/* Left column */}
      <div className="flex flex-col gap-4 flex-1 min-w-0">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-baseline justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[--color-text-primary]">Characters</h1>
            <p className="text-sm text-[--color-text-muted] mt-0.5">
              {characters ? `${characters.length} characters` : "Loading…"}
              {activeBookId ? " · filtered to active book" : " · all books"}
            </p>
          </div>
          {activeBookId && (
            <button
              onClick={() => setEditTarget("new")}
              className="flex items-center gap-2 px-3 py-1.5 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Character
            </button>
          )}
        </motion.div>

        {/* Search + role filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Search characters…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[--color-bg-card] border border-[--color-bg-accent] rounded-lg text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[--color-bg-card] text-[--color-text-primary] border border-[--color-bg-accent] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
          >
            {allRoles.map((r) => (
              <option key={r} value={r}>{r === "all" ? "All roles" : r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* States */}
        {isLoading && (
          <div className="flex items-center justify-center h-48 text-[--color-text-muted]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[--color-accent] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading characters…</span>
            </div>
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-red-400">Failed to load characters.</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 h-48 text-[--color-text-muted]">
            <p className="text-sm italic">
              {characters?.length === 0 ? "No characters yet." : "No characters match your search."}
            </p>
            {characters?.length === 0 && activeBookId && (
              <button
                onClick={() => setEditTarget("new")}
                className="px-4 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Add First Character
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((char, i) => (
            <motion.div
              key={char.character_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <CharacterCard
                char={char}
                selected={selected === char.character_id}
                onClick={() => setSelected(selected === char.character_id ? null : char.character_id)}
                onEdit={(e) => { e.stopPropagation(); setEditTarget(char); }}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right column — dossier */}
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
                <span className="text-[10px] uppercase tracking-widest text-[--color-text-muted] font-semibold">Dossier</span>
                <button
                  onClick={() => setSelected(null)}
                  className="text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <CharacterDetail characterId={selected} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Create / edit modal */}
      <AnimatePresence>
        {editTarget !== null && activeBookId && (
          <CharacterModal
            bookId={activeBookId}
            character={editTarget === "new" ? undefined : editTarget}
            onClose={() => setEditTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
