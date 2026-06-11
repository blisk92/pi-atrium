<script setup lang="ts">
/**
 * Team form modal (Wave 2 / Task 2.1).
 * Creates or edits a team. Saves to the vault via the main process.
 */
import { ref, reactive, watch } from 'vue'
import type { Team } from '@shared/types'

const props = defineProps<{
  open: boolean
  /** When set, we're editing this team. Otherwise we create a new one. */
  team?: Team | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', team: Team): void
}>()

interface MemberDraft {
  name: string
  role: string
  persona: string
}

const form = reactive({
  name: '',
  description: '',
  cwd: '',
  useDefaultCwd: true,
  members: [] as MemberDraft[],
})

const submitting = ref(false)
const error = ref<string | null>(null)

watch(
  () => [props.open, props.team],
  () => {
    if (!props.open) return
    if (props.team) {
      form.name = props.team.name
      form.description = props.team.description
      form.cwd = props.team.cwd
      form.useDefaultCwd = !props.team.cwd
      form.members = props.team.members.map((m) => ({
        name: m.name,
        role: m.role,
        persona: m.persona,
      }))
    } else {
      form.name = ''
      form.description = ''
      form.cwd = ''
      form.useDefaultCwd = true
      form.members = [{ name: '', role: '', persona: '' }]
    }
    error.value = null
  },
  { immediate: true }
)

function addMember(): void {
  form.members.push({ name: '', role: '', persona: '' })
}

function removeMember(i: number): void {
  if (form.members.length > 1) {
    form.members.splice(i, 1)
  }
}

async function onSave(): Promise<void> {
  error.value = null
  if (!form.name.trim()) {
    error.value = 'Team name is required'
    return
  }
  const cleanMembers = form.members
    .map((m) => ({ name: m.name.trim(), role: m.role.trim(), persona: m.persona.trim() }))
    .filter((m) => m.name && m.role)
  if (cleanMembers.length === 0) {
    error.value = 'At least one member with name and role is required'
    return
  }
  submitting.value = true
  try {
    const api = window.piAtrium
    if (!api) {
      error.value = 'No API bridge'
      return
    }
    const payload: Partial<Team> = {
      name: form.name.trim(),
      description: form.description.trim(),
      cwd: form.useDefaultCwd ? '' : form.cwd.trim(),
      members: cleanMembers.map((m) => ({
        id: '',
        name: m.name,
        role: m.role,
        persona: m.persona,
        status: 'draft' as const,
      })),
    }
    const team = props.team
      ? await api.teams.update(props.team.id, payload)
      : await api.teams.create(payload)
    if (!team) {
      error.value = 'Save failed'
      return
    }
    emit('saved', team)
    emit('close')
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    submitting.value = false
  }
}

function onCancel(): void {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="onCancel">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ team ? 'Edit team' : 'New team' }}</h2>
          <button class="close-btn" @click="onCancel">×</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Name <span class="req">*</span></label>
            <input v-model="form.name" placeholder="e.g. Research team" />
          </div>
          <div class="field">
            <label>Description</label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="What this team is for"
            ></textarea>
          </div>
          <div class="field">
            <label>Working directory</label>
            <label class="checkbox">
              <input v-model="form.useDefaultCwd" type="checkbox" />
              <span>Use default (app runtime dir)</span>
            </label>
            <input
              v-if="!form.useDefaultCwd"
              v-model="form.cwd"
              placeholder="C:\path\to\team\cwd"
            />
          </div>
          <div class="field">
            <div class="field-header">
              <label>Members <span class="req">*</span></label>
              <button class="add-btn" @click="addMember">+ Add member</button>
            </div>
            <div
              v-for="(m, i) in form.members"
              :key="i"
              class="member-row"
            >
              <input
                v-model="m.name"
                placeholder="Name (e.g. Alice)"
                class="member-name"
              />
              <input
                v-model="m.role"
                placeholder="Role (e.g. researcher)"
                class="member-role"
              />
              <input
                v-model="m.persona"
                placeholder="Initial task"
                class="member-task"
              />
              <button
                class="rm-btn"
                :disabled="form.members.length <= 1"
                title="Remove member"
                @click="removeMember(i)"
              >×</button>
            </div>
            <p class="hint">Each member becomes a headless Pi sidecar when the team starts.</p>
          </div>
          <div v-if="error" class="error">{{ error }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" :disabled="submitting" @click="onCancel">Cancel</button>
          <button class="btn btn-primary" :disabled="submitting" @click="onSave">
            {{ submitting ? 'Saving…' : (team ? 'Save' : 'Create draft') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: grid;
  place-items: center;
  z-index: 100;
}
.modal {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 640px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
}
.modal-header h2 { font-size: 14px; font-weight: 600; margin: 0; }
.close-btn {
  width: 26px; height: 26px;
  border: none;
  background: transparent;
  color: var(--text-faint);
  font-size: 18px;
  cursor: pointer;
  border-radius: 4px;
}
.close-btn:hover { background: var(--surface-2); color: var(--text); }
.modal-body {
  padding: 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 11px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
.field input, .field textarea {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px 10px;
  font: inherit;
  color: var(--text);
  font-size: 13px;
}
.field input:focus, .field textarea:focus { outline: none; border-color: var(--accent); }
.field .req { color: var(--accent); }
.checkbox { display: flex; align-items: center; gap: 8px; font-size: 12px; text-transform: none; color: var(--text); letter-spacing: 0; font-weight: 400; }
.field-header { display: flex; justify-content: space-between; align-items: center; }
.add-btn {
  font-size: 11px;
  background: var(--surface-2);
  color: var(--text);
  border: none;
  border-radius: 3px;
  padding: 3px 8px;
  cursor: pointer;
}
.add-btn:hover { background: var(--accent); color: var(--bg); }
.member-row {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr 26px;
  gap: 6px;
  align-items: center;
}
.member-row input {
  font-size: 12px;
  padding: 6px 8px;
}
.rm-btn {
  width: 26px; height: 26px;
  border: none;
  background: transparent;
  color: var(--text-faint);
  font-size: 16px;
  cursor: pointer;
  border-radius: 3px;
}
.rm-btn:hover:not(:disabled) { background: var(--error); color: white; }
.rm-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.hint { font-size: 11px; color: var(--text-faint); font-style: italic; margin: 0; }
.error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
}
.modal-footer {
  padding: 12px 18px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  background: var(--surface);
}
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--accent); color: var(--bg); font-weight: 600; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; }
.btn-secondary { background: var(--surface-2); color: var(--text); }
.btn-secondary:hover:not(:disabled) { background: var(--border); }
</style>
