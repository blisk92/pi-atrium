import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type { ChatMessage } from '@shared/types'

/**
 * Chat store (Wave 1 Task 1.3) — per-session message state.
 * One chat store instance, but the data is keyed by sessionId.
 *
 * Pattern: the store has a `Map<sessionId, ChatState>` internally. The renderer's
 * ChatPane calls `bindSession(id)` on mount, which:
 *  - creates the per-session state if missing
 *  - subscribes to incoming events (filters by id)
 *  - sets `currentId` to the bound session
 *
 * When the user switches sessions, ChatPane unmounts/remounts, calling
 * `unbindSession()` and then `bindSession(newId)`.
 *
 * Slash commands:
 *  /remember <text>  — add to session memory
 *  /recall [query]   — return matching memory entries
 *  /forget           — clear session memory
 */

export interface SendResult {
  ok: boolean
  status?: number
  error?: string
}

interface PerSessionState {
  messages: ChatMessage[]
  streamingId: string | null
  firstTokenAt: number | null
  lastSendStartedAt: number | null
  inputText: string
}

export const useChatStore = defineStore('chat', () => {
  // Per-session state, keyed by sessionId. Use reactive (not ref) so that
  // property additions (byId[id] = {...}) are tracked and the messages
  // array is properly reactive.
  const byId = reactive<Record<string, PerSessionState>>({})
  // currentId is a ref so computeds re-evaluate when the active session changes.
  const currentId = ref<string | null>(null)
  let eventListener: ((e: Event) => void) | null = null

  function ensure(id: string): PerSessionState {
    if (!byId[id]) {
      byId[id] = {
        messages: [],
        streamingId: null,
        firstTokenAt: null,
        lastSendStartedAt: null,
        inputText: '',
      }
    }
    return byId[id]!
  }

  function current(): PerSessionState | null {
    return currentId.value ? byId[currentId.value] ?? null : null
  }

  const messages = computed<ChatMessage[]>(() => current()?.messages ?? [])
  const streamingId = computed<string | null>(() => current()?.streamingId ?? null)
  const inputText = computed<string>({
    get: () => current()?.inputText ?? '',
    set: (v: string) => {
      if (currentId.value) ensure(currentId.value).inputText = v
    },
  })
  const isSending = computed(() => current()?.streamingId != null)
  const firstTokenMs = computed(() => {
    const c = current()
    if (!c) return null
    if (c.firstTokenAt === null || c.lastSendStartedAt === null) return null
    return c.firstTokenAt - c.lastSendStartedAt
  })

  function makeId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  }

  /** Handle a slash command. Returns true if the input was a command. */
  async function trySlashCommand(id: string, text: string): Promise<boolean> {
    const trimmed = text.trim()
    if (!trimmed.startsWith('/')) return false
    const api = window.piAtrium
    if (!api) return false

    const spaceIdx = trimmed.indexOf(' ')
    const cmd = (spaceIdx === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIdx)).toLowerCase()
    const arg = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim()

    // /remember [section] <text>  — default section: episodic
    //   /remember this happened
    //   /remember semantic the user prefers short answers
    if (cmd === 'remember' || cmd === 'mem') {
      if (!arg) {
        pushSystemMessage(id, '_usage: /remember [section] <text>_')
        return true
      }
      // Optional first word = section
      const validSections = ['episodic', 'semantic', 'procedural', 'working']
      const parts = arg.split(/\s+/)
      let section = 'episodic'
      let body = arg
      if (validSections.includes(parts[0]!.toLowerCase())) {
        section = parts[0]!.toLowerCase()
        body = parts.slice(1).join(' ')
        if (!body) {
          pushSystemMessage(id, '_usage: /remember [section] <text>_')
          return true
        }
      }
      const r = await api.agents.remember(id, section as 'episodic', body)
      if (r.ok) {
        pushSystemMessage(id, `_📝 remembered in **${section}** (id ${r.entry?.id})_`)
      } else {
        pushSystemMessage(id, `_remember failed: ${r.error}_`)
      }
      return true
    }

    if (cmd === 'recall' || cmd === 'r') {
      const r = await api.agents.recall(id, arg)
      if (!r.ok) {
        pushSystemMessage(id, `_recall failed_`)
      } else if (r.matches.length === 0) {
        pushSystemMessage(id, arg
          ? `_🔍 no matches in brain for "${arg}"_`
          : '_🧠 brain is empty for this agent_')
      } else {
        const lines = r.matches.map((m, i) => `  ${i + 1}. [${m.section}] ${m.text}`)
        pushSystemMessage(
          id,
          `🔍 **${r.matches.length} brain match${r.matches.length === 1 ? '' : 'es'}:**\n${lines.join('\n')}`
        )
      }
      return true
    }

    if (cmd === 'help' || cmd === '?') {
      pushSystemMessage(
        id,
        '**Slash commands:**\n' +
          '  `/remember [section] <text>` — store in brain (section: episodic/semantic/procedural/working, default episodic)\n' +
          '  `/recall [query]` — search brain (empty = list all)\n' +
          '  `/help` — show this help'
      )
      return true
    }
    pushSystemMessage(id, `_unknown command: /${cmd} (try /help)_`)
    return true
  }

  function pushSystemMessage(sessionId: string, content: string): void {
    const s = ensure(sessionId)
    s.messages.push({
      id: makeId('sys'),
      role: 'system',
      content,
      timestamp: Date.now(),
    })
  }

  async function send(text: string): Promise<SendResult> {
    if (!currentId.value) return { ok: false, error: 'no active session' }
    const id = currentId.value
    const trimmed = text.trim()
    if (!trimmed) return { ok: false, error: 'empty' }

    // Slash command?
    if (trimmed.startsWith('/')) {
      const handled = await trySlashCommand(id, trimmed)
      if (handled) return { ok: true }
    }

    const api = window.piAtrium
    if (!api) return { ok: false, error: 'no API bridge' }

    const s = ensure(id)
    const isBusy = !!s.streamingId

    s.messages.push({
      id: makeId('u'),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    })
    let agentMsgId: string | null = null
    if (!isBusy) {
      agentMsgId = makeId('a')
      s.messages.push({
        id: agentMsgId,
        role: 'agent',
        content: '',
        timestamp: Date.now(),
        streaming: true,
      })
      s.streamingId = agentMsgId
      s.lastSendStartedAt = Date.now()
      s.firstTokenAt = null
    }

    // If the agent is busy, the next message is queued by the SDK via
    // streamingBehavior: 'followUp' (waits for the current turn to
    // finish, then processes this one). If not busy, we don't need the
    // option. Either way, the user message is in the timeline.
    const opts = isBusy ? { streamingBehavior: 'followUp' as const } : undefined
    return api.sessions.send(id, trimmed, opts)
  }

  function abort(): void {
    if (!currentId.value) return
    void window.piAtrium?.sessions.abort(currentId.value)
  }

  /** Subscribe to incoming events for a specific session. */
  function bindSession(id: string): void {
    console.log(`[chat] bindSession(${id})`)
    currentId.value = id
    ensure(id)
    if (!eventListener) {
      eventListener = (e: Event) => {
        const detail = (e as CustomEvent<{ id: string; event: { type: string; [k: string]: unknown } }>).detail
        handleEvent(detail.id, detail.event)
      }
      window.addEventListener('piAtrium:sessionEvent', eventListener)
    }
  }

  function unbindSession(): void {
    currentId.value = null
    if (eventListener) {
      window.removeEventListener('piAtrium:sessionEvent', eventListener)
      eventListener = null
    }
  }

  function clear(): void {
    if (currentId.value) {
      const s = ensure(currentId.value)
      s.messages = []
      s.streamingId = null
      s.firstTokenAt = null
      s.lastSendStartedAt = null
    }
  }

  function extractText(event: { [k: string]: unknown }): { text: string; thinking: string } {
    const msg = event['message'] as { content?: unknown } | undefined
    const content = msg?.content
    if (!Array.isArray(content)) return { text: '', thinking: '' }
    let text = ''
    let thinking = ''
    for (const block of content) {
      if (!block || typeof block !== 'object') continue
      const t = (block as { type?: string }).type
      if (t === 'text') {
        text += ((block as { text?: string }).text) || ''
      } else if (t === 'thinking') {
        thinking += ((block as { thinking?: string }).thinking) || ''
      }
    }
    return { text, thinking }
  }

  function handleEvent(sessionId: string, event: { type: string; [k: string]: unknown }): void {
    if (sessionId !== currentId.value) return // only handle events for the bound session
    const s = ensure(sessionId)
    const type = event.type as string
    const eventMessage = event['message'] as { role?: string } | undefined
    const isAssistant = eventMessage?.role === 'assistant'

    if (type === 'message_start' || type === 'message_update') {
      if (!isAssistant) return
      const msg = s.messages.find((m) => m.id === s.streamingId)
      if (!msg) return
      const { text, thinking } = extractText(event)
      if (text) {
        msg.content = text
        if (s.firstTokenAt === null && s.lastSendStartedAt !== null) {
          s.firstTokenAt = Date.now()
          console.log(
            '[first-token][' + sessionId + ']',
            s.firstTokenAt - s.lastSendStartedAt,
            'ms'
          )
        }
      }
      // Always update thinking (even when empty) so a previous
      // thinking text is replaced with the current one.
      msg.thinking = thinking
    } else if (type === 'message_end') {
      // keep streaming=true until turn_end
    } else if (type === 'turn_end') {
      const msg = s.messages.find((m) => m.id === s.streamingId)
      if (msg) msg.streaming = false
      s.streamingId = null
    } else if (type === 'agent_end') {
      const msg = s.messages.find((m) => m.id === s.streamingId)
      if (msg) msg.streaming = false
      s.streamingId = null
    } else if (type === 'tool_call') {
      const msg = s.messages.find((m) => m.id === s.streamingId)
      if (msg) {
        msg.toolCall = {
          name: (event.toolName as string) || 'tool',
          args: (event.toolArgs as string) || undefined,
          durationMs: 0,
        }
      }
    } else if (type === 'tool_result') {
      const msg = s.messages.find((m) => m.id === s.streamingId)
      if (msg && msg.toolCall) {
        msg.toolCall.durationMs = Date.now() - msg.timestamp
      }
    } else if (type === 'prompt_error' || type === 'error') {
      const messageField = event['message']
      const errMsg = typeof messageField === 'string' ? messageField : 'agent error'
      const msg = s.messages.find((m) => m.id === s.streamingId)
      if (msg) {
        msg.streaming = false
        msg.content = msg.content || `_(${errMsg})_`
      }
      s.streamingId = null
    }
  }

  return {
    messages,
    streamingId,
    inputText,
    isSending,
    firstTokenMs,
    send,
    abort,
    bindSession,
    unbindSession,
    clear,
  }
})
