# ADR 0001 — Tech Stack (Tentative)

## Status
Proposed (not finalized)

## Context
NovelMap is desktop-first and local-first. We want portability, contributor friendliness, and a straightforward path to SQLite.

## Options
1) Tauri + TypeScript UI + SQLite
2) Electron + TypeScript UI + SQLite

## Decision (Tentative)
Start with a TypeScript-first architecture and keep the UI shell flexible.
We will choose Tauri or Electron once MVP scope is validated.

## Consequences
- Data model and core APIs must be UI-agnostic.
- SQLite schema and core logic should live in a standalone package/module.
