---
tags:
  - adr
  - pi-atrium
  - architecture
  - distribution
aliases:
  - ADR-06
created: 2026-06-11
modified: 2026-06-11
status: accepted
---

# ADR-06: Distribution — Electron, Portable .zip First

## Status

Accepted — 2026-06-10 (PRD interview)

## Context

How should the app be packaged and distributed? Options for a Windows desktop app:

- **Single .exe** — single self-contained binary
- **.msi installer** — Windows installer with Start Menu entry
- **Portable .zip** — extract-and-run, no install

## Decision

**Electron framework, portable `.zip` first, `.msi` later.**

- Electron because it matches Pi's Node/TS ecosystem (drop-in integration with `pi-agent`, `pi-intercom`, extensions)
- Portable `.zip` first because:
  - Single-user, local-only — no need for install ceremony
  - Easy to version-control and update
  - Can be added to Start Menu manually
- `.msi` later if user wants a more permanent installation

## Rationale

- Same Node/TS runtime as Pi → drop-in integration
- Single-file install via `electron-builder` → both formats easy
- Mature ecosystem; no Rust learning curve (Tauri alternative considered)
- Bigger binary (~150-200MB) — fine for a local dev tool

## Consequences

- Distribution channel: download `.zip`, extract, run
- Update flow: download new `.zip`, replace
- No auto-update mechanism in v1 (could add later via `electron-updater`)
- macOS/Linux support deferred to v2 (would require `.dmg` / `.AppImage`)
