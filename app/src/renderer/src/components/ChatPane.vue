<script setup lang="ts">
import { useAppStore } from '../stores/app'
import { computed } from 'vue'

const store = useAppStore()

const concierge = computed(() =>
  store.sessions.find((s) => s.isConcierge)
)

const version = (window as any).piAtrium?.version ?? '0.0.0'
</script>

<template>
  <main class="chat-pane">
    <div class="topbar">
      <div class="topbar-left">
        <div class="agent-avatar">CC</div>
        <div class="agent-info">
          <div class="agent-name">Concierge</div>
          <div class="agent-status">
            <span class="status-dot dot-idle"></span>
            <span v-if="concierge?.status === 'idle'">Ready (Slice 0.1 — no agent spawned yet)</span>
            <span v-else>{{ concierge?.status }}</span>
          </div>
        </div>
      </div>
      <div class="topbar-right">
        <span class="version-pill">v{{ version }}</span>
      </div>
    </div>

    <div class="chat">
      <div class="empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.4;">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <h3>Wave 0 · Slice 0.1 — "Empty room"</h3>
        <p>The 3-pane shell is up. Concierge sidecar spawns in <strong>Slice 0.2</strong>. Once it's running, you can chat here.</p>
        <p v-if="store.coldStartMs !== null" class="cold-start">
          ⏱ Cold start: <strong>{{ store.coldStartMs }}ms</strong>
          <span v-if="store.coldStartMs < 5000" class="ok">✓ under 5s target</span>
          <span v-else class="warn">⚠ over 5s target</span>
        </p>
      </div>
    </div>

    <div class="input-area">
      <div class="input-box disabled">
        <span class="input-placeholder">Chat input will be enabled in Slice 0.3…</span>
      </div>
    </div>
  </main>
</template>

<style scoped>
.chat-pane {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.topbar {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  flex-shrink: 0;
}
.topbar-left { display: flex; align-items: center; gap: 14px; }
.agent-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--surface-2);
  display: grid; place-items: center;
  color: var(--text);
  font-weight: 600;
  font-size: 12px;
}
.agent-info { display: flex; flex-direction: column; }
.agent-name { font-size: 14px; font-weight: 600; }
.agent-status {
  font-size: 11px;
  color: var(--text-faint);
  display: flex;
  align-items: center;
  gap: 5px;
}
.status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--text-faint);
}
.dot-idle { background: var(--text-faint); }
.dot-starting { background: var(--info); animation: pulse 1.5s ease-in-out infinite; }
.dot-active { background: var(--accent); }
.dot-thinking { background: var(--info); animation: pulse 1.5s ease-in-out infinite; }
.dot-tool { background: var(--warn); }
.dot-attention { background: var(--accent); animation: pulse 1.5s ease-in-out infinite; }
.dot-error { background: var(--error); }
.dot-stopping { background: var(--warn); }
.dot-stopped { background: var(--text-faint); }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.version-pill {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--text-faint);
  background: var(--surface-2);
  padding: 3px 8px;
  border-radius: 3px;
}

.chat {
  flex: 1;
  overflow-y: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.empty {
  max-width: 420px;
  text-align: center;
  color: var(--text-dim);
}
.empty h3 {
  font-size: 15px;
  color: var(--text);
  margin: 12px 0 6px;
  font-weight: 600;
}
.empty p { font-size: 13px; line-height: 1.6; margin-bottom: 8px; }
.empty strong { color: var(--text); }
.cold-start {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-faint);
  font-family: 'JetBrains Mono', monospace;
  margin-top: 16px;
  padding: 8px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.cold-start strong { color: var(--text); font-size: 14px; }
.cold-start .ok { color: var(--accent); }
.cold-start .warn { color: var(--warn); }

.input-area {
  padding: 16px 32px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}
.input-box {
  display: flex; align-items: center;
  padding: 12px 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  opacity: 0.5;
}
.input-box.disabled { cursor: not-allowed; }
.input-placeholder {
  color: var(--text-faint);
  font-size: 13px;
  font-style: italic;
}
</style>
