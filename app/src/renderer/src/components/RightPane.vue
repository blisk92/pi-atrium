<script setup lang="ts">
import { ref } from 'vue'

type Pane = 'files' | 'brain' | 'skills' | 'activity'
const active = ref<Pane>('files')

const tabs: Array<{ id: Pane; label: string }> = [
  { id: 'files', label: 'Files' },
  { id: 'brain', label: 'Brain' },
  { id: 'skills', label: 'Skills' },
  { id: 'activity', label: 'Activity' },
]
</script>

<template>
  <aside class="right-pane">
    <div class="rp-tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="rp-tab"
        :class="{ active: active === t.id }"
        @click="active = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="rp-content">
      <div v-show="active === 'files'" class="tab-pane">
        <div class="empty">File tree renders in Wave 6 (placeholder for now)</div>
      </div>
      <div v-show="active === 'brain'" class="tab-pane">
        <div class="empty">Per-agent brain viewer (Wave 3)</div>
      </div>
      <div v-show="active === 'skills'" class="tab-pane">
        <div class="empty">Per-agent skill management (Wave 4)</div>
      </div>
      <div v-show="active === 'activity'" class="tab-pane">
        <div class="empty">Activity log (Wave 5+)</div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.right-pane {
  background: var(--surface);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.rp-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.rp-tab {
  flex: 1;
  padding: 10px 6px;
  background: transparent;
  color: var(--text-faint);
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all var(--transition);
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
}
.rp-tab:hover { color: var(--text-dim); background: rgba(255,255,255,0.02); }
.rp-tab.active {
  color: var(--text);
  border-bottom-color: var(--accent);
}
.rp-content {
  flex: 1;
  overflow-y: auto;
}
.tab-pane { display: block; }
.empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--text-faint);
  font-size: 12px;
  font-style: italic;
}
</style>
