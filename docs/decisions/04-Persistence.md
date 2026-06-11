---
tags:
  - adr
  - pi-atrium
  - architecture
  - persistence
aliases:
  - ADR-04
created: 2026-06-11
modified: 2026-06-11
status: accepted
---

# ADR-04: Persistence — Hybrid (Vault + Windows user-data folder)

## Status

Accepted — 2026-06-10 (PRD interview)

## Context

The app needs to store multiple kinds of state. Options:

- **a) Everything in the vault** — single source of truth
- **b) Hybrid** — user-facing in vault, UI internals in OS user-data folder
- **c) Everything in user-data folder** — fully decoupled

## Decision

**Pattern b) Hybrid.**

- **Vault** (single source of truth for user-facing state):
  - `_pi-agents/agents/<id>/` — per-agent config, brain, SYSTEM.md
  - `_pi-agents/teams/<id>/` — team definitions + per-member subfolders
  - `Projects/<name>/` — projects created by the team
- **Windows user-data folder** (`pi-atrium/`) — UI internals (window state, logs, cache)

## Rationale

- Vault stays the single source of truth for **what the team is** (teams, agents, KB) — visible, editable, version-controllable in Obsidian
- Windows user-data folder handles **OS concerns** (window position, cache, logs) that don't belong in the vault
- Cleanly maps to existing folder structure: `_agents/` for brains, `_pi-agents/` for the rest (user's locked choice, 2026-06-10)

## Consequences

- Two storage locations to know about
- Vault is the primary "save" target for user actions
- User-data folder is OS-managed; user can wipe it without losing teams/agents/brains
- Backups: vault backup = app data backup (mostly); user-data folder is regenerable
- Cross-platform: when v2 adds macOS/Linux, the user-data path changes per OS but the vault path is stable
