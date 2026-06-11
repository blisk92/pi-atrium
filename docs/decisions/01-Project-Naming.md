---
tags:
  - adr
  - pi-atrium
  - naming
aliases:
  - ADR-01
created: 2026-06-11
modified: 2026-06-11
status: accepted
---

# ADR-01: Project Naming — "Pi Atrium"

## Status

Accepted — 2026-06-11

## Context

We needed a name for the new Windows desktop frontend for Pi Agent. Constraints:
- 1-3 words
- Easy to type and say
- No hyphens or underscores
- Hints at multi-agent collaboration or "team" concept
- Honors the Pi lineage (since it's a UI for Pi Agent)
- No collisions with existing dev tools

## Decision

**Project name: Pi Atrium.**

- **Pi** — explicit reference to Pi Agent, immediately recognizable to existing Pi users
- **Atrium** — architectural metaphor for a central open hall where multiple rooms/agents meet and gather before dispersing to work

## Alternatives considered

20 candidates fanned out via 4 parallel subagents (barney/frontend, ted/architect, tracy/PM, researcher/web research). Consensus picks: Atrium, Quorum, Loom, Atelier. User picked **Pi Atrium** after hearing TTS pronunciation of "Atelier" and "Pi Atrium".

## Consequences

- Folder name: `Projects/pi-atrium/`
- Code identifier: `pi-atrium` (kebab-case for package names) or `PiAtrium` (PascalCase for classes)
- Binary name: `Pi Atrium.exe` (display), `pi-atrium` (CLI)
- Domain-style name: "Pi Atrium" (product), "pi-atrium" (config files, process names)
- Audio pronunciation: "pie AY-tree-um"
