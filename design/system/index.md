# Pi Atrium — Design System

The single source of truth for Pi Atrium's visual language. Every component in the app reads from these tokens. When implementing (Build Waves), copy the CSS custom properties from `tokens.md` and use the components documented in `components.md`.

---

## Contents

| File | What's in it |
|---|---|
| [**tokens.md**](./tokens.md) | Colors · typography · spacing · borders · motion · z-index · CSS custom properties |
| [**components.md**](./components.md) | 20 components: button, card, form fields, tab, pill, table, status banner, file tree, waveform, etc. |
| [**states.md**](./states.md) | Empty / Loading / Error / Success / Disabled patterns for every surface |
| [**voice-states.md**](./voice-states.md) | PTT input · TTS output · per-session toggle · voice settings |
| [**examples.html**](./examples.html) | Live HTML rendering of every component (open in browser) |

---

## Quick reference

**Visual style:** Code Dark + Run Green — dark mode, code-friendly, block-based.

**Two font families:**
- **IBM Plex Sans** (body) — all UI text
- **JetBrains Mono** (mono) — IDs, paths, code, technical

**Core colors:**
- `--bg` `#0F172A` (canvas)
- `--surface` `#1E293B` (cards, sidebars)
- `--text` `#F8FAFC` (primary text)
- `--accent` `#22C55E` (Run Green — primary action, success)
- `--info` `#38BDF8`, `--warn` `#F59E0B`, `--error` `#EF4444` (status)

**Spacing:** 4px base unit. All spacing is `4, 8, 12, 16, 24, 32, 56` (px).

**Radius:** 6px everywhere (cards, buttons, inputs, tabs, pills). 50% for circular elements.

**Motion:** 180ms cubic-bezier transitions on all hover/focus. Pulsing animation for status indicators. Bounce for thinking dots.

---

## Origin

The design system is **extracted from the HTML mockups** (`concepts/`) and **prototype pages** (`prototype/`), not invented from scratch. This means:

- Every token/component has been validated by being rendered in a real browser
- The design system and the prototype share the same `shared.css` in the prototype folder
- When we move to Build Waves, the design system becomes the spec; the components become React (or vanilla) implementations

**Source files:**
- `/design/concepts/concept-chosen.html` — main app shell
- `/design/concepts/concept-1.html` / `concept-2.html` / `concept-3.html` — alternatives explored
- `/design/prototype/shared.css` — design system in CSS form (used by all 6 prototype pages)
- `/design/prototype/*.html` — example pages

---

## What this isn't

This is **not**:
- A Figma library (we use HTML as our design tool)
- A React/Vue component library (those come in Build Waves)
- A complete design philosophy (just the tokens + components for v1)

For v2, the design system will likely need:
- Light mode (currently dark only)
- Mobile/responsive breakpoints (desktop-only for v1)
- Animation guidelines / motion principles
- Accessibility audit (WCAG AA compliance)
- More components (modals, dropdowns, date pickers, etc.)
