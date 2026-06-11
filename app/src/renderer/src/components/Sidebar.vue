<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { useSessionStore } from '../stores/sessions'
import { useTeamStore } from '../stores/teams'
import TeamForm from './TeamForm.vue'

const sessions = useSessionStore()
const teams = useTeamStore()

const sessionList = computed(() => sessions.sessions)
const teamList = computed(() => teams.teams)
const activeId = computed(() => sessions.activeId)

// Team expansion state (which team IDs are expanded)
const expandedTeams = ref<Set<string>>(new Set())

// Team form modal state
const formOpen = ref(false)
const editingTeam = ref<null>(null) // create-only for now (no inline edit)

let cleanup: (() => void) | null = null

onMounted(() => {
  sessions.subscribe()
  teams.subscribe()
  cleanup = () => {
    sessions.unsubscribe()
    teams.unbind()
  }
})
onUnmounted(() => {
  if (cleanup) cleanup()
})

async function onSpawn(): Promise<void> {
  await sessions.spawn()
}
async function onStop(id: string, e: Event): Promise<void> {
  e.stopPropagation()
  if (id === 'concierge') return
  await sessions.stop(id)
}
async function onToggleTts(id: string, e: Event): Promise<void> {
  e.stopPropagation()
  const s = sessions.sessions.find((x) => x.id === id)
  if (!s) return
  await sessions.setTts(id, !s.ttsEnabled)
}

function toggleTeam(id: string): void {
  const next = new Set(expandedTeams.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedTeams.value = next
}

async function onStartTeam(id: string, e: Event): Promise<void> {
  e.stopPropagation()
  await teams.start(id)
}
async function onHaltTeam(id: string, e: Event): Promise<void> {
  e.stopPropagation()
  await teams.halt(id)
}
async function onDeleteTeam(id: string, e: Event): Promise<void> {
  e.stopPropagation()
  await teams.remove(id)
}
function onEditTeam(id: string, e: Event): void {
  e.stopPropagation()
  void id // editing a draft is not yet implemented in the modal
  // For now, editing the team while it's running is blocked at the
  // main process level. Editing a draft is supported; for slice 2.1 we
  // only support create — edit will land in a follow-up.
}

function statusPillClass(s: string): string {
  return `pill pill-${s}`
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
        v-for="s in sessionList"
        :key="s.id"
        class="session"
        :class="{ active: s.id === activeId }"
        @click="sessions.select(s.id)"
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
      <div v-if="sessionList.length === 0" class="empty">
        <div class="spinner"></div>
        <p>Spawning concierge…</p>
      </div>
    </div>

    <div class="sidebar-section">
      <div class="section-header">
        <span class="section-label">Teams</span>
        <button class="spawn-btn" title="New team" @click="formOpen = true">+</button>
      </div>
      <div v-if="teamList.length === 0" class="empty teams-empty">
        No teams yet. <button class="link" @click="formOpen = true">Create one</button>.
      </div>
      <div v-for="t in teamList" :key="t.id" class="team">
        <div class="team-row" @click="toggleTeam(t.id)">
          <span class="caret" :class="{ open: expandedTeams.has(t.id) }">▸</span>
          <div class="team-info">
            <div class="team-name">{{ t.name }}</div>
            <div class="team-sub">
              {{ t.members.length }} member{{ t.members.length === 1 ? '' : 's' }}
            </div>
          </div>
          <span :class="statusPillClass(t.status)">{{ t.status }}</span>
        </div>
        <div v-if="expandedTeams.has(t.id)" class="team-body">
          <div
            v-for="m in t.members"
            :key="m.id"
            class="team-member"
            :class="{ 'member-active': m.status === 'active' }"
            @click="m.sessionId && sessions.select(m.sessionId)"
          >
            <span
              class="status-dot"
              :class="{
                'dot-idle': m.status === 'draft',
                'dot-starting': m.status === 'starting',
                'dot-active': m.status === 'active',
                'dot-error': m.status === 'error',
              }"
            ></span>
            <div class="member-info">
              <div class="member-name">{{ m.name }}</div>
              <div class="member-role">{{ m.role }}</div>
            </div>
            <span v-if="m.port" class="member-port">{{ m.port }}</span>
          </div>
          <div class="team-actions">
            <button
              v-if="t.status === 'draft' || t.status === 'error' || t.status === 'stopped'"
              class="ta-btn primary"
              @click="(e) => onStartTeam(t.id, e)"
            >Start</button>
            <button
              v-if="t.status === 'active' || t.status === 'starting'"
              class="ta-btn warn"
              @click="(e) => onHaltTeam(t.id, e)"
            >Halt</button>
            <button
              v-if="t.status === 'draft'"
              class="ta-btn"
              @click="(e) => onEditTeam(t.id, e)"
            >Edit</button>
            <button
              class="ta-btn danger"
              @click="(e) => onDeleteTeam(t.id, e)"
            >Delete</button>
          </div>
        </div>
      </div>
    </div>

    <TeamForm :open="formOpen" :team="editingTeam" @close="formOpen = false" />
    <SettingsModal :open="settingsOpen" @close="settingsOpen = false" />

    <div class="sidebar-footer">
      <button class="settings-btn" title="Settings" @click="settingsOpen = true">⚙ Settings</button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar-footer {
  margin-top: auto;
  padding: 8px 18px 12px;
  border-top: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}
.settings-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: transparent;
  color: var(--text-dim);
  border: 1px solid var(--border);
  border-radius: 4px;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}
.settings-btn:hover {
  background: var(--surface-2);
  color: var(--text);
}
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
  flex-shrink: 0;
  overflow-y: auto;
}
.sidebar-section + .sidebar-section {
  border-top: 1px solid var(--border);
  flex: 1;
  min-height: 0;
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
  padding: 24px 28px;
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
.teams-empty { padding: 14px 20px; font-size: 11px; }
.link {
  background: transparent;
  border: none;
  color: var(--accent);
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  font: inherit;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ----- Teams ----- */
.team {
  margin: 0 0 4px;
}
.team-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px 8px 28px;
  color: var(--text-dim);
  font-size: 12px;
  border-left: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.team-row:hover { background: rgba(255, 255, 255, 0.02); }
.caret {
  font-size: 10px;
  width: 12px;
  color: var(--text-faint);
  transition: transform 0.15s;
  display: inline-block;
}
.caret.open { transform: rotate(90deg); }
.team-info { flex: 1; min-width: 0; }
.team-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.team-sub {
  font-size: 10px;
  color: var(--text-faint);
  font-family: 'JetBrains Mono', monospace;
}
.pill {
  font-size: 9px;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 3px;
}
.pill-draft { background: var(--surface-2); color: var(--text-faint); }
.pill-starting { background: rgba(96, 165, 250, 0.18); color: var(--info); }
.pill-active { background: rgba(34, 197, 94, 0.18); color: var(--accent); }
.pill-stopping { background: rgba(250, 204, 21, 0.18); color: var(--warn); }
.pill-stopped { background: var(--surface-2); color: var(--text-faint); }
.pill-error { background: rgba(239, 68, 68, 0.18); color: var(--error); }

.team-body {
  background: var(--bg);
  padding: 4px 0 6px;
  border-top: 1px solid var(--border);
}
.team-member {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 18px 6px 40px;
  font-size: 12px;
  color: var(--text-dim);
  cursor: pointer;
  transition: all 0.15s;
}
.team-member:hover { background: rgba(255, 255, 255, 0.02); }
.team-member.member-active { color: var(--text); }
.member-info { flex: 1; min-width: 0; }
.member-name {
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.member-role {
  font-size: 10px;
  color: var(--text-faint);
  font-family: 'JetBrains Mono', monospace;
}
.member-port {
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-faint);
}

.team-actions {
  display: flex;
  gap: 4px;
  padding: 8px 18px 6px 28px;
  border-top: 1px solid var(--border);
  margin-top: 4px;
}
.ta-btn {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  border-radius: 3px;
  cursor: pointer;
}
.ta-btn:hover { background: var(--border); }
.ta-btn.primary { background: var(--accent); color: var(--bg); border-color: var(--accent); }
.ta-btn.warn { background: var(--warn); color: var(--bg); border-color: var(--warn); }
.ta-btn.danger:hover { background: var(--error); color: white; border-color: var(--error); }
</style>
