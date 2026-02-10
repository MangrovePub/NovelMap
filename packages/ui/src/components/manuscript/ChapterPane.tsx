import { useMemo } from "react";
import type { Entity, EntityType } from "../../api/client.ts";

const highlightColors: Record<EntityType, string> = {
  character: "rgba(233,69,96,0.2)",
  location: "rgba(15,52,96,0.3)",
  organization: "rgba(83,52,131,0.25)",
  artifact: "rgba(233,160,69,0.2)",
  concept: "rgba(69,233,160,0.15)",
  event: "rgba(69,96,233,0.2)",
};

const underlineColors: Record<EntityType, string> = {
  character: "#e94560",
  location: "#a0c4ff",
  organization: "#b088d0",
  artifact: "#e9a045",
  concept: "#45e9a0",
  event: "#4560e9",
};

interface ChapterPaneProps {
  title: string;
  body: string;
  entities?: Entity[];
  onEntityClick?: (entity: Entity) => void;
}

interface TextSegment {
  text: string;
  entity?: Entity;
}

function buildSegments(body: string, entities: Entity[]): TextSegment[] {
  if (!entities.length) return [{ text: body }];

  // Build a map of match positions
  const matches: { start: number; end: number; entity: Entity }[] = [];

  for (const entity of entities) {
    const names = [entity.name];
    const meta = entity.metadata as { aliases?: string[] };
    if (meta?.aliases) {
      names.push(...meta.aliases);
    }

    for (const name of names) {
      if (name.length < 2) continue;
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "gi");
      let match;
      while ((match = regex.exec(body)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length, entity });
      }
    }
  }

  if (!matches.length) return [{ text: body }];

  // Sort by position, longest match first for ties
  matches.sort((a, b) => a.start - b.start || b.end - a.end);

  // Remove overlaps
  const filtered: typeof matches = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  // Build segments
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const m of filtered) {
    if (m.start > cursor) {
      segments.push({ text: body.slice(cursor, m.start) });
    }
    segments.push({ text: body.slice(m.start, m.end), entity: m.entity });
    cursor = m.end;
  }
  if (cursor < body.length) {
    segments.push({ text: body.slice(cursor) });
  }

  return segments;
}

export function ChapterPane({ title, body, entities = [], onEntityClick }: ChapterPaneProps) {
  const segments = useMemo(
    () => buildSegments(body, entities),
    [body, entities]
  );

  return (
    <div className="flex-1 bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl p-6 overflow-auto">
      <h1 className="text-xl font-bold text-[--color-text-primary] mb-4">
        {title}
      </h1>
      <div className="text-sm leading-relaxed text-[--color-text-primary] whitespace-pre-wrap">
        {segments.map((seg, i) =>
          seg.entity ? (
            <span
              key={i}
              onClick={() => onEntityClick?.(seg.entity!)}
              title={`${seg.entity.name} (${seg.entity.type})`}
              className="cursor-pointer transition-colors hover:opacity-80"
              style={{
                backgroundColor: highlightColors[seg.entity.type],
                borderBottom: `2px solid ${underlineColors[seg.entity.type]}`,
                borderRadius: "2px",
                padding: "0 1px",
              }}
            >
              {seg.text}
            </span>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </div>
    </div>
  );
}
