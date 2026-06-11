<script setup lang="ts">
import { useAppStore } from '../stores/app'
import { computed } from 'vue'
import type { AgentStatus } from '@shared/types'

const store = useAppStore()

const concierge = computed(() =>
  store.sessions.find((s) => s.isConcierge)
)

function dotClass(status: AgentStatus): string {
  return `dot-${status}`
}
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-logo">π</div>
      <div class="brand-name">Pi Atrium</div>
    </div>

    <div class="sidebar-section">
      <div v-if="concierge" class="session" :class="{ active: concierge.status === 'active' }">
        <span class="status-dot" :class="dotClass(concierge.status)"></span>
        <span class="session-name">{{ concierge.name }}</span>
        <span class="concierge-pill">★</span>
      </div>
      <div v-else class="empty">No concierge yet</div>
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
  padding: 8px 0;
  flex: 1;
  overflow-y: auto;
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
.dot-thinking { background: var(--info); animation: pulse 1.5s ease-in-out infinite; }
.dot-tool { background: var(--warn); }
.dot-attention { background: var(--accent); animation: pulse 1.5s ease-in-out infinite; }
.dot-error { background: var(--error); }
.dot-stopping { background: var(--warn); }
.dot-stopped { background: var(--text-faint); }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.empty {
  padding: 12px 28px;
  color: var(--text-faint);
  font-size: 12px;
  font-style: italic;
}
</style>
