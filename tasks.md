---
tags:
  - tasks
  - project
  - pi-atrium
aliases:
  - Pi Atrium Tasks
created: 2026-06-11
modified: 2026-06-11
status: active
---

# Pi Atrium — Tasks

## Status Legend
- [ ] Not started
- [x] Done
- [~] In progress
- [!] Blocked

## Phase: PRD Creation
- [x] PRD interview complete (2026-06-10)
- [x] PRD written (2026-06-10)
- [x] PRD approved (2026-06-11)
- [x] V2 Dashboard item added to roadmap (2026-06-11)

## Phase: Task Breakdown
- [x] Task breakdown created (this file)
- [x] All PRD features mapped to tasks
- [x] Architecture decisions documented as ADRs
- [ ] User reviews and approves task breakdown

## Phase: Design Concepts (3 single-page HTML concepts)
- [x] Concept 1 — **The Atrium** (3-pane: sidebar + chat + persistent file tree) — created `concept-1.html`
- [x] Concept 2 — **The Quorum** (workspaces + tabs + drawer for files/brain/skills) — created `concept-2.html`
- [x] Concept 3 — **The Focus** (compact agent pills + full-width chat + slide-out drawer) — created `concept-3.html`
- [x] Design system documented (`README.md` in concepts/ — colors, typography, effects)
- [x] **Chosen:** Concept 1 (3-pane) + tabbed right pane + middle pane file tabs — `concept-chosen.html`
- [x] Chosen concept has interactive tab switching, middle-pane file tabs, and session selection (JS)
- [x] Top-level README generated for GitHub
- [x] Git initialized, initial commit pushed to `blisk92/pi-atrium` (public)

## Phase: Clickable Prototype
- [x] Multi-page HTML/CSS/JS prototype built (lightweight "missing flows" pass)
- [x] All 10 features navigable (5 prototype pages + main concept)
  - [x] Main chat + file tabs (concept-chosen.html)
  - [x] Onboarding (onboarding.html)
  - [x] Team definition (team-new.html)
  - [x] Start/Stop team lifecycle (team-active.html)
  - [x] Per-agent brain + skills (concept-chosen right pane)
  - [x] Voice UI (voice.html)
  - [x] Knowledge base / vault (onboarding.html)
  - [x] Project source of truth (concept-chosen + team-new)
  - [x] Settings (settings.html)
  - [x] Concierge (concept-chosen + team-new)
- [x] User can complete core user story end-to-end (define team → start → talk to agent)
- [ ] User reviews and approves prototype

## Phase: Design System
- [ ] Tokens defined (colors, typography, spacing, motion)
- [ ] Core components documented (sidebar, chat pane, file tree, status pill, etc.)
- [ ] Voice UI states documented (recording, transcribing, speaking)
- [ ] Empty/loading/error states designed for each surface

## Phase: Build Waves

### Wave 0: Foundation
- [ ] BE-0001 — Electron app scaffold (main + preload + renderer)
- [ ] BE-0002 — Headless Pi sidecar wrapper (HTTP + SSE)
- [ ] FE-0001 — Renderer process + basic layout shell
- [ ] BE-0003 — Agent lifecycle manager (spawn, halt, restart)
- [ ] QA-0001 — Cold start + spawn time benchmarks

### Wave 1: Concierge + Single Session
- [ ] BE-0004 — Concierge sidecar spawn (persistent on app start)
- [ ] BE-0005 — Concierge auto-injected state baseline
- [ ] BE-0006 — `app_context()` skill implementation
- [ ] FE-0002 — Session picker (single session at first)
- [ ] FE-0003 — Chat pane (send/receive, SSE streaming)
- [ ] QA-0002 — First-token latency test

### Wave 2: Teams
- [ ] BE-0007 — Team definition (form + storage in vault)
- [ ] BE-0008 — Per-member sidecar spawn
- [ ] BE-0009 — pi-intercom initialization
- [ ] FE-0004 — Team form (new/edit)
- [ ] FE-0005 — Team state in sidebar (Draft/Active/Stopped)
- [ ] FE-0006 — Start/Halt team UI
- [ ] FE-0007 — Best-effort start with 1 retry
- [ ] QA-0003 — Multi-agent session test (3 agents, end-to-end)

### Wave 3: Per-Agent Brain
- [ ] BE-0010 — Brain folder structure creation (`_pi-agents/agents/<id>/brain/`)
- [ ] BE-0011 — `remember` / `recall` skills (5 memory types)
- [ ] BE-0012 — Auto session consolidation (episodic entries, profile updates)
- [ ] BE-0013 — Brain read/write permission enforcement
- [ ] FE-0008 — Brain viewer (in app, browse entries by type)
- [ ] QA-0004 — Brain persistence test across sessions

### Wave 4: Skills
- [ ] BE-0014 — Skill discovery from `~/.pi/agent/extensions/`
- [ ] BE-0015 — Skill filter at extension load (per-agent allow-list)
- [ ] BE-0016 — Custom skill paste/upload flow
- [ ] BE-0017 — `skill-manager` skill (queue + notify user)
- [ ] FE-0009 — Skill management UI (per agent)
- [ ] FE-0010 — Skill change approval dialog
- [ ] QA-0005 — Skill lifecycle test (add → approve → restart → active)

### Wave 5: Voice
- [ ] BE-0018 — voice-loop integration (reuse existing extension)
- [ ] BE-0019 — Push-to-talk hotkey handler (in-app)
- [ ] BE-0020 — Per-agent TTS toggle (state persisted)
- [ ] FE-0011 — Mic UI in chat pane (recording indicator)
- [ ] FE-0012 — Per-session TTS toggle in picker
- [ ] QA-0006 — Voice round-trip test (PTT → transcript → agent → TTS reply)

### Wave 6: File Tree
- [ ] BE-0021 — File system access via Electron IPC (contextBridge)
- [ ] BE-0022 — CWD resolution (per-team override with global default)
- [ ] FE-0013 — File tree pane (sidebar)
- [ ] FE-0014 — In-app preview (markdown, image, fallback to OS open)
- [ ] FE-0015 — Right-click menu (open in OS, reveal in folder, copy path)
- [ ] QA-0007 — File operations E2E test

### Wave 7: Projects (Vault as Source of Truth)
- [ ] BE-0023 — Project creation (Phase Gates default)
- [ ] BE-0024 — Project creation (schema-free override)
- [ ] BE-0025 — Concierge project-scaffolding skill (team-manager extension)
- [ ] BE-0026 — Vault write permission enforcement (Projects/ + _pi-agents/ write; rest read-only)
- [ ] QA-0008 — Project round-trip test (create → edit → archive)

### Wave 8: Knowledge Base
- [ ] BE-0027 — Vault auto-detection (read `~/.obsidian/obsidian.json` or scan)
- [ ] BE-0028 — Vault browse/create-new flow
- [ ] FE-0016 — KB linking UI (first-run + settings)
- [ ] QA-0009 — KB linking E2E test (link existing, create new, switch)

### Wave 9: Polish & Ship
- [ ] FE-0017 — Window state persistence
- [ ] FE-0018 — Settings UI
- [ ] FE-0019 — Crash recovery prompt ("Recover previous teams?")
- [ ] FE-0020 — "Skills active: N" status indicator
- [ ] BE-0027 — electron-builder config (portable `.zip`)
- [ ] QA-0010 — Full E2E test on clean Windows 10/11
- [ ] DOC-0001 — User guide (in vault)

## Phase: QA
- [ ] All waves pass acceptance criteria
- [ ] Performance targets met (cold start < 5s, spawn < 3s, memory < 4GB at 10 agents)
- [ ] Known bugs logged in `issues/`

## Phase: Deployment
- [ ] Portable `.zip` built and tested
- [ ] (Optional) `.msi` installer built
- [ ] User guide published

## Backlinks
- [[Pi Atrium PRD]] — full requirements
- [[Pi Atrium Board]] — Kanban dashboard
- [[01-Process-Model]] — process model ADR
- [[02-IPC-Mechanism]] — IPC ADR
- [[03-Persistence]] — persistence ADR
- [[04-Voice-Integration]] — voice ADR
- [[05-Distribution]] — distribution ADR
- [[06-Project-Naming]] — naming ADR
