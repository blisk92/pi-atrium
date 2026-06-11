<script setup lang="ts">
import { useAppStore } from '../stores/app'
import { computed } from 'vue'

const store = useAppStore()
const c = computed(() => store.concierge)
</script>

<template>
  <main class="chat-pane">
    <div class="topbar">
      <div class="topbar-left">
        <div class="agent-avatar">CC</div>
        <div class="agent-info">
          <div class="agent-name">Concierge</div>
          <div class="agent-status">
            <span
              class="status-dot"
              :class="{
                'dot-idle': c.status === 'idle',
                'dot-starting': c.status === 'starting',
                'dot-active': c.status === 'active',
                'dot-error': c.status === 'error',
              }"
            ></span>
            <span v-if="c.status === 'idle'">Waiting to spawn…</span>
            <span v-else-if="c.status === 'starting'">Starting concierge…</span>
            <span v-else-if="c.status === 'active'">
              Active
              <span v-if="c.pid" class="mono"> · pid {{ c.pid }}</span>
              <span v-if="store.spawnMs !== null" class="mono"> · spawned in {{ store.spawnMs }}ms</span>
            </span>
            <span v-else class="error">Error: {{ c.errorMessage }}</span>
          </div>
        </div>
      </div>
      <div class="topbar-right">
        <span class="version-pill">v0.2.0</span>
      </div>
    </div>

    <div class="chat">
      <div v-if="c.status === 'starting'" class="empty">
        <div class="spinner"></div>
        <h3>Starting concierge…</h3>
        <p>Spinning up the headless Pi sidecar on port {{ c.port }}.</p>
      </div>

      <div v-else-if="c.status === 'active'" class="empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.4;">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <h3>Concierge is live</h3>
        <p>Slice 0.2 complete. The concierge headless Pi sidecar is running on port <code>{{ c.port }}</code> with pid <code>{{ c.pid }}</code>.</p>
        <p v-if="store.spawnMs !== null" class="bench">
          ⏱ <strong>Spawn benchmark:</strong> {{ store.spawnMs }}ms
          <span v-if="store.spawnMs < 3000" class="ok">✓ under 3s target</span>
          <span v-else class="warn">⚠ over 3s target</span>
        </p>
        <p v-if="store.coldStartMs !== null" class="bench">
          ⏱ Cold start: {{ store.coldStartMs }}ms
        </p>
        <p class="hint">Chat input wires up in <strong>Slice 0.3</strong>.</p>
      </div>

      <div v-else-if="c.status === 'error'" class="empty error">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <h3>Concierge failed to start</h3>
        <p>{{ c.errorMessage }}</p>
      </div>

      <div v-else class="empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.4;">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <h3>Idle</h3>
        <p>App just started. Waiting for concierge spawn…</p>
      </div>
    </div>

    <div class="input-area">
      <div class="input-box disabled">
        <span class="input-placeholder">Chat input wires up in Slice 0.3…</span>
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
.agent-status .mono { color: var(--text-faint); }
.agent-status .error { color: var(--error); }
.status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--text-faint);
}
.dot-idle { background: var(--text-faint); }
.dot-starting { background: var(--info); animation: pulse 1.5s ease-in-out infinite; }
.dot-active { background: var(--accent); }
.dot-error { background: var(--error); }
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
  max-width: 480px;
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
.empty code { font-family: 'JetBrains Mono', monospace; color: var(--accent); }
.empty.error h3 { color: var(--error); }
.bench {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-faint);
  font-family: 'JetBrains Mono', monospace;
  margin-top: 8px;
  padding: 6px 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.bench strong { color: var(--text); font-size: 13px; }
.bench .ok { color: var(--accent); }
.bench .warn { color: var(--warn); }
.hint { color: var(--text-faint); font-size: 12px; margin-top: 12px; font-style: italic; }

.spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}
@keyframes spin { to { transform: rotate(360deg); } }

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
