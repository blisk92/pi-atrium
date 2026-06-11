<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()

const concierge = computed(() => store.concierge)

let unsubscribe: (() => void) | null = null
onMounted(() => {
  unsubscribe = store.subscribeConcierge()
})
onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-logo">π</div>
      <div class="brand-name">Pi Atrium</div>
    </div>

    <div class="sidebar-section">
      <div class="section-label">Pinned</div>
      <div class="session" :class="{ active: concierge.status === 'active' }">
        <span
          class="status-dot"
          :class="{
            'dot-idle': concierge.status === 'idle',
            'dot-starting': concierge.status === 'starting',
            'dot-active': concierge.status === 'active',
            'dot-error': concierge.status === 'error',
          }"
        ></span>
        <span class="session-name">Concierge</span>
        <span class="concierge-pill">★</span>
      </div>
      <div v-if="concierge.status === 'starting'" class="status-text">
        Spawning…
      </div>
      <div v-else-if="concierge.status === 'error'" class="status-text error">
        {{ concierge.errorMessage || 'Failed to start' }}
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
.section-label {
  padding: 0 28px 8px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-faint);
}
.session {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 18px 8px 28px;
  color: var(--text-dim);
  font-size: 13px;
  border-left: 2px solid transparent;
  transition: all var(--transition);
}
.session.active {
  background: var(--accent-soft);
  color: var(--text);
  border-left-color: var(--accent);
}
.session-name { flex: 1; }
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
.status-text {
  padding: 4px 28px 0;
  font-size: 11px;
  color: var(--text-faint);
  font-style: italic;
}
.status-text.error { color: var(--error); font-style: normal; }
</style>
