# State Patterns

How Pi Atrium components behave across the four primary states: **empty**, **loading**, **error**, **success**. Every interactive surface needs to handle all four.

---

## 1. Empty state

When a surface has no content yet.

**Pattern:**

```html
<div class="empty">
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    [appropriate icon]
  </svg>
  <h3>[What the user is looking at]</h3>
  <p>[Why it's empty + what to do about it]</p>
  <button class="btn btn-primary">[Primary action]</button>
</div>
```

**Rules:**
- Always show the icon at low opacity (0.4)
- Title is short, present-tense ("No teams yet", "No skills installed")
- Description is 1 sentence, 12-20 words max, includes a hint
- CTA is the primary action that fills the empty state
- No "loading" or "error" indicators — keep it clean

**Examples in the app:**
- No teams in sidebar → "+ New Team" button
- No skills in agent config → "Add skills" button + hint about paste/upload
- No brain entries yet → "Start a conversation to populate" hint
- No activity log → "Activity will appear here" hint

---

## 2. Loading state

When content is being fetched / computed / spawned.

**Three variants:**

### Inline (most common)

Replace the static content with a skeleton or spinner:

```html
<!-- Skeleton (preferred for content) -->
<div class="skeleton-line" style="width: 60%;"></div>
<div class="skeleton-line" style="width: 80%;"></div>
<div class="skeleton-line" style="width: 45%;"></div>

<!-- Spinner (preferred for actions) -->
<div class="spinner-sm"></div>
```

### PTT / recording (in-input)

```html
<div class="ptt-active">
  <span class="ptt-dot"></span>
  <div class="waveform">[8 bars animating]</div>
  <div class="ptt-label">RECORDING — 0:04 / 60s</div>
  <span class="ptt-key">Ctrl+Space</span>
</div>
```

### Per-row (long operations)

Use `pill pill-starting` or status dots:

```html
<span class="status-dot thinking"></span>
<span>Feasibility</span>
<span class="pill pill-starting"><span class="dot"></span> Starting…</span>
```

**Rules:**
- Always show a pulsing indicator (dot, waveform, or progress bar) so the user knows it's not frozen
- For long operations (>2s), include elapsed time
- For agent spawns, show a progress bar with the count (e.g., "1 of 3 agents started")
- NEVER use a blocking modal spinner — Pi Atrium is non-blocking by design

---

## 3. Error state

When something goes wrong. Critical to handle gracefully — agents will fail, files won't open, etc.

**Three levels of error:**

### Inline (form validation, simple errors)

```html
<div class="form-row error">
  <label>Vault path</label>
  <input type="text" value="..." aria-invalid="true" />
  <div class="hint error">Folder not found or not a vault</div>
</div>
```

- Red left border on the input (4px)
- Error message in `--error` color below
- `aria-invalid="true"` for accessibility

### Toast (transient, dismissable)

```html
<div class="toast toast-error" role="alert">
  <svg class="toast-icon">...</svg>
  <div>
    <div class="toast-title">Couldn't spawn Storyboard</div>
    <div class="toast-msg">Port 49154 already in use. Retry?</div>
  </div>
  <button class="toast-close">×</button>
</div>
```

- Slides in from bottom-right
- Auto-dismisses after 5s (or click ×)
- Has action button if recoverable (e.g., "Retry")

### Banner (persistent, page-level)

```html
<div class="status-banner error">
  <div class="icon">[error icon]</div>
  <div class="info">
    <h3>Couldn't load vault</h3>
    <p>The path <code class="mono">C:\path</code> doesn't appear to be an Obsidian vault. Re-link or create a new one.</p>
  </div>
</div>
```

- Reuses the status-banner pattern with `error` variant
- Stays until the user takes an action or the issue resolves

### Agent failure (specific pattern)

When a per-agent spawn fails (port conflict, etc.):

```html
<tr>
  <td>Storyboard</td>
  <td><span class="pill pill-error">Failed</span></td>
  <td class="mono">1 / 1 (gave up)</td>
  <td><button class="btn btn-sm">Retry</button></td>
</tr>
```

- Red `pill-error` badge
- Show retry count
- Always offer a Retry button (or "View error" → detail)

**Rules:**
- Always explain WHAT failed and WHY (in plain language)
- Always offer a next action (Retry, View, Switch, Re-link)
- Never show a raw stack trace to the user
- Log the full error to the agent's episodic memory for debugging

---

## 4. Success state

When something completes. Keep it brief — most successes just transition the UI without a toast.

**Patterns:**

### Inline state change

- Pill changes color: `pill-starting` → `pill-active` (with a brief pulse)
- Status dot changes: `thinking` → `idle`
- Tab gets a "saved" indicator that fades after 2s

### Toast (for explicit user actions)

```html
<div class="toast toast-success" role="status">
  <svg class="toast-icon">...</svg>
  <div>
    <div class="toast-title">Team started</div>
    <div class="toast-msg">3 agents spawned in 4.2s</div>
  </div>
  <button class="toast-close">×</button>
</div>
```

- Slides in from bottom-right
- Auto-dismisses after 3s (shorter than error)
- Use sparingly — not for every action, only for "this just happened and you might want to know"

### Inline confirmation (in-place)

- Button briefly shows a checkmark icon
- "Saved" text appears next to the action
- Fades after 2s

**Rules:**
- Don't over-toast. Most actions just update the UI silently.
- Reserve toasts for: errors, cross-cutting operations (team started, vault linked), or things that take >2s
- Success toasts should be SHORT (3s) and unobtrusive
- Error toasts should be persistent (5s+) and require acknowledgment

---

## 5. Disabled state

When an action is unavailable.

**Patterns:**

- Button: opacity 0.5, `pointer-events: none`, cursor `not-allowed`
- Input: `--text-faint` color, no hover state
- Tab: 50% opacity, no underline
- Toggle: `--surface-2` background, knob stays at "off" position

**When to disable:**
- Required prerequisites not met (e.g., "Start" disabled if no agents in team)
- Async operation in progress (e.g., button shows spinner, can't be re-clicked)
- User has no permission (N/A in solo app)

**When NOT to disable:**
- Instead, allow the action and show an error/guidance
- E.g., "Save" with no changes should be clickable but show a "No changes" toast

---

## 6. Loading vs. error timing

A common pattern: an operation can be in one of these states at once.

| State | Indicator | Replaces | After |
|---|---|---|---|
| Idle | — | — | Click triggers → Loading |
| Loading | Spinner / skeleton / progress | Action button content | → Success or Error |
| Success | Brief toast or inline check | Loading state | → Idle (after 3-5s) |
| Error | Persistent toast or inline error | Loading state | → Idle (after user dismisses or 5s) |

**Don't:**
- Show "Loading..." for less than 200ms (causes flicker)
- Show both Loading and Error at the same time
- Auto-dismiss errors (user might miss them)

---

## 7. Confirmation patterns

For destructive actions (Halt team, Delete, Reset).

- **Default:** confirm via modal dialog with explicit "Yes, halt" / "Cancel" buttons
- **Quick (recent):** "Are you sure?" with a 5-second "undo" toast after the action
- **For irreversible (Delete vault):** always require modal confirmation + typed confirmation ("type 'DELETE' to confirm")

For v1, the only destructive action is "Halt team" (with a graceful 10s timeout that itself is a safety net). So a simple "Are you sure?" modal is sufficient.

---

## 8. Empty/loading/error coverage matrix

Every interactive surface needs all 4 states. Here's the plan:

| Surface | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Session picker (no teams) | ✅ empty | n/a | n/a | n/a |
| Team spawn | n/a | ✅ progress bar | ✅ pill-error | ✅ pill-active |
| Chat (first message) | n/a | ✅ thinking bubble | ✅ error message | n/a (just shows reply) |
| File tree (no files) | ✅ empty | n/a | ✅ error message | n/a |
| Brain tab (no entries) | ✅ empty | ✅ skeleton | ✅ error | n/a |
| Skills tab (no skills) | ✅ empty | n/a | n/a | n/a |
| Activity tab (no activity) | ✅ empty | n/a | n/a | n/a |
| Settings (loading) | n/a | ✅ skeleton | ✅ error banner | n/a |
| File preview (no content) | n/a | ✅ skeleton | ✅ error | n/a |
| PTT (idle) | n/a | ✅ waveform | n/a | n/a |

Coverage verified for v1.
