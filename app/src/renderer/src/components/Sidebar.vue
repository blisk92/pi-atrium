<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useSessionStore } from '../stores/sessions'

const store = useSessionStore()

const sessions = computed(() => store.sessions)
const activeId = computed(() => store.activeId)

let cleanup: (() => void) | null = null

onMounted(() => {
  store.subscribe()
  cleanup = () => store.unsubscribe()
})
onUnmounted(() => {
  if (cleanup) cleanup()
})

async function onSpawn(): Promise<void> {
  await store.spawn()
}

async function onStop(id: string, e: Event): Promise<void> {
  e.stopPropagation()
  if (id === 'concierge') return // can't kill the concierge
  await store.stop(id)
}

async function onToggleTts(id: string, e: Event): Promise<void> {
  e.stopPropagation()
  const s = store.sessions.find((x) => x.id === id)
  if (!s) return
  await store.setTts(id, !s.ttsEnabled)
}
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-logo">π</div>
      <div class="brand-name">Pi Atrium</div>
    </div>

    <div class="sidebar-section">
      <div class="section-header">
        <span class="section-label">Sessions</span>
        <button class="spawn-btn" title="Spawn new session" @click="onSpawn">+</button>
      </div>
      <div
        v-for="s in sessions"
        :key="s.id"
        class="session"
        :class="{ active: s.id === activeId }"
        @click="store.select(s.id)"
      >
        <span
          class="status-dot"
          :class="{
            'dot-idle': s.status === 'idle',
            'dot-starting': s.status === 'starting',
            'dot-active': s.status === 'active',
            'dot-error': s.status === 'error',
          }"
        ></span>
        <div class="session-info">
          <div class="session-name">{{ s.name }}</div>
          <div class="session-sub">
            <span v-if="s.status === 'starting'">Spawning…</span>
            <span v-else-if="s.status === 'active'">
              port {{ s.port }}
              <span v-if="s.pid" class="mono">· pid {{ s.pid }}</span>
            </span>
            <span v-else-if="s.status === 'error'" class="err">{{ s.errorMessage || 'Error' }}</span>
            <span v-else>{{ s.status }}</span>
          </div>
        </div>
        <span v-if="s.isConcierge" class="concierge-pill">★</span>
        <span
          v-if="!s.isConcierge"
          class="tts-toggle"
          :class="{ on: s.ttsEnabled }"
          :title="s.ttsEnabled ? 'TTS on' : 'TTS off (Wave 5 wires it up)'"
          @click="(e) => onToggleTts(s.id, e)"
        >
          🔊
        </span>
        <button
          v-if="!s.isConcierge"
          class="stop-btn"
          title="Stop session"
          @click="(e) => onStop(s.id, e)"
        >×</button>
      </div>
      <div v-if="sessions.length === 0" class="empty">
        <div class="spinner"></div>
        <p>Spawning concierge…</p>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.brand {
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.brand-logo {
  width: 22px; height: 22px;
  background: var(--accent);
  border-radius: 5px;
  display: grid; place-items: center;
  color: var(--bg);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 12px;
}
.brand-name {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.3px;
}
.sidebar-section {
  padding: 12px 0;
  flex: 1;
  overflow-y: auto;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px 8px;
}
.section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-faint);
}
.spawn-btn {
  width: 20px; height: 20px;
  background: var(--surface-2);
  color: var(--text-dim);
  border: none;
  border-radius: 3px;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: grid; place-items: center;
  transition: all 0.15s;
}
.spawn-btn:hover { background: var(--accent); color: var(--bg); }

.session {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 18px 8px 28px;
  color: var(--text-dim);
  font-size: 13px;
  border-left: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.session:hover { background: rgba(255, 255, 255, 0.02); }
.session.active {
  background: var(--accent-soft);
  color: var(--text);
  border-left-color: var(--accent);
}
.session-info { flex: 1; min-width: 0; }
.session-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.session-sub {
  font-size: 10px;
  color: var(--text-faint);
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.session-sub .mono { color: var(--text-faint); }
.session-sub .err { color: var(--error); font-family: inherit; }
.concierge-pill {
  display: inline-block;
  padding: 1px 6px;
  background: var(--accent);
  color: var(--bg);
  font-size: 9px;
  font-weight: 700;
  border-radius: 3px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.tts-toggle {
  width: 22px; height: 22px;
  display: grid; place-items: center;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
  background: transparent;
  color: var(--text-faint);
  transition: all 0.15s;
  flex-shrink: 0;
}
.tts-toggle:hover { background: var(--surface-2); }
.tts-toggle.on { background: var(--accent); color: var(--bg); }
.stop-btn {
  width: 20px; height: 20px;
  display: grid; place-items: center;
  border-radius: 3px;
  font-size: 14px;
  background: transparent;
  color: var(--text-faint);
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.stop-btn:hover { background: var(--error); color: white; }

.status-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--text-faint);
  flex-shrink: 0;
}
.dot-idle { background: var(--text-faint); }
.dot-starting { background: var(--info); animation: pulse 1.5s ease-in-out infinite; }
.dot-active { background: var(--accent); }
.dot-error { background: var(--error); }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.empty {
  padding: 32px 28px;
  text-align: center;
  color: var(--text-faint);
  font-size: 11px;
}
.empty .spinner {
  width: 24px; height: 24px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 10px;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
