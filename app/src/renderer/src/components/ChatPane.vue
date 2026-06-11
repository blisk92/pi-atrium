<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useAppStore } from '../stores/app'
import { useChatStore } from '../stores/chat'

const appStore = useAppStore()
const chat = useChatStore()
const c = computed(() => appStore.concierge)

const messagesEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)
let unsubscribe: (() => void) | null = null

onMounted(() => {
  unsubscribe = window.piAtrium?.concierge.onEvent((event) => chat.handleEvent(event)) ?? null
  // Auto-focus the input once concierge is active
  watch(
    () => c.value.status,
    (s) => {
      if (s === 'active') nextTick(() => inputEl.value?.focus())
    },
    { immediate: true }
  )
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

// Auto-scroll to bottom when messages grow
watch(
  () => chat.messages.length,
  () => nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
)

// Auto-scroll while streaming (content grows on the same message)
watch(
  () => chat.streamingId && chat.messages.find((m) => m.id === chat.streamingId)?.content,
  () => nextTick(() => {
    if (messagesEl.value && chat.streamingId) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
)

function onSend(): void {
  const text = chat.inputText
  if (!text.trim()) return
  void chat.send(text)
  chat.inputText = ''
  nextTick(() => inputEl.value?.focus())
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    onSend()
  }
}

function onStop(): void {
  chat.abort()
}

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <main class="chat-pane">
    <div ref="messagesEl" class="messages" :class="{ empty: chat.messages.length === 0 }">
      <div v-if="chat.messages.length === 0" class="empty-state">
        <div v-if="c.status === 'starting'" class="loading">
          <div class="spinner"></div>
          <h3>Starting concierge…</h3>
          <p>Spinning up the headless Pi sidecar on port {{ c.port }}.</p>
        </div>
        <div v-else-if="c.status === 'active'" class="prompt-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <h3>Say hello to the concierge</h3>
          <p>Try: <em>"What can you do?"</em> or <em>"List my active teams."</em></p>
          <p v-if="appStore.spawnMs !== null" class="bench">
            ⏱ Spawn: <strong>{{ appStore.spawnMs }}ms</strong>
            <span v-if="appStore.spawnMs < 3000" class="ok">· under target</span>
          </p>
        </div>
        <div v-else-if="c.status === 'error'" class="error-state">
          <h3>Concierge failed to start</h3>
          <p>{{ c.errorMessage }}</p>
        </div>
      </div>

      <div
        v-for="m in chat.messages"
        :key="m.id"
        class="message"
        :class="['role-' + m.role, { streaming: m.streaming }]"
      >
        <div class="message-meta">
          <span class="role">{{ m.role === 'user' ? 'You' : 'Concierge' }}</span>
          <span class="time">{{ fmtTime(m.timestamp) }}</span>
        </div>
        <div class="message-body">
          <span v-if="m.content">{{ m.content }}</span>
          <span v-else-if="m.streaming" class="typing">thinking…</span>
          <span v-else>…</span>
          <span v-if="m.streaming" class="cursor">▍</span>
        </div>
        <div v-if="m.toolCall" class="tool-call">
          <span class="tool-icon">⚙</span>
          <span class="tool-name">{{ m.toolCall.name }}</span>
          <span v-if="m.toolCall.durationMs" class="tool-duration">
            {{ m.toolCall.durationMs }}ms
          </span>
        </div>
      </div>

      <div v-if="chat.firstTokenMs !== null && !chat.isSending" class="latency-badge">
        ⏱ first token: <strong>{{ chat.firstTokenMs }}ms</strong>
        <span v-if="chat.firstTokenMs < 2000" class="ok">· under 2s target</span>
        <span v-else class="warn">· over 2s target</span>
      </div>
    </div>

    <div class="input-area">
      <div class="input-box">
        <textarea
          ref="inputEl"
          v-model="chat.inputText"
          :placeholder="c.status === 'active' ? 'Type a message…  (Enter to send · Shift+Enter for newline)' : 'Waiting for concierge…'"
          :disabled="c.status !== 'active'"
          rows="1"
          @keydown="onKeydown"
        ></textarea>
        <button
          v-if="!chat.isSending"
          class="send-btn"
          :disabled="!chat.inputText.trim() || c.status !== 'active'"
          @click="onSend"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
        <button v-else class="stop-btn" @click="onStop" title="Stop">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="1"/>
          </svg>
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.chat-pane {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  height: 100%;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.messages.empty {
  align-items: center;
  justify-content: center;
}
.empty-state {
  max-width: 480px;
  text-align: center;
  color: var(--text-dim);
}
.empty-state h3 {
  font-size: 15px;
  color: var(--text);
  margin: 12px 0 6px;
  font-weight: 600;
}
.empty-state p { font-size: 13px; line-height: 1.6; margin-bottom: 8px; }
.empty-state em { color: var(--text); font-style: normal; }
.empty-state strong { color: var(--text); }
.bench {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-faint);
  font-family: 'JetBrains Mono', monospace;
  margin-top: 8px;
  padding: 6px 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.bench .ok { color: var(--accent); }
.bench .warn { color: var(--warn); }

.spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}
@keyframes spin { to { transform: rotate(360deg); } }

.message {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.message.role-user { align-self: flex-end; align-items: flex-end; }
.message.role-agent { align-self: flex-start; align-items: flex-start; }
.message-meta {
  font-size: 11px;
  color: var(--text-faint);
  display: flex;
  gap: 8px;
  align-items: center;
}
.message-meta .role { font-weight: 600; }
.message-body {
  font-size: 13px;
  line-height: 1.55;
  color: var(--text);
  white-space: pre-wrap;
  word-wrap: break-word;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 14px;
  max-width: 100%;
}
.message.role-user .message-body {
  background: var(--accent-soft);
  border-color: var(--accent-soft);
  color: var(--text);
}
.message.streaming .message-body { border-color: var(--accent); }
.typing { color: var(--text-faint); font-style: italic; }
.cursor {
  display: inline-block;
  animation: blink 1s steps(2) infinite;
  color: var(--accent);
  margin-left: 2px;
}
@keyframes blink { 50% { opacity: 0; } }
.tool-call {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-faint);
  background: var(--surface-2);
  padding: 3px 8px;
  border-radius: 3px;
  align-self: flex-start;
}
.tool-icon { color: var(--info); }
.tool-duration { color: var(--text-faint); }

.latency-badge {
  align-self: center;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-faint);
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 4px 10px;
  border-radius: 3px;
  margin-top: 8px;
}
.latency-badge strong { color: var(--text); }
.latency-badge .ok { color: var(--accent); }
.latency-badge .warn { color: var(--warn); }

.input-area {
  padding: 14px 24px 16px;
  border-top: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}
.input-box {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 8px 8px 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: border-color 0.15s;
}
.input-box:focus-within { border-color: var(--accent); }
.input-box textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  color: var(--text);
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  max-height: 200px;
  padding: 4px 0;
  font-family: inherit;
}
.input-box textarea::placeholder { color: var(--text-faint); }
.input-box textarea:disabled { cursor: not-allowed; }

.send-btn, .stop-btn {
  width: 32px; height: 32px;
  border: none;
  border-radius: 6px;
  background: var(--accent);
  color: var(--bg);
  cursor: pointer;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: opacity 0.15s;
}
.send-btn:disabled {
  background: var(--surface-2);
  color: var(--text-faint);
  cursor: not-allowed;
}
.stop-btn { background: var(--error); color: white; }
.send-btn:hover:not(:disabled), .stop-btn:hover { opacity: 0.85; }
</style>
