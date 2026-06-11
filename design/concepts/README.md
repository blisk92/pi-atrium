---
tags:
  - design
  - concepts
  - pi-atrium
aliases:
  - Pi Atrium Design Concepts
created: 2026-06-11
modified: 2026-06-11
status: active
---

# Pi Atrium — Design Concepts

Three single-page HTML mockups exploring different layout directions for the desktop app. Open each `.html` in a browser to view.

## Design system (shared across all concepts)

Derived from `ui-ux-pro-max` skill (query: "Electron desktop developer tool multi-agent chat panel sidebar dark mode technical professional coding"):

- **Style:** Code Dark + Run Green — dark mode, code-friendly, block-based
- **Colors:**
  - `--bg` `#0F172A` (slate-900) — main background
  - `--surface` `#1E293B` (slate-800) — primary surface (sidebars, topbar)
  - `--surface-2` `#334155` (slate-700) — secondary surface, hover state
  - `--text` `#F8FAFC` (slate-50) — primary text
  - `--text-dim` `#94A3B8` (slate-400) — secondary text
  - `--text-faint` `#64748B` (slate-500) — tertiary text, hints
  - `--accent` `#22C55E` (green-500) — "run green" — primary action, status:active
  - `--warn` `#F59E0B` (amber-500) — tool use status
  - `--error` `#EF4444` (red-500) — error status
  - `--info` `#38BDF8` (sky-400) — thinking status
- **Typography:**
  - Body: **IBM Plex Sans** (300, 400, 500, 600, 700)
  - Code/IDs/paths: **JetBrains Mono** (400, 500, 600)
- **Effects:** Subtle glow on focus, 150-300ms transitions, color shift on hover, monospace for technical elements (agent IDs, paths, task IDs)

## The 3 concepts

### Concept 1: **The Atrium** — 3-pane (sidebar + chat + file tree)

**Layout:** 3-pane grid, 260px sidebar + flex center chat + 320px right file tree.

**Best for:** Power users who want everything visible at once. Familiar VS Code / Slack / Discord pattern.

**Pros:**
- All surfaces visible simultaneously — no tab switching
- File tree is always-on (matches developer expectations)
- Status indicators on every session at a glance

**Cons:**
- Densest layout — chat pane is narrowest
- 3 columns compete for horizontal space (challenging on smaller laptop screens)
- Sidebar + tree take ~580px combined, leaving chat with limited width

**When to use:** Solo dev with a large monitor (27"+), wants to see everything at once.

---

### Concept 2: **The Quorum** — workspaces + tabs (VS Code feel)

**Layout:** Top workspace tabs (each tab = a team or concierge) + left agent list (members of current workspace) + center chat + right drawer (files / brain / skills tabs).

**Best for:** Multi-team workflows — jumping between different projects, each with its own team of agents.

**Pros:**
- Workspace pattern matches how multi-project developers already work (VS Code, Slack workspaces)
- Right drawer is multi-purpose (files/brain/skills tabs) — more flexible than always-on tree
- Agent list shows only the current workspace's members (less clutter than global list)
- Tab badges show activity count at a glance

**Cons:**
- More chrome at the top (tabs eat vertical space)
- Two-level navigation (workspace > agent) takes a click to reach a specific session
- Tabs can get crowded with many workspaces

**When to use:** Multiple teams running in parallel, want quick switching between projects.

---

### Concept 3: **The Focus** — single-agent-first, minimal chrome

**Layout:** Top compact agent pills (concierge + team members as small chips) + full-width chat + slide-out right drawer (peek at files/brain/skills on demand).

**Best for:** Hands-free, voice-first workflows — the concierge drives, agent pills are always one click away.

**Pros:**
- Maximum chat real estate (760px+ message width)
- Minimal chrome — closest to a "command line" feel but with structure
- Agent pills are a great visual indicator of who's running
- Slide-out drawer stays out of the way until needed
- Best fit for the voice + concierge UX (less visual noise)

**Cons:**
- No persistent file tree (have to slide out to see files)
- Tabs are pills — less clear than Concept 2's workspace tabs for "which project am I in"
- Could feel "sparse" if the user wants to see the team structure at a glance

**When to use:** Hands-free workflows, voice-driven, when chat is the primary surface.

---

## Chosen concept: **Concept 1 + tabbed right pane + middle pane file tabs**

**File:** `concept-chosen.html`

**Layout:** Concept 1's 3-pane (260px sidebar + flex center + 320px right pane) with **two tab systems**:
- **Middle pane tabs** (above content) — Chat (pinned, always present) + dynamically opened files (e.g., `feasibility.md`, `PRD.md`)
- **Right pane tabs** (vertical context) — Files · Brain · Skills · Activity

**Rationale:**
- Middle pane tabs give the app a real IDE feel — open multiple files side by side, switch freely
- Clicking a file in the right pane's file tree opens it as a new tab in the middle pane (not in the right pane)
- Each middle tab has a close button; clicking it removes the tab
- Re-clicking an already-open file in the tree just re-activates its tab
- Open files are visually marked in the right pane (accent color)
- Chat tab is pinned and can't be closed (always there as the home view)
- Right pane tabs (Files/Brain/Skills/Activity) stay — they're the "what the agent is doing/knows" context
- Two tab systems serve different needs: middle = "what I'm working on", right = "who I'm working with"

**Interactive:**
- Click a file in the right pane's Files tab → opens as a tab in the middle pane
- Click an already-open file in the tree → activates its existing tab
- Click a middle tab → switches to that file (or chat)
- Click × on a middle tab → closes it (activates Chat if no more files)
- Click a right pane tab → switches the context surface
- Click a session in the sidebar → switches the active agent

**Next:** this becomes the starting point for the Clickable Prototype phase (multi-page, with all 10 features navigable).

---

## Prototype: missing-flows pass

**Folder:** `design/prototype/`

**Hub:** `index.html` — links to all 5 flow pages

5 lightweight HTML pages covering the flows the main concept doesn't show. Each page is a standalone walkthrough. Shared design system in `shared.css`.

| Page | What it covers |
|---|---|
| `onboarding.html` | First-run: link existing vault · create new · auto-detect |
| `team-new.html` | Team definition form (name, CWD, members with role + skills) |
| `team-active.html` | All 5 lifecycle states (Draft → Starting → Active → Stopping → Stopped) + partial-failure handling |
| `voice.html` | PTT active (waveform + level meter) · TTS playing (speaking animation) · per-agent toggle |
| `settings.html` | General · Voice · Model · Network · Vault · Agents defaults · Advanced · About |

Use the top nav bar to jump between pages. The Hub page is the index.

---

## Open questions for user

1. Which layout feels closest to what you want?
2. Should we combine elements (e.g., Concept 1's persistent tree + Concept 2's workspace tabs)?
3. Is dark mode the right default, or should we support light mode too?
4. Any visual references (apps you like the look of) we should match?
