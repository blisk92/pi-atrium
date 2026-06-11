---
tags: [project, prd, pi-atrium, pi-agent, desktop-ui]
aliases: [Pi Atrium PRD]
created: 2026-06-10
modified: 2026-06-11
status: approved
priority: A
---

# Pi Atrium PRD

> **Project:** A Windows desktop (Electron) frontend UI for Pi Agent that lets a user launch and manage a "team" of multiple AI agents that collaborate via `pi-intercom`.
>
> **Status:** Draft — interview complete, awaiting approval
>
> **Owner:** edmond (single user, local-only)
>
> **Interview completed:** 2026-06-10
>
> **Distribution:** Electron, portable `.zip` (v1), `.msi` (later)

---

## 1. Problem Statement

The current Pi Agent is a TUI — a single linear conversation per session. To work with multiple agents (a "team" of specialists), the user has to manually launch separate terminals, manage ports, wire up `pi-intercom` themselves, and context-switch between them. This works for one-off use, but breaks down when the user wants a persistent, recurring team setup (e.g., a "research team" that runs weekly, a "code review crew" that reviews PRs as they arrive, or a "creative team" that brainstorms in parallel).

**Pi Atrium** solves this by providing a desktop control panel for agent teams: define a team once, start it with one click, switch between agents via a sidebar, and let the team coordinate via `pi-intercom` in the background.

---

## 2. Goals

1. **Reduce friction** for running multiple Pi agents simultaneously
2. **Make teams repeatable** — define once, start many times
3. **Specialize agents** — each agent grows as a specialist via its persistent brain
4. **Vault as source of truth** — the team's work lives in the Obsidian vault, not in opaque app state
5. **Stay in flow** — voice UI and a concierge assistant so the user can drive the team hands-free

---

## 3. Non-Goals (Out of Scope for v1)

- Multi-user / collaboration / permissions
- Cloud sync — app is local-only
- Mobile / cross-platform — Windows desktop only
- Cron / scheduled team runs
- Event-driven triggers (file-watch, webhooks)
- DAG pipelines — `pi-intercom` covers ad-hoc coordination
- Agent marketplace / public template registry
- Custom voice/UI theming (use sensible defaults)

---

## 4. User Story

> As a developer using Pi Agent, I want to launch a "team" of specialized AI agents with one click, talk to any of them directly, and have them coordinate in the background — so I can delegate complex multi-step work without manually managing multiple terminals.

---

## 5. Scope (In)

1. **Agent team** — N agents, each with role + initial task/prompt
2. **Start / halt team** — Launch all agents; `pi-intercom` initialized; graceful shutdown
3. **Session picker UI** — Sidebar (concierge pinned, teams as collapsible groups) + chat pane
4. **File tree pane** — Folder tree of team's CWD; click for preview, right-click for OS actions
5. **Per-agent brain** — 5 memory types; hybrid storage; hybrid read/write (explicit + auto)
6. **Knowledge base** — Whole vault; auto-detect existing + browse + create-new
7. **Per-agent skill management** — Pick from installed Pi extensions + paste/upload custom; `skill-manager` skill available to all agents (queues changes for user approval)
8. **Vault = project source of truth** — Phase Gates schema by default; per-project override to schema-free
9. **Voice UI** — Push-to-talk input; per-agent TTS toggle in picker
10. **Default concierge session** — Persistent built-in agent with full admin skillset; auto-injected state baseline + `app_context()` skill

---

## 6. Architecture

The app is structured as an Electron host with Pi Agent running as sidecar processes. The Electron main process manages agent lifecycle and proxies events to the renderer.

### 6.1 Process Model
- **Sidecar per agent** — each agent is a separate Node child process running Pi Agent
- **Concierge** also runs as a persistent sidecar (started on Electron app launch)
- Pi is invoked via a headless extension that exposes HTTP + SSE

### 6.2 IPC
- **HTTP + SSE** for Electron ↔ Pi sidecars
  - `POST /message` — send user message
  - `GET /events` — SSE stream of agent responses
- **Electron IPC** (`contextBridge`) for file operations (renderer → main → `fs`)

### 6.3 Persistence
- **Vault** (single source of truth for user-facing state):
  - `_pi-agents/agents/<id>/` — per-agent config, brain, SYSTEM.md
  - `_pi-agents/teams/<id>/` — team definitions + per-member subfolders
  - `Projects/<name>/` — projects created by the team
- **Windows user-data folder** (`pi-atrium/`) — UI internals (window state, logs, cache)

### 6.4 Voice
- Reuse existing **`voice-loop`** extension
- Add desktop UI: push-to-talk input + per-session TTS toggle

### 6.5 Concierge Spawn
- Persistent, started on Electron app launch
- Always visible at top of session picker
- Auto-injected state baseline (small) + `app_context()` skill for deep queries

---

## 7. Data Models

The data is split across three storage locations: per-agent folders, per-team folders, and per-project folders. The vault holds the first two; projects live in the user's existing `Projects/` folder.

### 7.1 Per-agent (`_pi-agents/agents/<id>/`)

```
.pi/SYSTEM.md           ← system prompt (replaces Pi default)
config.json             ← model, skills, metadata, brain ref
brain.md                ← index + profile (self-model)
brain/
  episodic/<entry>.md   ← session / event logs
  semantic/<entry>.md   ← facts & concepts
  procedural/<entry>.md ← how-tos & workflows
  working/<entry>.md    ← current task scratchpads
```

### 7.2 Per-team (`_pi-agents/teams/<id>/`)

```
team.md                 ← team config (name, CWD, members, status)
members/<id>.md         ← per-member config (links to agent by id)
```

### 7.3 Per-project (`Projects/<name>/`)
- **Default:** Phase Gates schema (`PRD.md`, `tasks.md`, `board.md`, `notes/`)
- **Per-project override:** schema-free; concierge ensures `README.md` exists

---

## 8. Features (Detailed)

This section captures the locked decisions from the feature-by-feature interview.

### 8.1 Team Definition
| Decision | Value |
|---|---|
| Data model | Team file + per-member subfolder |
| Lifecycle | **Strict — Halt to edit** |
| Agent persona | `.pi/SYSTEM.md` (per agent, in vault) |
| Spawn mechanism | Programmatic injection via HTTP+SSE startup payload |
| Validation | Warnings, not hard blocks (warn on missing CWD, auto-rename on name conflict, allow empty team, no-skill → defaults) |

### 8.2 Skill Management
| Decision | Value |
|---|---|
| Storage | `config.json` (`skills: []`) |
| Enforcement | Filter at extension load (headless wrapper) |
| Custom workflow | Paste **OR** upload |
| `skill-manager` scope | All agents by default |
| Skill add behavior | Queue + notify user (no live injection) |

### 8.3 Per-agent Brain
| Decision | Value |
|---|---|
| Memory types | All 5 (Episodic, Semantic, Procedural, Profile, Working) |
| Storage | Hybrid — `brain.md` index + per-type folders with per-entry files |
| Read/write | Hybrid — explicit `remember`/`recall` skills + automatic session consolidation |
| Profile updates | Automatic on each session (self-model grows) |

### 8.4 Default Concierge Session
| Decision | Value |
|---|---|
| State access | Auto-injected baseline (small) + `app_context()` skill for deep queries |
| Special skills | Full admin skillset (team-manager, app-context, vault-read, vault-write, intercom-coordinator) |
| Mitigations | Own sidecar (independent restart), all actions logged to brain (episodic), user can revoke skills |

### 8.5 File Tree Pane
| Decision | Value |
|---|---|
| Actions | Read + create folders/files |
| Click behavior | Click = in-app preview; right-click = OS actions (open in OS, reveal in folder, copy path) |

### 8.6 Session Picker UI
| Decision | Value |
|---|---|
| Layout | Grouped by team (concierge pinned, teams as collapsible groups) |
| Status indicators | Idle / Thinking / Tool use / **Attention** / Error |

### 8.7 Start / Halt Team
| Decision | Value |
|---|---|
| Start failure | Best-effort with **1 auto-retry** for transient failures; failed agents shown red; team starts "Active" with whatever spawned |
| Halt | Graceful with 10s timeout (agents can save brain state, then forced termination) |

### 8.8 Voice UI
| Decision | Value |
|---|---|
| Input trigger | Push-to-talk (hotkey) |
| Output | Per-agent toggle in picker (default OFF) |

### 8.9 Knowledge Base (Vault)
| Decision | Value |
|---|---|
| Scope | Whole vault |
| Linking | Auto-detect existing + browse to folder + create-new (covers all flows) |

### 8.10 Vault as Project Source of Truth
| Decision | Value |
|---|---|
| Schema | Phase Gates by default; per-project override to schema-free |
| Permissions | Concierge creates, all agents edit |

---

## 9. Non-Functional Requirements

Performance, reliability, and security targets for the v1 build.

### 9.1 Performance

| Surface | Target |
|---|---|
| App cold start | < 5s |
| Per-agent spawn | < 3s |
| First-token latency | < 2s (dominated by LLM, not us) |
| Memory at 10 agents | < 4GB |
| Idle memory (concierge only) | < 500MB |

### 9.2 Reliability
- **Crash recovery:** "Recover previous teams?" prompt on first launch after crash; default to "yes" for next time

### 9.3 Security

| Dimension | Decision |
|---|---|
| Skill execution | Full trust (user is admin); show "Skills active: N" indicator |
| Network access | Fully open |
| Vault write scope | Default: agents can write to `Projects/` and `_pi-agents/`; rest read-only; per-agent override possible |
| Port range | IANA dynamic (49152+) |

### 9.4 Limits
- **Max concurrent agents:** 10 (configurable, per team)

---

## 10. V2 Roadmap (Captured, Not for v1)

- **Dashboard** — visual overview screen (TBD: team activity, agent metrics, project health, recent brain activity, etc.) — captured 2026-06-11
- **Conference-call mode** — real-time voice "huddle" with N agents (user + multiple agents talking)
- **Per-team voice configuration** — different providers/voices/models per team
- **Skill marketplace** — discover / install third-party agent templates
- **Per-project override UI** in the team form (currently only via frontmatter)
- **Cross-platform** (macOS, Linux)

---

## 11. Success Criteria

v1 of Pi Atrium is successful when:

- [ ] User can define a team with 3+ members in under 2 minutes
- [ ] User can start the team with one click and see all agents come up in < 30s
- [ ] User can switch between any agent and any team member via the sidebar
- [ ] User can talk to the concierge and have it create a new team on demand
- [ ] Agents can communicate via `pi-intercom` without user intervention
- [ ] Each agent's brain persists across sessions (visible in vault)
- [ ] Skills (including `skill-manager`) work for all agents
- [ ] Voice input (PTT) and per-agent TTS toggle work
- [ ] File tree shows team's CWD with preview + right-click actions
- [ ] App is portable `.zip` distributable; runs on Windows 10/11

---

## 12. Open Questions

None. All interview decisions locked. If new questions arise during Build Waves, log them in `Projects/pi-atrium/notes/open-questions.md`.

---

## 13. References

- [[Wiki/Pi/AGENTS]] — Pi context file system
- [[Wiki/Pi/Tools and Capabilities]] — Pi agent tools reference
- [[Wiki/Pi/pi-intercom]] — Inter-agent communication (skill reference)
- [[Wiki/Pi/voice-loop]] — Voice TTS/STT extension
- [[Wiki/Workflows/Phase Gates]] — Workflow that produced this PRD
- [[Wiki/Workflows/Project Setup]] — Project folder conventions
- [[Wiki/Workflows/PRD Creation]] — Interview-driven PRD process

---

## 14. Next Phase (after approval)

Per [[Wiki/Workflows/Phase Gates]]:

1. → **Task Breakdown** (this PRD → `tasks.md`)
2. → **Design Concepts** (visual / interaction concepts)
3. → **Clickable Prototype** (validated concepts)
4. → **Design System** (extracted patterns + tokens)
5. → **Build Waves** (implement against design system)

> Do not start implementation until **all** earlier phases are approved. Each phase must end in a testable state.
