# Pi Atrium

> **A Windows desktop UI for Pi Agent — launch and manage multi-agent teams that collaborate via `pi-intercom`.**

![Status](https://img.shields.io/badge/status-v1%20in%20design-yellow)
![Phase](https://img.shields.io/badge/phase-clickable%20prototype%20next-blue)
![Owner](https://img.shields.io/badge/owner-edmond-lightgrey)

---

## What is this?

**Pi Atrium** is a desktop control panel for [Pi Agent](https://pi.dev) that lets you launch a "team" of multiple AI agents that collaborate via `pi-intercom`. Each agent has its own persona, skills, and persistent memory ("brain"). The user picks which agent to talk to from a sidebar. A persistent **concierge** agent helps manage the team. The Obsidian vault is the project source of truth.

Define a team once, start it with one click, switch between agents via a sidebar, and let the team coordinate in the background.

---

## Project Status

| Phase | Status |
|---|---|
| **PRD Creation** | ✅ Approved (2026-06-11) |
| **Task Breakdown** | ✅ Complete (2026-06-11) |
| **Design Concepts** | ✅ Chosen: Concept 1 + middle pane tabs (2026-06-11) |
| **Clickable Prototype** | ⏳ Next |
| **Design System** | ⏳ Pending |
| **Build Waves** | ⏳ Pending (9 waves defined) |

See [Pi Atrium PRD](Pi%20Atrium%20PRD.md) for the full product spec, and [tasks.md](tasks.md) for the build plan.

---

## Tech Stack

- **Electron** — desktop shell (portable `.zip` distribution)
- **Pi Agent** — runs as sidecar Node processes per agent
- **HTTP + SSE** — IPC between Electron renderer and Pi sidecars
- **Obsidian** — vault as the source of truth (`_pi-agents/` for app state)
- **TypeScript** — Electron + Pi sidecar code
- **Node.js** — runtime

---

## Architecture

Pi Atrium is structured as an **Electron host** with **Pi Agent running as sidecar processes**. The Electron main process manages agent lifecycle; the renderer is a standard Chromium instance.

```
┌──────────────────────────────────────────────────────────┐
│  Electron main process                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Sidecar 1  │  │  Sidecar 2  │  │  Sidecar 3  │  ...   │
│  │  (Concierge) │  │ (Feasibility)│  │ (Shotlist) │         │
│  │  Pi Agent    │  │  Pi Agent    │  │  Pi Agent    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         ↕ HTTP + SSE               pi-intercom             │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Electron renderer (Chromium)                    │    │
│  │  3-pane layout: sidebar + chat + right context   │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

See [`docs/decisions/`](docs/decisions/) for the full Architecture Decision Record set:

- [**01-Project-Naming**](docs/decisions/01-Project-Naming.md) — Why "Pi Atrium"
- [**02-Process-Model**](docs/decisions/02-Process-Model.md) — Sidecar per agent
- [**03-IPC-Mechanism**](docs/decisions/03-IPC-Mechanism.md) — HTTP + SSE
- [**04-Persistence**](docs/decisions/04-Persistence.md) — Hybrid (vault + Windows user-data)
- [**05-Voice-Integration**](docs/decisions/05-Voice-Integration.md) — Reuse `voice-loop`
- [**06-Distribution**](docs/decisions/06-Distribution.md) — Electron portable `.zip`

---

## Repo Structure

```
pi-atrium/
├── README.md                  ← this file
├── Pi Atrium PRD.md           ← full product requirements
├── tasks.md                   ← task breakdown by phase + Build Wave
├── board.md                   ← Kanban dashboard
├── docs/
│   └── decisions/             ← Architecture Decision Records (ADRs)
├── design/
│   ├── concepts/              ← HTML mockups (3 originals + 1 chosen)
│   ├── prototype/             ← multi-page clickable prototype (next)
│   └── system/                ← design tokens, components
├── tasks/                     ← individual task notes (populated in Build Waves)
├── issues/                    ← bug reports
└── notes/                     ← research files
```

---

## Design

Three single-page HTML mockups explored different layout directions; the **chosen design** combines Concept 1's 3-pane layout with two tab systems:
- **Middle pane tabs** — Chat (pinned) + dynamically opened files (VS Code feel)
- **Right pane tabs** — Files · Brain · Skills · Activity (agent context)

View the chosen design: [`design/concepts/concept-chosen.html`](design/concepts/concept-chosen.html)

---

## Development

> *Coming soon — currently in design phase. Wave 0 (Foundation) starts after the clickable prototype is approved.*

### Prerequisites (for when we start building)

- Node.js 18+
- npm 9+
- Pi Agent installed globally
- Obsidian vault configured at `~/.pi/agent/`

### Running locally (planned)

```bash
# Install Pi Agent and dependencies
npm install -g @mariozechner/pi-coding-agent
git clone <this-repo>
cd pi-atrium
npm install
npm run dev
```

---

## V2 Roadmap (parked, not v1)

- **Conference-call mode** — real-time voice "huddle" with N agents (user + multiple agents talking)
- **Dashboard** — visual overview screen (TBD: team activity, agent metrics, project health, recent brain activity)
- **Per-team voice configuration** — different providers/voices/models per team
- **Skill marketplace** — discover / install third-party agent templates
- **Cross-platform** (macOS, Linux)

---

## License

TBD

---

## Maintainer

**edmond** — single-user project, local-only

---

## Related

- [Pi Agent](https://pi.dev) — the underlying AI coding harness
- [[Pi Atrium PRD|Pi Atrium PRD]] — full requirements (Obsidian link)
- [Wiki/Workflows/Phase Gates](https://github.com/edmond/pi-atrium) — workflow that produced this project (placeholder)
