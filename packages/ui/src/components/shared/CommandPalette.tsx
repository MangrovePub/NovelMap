import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useProjectStore } from "../../stores/project-store.ts";
import { useEntities } from "../../hooks/use-entities.ts";
import { ENTITY_TYPE_COLORS } from "./EntityTypeIcon.tsx";
import type { EntityType } from "../../api/client.ts";

interface CommandItem {
  id: string;
  label: string;
  section: string;
  action: () => void;
  icon?: string;
  color?: string;
}

const NAV_COMMANDS: { to: string; label: string }[] = [
  { to: "/bookshelf", label: "Bookshelf" },
  { to: "/graph", label: "Graph" },
  { to: "/entities", label: "Entities" },
  { to: "/crossbook", label: "Cross-Book" },
  { to: "/insights", label: "Insights" },
  { to: "/fieldguide", label: "Field Guide" },
  { to: "/timeline", label: "Timeline" },
  { to: "/mindmap", label: "Mind Map" },
  { to: "/plot", label: "Plot" },
  { to: "/snapshots", label: "Snapshots" },
  { to: "/plugins", label: "Plugins" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const projectId = useProjectStore((s) => s.activeProjectId);
  const { data: entities } = useEntities(projectId);

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const runAndClose = useCallback(
    (action: () => void) => {
      action();
      setOpen(false);
    },
    []
  );

  // Build commands list
  const commands: CommandItem[] = [];

  // Navigation commands
  for (const nav of NAV_COMMANDS) {
    commands.push({
      id: `nav:${nav.to}`,
      label: nav.label,
      section: "Navigate",
      action: () => runAndClose(() => navigate(nav.to)),
    });
  }

  // Entity commands (search entities)
  if (entities) {
    for (const entity of entities) {
      commands.push({
        id: `entity:${entity.id}`,
        label: entity.name,
        section: "Entities",
        color: ENTITY_TYPE_COLORS[entity.type as EntityType],
        action: () => runAndClose(() => navigate("/entities")),
      });
    }
  }

  // Filter by query
  const q = query.toLowerCase().trim();
  const filtered = q
    ? commands.filter((c) => c.label.toLowerCase().includes(q))
    : commands.filter((c) => c.section === "Navigate"); // show nav only when no query

  // Keep selected index in bounds
  const clamped = Math.min(selectedIndex, filtered.length - 1);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[clamped]) {
      e.preventDefault();
      filtered[clamped].action();
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[clamped] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [clamped]);

  // Group filtered items by section
  const sections = new Map<string, CommandItem[]>();
  for (const item of filtered) {
    const list = sections.get(item.section) ?? [];
    list.push(item);
    sections.set(item.section, list);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="w-full max-w-lg bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[--color-bg-accent]">
              <svg className="w-5 h-5 text-[--color-text-muted] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search views, entities..."
                className="flex-1 bg-transparent text-[--color-text-primary] text-sm placeholder:text-[--color-text-muted] focus:outline-none"
              />
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[--color-text-muted] bg-[--color-bg-body] border border-[--color-bg-accent] rounded">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-sm text-[--color-text-muted] text-center">
                  No results for "{query}"
                </div>
              ) : (
                Array.from(sections.entries()).map(([section, items]) => {
                  let globalIdx = 0;
                  for (const [s, list] of sections) {
                    if (s === section) break;
                    globalIdx += list.length;
                  }
                  return (
                    <div key={section}>
                      <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[--color-text-muted]">
                        {section}
                      </div>
                      {items.map((item, i) => {
                        const idx = globalIdx + i;
                        return (
                          <button
                            key={item.id}
                            onClick={item.action}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                              idx === clamped
                                ? "bg-[--color-bg-accent] text-[--color-text-primary]"
                                : "text-[--color-text-secondary] hover:bg-[--color-bg-body]"
                            }`}
                            onMouseEnter={() => setSelectedIndex(idx)}
                          >
                            {item.color && (
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                            )}
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-[--color-bg-accent] flex items-center gap-4 text-[10px] text-[--color-text-muted]">
              <span><kbd className="px-1 py-0.5 bg-[--color-bg-body] border border-[--color-bg-accent] rounded font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="px-1 py-0.5 bg-[--color-bg-body] border border-[--color-bg-accent] rounded font-mono">↵</kbd> select</span>
              <span><kbd className="px-1 py-0.5 bg-[--color-bg-body] border border-[--color-bg-accent] rounded font-mono">esc</kbd> close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
