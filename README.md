# Pi Atrium

> **A Windows desktop UI for Pi Agent — launch and manage multi-agent teams that collaborate via `pi-intercom`.**

![Status](https://img.shields.io/badge/status-Wave%202%20shipped-yellowgreen)
![Phase](https://img.shields.io/badge/phase-Build%20Waves-blue)
![Owner](https://img.shields.io/badge/owner-edmond-lightgrey)

---

## What is this?

**Pi Atrium** is a desktop control panel for [Pi Agent](https://pi.dev) that lets you launch a "team" of multiple AI agents that collaborate via `pi-intercom`. Each agent has its own persona, skills, and persistent memory ("brain"). The user picks which agent to talk to from a sidebar. A persistent **concierge** agent helps manage the team. The Obsidian vault is the project source of truth.

Define a team once, start it with one click, switch between agents via a sidebar, and let the team coordinate in the background.

---

## Status (Wave 0–2 shipped, Wave 3+ in flight)

| Phase | Status |
|---|---|
| **PRD Creation** | ✅ Approved (2026-06-11) |
| **Task Breakdown** | ✅ Complete (2026-06-11) |
| **Design Concepts** | ✅ Chosen: Concept 1 + middle pane tabs |
| **Clickable Prototype** | ✅ 5-page HTML prototype + shared.css |
| **Design System** | ✅ Tokens, components, states, voice states, examples |
| **Build Wave 0** (Foundation) | ✅ 4/4 tasks shipped — empty room, concierge spawn, chat, right pane |
| **Build Wave 1** (Single session) | ✅ 3/3 tasks shipped — multi-session sidebar, /remember, /recall |
| **Build Wave 2** (Teams) | ✅ 3/3 tasks shipped — define, run, halt teams |
| **Build Wave 3** (Brain) | ✅ 3/3 tasks shipped — brain folder, remember/recall, persist |
| **Build Wave 4** (Skills) | ✅ 1/3 tasks shipped — skills visible (4.2/4.3 deferred) |
| **Build Wave 5** (Voice) | 🚧 TTS in progress |
| **Build Wave 6** (File Tree) | ⏳ Pending |
| **Build Wave 7** (Projects) | ⏳ Pending |
| **Build Wave 8** (KB / Vault) | ⏳ Pending |
| **Build Wave 9** (Polish & Ship) | ⏳ Pending |

See [Pi Atrium PRD](Pi%20Atrium%20PRD.md) for the full product spec and [tasks.md](tasks.md) for the build plan.

---

## What works right now

- **Cold start ~350ms** · concierge spawns as a sidecar on port 49152 in ~2.3s
- **Multi-session sidebar** · concierge is session #0; spawn more via the **+** button
- **Chat with streaming** · typed message → streamed response, latency badge, auto-scroll, tool calls inline
- **Slash commands** · `/remember [section] <text>`, `/recall [query]`, `/help` — writes to a per-agent on-disk **brain** (4 sections: episodic, semantic, procedural, working)
- **Teams** · define a team with N members via a modal; **Start** spawns one headless Pi per member (~2.5s per member); **Halt** sends SIGTERM with 10s grace; **Delete** removes from disk
- **Right pane tabs** · Files (mock tree, real in Wave 6), Brain (live entry counts + viewer), Skills (4 builtin toggles per session), Activity (real-time event log)
- **TTS** · per-session toggle; when on, agent responses are spoken via `mmx` (Wave 5)
- **Vault-style storage** · teams at `<app>/.runtime/teams/<id>/team.md`; per-member at `<id>/<memberId>/{config.json, .pi/SYSTEM.md, brain.md, brain/}`

---

## Tech Stack

- **Electron 33** + electron-vite + Vue 3 + Pinia + TypeScript (strict) + Vite 5
- **Pi Agent** — `@earendil-works/pi-coding-agent` runs as a sidecar Node process per session
- **HTTP + SSE** — IPC between Electron main and Pi sidecars (127.0.0.1 only)
- **mmx** (MiniMax AI) — TTS for spoken responses (and STT for PTT, planned)
- **TypeScript** — main, preload, renderer all strict-mode
- **Node.js 22+** — `--experimental-strip-types` runs the headless Pi source directly in dev

---

## Architecture

Pi Atrium is **Electron** hosting **Pi Agent** as one or more Node child processes. Each sidecar binds to a unique localhost port; the main process proxies SSE events back to the renderer over Electron IPC.

```
┌──────────────────────────────────────────────────────────┐
│  Electron main process                                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐             │
│  │ Sidecar 1  │ │ Sidecar 2  │ │ Sidecar 3  │   …         │
│  │ Concierge  │ │ Session s1 │ │ Team-Mem   │             │
│  │ port 49152 │ │ port 49153 │ │ port 49154 │             │
│  │ Pi Agent   │ │ Pi Agent   │ │ Pi Agent   │             │
│  └────────────┘ └────────────┘ └────────────┘             │
│       ↕ HTTP + SSE             pi-intercom (skill)         │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Electron renderer (Vue 3)                       │    │
│  │  Pinia: app · sessions · teams · chat            │    │
│  │  3-pane layout: Sidebar · Middle · Right         │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

See [`docs/decisions/`](docs/decisions/) for the ADRs:

- [**01-Project-Naming**](docs/decisions/01-Project-Naming.md) — Why "Pi Atrium"
- [**02-Process-Model**](docs/decisions/02-Process-Model.md) — Sidecar per agent
- [**03-IPC-Mechanism**](docs/decisions/03-IPC-Mechanism.md) — HTTP + SSE
- [**04-Persistence**](docs/decisions/04-Persistence.md) — Hybrid (vault + Windows user-data)
- [**05-Voice-Integration**](docs/decisions/05-Voice-Integration.md) — `voice-loop` (planned) + `mmx` TTS (shipped)
- [**06-Distribution**](docs/decisions/06-Distribution.md) — Electron portable `.zip`

---

## Repo Structure

```
pi-atrium/
├── README.md                  ← this file
├── Pi Atrium PRD.md           ← full product requirements
├── tasks.md                   ← task breakdown by phase + Build Wave
├── board.md                   ← Kanban dashboard
├── docs/decisions/            ← Architecture Decision Records (ADRs)
├── design/
│   ├── concepts/              ← 3 originals + chosen
│   ├── prototype/             ← 5-page clickable prototype
│   └── system/                ← tokens, components, voice states
├── app/                       ← Electron host (Vue 3 + Pinia + TS)
│   ├── src/main/              ← main process (sidecar spawn, IPC, teams, brain, tts)
│   ├── src/preload/           ← contextBridge bridge → window.piAtrium
│   ├── src/renderer/          ← Vue UI (Sidebar, MiddlePane, RightPane, ChatPane, TeamForm)
│   ├── src/headless-pi/       ← headless Pi wrapper (HTTP + SSE on localhost)
│   ├── src/shared/            ← types shared between main/renderer
│   └── package.json
└── tools/playwright/         ← E2E test scripts (one per task)
```

---

## Running locally

### Prerequisites

- Node.js 22+
- npm 9+
- `@earendil-works/pi-coding-agent` (installed by the app's npm install)
- Optional: `mmx` CLI on PATH (for TTS)

### Build & run

```bash
cd app
npm install
npm run build      # typecheck + electron-vite build
./node_modules/.bin/electron .   # launches the built app
```

For hot-reload dev mode:

```bash
cd app
npm run dev
```

### Running the E2E tests

Each task has a Playwright test under `tools/playwright/`:

```bash
cd tools/playwright
node test-skills.js          # example: Skills toggle test
node test-team-run-halt.js   # example: Team start + halt
```

---

## Performance

| Metric | Target | Actual |
|---|---|---|
| Cold start (process→window) | < 5s | **~350ms** |
| Concierge spawn (main→active) | < 3s | **~2.3s** |
| Per-member team spawn | < 3s | **~2.5s** |
| First-token latency (M3) | < 2s | ~4-6s (model-bound: thinking block) |
| Halt latency | fast | **~30ms** (instant return) |

---

## V2 Roadmap (parked, not v1)

- **Conference-call mode** — real-time voice "huddle" with N agents
- **Dashboard** — team activity, agent metrics, project health
- **Per-team voice configuration** — different providers/voices per team
- **Skill marketplace** — discover / install third-party agent templates
- **Cross-platform** (macOS, Linux)

---

## Maintainer

**edmond** — single-user project, local-only

---

## Support

If Pi Atrium makes your day a little better, you can buy me a coffee with Bitcoin:

**`bc1qanppjy5l5zek7a3ddl445lx8kppmz0lypshkue`**

Or scan the address above with any Bitcoin wallet. Every sat is appreciated; none required. ☕

