---
tags:
  - adr
  - pi-atrium
  - architecture
  - process-model
aliases:
  - ADR-02
created: 2026-06-11
modified: 2026-06-11
status: accepted
---

# ADR-02: Process Model — Sidecar per Agent

## Status

Accepted — 2026-06-10 (PRD interview)

## Context

Pi Agent is a Node-based CLI/TUI. To run N agents for a "team," three patterns were considered:

- **A. Sidecar per agent** — each agent is a separate Node child process running Pi
- **B. Embedded library** — Electron embeds Pi as a lib, spawns N contexts in one process
- **C. Worker threads** — hybrid: one main Node process + N worker_threads

## Decision

**Pattern A: Sidecar per agent.**

- Each agent = separate Node child process running Pi Agent
- Concierge also runs as a persistent sidecar (started on Electron app launch)
- Pi is invoked via a headless extension that exposes HTTP + SSE

## Rationale

- Zero changes to Pi core (uses existing CLI)
- Each agent gets a real `pi-intercom` session natively
- Memory cost is acceptable for default cap of 10 agents (~500MB-1GB total)
- When an agent crashes, only that one dies — the team survives
- Easy to scale down to 1 or up to 10 via the cap setting
- Matches Pi's existing design (no refactor required)

## Consequences

- Memory ceiling: 10 agents × ~100MB = ~1GB baseline + headroom = < 4GB target
- Need a headless Pi extension (small new code, in `pi-atrium/extensions/`)
- Need a process manager in the Electron main process (spawn, monitor, halt, restart)
- Failed agents don't take down the team (good)
- Failed agents need visible error state in the UI (so user knows)
