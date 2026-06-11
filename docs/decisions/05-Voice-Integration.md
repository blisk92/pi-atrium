---
tags:
  - adr
  - pi-atrium
  - architecture
  - voice
aliases:
  - ADR-05
created: 2026-06-11
modified: 2026-06-11
status: accepted
---

# ADR-05: Voice Integration — Reuse `voice-loop`

## Status

Accepted — 2026-06-10 (PRD interview)

## Context

The app needs TTS/STT for the in-desktop voice UI. Options:

- **a) Reuse `voice-loop` extension** — TTS/STT calls proxy to the MiniMax TTS + Whisper stack that `voice-loop` already uses
- **b) New in-app voice pipeline** — TTS/STT live inside Electron, independent of `voice-loop`
- **c) Hybrid** — default to `voice-loop`; allow per-team voice config

## Decision

**Pattern a) Reuse `voice-loop`** for v1.

## Rationale

- `voice-loop` already works end-to-end (tested 2026-06-05)
- Single source of truth for voice — easier to maintain
- Voice triggers (`[voice]` suffix) work the same as in TUI
- Per-team voice customization (pattern c) can be layered on top later as a per-team config

## Consequences

- App inherits `voice-loop`'s dependencies (MiniMax Token Plan for TTS, local Whisper for STT)
- Voice quality and provider flexibility are limited to what `voice-loop` supports
- No need to write a new TTS/STT pipeline in Electron
- A future "per-team voice config" feature can route different teams to different voice providers via configuration in the team file
