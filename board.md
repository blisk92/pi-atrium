---
tags:
  - board
  - project
  - pi-atrium
  - kanban
aliases:
  - Pi Atrium Board
created: 2026-06-11
modified: 2026-06-11
status: active
---

# Pi Atrium — Board

Kanban dashboard. Drag cards between lanes as work progresses. WIP limits recommended per lane.

See [[Pi Atrium Tasks]] for the full task list and [[Pi Atrium PRD]] for requirements.

---

## Backlog

*(Not yet started — tasks from Wave 1+ appear here once Wave 0 is in progress)*

- Wave 1: Concierge + Single Session
- Wave 2: Teams
- Wave 3: Per-Agent Brain
- Wave 4: Skills
- Wave 5: Voice
- Wave 6: File Tree
- Wave 7: Projects
- Wave 8: Knowledge Base
- Wave 9: Polish & Ship

## In Progress

*(Currently being worked on — keep this lane small)*

- **Phase: Design Concepts** — `concept-chosen.html` (Concept 1 + tabbed right pane) is the starting point for Clickable Prototype

## Review / QA

*(Fix applied, waiting for re-verification)*

- *(none)*

## Done

*(Verified and closed)*

- [x] **Phase: PRD Creation** — PRD written, approved, V2 dashboard added (2026-06-10 → 2026-06-11)
- [x] **Phase: Task Breakdown** — tasks.md created, ADRs drafted, subfolders set up (2026-06-11)

---

## Wave 0: Foundation (current target wave)

| Task | Status | Notes |
|---|---|---|
| BE-0001 — Electron app scaffold (main + preload + renderer) | [ ] | |
| BE-0002 — Headless Pi sidecar wrapper (HTTP + SSE) | [ ] | |
| FE-0001 — Renderer process + basic layout shell | [ ] | |
| BE-0003 — Agent lifecycle manager (spawn, halt, restart) | [ ] | |
| QA-0001 — Cold start + spawn time benchmarks | [ ] | |

---

## Lane reference

| Lane | Purpose | WIP limit |
|---|---|---|
| **Backlog** | All planned tasks, not yet started | (none) |
| **In Progress** | Currently being worked on | 3-5 tasks |
| **Review / QA** | Fix applied, waiting for re-verification | 5-10 tasks |
| **Done** | Verified and closed | (none) |
