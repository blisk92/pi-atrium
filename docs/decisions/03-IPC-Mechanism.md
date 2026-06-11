---
tags:
  - adr
  - pi-atrium
  - architecture
  - ipc
aliases:
  - ADR-03
created: 2026-06-11
modified: 2026-06-11
status: accepted
---

# ADR-03: IPC Mechanism — HTTP + SSE

## Status

Accepted — 2026-06-10 (PRD interview)

## Context

With N sidecar Pi processes, the Electron app needs a way to send messages and receive streaming responses. Options:

- **A. HTTP + SSE** — each sidecar binds to a localhost port; streaming via Server-Sent Events
- **B. WebSocket** — each sidecar runs a ws server on a localhost port
- **C. stdio pipe** — spawn Pi with stdio; wrapper translates lines ↔ messages
- **D. Unix socket / named pipe** — OS-level socket

WebSocket was considered as a comparison (see chat log); HTTP + SSE was preferred for debuggability (`curl -N`) and one-way streaming fit.

## Decision

**Pattern A: HTTP + SSE**, with a small Pi "headless" extension exposing:

- `POST /message` — send user message
- `GET /events` — SSE stream of agent responses

Plus a system-prompt injection field in the spawn payload (so `SYSTEM.md` content gets pushed at startup).

## Rationale

- SSE is purpose-built for one-way streaming (assistant responses) — perfect fit
- HTTP is the lingua franca; trivially testable with `curl`
- Port allocation at spawn time is straightforward
- The headless extension is small and reusable
- File ops use a separate Electron IPC channel (`contextBridge`) for security

## Consequences

- Port range: 49152+ (IANA dynamic)
- Need port allocator in main process
- Need SSE parser in renderer (or proxy through main)
- Per-agent state (concierge, team members) has a stable URL the renderer can target
- WebSocket advantages (bi-directional, lower overhead) are not needed for this use case
