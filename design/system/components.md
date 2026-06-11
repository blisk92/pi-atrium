# Components

Catalog of Pi Atrium's UI components. Each component documents: purpose, anatomy, variants, states, and code.

For visual reference, see [`examples.html`](./examples.html) which renders every component live.

---

## 1. Button

Triggers an action. Three variants by intent, plus size modifier.

```html
<!-- Variants -->
<button class="btn">Default</button>
<button class="btn btn-primary">Primary action</button>
<button class="btn btn-danger">Destructive</button>
<button class="btn btn-ghost">+ New Team</button>

<!-- Size modifier -->
<button class="btn btn-sm">Compact</button>
```

| Variant | Background | Border | Text | When to use |
|---|---|---|---|---|
| `btn` | transparent | `--border` | `--text` | Default / neutral |
| `btn-primary` | `--accent` | `--accent` | `--bg` (dark) | Primary CTA (Save, Start, Continue) |
| `btn-danger` | transparent | `--error`/30% | `--error` | Destructive (Halt, Delete) |
| `btn-ghost` | transparent | `--border` dashed | `--text-dim` | Tertiary / "create new" actions |

**States:** default, hover (background → `--surface-2`), active, focus (border → `--accent`), disabled (opacity 0.5, pointer-events none).

**Anatomy:** text label, optional leading icon, optional trailing icon.

---

## 2. Icon button

Compact square button for topbar actions (skills, settings, voice toggle).

```html
<button class="icon-btn" title="Toggle voice output">
  <svg width="16" height="16" viewBox="0 0 24 24" ...>...</svg>
</button>
```

- 32×32px, transparent bg, `--text-dim` color
- Hover: background → `--surface-2`, color → `--text`
- Active state: color → `--accent`, border → `--accent`
- Always 16px Lucide-style inline SVG (no emoji)

---

## 3. Card

Container with a title, body, and optional footer.

```html
<div class="card">
  <div class="card-title">
    Section title
    <span class="sub">optional subtitle</span>
  </div>
  <p>Body content...</p>
</div>
```

- Background: `--surface`
- Border: 1px `--border`, radius `--radius`
- Padding: 20px
- Title: 11px uppercase label, `--accent` color, with subtitle in `--text-faint`
- Used for: every form section, every content group

---

## 4. Form fields

```html
<div class="form-row">
  <label for="name">Name</label>
  <input type="text" id="name" value="..." />
  <div class="hint">Helper text</div>
</div>
```

| Element | Style |
|---|---|
| Label | 11px uppercase, `--text-dim`, 6px margin-bottom |
| Input | `--bg` bg, `--border` border, focus → `--accent` border |
| Textarea | Same as input, monospace font, min 80px tall, vertical resize |
| Select | Same as input, with chevron |
| Hint | 11px, `--text-faint`, 4px margin-top |
| Grid | `.form-grid` = 2-column grid, 16px gap |

**Validation states** (TODO for v1.1):
- Valid: subtle `--accent` left border
- Invalid: subtle `--error` left border + error message

---

## 5. Toggle switch

Custom-styled checkbox that looks like an iOS switch.

```html
<label class="toggle">
  <input type="checkbox" checked />
  <span class="switch"></span>
  <span>Label</span>
</label>
```

- Switch: 36×20px pill, `--surface-2` when off, `--accent` when on
- Knob: 16px circle, slides 16px on toggle
- Label: 12px, after the switch

**State:** off (default) | on (`checked`)

---

## 6. Status pill

Compact badge showing a status with optional pulsing dot.

```html
<span class="pill pill-draft">Draft</span>
<span class="pill pill-active"><span class="dot"></span> Active</span>
<span class="pill pill-starting"><span class="dot"></span> Starting…</span>
<span class="pill pill-stopping"><span class="dot"></span> Stopping</span>
<span class="pill pill-stopped">Stopped</span>
<span class="pill pill-error">Failed</span>
```

- Padding 3px 10px, border-radius 12px
- Font: 11px, 600 weight, uppercase, JetBrains Mono
- `pulse` animation on the dot for active/starting/attention states

**Use for:** team lifecycle, agent status, error states, queued states.

---

## 7. Status dot

Tiny 8px circle next to a session label.

```html
<div class="status-dot thinking"></div>
```

States: `idle` (faint), `thinking` (info, pulsing), `tool` (warn), `attention` (accent, pulsing), `error` (error).

**Use for:** session picker dots, agent list, quick status indicators.

---

## 8. Tab

Used in both middle pane (horizontal) and right pane (vertical mini-tabs).

### Middle pane tab (horizontal)

```html
<button class="middle-tab active" data-tab="chat">
  <svg class="tab-icon">...</svg>
  <span class="tab-label">Chat</span>
  <span class="tab-close">×</span>
</button>
```

- Height: 36px, padding 0 12px
- Border-bottom 2px transparent, becomes `--accent` when active
- Active state: bg = `--bg`, color = `--text`
- Inactive: bg = transparent, color = `--text-dim`
- Hover: bg = `--surface-2`
- Pinned tabs (like Chat) hide the close button
- Tabs with unread content show a small badge

### Right pane tab (vertical, uppercase)

```html
<button class="rp-tab active" data-tab="files">Files</button>
```

- Flex 1, padding 10px 6px
- Font 10px uppercase
- Same color/border logic as middle tabs

---

## 9. Lifecycle step

5-state team lifecycle indicator (Draft → Starting → Active → Stopping → Stopped).

```html
<div class="lifecycle-step active">
  <div class="num">2</div>
  <div class="label">● Starting</div>
</div>
```

- 5 columns, equal width
- Each cell: number (10px mono, faint) + label (11px uppercase)
- Past: muted surface, dim text
- Current: accent-soft bg, accent text
- Future: muted surface, faint text

---

## 10. Status banner

Big colored banner showing current state (used in team-active.html).

```html
<div class="status-banner active">
  <div class="icon">[svg]</div>
  <div class="info">
    <h3>Title</h3>
    <p>Subtitle / description</p>
    <div class="progress-bar"><div class="progress-bar-fill" style="width: 60%;"></div></div>
  </div>
</div>
```

- Border-left 3px (color depends on state: accent, info, warn, error)
- Icon: 40px circle with state-colored bg
- Optional progress bar below info
- States: `active`, `starting`, `stopping`, `error`

---

## 11. Table

Used for tabular data (Detected vaults, lifecycle, skill lists).

```html
<table class="tbl">
  <thead>
    <tr>
      <th>NAME</th>
      <th>PATH</th>
      <th class="action-col">ACTION</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Cell</td>
      <td class="mono path-cell">path\with\backslashes</td>
      <td class="action-col"><button class="btn btn-sm">Action</button></td>
    </tr>
  </tbody>
</table>
```

- Header: 10px uppercase, `--text-faint`, `white-space: nowrap`
- Cell: 12px padding, vertical-align middle
- `.mono path-cell`: word-break break-all, max-width 360px
- `.action-col`: right-aligned, 90px width
- Row hover: subtle `--surface-2` tint

---

## 12. Choice card

3-card grid for picking between options (used in onboarding).

```html
<div class="choice active">
  <div class="choice-icon">[svg]</div>
  <h3>Title</h3>
  <p>Description</p>
  <div class="badge">● recommended</div>
</div>
```

- 3 columns in a grid (16px gap)
- 20px padding
- Hover: border → `--accent`
- Active: border `--accent`, bg `--accent-soft`
- Icon: 40px square with `--accent` color SVG inside

---

## 13. Skill chip

Compact monospace pill for skill names.

```html
<label class="skill-chip">
  <input type="checkbox" checked />
  <span>obsidian-read</span>
</label>
```

- 2px 8px padding, border-radius 10px
- Background: `--surface-2`, font 10px mono, color `--text-dim`
- Used in skill pickers (team-new member form, settings)

---

## 14. File tree node

Row in the right pane's file tree.

```html
<div class="ft-node dir">
  <svg>...icon...</svg>
  Projects/Q3 Shoot
</div>
<div class="ft-node file indent-1">
  <svg>...icon...</svg>
  feasibility.md
</div>
```

- 3px 16px padding, monospace 12px
- Color: `--text-dim` for files, `--text` for dirs
- Indent classes: `.indent-1` (32px), `.indent-2` (52px), `.indent-3` (72px)
- Hover: bg `rgba(255,255,255,0.04)`
- Open file state: `.open-file` adds `--accent` color

---

## 15. TTS toggle pill

Per-session voice output toggle in the sidebar.

```html
<span class="tts-toggle on">🔊 on</span>
<span class="tts-toggle off">🔇 off</span>
```

- 2px 8px padding, border-radius 10px
- 10px uppercase, mono font
- On: `--accent-soft` bg, `--accent` text
- Off: gray bg, faint text

---

## 16. Waveform bars (PTT active indicator)

```html
<div class="waveform">
  <div class="waveform-bar"></div>
  <div class="waveform-bar"></div>
  <div class="waveform-bar"></div>
  <div class="waveform-bar"></div>
</div>
```

- 4px wide bars, 24px tall container
- 8 bars with staggered `wave` animation (each 0.1s offset)
- Color: `--error` (red, when recording)
- 0.8s animation cycle

---

## 17. Input area (chat)

```html
<div class="input-area">
  <div class="input-box">
    <button class="icon-btn">[mic icon]</button>
    <textarea placeholder="..." rows="1">Default text</textarea>
    <button class="icon-btn">[send icon]</button>
  </div>
  <div class="input-hint">
    <span>Enter send · Shift+Enter newline · Ctrl+Space PTT</span>
    <span>context info</span>
  </div>
</div>
```

- Input box: 12px 14px padding, 10px gap, 5px radius
- Focus: border → `--accent`
- Textarea: 14px, min 22px, max 200px (auto-grow)
- Hint: 11px mono, `--text-faint`

---

## 18. Empty state

```html
<div class="empty">
  <svg>[large icon]</svg>
  <h3>No teams yet</h3>
  <p>Create your first team to get started.</p>
  <button class="btn btn-primary">+ New Team</button>
</div>
```

- 48px 32px padding, centered
- Icon: 48-64px, opacity 0.4
- Title: 16px, `--text-dim`, 600
- Description: 13px, `--text-faint`, max 360px, auto-centered
- Optional CTA button

---

## 19. Form row (form layout)

```html
<div class="form-row">
  <label for="...">Field label</label>
  <input ... />
  <div class="hint">Helper text</div>
</div>
```

- 16px margin-bottom between rows
- Label: 11px uppercase, 6px margin-bottom
- Hint: 11px, 4px margin-top

For 2-column layouts:
```html
<div class="form-grid">
  <div class="form-row">...</div>
  <div class="form-row">...</div>
</div>
```

`form-grid` = 1fr 1fr, 16px gap.

---

## 20. Btn-row (button container)

```html
<div class="btn-row">
  <button class="btn">Cancel</button>
  <span class="spacer"></span>
  <button class="btn btn-primary">Save</button>
</div>
```

- 24px margin-top
- 8px gap between buttons
- `.spacer` is `flex: 1` for right-aligning
- `.right` modifier for `justify-content: flex-end`

---

## Notes on implementation

- All components use CSS custom properties — copy `:root` from `tokens.md` into your CSS
- All icons are inline SVG (no emoji, no icon font)
- All status indicators use the dot + pill pattern consistently
- All animations use the standard `pulse` / `bounce` / `wave` keyframes
- For responsive: components don't currently have mobile breakpoints (desktop-only for v1, see PRD §3)
