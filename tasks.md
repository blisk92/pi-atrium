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
- [x] Tokens defined (colors, typography, spacing, motion) → `design/system/tokens.md`
- [x] Core components documented (20 components) → `design/system/components.md`
- [x] Voice UI states documented (PTT, TTS, per-session toggle) → `design/system/voice-states.md`
- [x] Empty/loading/error/success/disabled state patterns → `design/system/states.md`
- [x] Live examples rendered → `design/system/examples.html`
- [x] Design system overview → `design/system/index.md`
- [x] Visual verification via Playwright screenshot (no JS errors, all components render)

## Phase: Build Waves

### Wave 0: Foundation — 4 vertical slices

Each slice is a complete end-to-end deliverable (UI + backend + measurement). Vertical not horizontal.

- [x] **Slice 0.1 — "Empty room"** ✅ — App boots, 3-pane shell renders with design system, cold start measured
  - [x] Electron scaffold (main + preload + renderer)
  - [x] Vue 3 + Vite + Pinia + TypeScript strict
  - [x] Design system tokens wired (CSS variables from `design/system/tokens.md`)
  - [x] 3-pane shell (sidebar / chat / right pane) with placeholder content
  - [x] Cold-start benchmark · **537ms** (target < 5s) 🎉
- [x] **Slice 0.2 — "First agent"** ✅ — Concierge sidecar spawns on app start, shows in sidebar
  - [x] Headless Pi sidecar (Node child process, HTTP + SSE, port 49152)
  - [x] SYSTEM.md concierge persona bundled with the app
  - [x] Main process: spawn concierge on app start, track PID + port, IPC bridge
  - [x] Pinia store: `useAppStore.concierge` with status (idle/starting/active/error)
  - [x] Sidebar shows concierge with live status dot + name + spawn benchmark
  - [x] Spawn benchmark · **2,287ms** (target < 3s) 🎉
  - [x] Preload exposes `window.piAtrium` API surface (concierge.get/send/onStateChange)
- [ ] **Slice 0.3 — "First message"** — User types, agent responds in chat pane
  - [ ] Chat pane UI (message list, input area, send button)
  - [ ] Main process: HTTP client to concierge (`POST /message`)
  - [ ] SSE listener for streamed response chunks
  - [ ] Pinia store: `useChatStore` with messages, streaming state, agent status
  - [ ] Middle pane tabs (chat pinned + dynamic file tabs)
  - [ ] First-token latency benchmark · target < 2s
- [ ] **Slice 0.4 — "Right pane"** — File tree + brain/skills/activity tabs
  - [ ] Right pane tab system (Files / Brain / Skills / Activity)
  - [ ] File tree component (mock data for now, real vault scan in Wave 6)
  - [ ] Brain / Skills / Activity tabs (placeholder content)
  - [ ] End-to-end smoke: spawn agent, send message, see response, switch tabs

### Wave 1: Concierge + Single Session — 3 vertical slices

Goal: user can talk to the concierge agent.

- [ ] **Slice 1.1 — "Concierge lives"** — Concierge sidecar spawns on app start, persists until app closes
  - [ ] Headless Pi sidecar (`src/headless-pi/`) that runs a Pi agent on a localhost port
  - [ ] SYSTEM.md concierge persona bundled with the app (in `resources/system/concierge.md`)
  - [ ] Main process: spawn concierge on `app.whenReady()`, track PID + port + URL
  - [ ] Concierge status in sidebar flips from `idle` → `starting` → `active` within 3s
  - [ ] Pinia store: `useConciergeStore` with status (idle/starting/active/error)
  - [ ] Spawn benchmark · target < 3s
- [ ] **Slice 1.2 — "First token"** — User types a message, concierge responds with a streamed answer
  - [ ] Chat input enabled; user message appears immediately in chat pane
  - [ ] Main process: HTTP client to concierge (`POST /message`)
  - [ ] SSE listener for streamed response chunks; append to message in real time
  - [ ] Pinia store: `useChatStore` with messages, streaming state, agent status
  - [ ] Tool calls rendered inline (e.g., `obsidian_retrieve` invocations)
  - [ ] First-token latency benchmark · target < 2s
- [ ] **Slice 1.3 — "Multiple sessions"** — User can spawn/select multiple single-agent sessions in the sidebar
  - [ ] Session picker shows all active sessions grouped by team (still 1 default team for now)
  - [ ] Session selection in sidebar drives chat pane
  - [ ] Per-session TTS toggle in sidebar (off by default)
  - [ ] Session-level `remember`/`recall` basics (no full brain yet — Wave 3)

### Wave 2: Teams — 3 vertical slices

Goal: user can launch a team of N agents that collaborate via pi-intercom.

- [ ] **Slice 2.1 — "Define team"** — User creates a team via form, saved to vault, shows in sidebar as Draft
  - [ ] Team form modal/page (name, description, CWD with "use default" toggle, members with role + initial task)
  - [ ] Team saved as `.md` file in `_pi-agents/teams/<id>/team.md` + per-member subfolder
  - [ ] Team shows in sidebar with `Draft` pill, expandable to show members
  - [ ] "Edit" + "Delete" actions on Draft teams
- [ ] **Slice 2.2 — "Team runs"** — User clicks Start, members spawn, status goes Draft → Active
  - [ ] Each member gets a headless Pi sidecar (one port per member, port range 49152+)
  - [ ] pi-intercom initialized between members
  - [ ] Status transitions Draft → Starting → Active (with per-member progress)
  - [ ] Best-effort: 1 auto-retry on transient spawn failure; failed members marked red
  - [ ] Spawn benchmark · per-member < 3s, full team (3 members) < 6s
- [ ] **Slice 2.3 — "Halt team"** — User clicks Halt, graceful shutdown with 10s brain-save window
  - [ ] SIGTERM sent to all member sidecars; they have 10s to save brain + exit
  - [ ] Force-quit option if they don't exit in time
  - [ ] Status transitions Active → Stopping → Stopped
  - [ ] E2E smoke: spawn 3 agents, send 1 message, halt, verify brain saved

### Wave 3: Per-Agent Brain — 3 vertical slices

Goal: agents remember things across sessions and grow as specialists.

- [ ] **Slice 3.1 — "Brain exists"** — Each agent has a structured brain folder on disk
  - [ ] Folder structure created on first sidecar spawn: `_pi-agents/agents/<id>/brain/{episodic,semantic,procedural,working}/`
  - [ ] `brain.md` index file with self-model (Profile) section
  - [ ] Brain tab in right pane shows the 5 sections with entry counts
  - [ ] Brain viewer can browse individual entries
- [ ] **Slice 3.2 — "Remember/recall"** — Agent can call remember/recall, entries appear in brain viewer
  - [ ] `remember(type, content)` skill — agent stores to correct section
  - [ ] `recall(type, query)` skill — agent retrieves relevant entries
  - [ ] Brain viewer live-updates when agent stores
  - [ ] E2E: "Remember that the user prefers Postgres" → next session, agent knows
- [ ] **Slice 3.3 — "Auto-consolidate"** — On session end, agent's brain is automatically updated
  - [ ] Episodic entry written (session summary, what happened)
  - [ ] Profile updated (specialty, strengths, weaknesses observed)
  - [ ] Semantic entries consolidated (deduplicated, merged where similar)
  - [ ] Persistence test: close + reopen, brain survives intact

### Wave 4: Skills — 3 vertical slices

Goal: agents can manage their own skill set (and the user can add custom skills).

- [ ] **Slice 4.1 — "Skills visible"** — Brain tab shows the agent's current skills; can toggle on/off
  - [ ] Skill discovery from `~/.pi/agent/extensions/`
  - [ ] Per-agent skill allow-list (in `config.json`)
  - [ ] Skills tab in right pane shows active/queued/disabled states
  - [ ] Toggle disables a skill (next agent restart picks up the change)
- [ ] **Slice 4.2 — "Add custom skill"** — User can paste or upload a custom skill
  - [ ] Paste form: textarea for code + name field
  - [ ] Upload form: file picker for `.ts` (extension) or `.md` (skill)
  - [ ] New skill saved to `~/.pi/agent/extensions/<name>.ts` (or skills dir)
  - [ ] Skill appears in agent's skill list (pending approval)
- [ ] **Slice 4.3 — "Self-extend"** — Agent calls `skill-manager`, queues change, user approves, agent restarts
  - [ ] `skill-manager` skill: agent can `add_skill(name, code)` and `remove_skill(name)`
  - [ ] Changes are queued (not auto-applied) — UI shows pending change
  - [ ] User approves → agent restarts with new skill set
  - [ ] User denies → change discarded
  - [ ] E2E: agent says "I need a `count_files` skill" → user approves → next message uses it

### Wave 5: Voice — 3 vertical slices

Goal: user can talk to agents via voice (PTT input + TTS output).

- [ ] **Slice 5.1 — "TTS on"** — User enables TTS for concierge, agent's response is spoken
  - [ ] voice-loop integration: TTS plays via MiniMax speech-2.8-hd (reuses existing extension)
  - [ ] Per-session TTS toggle (sidebar)
  - [ ] "Speaking" pill below agent's message with elapsed timer
  - [ ] User can interrupt (sends next message → TTS stops)
- [ ] **Slice 5.2 — "PTT works"** — User holds Ctrl+Space, records audio, gets transcribed message
  - [ ] PTT hotkey handler in main process
  - [ ] Recording indicator in chat pane (waveform + elapsed)
  - [ ] local Whisper transcription on release
  - [ ] Transcribed text appears as user message
  - [ ] Mic permission flow (first-use prompt)
- [ ] **Slice 5.3 — "Voice round-trip"** — PTT → concierge responds via voice → first-token < 2s
  - [ ] E2E: hold Ctrl+Space, speak "what's the weather", release, hear response
  - [ ] Latency benchmark for full voice round-trip
  - [ ] Error states: no mic, no permission, transcription failure (each with toast)

### Wave 6: File Tree — 3 vertical slices

Goal: user can see and interact with files (in the team's CWD) from the right pane.

- [ ] **Slice 6.1 — "Tree renders"** — File tree of team's CWD shows in right pane Files tab
  - [ ] File system access via Electron IPC (contextBridge for security)
  - [ ] Tree shows directories + files with appropriate icons
  - [ ] Per-team CWD resolution (from team config, fallback to global default)
  - [ ] Files outside the team's CWD are not visible
- [ ] **Slice 6.2 — "Click to preview"** — Clicking a file opens it in a middle-pane tab
  - [ ] Markdown files: rendered preview with syntax highlighting
  - [ ] Image files: image preview
  - [ ] Other files: "Open in OS" button (uses Electron's shell.openPath)
  - [ ] Each file tab has a close button
  - [ ] Re-clicking an open file just activates its tab
- [ ] **Slice 6.3 — "Right-click actions"** — Right-click on a file node shows OS-style menu
  - [ ] "Open in OS" (default app)
  - [ ] "Reveal in folder" (opens Explorer at the file's location)
  - [ ] "Copy path" (puts absolute path on clipboard)
  - [ ] "Copy relative path" (relative to team's CWD)

### Wave 7: Projects (Vault as Source of Truth) — 3 vertical slices

Goal: agents can create and manage projects in the vault following the Phase Gates schema.

- [ ] **Slice 7.1 — "Create Phase Gates project"** — Concierge creates a new project with the standard schema
  - [ ] Concierge calls `create_project(name, cwd)` skill
  - [ ] Project scaffolded: `PRD.md`, `tasks.md`, `board.md`, `notes/`
  - [ ] Project shows in the concierge's project list (right pane "Activity" tab)
  - [ ] E2E: "Create a project for the Q4 campaign" → concierge scaffolds it
- [ ] **Slice 7.2 — "Create schema-free project"** — Concierge creates a simple README-only project
  - [ ] `create_project(name, cwd, schema: "minimal")` creates just `README.md`
  - [ ] Used for ad-hoc / experimental work
  - [ ] E2E: concierge correctly picks schema based on user's intent
- [ ] **Slice 7.3 — "Vault write permissions"** — Agents can only write to allowed folders
  - [ ] Default allow-list: `Projects/`, `_pi-agents/`
  - [ ] Default deny: everything else
  - [ ] Per-agent override possible (advanced settings)
  - [ ] Attempt to write to denied folder → error logged, user notified
  - [ ] Security test: agent tries to write to `Wiki/personal-notes.md` → blocked

### Wave 8: Knowledge Base — 3 vertical slices

Goal: agent has access to the full vault as its knowledge base.

- [ ] **Slice 8.1 — "Link existing vault"** — First-run flow lets user point to an existing Obsidian vault
  - [ ] Onboarding dialog: link existing / create new / auto-detect
  - [ ] "Link existing" → folder picker; verify `.obsidian/` exists
  - [ ] Vault path stored in app settings
  - [ ] Concierge reads vault structure on first launch (Wiki + Projects scan)
- [ ] **Slice 8.2 — "Switch vault"** — Settings page lets user switch to a different vault
  - [ ] Vault picker in settings (lists recent Obsidian vaults from `~/.obsidian/obsidian.json`)
  - [ ] "Switch" → concierge re-indexes, agents reload their context
  - [ ] "Unlink" → agent has no vault, works in memory-only mode
- [ ] **Slice 8.3 — "Auto-detect"** — On install, scan for Obsidian vaults and offer to link
  - [ ] Scan common locations (`~/Documents`, `~/ObsidianVaults`, etc.)
  - [ ] Detect by presence of `.obsidian/` folder
  - [ ] "Found 2 vaults" prompt with options to link, skip, browse
  - [ ] Skip option for fully offline use

### Wave 9: Polish & Ship — 3 vertical slices

Goal: ship a portable `.zip` that works on a clean Windows 10/11 machine.

- [ ] **Slice 9.1 — "Settings + window state"** — Full settings UI + window persists position/size
  - [ ] Settings page: general / voice / model / network / vault / agents defaults / advanced
  - [ ] Window state persistence (size, position, maximized) via `electron-store`
  - [ ] On reopen, window restores to same size/position
  - [ ] Crash recovery prompt: "Recover previous teams?" if unclean exit detected
- [ ] **Slice 9.2 — "Status indicator + persona polish"** — Final UX polish
  - [ ] "Skills active: N" status indicator in topbar
  - [ ] Concierge persona refinement based on real usage
  - [ ] Empty states for every surface (no teams, no skills, no brain, etc.)
  - [ ] Error states covered (already documented in `design/system/states.md`)
- [ ] **Slice 9.3 — "Portable .zip"** — electron-builder config, builds a runnable `.zip`
  - [ ] `electron-builder.yml` config (portable target, x64)
  - [ ] `npm run package` produces `release/<version>/Pi Atrium-<version>-portable.exe`
  - [ ] Run on a clean Windows 10/11 VM, verify it boots, concierge spawns, chat works
  - [ ] E2E smoke from clean install: create team → start → chat → halt → brain saved

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
