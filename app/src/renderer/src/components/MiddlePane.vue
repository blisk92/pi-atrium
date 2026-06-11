<script setup lang="ts">
/**
 * Middle pane — tabbed container with a pinned Chat tab and dynamic file tabs.
 * Wave 0 / Task 0.3: just the Chat tab. File tabs arrive in Wave 6.
 */
import { computed, ref } from 'vue'
import ChatPane from './ChatPane.vue'

interface Tab {
  id: string
  label: string
  icon?: string
  pinned?: boolean
  closable?: boolean
}

const tabs = ref<Tab[]>([
  { id: 'chat', label: 'Chat', icon: '💬', pinned: true },
])
const activeTab = ref<string>('chat')

const activeIsChat = computed(() => activeTab.value === 'chat')
</script>

<template>
  <div class="middle-pane">
    <div class="tab-bar">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="tab"
        :class="{ active: t.id === activeTab, pinned: t.pinned }"
        @click="activeTab = t.id"
      >
        <span v-if="t.icon" class="tab-icon">{{ t.icon }}</span>
        <span class="tab-label">{{ t.label }}</span>
        <span v-if="t.pinned" class="pin-icon" title="Pinned">★</span>
      </button>
    </div>
    <div class="tab-content">
      <ChatPane v-if="activeIsChat" />
      <div v-else class="placeholder">
        {{ tabs.find((t) => t.id === activeTab)?.label }} — coming in a later wave
      </div>
    </div>
  </div>
</template>

<style scoped>
.middle-pane {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  background: var(--bg);
}
.tab-bar {
  display: flex;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  padding: 0 8px;
  overflow-x: auto;
  flex-shrink: 0;
}
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  color: var(--text-faint);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.tab:hover { color: var(--text-dim); }
.tab.active {
  color: var(--text);
  border-bottom-color: var(--accent);
}
.tab-icon { font-size: 12px; }
.tab-label { font-weight: 500; }
.pin-icon {
  font-size: 9px;
  color: var(--accent);
  margin-left: 2px;
}
.tab-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.placeholder {
  flex: 1;
  display: grid;
  place-items: center;
  color: var(--text-faint);
  font-size: 13px;
  font-style: italic;
}
</style>
