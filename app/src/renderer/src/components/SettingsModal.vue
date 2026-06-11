<script setup lang="ts">
/**
 * Settings modal (Wave 9 / Task 9.1).
 * Lets the user pick a vault path + default model + theme. Persisted to
 * userData/settings.json via the main process.
 */
import { ref, reactive, onMounted, watch } from 'vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

interface Settings {
  vaultPath: string
  defaultModel: string
  theme: 'dark' | 'light'
  voiceProvider: 'mmx' | 'web-speech'
}

const defaults: Settings = {
  vaultPath: '',
  defaultModel: '',
  theme: 'dark',
  voiceProvider: 'mmx',
}

const settings = reactive<Settings>({ ...defaults })
const saving = ref(false)
const saved = ref(false)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  try {
    const api = window.piAtrium as any
    if (api?.settings?.get) {
      const s = await api.settings.get()
      Object.assign(settings, s)
    }
  } catch (err) {
    /* first-run, no settings yet */
  }
}

async function save(): Promise<void> {
  saving.value = true
  saved.value = false
  error.value = null
  try {
    const api = window.piAtrium as any
    if (!api?.settings?.set) throw new Error('settings IPC not available')
    await api.settings.set({ ...settings })
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    saving.value = false
  }
}

async function pickFolder(): Promise<void> {
  const api = window.piAtrium as any
  if (api?.settings?.pickFolder) {
    const p = await api.settings.pickFolder()
    if (!p) return
    settings.vaultPath = p
    vaultError.value = null
    // Validate the picked path
    if (api.settings.validateVault) {
      const err = await api.settings.validateVault(p)
      vaultError.value = err
    }
  }
}

const vaultError = ref<string | null>(null)
const vaultOk = ref(false)

watch(
  () => settings.vaultPath,
  async (p) => {
    vaultError.value = null
    vaultOk.value = false
    if (!p) return
    const api = window.piAtrium as any
    if (api?.settings?.validateVault) {
      const err = await api.settings.validateVault(p)
      vaultError.value = err
      vaultOk.value = err === null
    }
  }
)

onMounted(load)

watch(
  () => props.open,
  (o) => {
    if (o) load()
  }
)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h2>Settings</h2>
          <button class="close-btn" @click="emit('close')">×</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Obsidian vault path</label>
            <div class="path-row">
              <input v-model="settings.vaultPath" placeholder="C:\Users\you\Documents\MyVault" />
              <button class="btn-secondary" @click="pickFolder">Pick…</button>
            </div>
            <p class="hint">
              Pick the folder that contains your <code>.obsidian/</code> subfolder
              (e.g. <code>…\ObsidianVault\SecondBrain</code>, not
              <code>…\ObsidianVault</code>).
            </p>
            <p v-if="vaultError" class="vault-error">⚠ {{ vaultError }}</p>
            <p v-else-if="vaultOk" class="vault-ok">✓ Looks like a vault</p>
          </div>
          <div class="field">
            <label>Default model</label>
            <input v-model="settings.defaultModel" placeholder="(leave blank to use SDK default)" />
          </div>
          <div class="field">
            <label>Theme</label>
            <select v-model="settings.theme">
              <option value="dark">Dark (Code Dark)</option>
              <option value="light">Light (planned)</option>
            </select>
          </div>
          <div class="field">
            <label>Voice provider (TTS / STT)</label>
            <select v-model="settings.voiceProvider">
              <option value="mmx">mmx (MiniMax TTS via local CLI)</option>
              <option value="web-speech">Web Speech (planned)</option>
            </select>
          </div>
          <div v-if="error" class="error">{{ error }}</div>
          <div v-if="saved" class="saved">✓ Saved</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="emit('close')">Close</button>
          <button class="btn btn-primary" :disabled="saving" @click="save">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: grid; place-items: center;
  z-index: 100;
}
.modal {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 560px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.modal-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  background: var(--surface);
}
.modal-header h2 { font-size: 14px; font-weight: 600; margin: 0; }
.close-btn {
  width: 26px; height: 26px;
  border: none; background: transparent;
  color: var(--text-faint);
  font-size: 18px; cursor: pointer;
  border-radius: 4px;
}
.close-btn:hover { background: var(--surface-2); color: var(--text); }
.vault-error {
  font-size: 12px;
  color: #f87171;
  margin: 4px 0 0 0;
}
.vault-ok {
  font-size: 12px;
  color: #22c55e;
  margin: 4px 0 0 0;
}
.field code {
  background: var(--surface);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
}
.modal-body {
  padding: 18px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 14px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field label {
  font-size: 11px; color: var(--text-faint);
  text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;
}
.field input, .field select {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px 10px;
  font: inherit;
  color: var(--text);
  font-size: 13px;
}
.field input:focus, .field select:focus {
  outline: none; border-color: var(--accent);
}
.path-row { display: flex; gap: 6px; }
.path-row input { flex: 1; }
.hint { font-size: 11px; color: var(--text-faint); font-style: italic; margin: 0; }
.error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
}
.saved {
  background: rgba(34, 197, 94, 0.1);
  color: var(--accent);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
}
.modal-footer {
  padding: 12px 18px;
  border-top: 1px solid var(--border);
  display: flex; justify-content: flex-end; gap: 8px;
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
