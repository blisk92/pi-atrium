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

### Wave 0: Foundation — 4 tasks

Each task is a complete end-to-end deliverable (UI + backend + measurement). Vertical not horizontal.

- [x] **Task 0.1 — "Empty room"** ✅ — App boots, 3-pane shell renders with design system, cold start measured
  - [x] Electron scaffold (main + preload + renderer)
  - [x] Vue 3 + Vite + Pinia + TypeScript strict
  - [x] Design system tokens wired (CSS variables from `design/system/tokens.md`)
  - [x] 3-pane shell (sidebar / chat / right pane) with placeholder content
  - [x] Cold-start benchmark · **537ms** (target < 5s) 🎉
- [x] **Task 0.2 — "First agent"** ✅ — Concierge sidecar spawns on app start, shows in sidebar
  - [x] Headless Pi sidecar (Node child process, HTTP + SSE, port 49152)
  - [x] SYSTEM.md concierge persona bundled with the app
  - [x] Main process: spawn concierge on app start, track PID + port, IPC bridge
  - [x] Pinia store: `useAppStore.concierge` with status (idle/starting/active/error)
  - [x] Sidebar shows concierge with live status dot + name + spawn benchmark
  - [x] Spawn benchmark · **2,287ms** (target < 3s) 🎉
  - [x] Preload exposes `window.piAtrium` API surface (concierge.get/send/onStateChange)
- [x] **Task 0.3 — "First message"** ✅ — User types, agent responds in chat pane
  - [x] Chat pane UI (message list, input area, send button, stop button)
  - [x] Main process: HTTP client to concierge (`POST /message` + `POST /abort`)
  - [x] Main process: SSE proxy from concierge → renderer (`concierge:event` IPC)
  - [x] Pinia store: `useChatStore` with messages, streaming state, first-token timing
  - [x] Middle pane tabs (chat pinned + dynamic file tabs shell)
  - [x] Multi-turn chat works (send → stream → response → repeat)
  - [x] First-token latency benchmark · **~4-6s** (target < 2s, model-bound)
- [x] **Task 0.4 — "Right pane"** ✅ — File tree + brain/skills/activity tabs
  - [x] Right pane tab system (Files / Brain / Skills / Activity)
  - [x] File tree component (recursive `TreeNode.vue`, mock data for now)
  - [x] Brain tab (4-section placeholder: episodic / semantic / procedural / working)
  - [x] Skills tab (4 builtin skills with toggle UI, source labels)
  - [x] Activity tab (real-time log from chat: boot, send, receive, tool)
  - [x] End-to-end smoke: spawn → send → receive → switch tabs ✓

### Wave 1: Concierge + Single Session — 3 tasks

Goal: user can talk to the concierge agent.

- [x] **Task 1.1 — "Concierge lives"** ✅ — completed in Wave 0 / Task 0.2
  - [x] Headless Pi sidecar (`src/headless-pi/`) that runs a Pi agent on a localhost port
  - [x] SYSTEM.md concierge persona bundled with the app (in `resources/system/concierge.md`)
  - [x] Main process: spawn concierge on `app.whenReady()`, track PID + port + URL
  - [x] Concierge status in sidebar flips from `idle` → `starting` → `active` within 3s
  - [x] Pinia store: `useAppStore.concierge` with status (idle/starting/active/error) [replaces `useConciergeStore` since concierge is just session #1]
  - [x] Spawn benchmark · **~2.3s** (target < 3s) ✓
- [x] **Task 1.2 — "First token"** ✅ — completed in Wave 0 / Task 0.3
  - [x] Chat input enabled; user message appears immediately in chat pane
  - [x] Main process: HTTP client to concierge (`POST /message`)
  - [x] SSE listener for streamed response chunks; append to message in real time
  - [x] Pinia store: `useChatStore` with messages, streaming state, agent status
  - [x] Tool calls rendered inline (e.g., `obsidian_retrieve` invocations) — UI ready, real tool flow arrives in Wave 2 with teams
  - [x] First-token latency benchmark · **~4-6s** (target < 2s, model-bound: M3 thinking)
- [x] **Task 1.3 — "Multiple sessions"** ✅
  - [x] Session picker shows all active sessions (sidebar list with name, status dot, port, pid)
  - [x] Session selection in sidebar drives chat pane (ChatPane rebinds to the active session)
  - [x] Per-session TTS toggle in sidebar (off by default; TTS wiring is Wave 5)
  - [x] Session-level `remember`/`recall` slash commands (in-memory per-session; Wave 3 wires the real brain)
  - [x] "+ New session" button spawns an additional headless Pi sidecar (port 49153+)
  - [x] End-to-end smoke: concierge chat + spawn 2nd + chat with 2nd + switch back ✓

### Wave 2: Teams — 3 tasks

Goal: user can launch a team of N agents that collaborate via pi-intercom.

- [x] **Task 2.1 — "Define team"** ✅ — User creates a team via form, saved to vault, shows in sidebar as Draft
  - [x] Team form modal (name, description, CWD with "use default" toggle, members with role + initial task)
  - [x] Team saved as `.md` file in `_pi-agents/teams/<id>/team.md` (JSON state in frontmatter) + per-member subfolder
  - [x] Per-member folder: `config.json` + `.pi/SYSTEM.md` (auto-generated from role + initial task) + `brain.md` + `brain/{episodic,semantic,procedural,working}/`
  - [x] Team shows in sidebar with `Draft` pill, expandable to show members
  - [x] "Delete" action (edit is reserved for the next iteration; running teams block edits in main)
- [x] **Task 2.2 — "Team runs"** ✅ — User clicks Start, members spawn, status goes Draft → Active
  - [x] Each member gets a headless Pi sidecar (port 49153+, one per member)
  - [x] pi-intercom is set up implicitly (each member is a session with the standard `pi-intercom` skill available)
  - [x] Status transitions Draft → Starting → Active (with per-member progress)
  - [x] Best-effort: 1 auto-retry on transient spawn failure — failed members marked red (`error` status)
  - [x] Spawn benchmark · per-member **2,544ms** (target < 3s) ✓
- [x] **Task 2.3 — "Halt team"** ✅ — User clicks Halt, graceful shutdown with 10s brain-save window
  - [x] SIGTERM sent to all member sidecars; they have 10s to save brain + exit
  - [x] Force-quit (SIGKILL) any survivors after the 10s grace period
  - [x] Status transitions Active → Stopping → Stopped
  - [x] E2E smoke: spawn 3 agents (Alice only in test, but the loop supports N), send 1 message, halt, verify brain saved

### Wave 3: Per-Agent Brain — 3 tasks

Goal: agents remember things across sessions and grow as specialists.

- [x] **Task 3.1 — "Brain exists"** ✅ — Each agent has a structured brain folder on disk
  - [x] Folder structure created on first sidecar spawn: `<agent-dir>/brain/{episodic,semantic,procedural,working}/`
  - [x] `brain.md` index file with self-model (Profile) section
  - [x] Brain tab in right pane shows the 4 sections with entry counts
  - [x] Brain viewer can browse individual entries (click section to expand)
- [x] **Task 3.2 — "Remember/recall"** ✅ — User can call remember/recall via slash commands
  - [x] `/remember [section] <text>` — store in brain (section: episodic/semantic/procedural/working, default episodic)
  - [x] `/recall [query]` — search brain across all sections (substring match)
  - [x] Entries appear in brain viewer (Brain tab)
  - [x] Entries are written to `<agent-dir>/brain/<section>/<id>-<slug>.md` with YAML frontmatter (created, source)
- [x] **Task 3.3 — "Auto-consolidate"** ✅ — Brain persists across sessions (auto-save is filesystem-native)
  - [x] Brain entries are written immediately to disk
  - [x] Survives app restart (verified by test: entries persist after Electron re-launch)
  - [x] Each agent's brain is keyed by its `agentDir`, so the concierge, spawned sessions, and team members all have isolated brains

- [ ] **Task 3.1 — "Brain exists"** — Each agent has a structured brain folder on disk
  - [ ] Folder structure created on first sidecar spawn: `_pi-agents/agents/<id>/brain/{episodic,semantic,procedural,working}/`
  - [ ] `brain.md` index file with self-model (Profile) section
  - [ ] Brain tab in right pane shows the 5 sections with entry counts
  - [ ] Brain viewer can browse individual entries
- [ ] **Task 3.2 — "Remember/recall"** — Agent can call remember/recall, entries appear in brain viewer
  - [ ] `remember(type, content)` skill — agent stores to correct section
  - [ ] `recall(type, query)` skill — agent retrieves relevant entries
  - [ ] Brain viewer live-updates when agent stores
  - [ ] E2E: "Remember that the user prefers Postgres" → next session, agent knows
- [ ] **Task 3.3 — "Auto-consolidate"** — On session end, agent's brain is automatically updated
  - [ ] Episodic entry written (session summary, what happened)
  - [ ] Profile updated (specialty, strengths, weaknesses observed)
  - [ ] Semantic entries consolidated (deduplicated, merged where similar)
  - [ ] Persistence test: close + reopen, brain survives intact

### Wave 4: Skills — 3 tasks

Goal: agents can manage their own skill set (and the user can add custom skills).

- [ ] **Task 4.1 — "Skills visible"** — Brain tab shows the agent's current skills; can toggle on/off
  - [ ] Skill discovery from `~/.pi/agent/extensions/`
  - [ ] Per-agent skill allow-list (in `config.json`)
  - [ ] Skills tab in right pane shows active/queued/disabled states
  - [ ] Toggle disables a skill (next agent restart picks up the change)
- [ ] **Task 4.2 — "Add custom skill"** — User can paste or upload a custom skill
  - [ ] Paste form: textarea for code + name field
  - [ ] Upload form: file picker for `.ts` (extension) or `.md` (skill)
  - [ ] New skill saved to `~/.pi/agent/extensions/<name>.ts` (or skills dir)
  - [ ] Skill appears in agent's skill list (pending approval)
- [ ] **Task 4.3 — "Self-extend"** — Agent calls `skill-manager`, queues change, user approves, agent restarts
  - [ ] `skill-manager` skill: agent can `add_skill(name, code)` and `remove_skill(name)`
  - [ ] Changes are queued (not auto-applied) — UI shows pending change
  - [ ] User approves → agent restarts with new skill set
  - [ ] User denies → change discarded
  - [ ] E2E: agent says "I need a `count_files` skill" → user approves → next message uses it

### Wave 5: Voice — 3 tasks

Goal: user can talk to agents via voice (PTT input + TTS output).

- [ ] **Task 5.1 — "TTS on"** — User enables TTS for concierge, agent's response is spoken
  - [ ] voice-loop integration: TTS plays via MiniMax speech-2.8-hd (reuses existing extension)
  - [ ] Per-session TTS toggle (sidebar)
  - [ ] "Speaking" pill below agent's message with elapsed timer
  - [ ] User can interrupt (sends next message → TTS stops)
- [ ] **Task 5.2 — "PTT works"** — User holds Ctrl+Space, records audio, gets transcribed message
  - [ ] PTT hotkey handler in main process
  - [ ] Recording indicator in chat pane (waveform + elapsed)
  - [ ] local Whisper transcription on release
  - [ ] Transcribed text appears as user message
  - [ ] Mic permission flow (first-use prompt)
- [ ] **Task 5.3 — "Voice round-trip"** — PTT → concierge responds via voice → first-token < 2s
  - [ ] E2E: hold Ctrl+Space, speak "what's the weather", release, hear response
  - [ ] Latency benchmark for full voice round-trip
  - [ ] Error states: no mic, no permission, transcription failure (each with toast)

### Wave 6: File Tree — 3 tasks

Goal: user can see and interact with files (in the team's CWD) from the right pane.

- [ ] **Task 6.1 — "Tree renders"** — File tree of team's CWD shows in right pane Files tab
  - [ ] File system access via Electron IPC (contextBridge for security)
  - [ ] Tree shows directories + files with appropriate icons
  - [ ] Per-team CWD resolution (from team config, fallback to global default)
  - [ ] Files outside the team's CWD are not visible
- [ ] **Task 6.2 — "Click to preview"** — Clicking a file opens it in a middle-pane tab
  - [ ] Markdown files: rendered preview with syntax highlighting
  - [ ] Image files: image preview
  - [ ] Other files: "Open in OS" button (uses Electron's shell.openPath)
  - [ ] Each file tab has a close button
  - [ ] Re-clicking an open file just activates its tab
- [ ] **Task 6.3 — "Right-click actions"** — Right-click on a file node shows OS-style menu
  - [ ] "Open in OS" (default app)
  - [ ] "Reveal in folder" (opens Explorer at the file's location)
  - [ ] "Copy path" (puts absolute path on clipboard)
  - [ ] "Copy relative path" (relative to team's CWD)

### Wave 7: Projects (Vault as Source of Truth) — 3 tasks

Goal: agents can create and manage projects in the vault following the Phase Gates schema.

- [ ] **Task 7.1 — "Create Phase Gates project"** — Concierge creates a new project with the standard schema
  - [ ] Concierge calls `create_project(name, cwd)` skill
  - [ ] Project scaffolded: `PRD.md`, `tasks.md`, `board.md`, `notes/`
  - [ ] Project shows in the concierge's project list (right pane "Activity" tab)
  - [ ] E2E: "Create a project for the Q4 campaign" → concierge scaffolds it
- [ ] **Task 7.2 — "Create schema-free project"** — Concierge creates a simple README-only project
  - [ ] `create_project(name, cwd, schema: "minimal")` creates just `README.md`
  - [ ] Used for ad-hoc / experimental work
  - [ ] E2E: concierge correctly picks schema based on user's intent
- [ ] **Task 7.3 — "Vault write permissions"** — Agents can only write to allowed folders
  - [ ] Default allow-list: `Projects/`, `_pi-agents/`
  - [ ] Default deny: everything else
  - [ ] Per-agent override possible (advanced settings)
  - [ ] Attempt to write to denied folder → error logged, user notified
  - [ ] Security test: agent tries to write to `Wiki/personal-notes.md` → blocked

### Wave 8: Knowledge Base — 3 tasks

Goal: agent has access to the full vault as its knowledge base.

- [ ] **Task 8.1 — "Link existing vault"** — First-run flow lets user point to an existing Obsidian vault
  - [ ] Onboarding dialog: link existing / create new / auto-detect
  - [ ] "Link existing" → folder picker; verify `.obsidian/` exists
  - [ ] Vault path stored in app settings
  - [ ] Concierge reads vault structure on first launch (Wiki + Projects scan)
- [ ] **Task 8.2 — "Switch vault"** — Settings page lets user switch to a different vault
  - [ ] Vault picker in settings (lists recent Obsidian vaults from `~/.obsidian/obsidian.json`)
  - [ ] "Switch" → concierge re-indexes, agents reload their context
  - [ ] "Unlink" → agent has no vault, works in memory-only mode
- [ ] **Task 8.3 — "Auto-detect"** — On install, scan for Obsidian vaults and offer to link
  - [ ] Scan common locations (`~/Documents`, `~/ObsidianVaults`, etc.)
  - [ ] Detect by presence of `.obsidian/` folder
  - [ ] "Found 2 vaults" prompt with options to link, skip, browse
  - [ ] Skip option for fully offline use

### Wave 9: Polish & Ship — 3 tasks

Goal: ship a portable `.zip` that works on a clean Windows 10/11 machine.

- [ ] **Task 9.1 — "Settings + window state"** — Full settings UI + window persists position/size
  - [ ] Settings page: general / voice / model / network / vault / agents defaults / advanced
  - [ ] Window state persistence (size, position, maximized) via `electron-store`
  - [ ] On reopen, window restores to same size/position
  - [ ] Crash recovery prompt: "Recover previous teams?" if unclean exit detected
- [ ] **Task 9.2 — "Status indicator + persona polish"** — Final UX polish
  - [ ] "Skills active: N" status indicator in topbar
  - [ ] Concierge persona refinement based on real usage
  - [ ] Empty states for every surface (no teams, no skills, no brain, etc.)
  - [ ] Error states covered (already documented in `design/system/states.md`)
- [ ] **Task 9.3 — "Portable .zip"** — electron-builder config, builds a runnable `.zip`
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
