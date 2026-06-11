<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/app'
import { useChatStore } from '../stores/chat'
import TreeNode, { type TreeNodeData } from './TreeNode.vue'

type Pane = 'files' | 'brain' | 'skills' | 'activity'
const active = ref<Pane>('files')

const appStore = useAppStore()
const chat = useChatStore()

const tabs: Array<{ id: Pane; label: string }> = [
  { id: 'files', label: 'Files' },
  { id: 'brain', label: 'Brain' },
  { id: 'skills', label: 'Skills' },
  { id: 'activity', label: 'Activity' },
]

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

// ----- Mock brain sections (real brain is Wave 3) -----
interface BrainSection {
  id: string
  name: string
  description: string
  count: number
}
const brainSections: BrainSection[] = [
  { id: 'episodic', name: 'Episodic', description: 'Recent events, what happened', count: 0 },
  { id: 'semantic', name: 'Semantic', description: 'Curated knowledge, facts', count: 0 },
  { id: 'procedural', name: 'Procedural', description: 'Skills, routines, how-tos', count: 0 },
  { id: 'working', name: 'Working', description: 'Current task context', count: 0 },
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
          <span class="pane-subtitle">concierge</span>
        </div>
        <div class="brain-list">
          <div v-for="s in brainSections" :key="s.id" class="brain-card">
            <div class="brain-card-head">
              <span class="brain-name">{{ s.name }}</span>
              <span class="brain-count">{{ s.count }} entries</span>
            </div>
            <div class="brain-desc">{{ s.description }}</div>
          </div>
        </div>
        <div class="pane-footer">
          <span>Real brain → Wave 3</span>
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
}
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
