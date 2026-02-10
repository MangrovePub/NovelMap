# ADR 0002 — Core Data Model

## Status
Accepted (Core Concept)

## Decision
NovelMap is built on three primitives:
1) Entities (typed things)
2) Relationships (typed edges)
3) Appearances (entity <-> manuscript anchors)

Manuscripts provide structure (chapters/scenes), but the story graph is the source of truth for exploration.

## Minimum Tables (Conceptual)
- project
- manuscript
- chapter (and/or scene)
- entity
- appearance
- relationship

## Notes
- "Appearances" are the glue that enables Field Guide, timelines, and continuity analysis.
- Relationships should be typed, directional, and metadata-friendly.
