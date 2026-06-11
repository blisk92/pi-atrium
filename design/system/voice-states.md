# Voice UI States

Pi Atrium integrates with the existing `voice-loop` extension for TTS/STT. This doc covers the visual states for all three voice interactions: **PTT input**, **TTS output**, and the **per-session toggle**.

For the full prototype, see [`../prototype/voice.html`](../prototype/voice.html). For the data model, see `[[05-Voice-Integration]]` ADR.

---

## 1. Push-to-talk (input)

Triggered by holding `Ctrl+Space` (configurable in settings). Records audio, transcribes, sends to agent.

### States

| State | Visual | Behavior |
|---|---|---|
| **Idle** | Mic icon in input box, normal color | No recording; click triggers PTT mode |
| **Recording** | Red glowing border, waveform animating, "RECORDING — 0:04 / 60s" | Audio captured; release to send |
| **Transcribing** | Spinner next to mic, "Transcribing..." | Whisper running; can't cancel |
| **Sent** | Text appears in input box, ready to edit/send | Normal input flow |
| **Error** | Red border + toast "Couldn't transcribe audio" | Fall back to text input |

### Recording state (PTT active)

```html
<div class="ptt-active">
  <span class="ptt-dot"></span>
  <div class="waveform">
    <div class="waveform-bar"></div>
    <div class="waveform-bar"></div>
    <div class="waveform-bar"></div>
    <div class="waveform-bar"></div>
    <div class="waveform-bar"></div>
    <div class="waveform-bar"></div>
    <div class="waveform-bar"></div>
    <div class="waveform-bar"></div>
  </div>
  <div class="ptt-label">RECORDING — 0:04 / 60s</div>
  <span class="ptt-key">Ctrl+Space</span>
</div>
```

**Visual specs:**
- Container: red border (`--error`), glowing shadow (animated)
- Recording dot: 10px, `--error`, pulsing
- Waveform: 8 bars, 4px wide, 24px container, staggered animation
- Label: 12px, 600 weight, `--error`
- Elapsed time: `0:04 / 60s` format
- Hotkey indicator: 10px mono, `--text-faint`

### Input level meter (subtle, below PTT)

```html
<div class="level-meter">
  <div class="level-bar active"></div>
  <div class="level-bar active"></div>
  <div class="level-bar active"></div>
  <div class="level-bar active"></div>
  <div class="level-bar active"></div>
  <div class="level-bar active"></div>
  <div class="level-bar"></div>
  <div class="level-bar"></div>
</div>
```

- 8 bars, 4px wide, 8px tall
- Active bars light up in sequence based on input level (opacity 0.4 → 1.0)
- Threshold markers: -18dB = good, -6dB = loud, 0dB = clipping

### Error states

- **No mic permission** → banner at top of input: "Microphone access required. [Grant permission]"
- **Mic not detected** → "No microphone found. Check your audio settings."
- **Transcription failed** → toast + the audio is offered as a downloadable file (so user doesn't lose the recording)

---

## 2. TTS output (agent speaking)

The selected agent's response is synthesized and played back via voice-loop.

### States

| State | Visual | Behavior |
|---|---|---|
| **Idle** | Speaker icon in topbar, normal color | No audio playing |
| **Speaking** | Speaker icon active (`--accent`), "● SPEAKING" pill below last message, waveform animation in agent meta | Audio playing; can be interrupted |
| **Interrupted** | Brief fade-out animation, icon returns to idle | User typed or sent another message |
| **Error** | Toast "Couldn't play voice. Check voice provider settings." | Falls back to silent mode |

### Speaking state (TTS active)

In the chat message, add a small TTS playing indicator below the message body:

```html
<div class="tts-playing">
  <div class="bar">
    <span></span><span></span><span></span><span></span>
  </div>
  SPEAKING · 0:03 / 0:05 · Concierge
</div>
```

**Visual specs:**
- Container: `var(--accent-soft)` bg, `--accent` border, 8px 12px padding
- Bar: 4 small bars (2px wide), 12px tall, staggered bounce animation
- Label: 11px, 600 weight, uppercase
- Duration: `0:03 / 0:05` format
- Agent name: appended for clarity

In the chat topbar, the agent status changes:

```html
<div class="agent-info">
  <div class="agent-name">Concierge</div>
  <div class="agent-status">● speaking…</div>
</div>
```

The status dot also pulses green while speaking.

### Interruption

When the user types or clicks to interrupt, the TTS playing pill fades out (200ms) and the audio stops. No special action needed.

### Skip behavior

- User can click on a later message to skip to that part of the response
- The currently-playing message's TTS pill disappears
- The new message (if not yet spoken) becomes the new "speaking" target

---

## 3. Per-session TTS toggle (sidebar)

Each session in the sidebar has a small TTS toggle. Default: OFF.

### Visual

```html
<span class="tts-toggle on">🔊 on</span>
<span class="tts-toggle off">🔇 off</span>
```

- 2px 8px padding, border-radius 10px
- 10px uppercase, mono font
- On: `--accent-soft` bg, `--accent` text
- Off: gray bg, faint text

### Behavior

- Click toggles between on/off
- State persists per-session (in session config, not global)
- When on, every message from that session is auto-spoken
- When off, no TTS for that session
- Concierge TTS toggle is independent of team agent toggles

### States for the toggle itself

| State | Visual |
|---|---|
| Off (default) | Gray pill, "🔇 off" |
| On | Green pill, "🔊 on" |
| Hover | Slight brightness boost |
| TTS currently playing for this session | "● speaking" indicator in addition to "on" state |

---

## 4. Mic permission flow (first-run)

When the user first tries to use PTT:

```
┌─────────────────────────────────────────────┐
│  🔒  Microphone access required             │
│                                             │
│  Pi Atrium needs microphone access for      │
│  push-to-talk.                              │
│                                             │
│              [Grant permission]  [Skip]     │
└─────────────────────────────────────────────┘
```

- Modal-style banner (or system permission prompt from Electron)
- "Grant permission" calls `navigator.mediaDevices.getUserMedia({ audio: true })` (or Electron's equivalent)
- "Skip" closes the banner; PTT button is disabled until granted
- If denied: persistent banner until granted

---

## 5. Voice settings (link from chat topbar)

Full table of voice settings (from `voice.html`):

| Setting | Default | Notes |
|---|---|---|
| Provider | `voice-loop (MiniMax speech-2.8-hd)` | reuses existing extension |
| Default voice | `aussie-sultry-ladies` | configurable per team in v2 |
| Model | `speech-2.8-hd` (best quality) | alt: `speech-2.8-turbo` for speed |
| Speed | `1.0×` | slider 0.5× – 2.0× |
| PTT hotkey | `Ctrl+Space` | hold to record |
| Max recording | `60s` | auto-stop + send |
| STT backend | `local Whisper` | uses faster-whisper-server on port 8765 |

All settings live in `settings.html` (Voice section).

---

## 6. Empty / error / no-mic states

| Scenario | Behavior |
|---|---|
| No mic detected | Banner: "No microphone found. Check your audio settings." PTT button disabled. |
| Mic permission denied | Persistent banner: "Microphone access required. [Grant permission]" |
| TTS provider error | Toast: "Couldn't play voice. Check voice provider settings." Per-message TTS is skipped, doesn't fail the chat. |
| STT failure | Toast: "Couldn't transcribe audio. Try again or type your message." The recorded audio is offered as a downloadable file so nothing is lost. |
| Voice provider not configured | Onboarding warning: "No TTS provider configured. Pi Atrium will work in text-only mode. [Configure in Settings]" |
