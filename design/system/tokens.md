# Design Tokens

The design tokens are the single source of truth for Pi Atrium's visual language. Every component reads from these values. When implementing (in Build Waves), copy these as CSS custom properties.

---

## Colors

### Surface

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0F172A` (slate-900) | Main background · app canvas |
| `--surface` | `#1E293B` (slate-800) | Primary surface · sidebars · topbar · cards |
| `--surface-2` | `#334155` (slate-700) | Secondary surface · hover states · inputs · skill chips |
| `--border` | `#334155` | Borders · dividers (same as `--surface-2` for cohesion) |

### Text

| Token | Hex | Use |
|---|---|---|
| `--text` | `#F8FAFC` (slate-50) | Primary text |
| `--text-dim` | `#94A3B8` (slate-400) | Secondary text · metadata |
| `--text-faint` | `#64748B` (slate-500) | Tertiary text · hints · labels |

### Accent (Run Green)

| Token | Hex | Use |
|---|---|---|
| `--accent` | `#22C55E` (green-500) | Primary action · success · active state |
| `--accent-dim` | `#16A34A` (green-600) | Hover for `--accent` |
| `--accent-soft` | `rgba(34, 197, 94, 0.12)` | Selected row bg · tab accent · success bg |

### Status

| Token | Hex | Use |
|---|---|---|
| `--info` | `#38BDF8` (sky-400) | Thinking · loading · in-progress |
| `--warn` | `#F59E0B` (amber-500) | Tool use · stopping · warning |
| `--error` | `#EF4444` (red-500) | Error · failed · destructive |
| `--success` | (use `--accent`) | Success state (alias) |

### Status dot (small indicator next to sessions)

| State | Color |
|---|---|
| Idle | `--text-faint` (gray) |
| Thinking | `--info` (sky, pulsing) |
| Tool use | `--warn` (amber) |
| Attention | `--accent` (green, pulsing) |
| Error | `--error` (red) |

### Status pill (larger badge)

| Pill | Background | Text |
|---|---|---|
| `pill-draft` | `rgba(148, 163, 184, 0.15)` | `--text-dim` |
| `pill-active` | `--accent-soft` | `--accent` |
| `pill-starting` | `rgba(56, 189, 248, 0.15)` | `--info` |
| `pill-stopping` | `rgba(245, 158, 11, 0.15)` | `--warn` |
| `pill-stopped` | `rgba(148, 163, 184, 0.15)` | `--text-faint` |
| `pill-error` | `rgba(239, 68, 68, 0.15)` | `--error` |

---

## Typography

### Font families

| Token | Stack | Use |
|---|---|---|
| Body | `'IBM Plex Sans'`, `system-ui`, `-apple-system`, `sans-serif` | All UI text |
| Mono | `'JetBrains Mono'`, `monospace` | IDs · paths · code · technical |

### Type scale

| Element | Size | Weight | Notes |
|---|---|---|---|
| H1 (page) | 28px | 700 | Letter-spacing -0.3px |
| H2 (section) | 20px | 600 | Border-bottom 1px on card titles |
| H3 (subsection) | 16px | 600 | |
| Body | 14px | 400 | Default |
| Small | 12-13px | 400 | Metadata · hints |
| Tiny / labels | 10-11px | 600 | All-caps · letter-spacing 0.5-0.8px |
| Mono body | 12-13px | 400 | Paths · IDs · values |

### Label style (recurring)

All-caps section labels use:
```css
font-size: 10-11px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.5-0.8px;
color: var(--text-faint);
```

---

## Spacing

Base unit: **4px**. All spacing is a multiple of 4.

| Token | Value | Use |
|---|---|---|
| `--space-1` | 4px | Icon gaps, micro-spacing |
| `--space-2` | 8px | Tight padding, chip gaps |
| `--space-3` | 12px | Standard padding (cards, cells) |
| `--space-4` | 16px | Form gaps, page margins |
| `--space-5` | 24px | Card padding (spacious), page header |
| `--space-6` | 32px | Page padding, hero spacing |
| `--space-7` | 56px | Page top offset (under proto-nav) |

### Sizing

| Token | Value | Use |
|---|---|---|
| Sidebar width | 260px | Session picker |
| Right pane width | 320px | Context surface |
| Tab bar height | 36px | Middle pane tabs |
| Topbar height | 48-56px | App topbar (varies) |
| Proto nav height | 32px | Prototype pages only |
| Input height | ~40px | Standard text input |
| Button height | ~36px | Standard button |
| Icon button | 32×32px | Top-right actions |

---

## Borders & Radius

| Token | Value | Use |
|---|---|---|
| `--radius` | 6px | All cards, buttons, inputs, tabs, pills |
| `border-radius: 50%` | — | Avatars, status dots |

Borders are always 1px solid `--border`.

---

## Motion

| Token | Value | Use |
|---|---|---|
| `--transition` | `180ms cubic-bezier(0.4, 0, 0.2, 1)` | All hover/focus transitions |
| Pulse | `1.5s ease-in-out infinite` | Status dots, recording indicator |
| Bounce | `0.8s ease-in-out infinite` | Thinking dots |
| Glow | `1.5s ease-in-out infinite` | PTT active border glow |

### Animation keyframes (standard)

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}
```

---

## Shadows & Elevation

Pi Atrium uses **borders + subtle backgrounds** for depth, not heavy shadows. Only one shadow used:

```css
--shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
```

Used for: floating popovers, dropdowns. NOT used for cards or panels.

For "elevation" (modals, focused panels), prefer:
- Border highlight (`border-color: var(--accent)`)
- Subtle background tint (`var(--accent-soft)`)
- Light glow on focus (`box-shadow: 0 0 0 1px var(--accent)`)

---

## Z-index scale

| Layer | z-index | Use |
|---|---|---|
| Base | 0 | App content |
| Sticky | 10 | Sticky topbar, sticky nav |
| Floating | 50 | Dropdowns, popovers |
| Modal | 100 | Modals, dialogs |
| Toast | 1000 | Notifications, toasts |

---

## Implementation (CSS custom properties)

```css
:root {
  /* Surface */
  --bg: #0F172A;
  --surface: #1E293B;
  --surface-2: #334155;
  --border: #334155;

  /* Text */
  --text: #F8FAFC;
  --text-dim: #94A3B8;
  --text-faint: #64748B;

  /* Accent */
  --accent: #22C55E;
  --accent-dim: #16A34A;
  --accent-soft: rgba(34, 197, 94, 0.12);

  /* Status */
  --info: #38BDF8;
  --warn: #F59E0B;
  --error: #EF4444;

  /* Other */
  --radius: 6px;
  --transition: 180ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

Copy this into any new component file. The values must match exactly across all surfaces.
