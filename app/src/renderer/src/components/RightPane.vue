<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../stores/app'
import { useChatStore } from '../stores/chat'
import { useSessionStore } from '../stores/sessions'
import TreeNode, { type TreeNodeData } from './TreeNode.vue'

type Pane = 'files' | 'brain' | 'skills' | 'activity'
const active = ref<Pane>('files')

const appStore = useAppStore()
const chat = useChatStore()
const sessions = useSessionStore()

const tabs: Array<{ id: Pane; label: string }> = [
  { id: 'files', label: 'Files' },
  { id: 'brain', label: 'Brain' },
  { id: 'skills', label: 'Skills' },
  { id: 'activity', label: 'Activity' },
]

// Brain tab state
const brain = ref<{
  agentId: string
  agentName: string
  role?: string
  profile: string
  sections: { id: string; name: string; description: string; entries: { id: string; text: string; createdAt: number }[] }[]
  totalEntries: number
} | null>(null)
const expandedSections = ref<Set<string>>(new Set(['episodic']))
const brainLoading = ref(false)

async function loadBrain(): Promise<void> {
  const agentId = sessions.activeId
  if (!agentId) {
    brain.value = null
    return
  }
  brainLoading.value = true
  try {
    const api = window.piAtrium
    if (!api) return
    brain.value = await api.agents.brain(agentId)
  } finally {
    brainLoading.value = false
  }
}

watch(
  () => [active.value, sessions.activeId],
  ([a, id]) => {
    if (a === 'brain' && id) void loadBrain()
  },
  { immediate: true }
)

function toggleSection(id: string): void {
  const next = new Set(expandedSections.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedSections.value = next
}

// ----- Mock file tree (real vault scan is Wave 6) -----
const fileTree: TreeNodeData[] = [
  {
    name: 'app',
    kind: 'dir',
    children: [
      {
        name: 'resources',
        kind: 'dir',
        children: [{ name: 'system', kind: 'dir', children: [{ name: 'concierge.md', kind: 'file' }] }],
      },
      {
        name: 'src',
        kind: 'dir',
        children: [
          {
            name: 'headless-pi',
            kind: 'dir',
            children: [
              { name: 'cli.ts', kind: 'file' },
              { name: 'server.ts', kind: 'file' },
            ],
          },
          { name: 'main', kind: 'dir', children: [{ name: 'index.ts', kind: 'file' }] },
          {
            name: 'renderer',
            kind: 'dir',
            children: [
              { name: 'components', kind: 'dir', children: [] },
              { name: 'stores', kind: 'dir', children: [] },
            ],
          },
          { name: 'shared', kind: 'dir', children: [{ name: 'types.ts', kind: 'file' }] },
        ],
      },
      { name: 'package.json', kind: 'file' },
      { name: 'electron.vite.config.ts', kind: 'file' },
      { name: 'tsconfig.json', kind: 'file' },
    ],
  },
]

// ----- Mock skills (real skill management is Wave 4) -----
interface Skill {
  name: string
  description: string
  enabled: boolean
  source: 'builtin' | 'user' | 'agent'
}
const skills: Skill[] = [
  { name: 'obsidian_retrieve', description: 'Search and read Obsidian vault notes', enabled: false, source: 'builtin' },
  { name: 'app_context', description: 'Inspect app state (teams, agents, sessions)', enabled: false, source: 'builtin' },
  { name: 'skill-manager', description: 'Add or remove skills on the current agent', enabled: false, source: 'builtin' },
  { name: 'pi-intercom', description: 'Talk to other Pi agents', enabled: false, source: 'builtin' },
]

// ----- Activity log (real-time from chat) -----
const activity = computed(() => {
  const items: { time: string; type: 'system' | 'send' | 'receive' | 'tool'; text: string }[] = []
  if (appStore.spawnMs !== null) {
    items.push({
      time: 'boot',
      type: 'system',
      text: `Concierge spawned in ${appStore.spawnMs}ms (port ${appStore.concierge.port}, pid ${appStore.concierge.pid})`,
    })
  }
  for (const m of chat.messages) {
    if (m.role === 'user') {
      items.push({
        time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'send',
        text: `Sent: ${m.content.slice(0, 60)}${m.content.length > 60 ? '…' : ''}`,
      })
    } else if (m.role === 'agent') {
      if (m.content) {
        items.push({
          time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'receive',
          text: `Received (${m.content.length} chars): ${m.content.slice(0, 60)}${m.content.length > 60 ? '…' : ''}`,
        })
      }
      if (m.toolCall) {
        items.push({
          time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'tool',
          text: `Tool call: ${m.toolCall.name}${m.toolCall.durationMs ? ` (${m.toolCall.durationMs}ms)` : ''}`,
        })
      }
    }
  }
  return items
})
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
      <!-- FILES TAB -->
      <div v-show="active === 'files'" class="tab-pane">
        <div class="pane-header">
          <span class="pane-title">Files</span>
          <span class="pane-subtitle">team cwd</span>
        </div>
        <div class="file-tree">
          <ul>
            <TreeNode v-for="n in fileTree" :key="n.name" :node="n" :depth="0" />
          </ul>
        </div>
        <div class="pane-footer">
          <span>Real vault scan → Wave 6</span>
        </div>
      </div>

      <!-- BRAIN TAB -->
      <div v-show="active === 'brain'" class="tab-pane">
        <div class="pane-header">
          <span class="pane-title">Brain</span>
          <span class="pane-subtitle">
            <template v-if="brain">{{ brain.agentName }} · {{ brain.totalEntries }} entries</template>
            <template v-else>—</template>
          </span>
        </div>
        <div v-if="brainLoading" class="loading">Loading…</div>
        <div v-else-if="!brain" class="empty-state">
          No active session.
        </div>
        <div v-else class="brain-list">
          <div class="brain-profile">
            <div class="profile-label">Profile</div>
            <div class="profile-text">{{ brain.profile }}</div>
          </div>
          <div
            v-for="s in brain.sections"
            :key="s.id"
            class="brain-card"
            :class="{ expanded: expandedSections.has(s.id) }"
          >
            <div class="brain-card-head" @click="toggleSection(s.id)">
              <span class="brain-name">{{ s.name }}</span>
              <span class="brain-count">{{ s.entries.length }} entr{{ s.entries.length === 1 ? 'y' : 'ies' }}</span>
            </div>
            <div class="brain-desc">{{ s.description }}</div>
            <div v-if="expandedSections.has(s.id)" class="brain-entries">
              <div v-if="s.entries.length === 0" class="empty-entries">No entries yet.</div>
              <div
                v-for="e in s.entries"
                :key="e.id"
                class="brain-entry"
              >
                <div class="entry-text">{{ e.text }}</div>
                <div class="entry-meta">
                  <span v-if="e.createdAt" class="mono">{{ new Date(e.createdAt).toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SKILLS TAB -->
      <div v-show="active === 'skills'" class="tab-pane">
        <div class="pane-header">
          <span class="pane-title">Skills</span>
          <span class="pane-subtitle">{{ skills.filter(s => s.enabled).length }} of {{ skills.length }} on</span>
        </div>
        <div class="skills-list">
          <div v-for="s in skills" :key="s.name" class="skill-row">
            <div class="skill-toggle" :class="{ on: s.enabled }">
              <div class="toggle-knob"></div>
            </div>
            <div class="skill-info">
              <div class="skill-name">{{ s.name }}</div>
              <div class="skill-desc">{{ s.description }}</div>
            </div>
            <span class="skill-source" :class="'src-' + s.source">{{ s.source }}</span>
          </div>
        </div>
        <div class="pane-footer">
          <span>Real skill management → Wave 4</span>
        </div>
      </div>

      <!-- ACTIVITY TAB -->
      <div v-show="active === 'activity'" class="tab-pane">
        <div class="pane-header">
          <span class="pane-title">Activity</span>
          <span class="pane-subtitle">{{ activity.length }} events</span>
        </div>
        <div class="activity-list">
          <div v-if="activity.length === 0" class="empty-state">No activity yet</div>
          <div v-for="(a, i) in activity" :key="i" class="activity-row">
            <span class="activity-time">{{ a.time }}</span>
            <span class="activity-type" :class="'type-' + a.type">{{ a.type }}</span>
            <span class="activity-text">{{ a.text }}</span>
          </div>
        </div>
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
.tab-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.pane-header {
  padding: 12px 16px 8px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  background: var(--surface);
  position: sticky;
  top: 0;
}
.pane-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text);
}
.pane-subtitle {
  font-size: 10px;
  color: var(--text-faint);
  font-family: 'JetBrains Mono', monospace;
}

.pane-footer {
  padding: 8px 16px;
  font-size: 10px;
  color: var(--text-faint);
  font-style: italic;
  border-top: 1px solid var(--border);
  margin-top: auto;
}

/* Files tab */
.file-tree {
  padding: 8px 0;
  flex: 1;
}
.file-tree > ul { list-style: none; margin: 0; padding: 0; }

/* Brain tab */
.brain-list { padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; }
.brain-profile {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  margin-bottom: 4px;
}
.profile-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-faint);
  font-weight: 700;
  margin-bottom: 4px;
}
.profile-text {
  font-size: 11px;
  color: var(--text);
  white-space: pre-wrap;
}
.brain-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
}
.brain-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  cursor: pointer;
  user-select: none;
}
.brain-card.expanded .brain-card-head { margin-bottom: 8px; }
.brain-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}
.brain-count {
  font-size: 10px;
  color: var(--text-faint);
  font-family: 'JetBrains Mono', monospace;
}
.brain-desc { font-size: 11px; color: var(--text-faint); }
.brain-entries {
  border-top: 1px solid var(--border);
  padding-top: 6px;
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.empty-entries { font-size: 11px; color: var(--text-faint); font-style: italic; padding: 4px 0; }
.brain-entry {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 6px 8px;
}
.entry-text {
  font-size: 11px;
  color: var(--text);
  white-space: pre-wrap;
  word-wrap: break-word;
}
.entry-meta {
  font-size: 9px;
  color: var(--text-faint);
  margin-top: 2px;
}
.entry-meta .mono { font-family: 'JetBrains Mono', monospace; }
.loading { padding: 24px; text-align: center; color: var(--text-faint); font-size: 12px; }

/* Skills tab */
.skills-list { padding: 8px 12px; }
.skill-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--border);
}
.skill-row:last-child { border-bottom: none; }
.skill-toggle {
  width: 28px; height: 16px;
  background: var(--surface-2);
  border-radius: 8px;
  position: relative;
  flex-shrink: 0;
  transition: background 0.15s;
}
.skill-toggle.on { background: var(--accent); }
.toggle-knob {
  position: absolute;
  top: 2px; left: 2px;
  width: 12px; height: 12px;
  background: white;
  border-radius: 50%;
  transition: left 0.15s;
}
.skill-toggle.on .toggle-knob { left: 14px; }
.skill-info { flex: 1; min-width: 0; }
.skill-name {
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text);
}
.skill-desc {
  font-size: 11px;
  color: var(--text-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.skill-source {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 5px;
  border-radius: 2px;
  font-weight: 600;
  flex-shrink: 0;
}
.src-builtin { background: var(--surface-2); color: var(--text-faint); }
.src-user { background: rgba(34, 197, 94, 0.15); color: var(--accent); }
.src-agent { background: rgba(96, 165, 250, 0.15); color: var(--info); }

/* Activity tab */
.activity-list { padding: 8px 0; font-family: 'JetBrains Mono', monospace; font-size: 11px; }
.empty-state { padding: 24px; text-align: center; color: var(--text-faint); font-style: italic; }
.activity-row {
  display: grid;
  grid-template-columns: 60px 60px 1fr;
  gap: 8px;
  padding: 4px 16px;
  align-items: baseline;
}
.activity-row:hover { background: rgba(255,255,255,0.02); }
.activity-time { color: var(--text-faint); }
.activity-type {
  font-size: 9px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.type-system { color: var(--text-faint); }
.type-send { color: var(--info); }
.type-receive { color: var(--accent); }
.type-tool { color: var(--warn); }
.activity-text {
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
