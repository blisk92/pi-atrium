import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatMessage } from '@shared/types'

/**
 * Chat store — messages + streaming state for the concierge (and future agents).
 * Wave 0 / Task 0.3: send text, receive streamed response via SSE → IPC proxy.
 */

export interface SendResult {
  ok: boolean
  status?: number
  error?: string
}

export const useChatStore = defineStore('chat', () => {
  // All messages, ordered oldest → newest
  const messages = ref<ChatMessage[]>([])

  // ID of the message currently being streamed (null when idle)
  const streamingId = ref<string | null>(null)

  // Current input text (kept here so it survives across mounts)
  const inputText = ref('')

  // Send state
  const isSending = computed(() => streamingId.value !== null)
  const lastSendStartedAt = ref<number | null>(null)
  const firstTokenAt = ref<number | null>(null)
  const firstTokenMs = computed(() =>
    firstTokenAt.value !== null && lastSendStartedAt.value !== null
      ? firstTokenAt.value - lastSendStartedAt.value
      : null
  )

  function makeId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  }

  async function send(text: string): Promise<SendResult> {
    const trimmed = text.trim()
    if (!trimmed || isSending.value) return { ok: false, error: 'empty or busy' }

    // Optimistic: add user message + placeholder agent message
    const userMsg: ChatMessage = {
      id: makeId('u'),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    }
    const agentMsgId = makeId('a')
    const agentMsg: ChatMessage = {
      id: agentMsgId,
      role: 'agent',
      content: '',
      timestamp: Date.now(),
      streaming: true,
    }
    messages.value.push(userMsg, agentMsg)
    streamingId.value = agentMsgId
    lastSendStartedAt.value = Date.now()
    firstTokenAt.value = null

    const api = window.piAtrium
    if (!api) {
      finishStreamWithError('no API bridge')
      return { ok: false, error: 'no API bridge' }
    }
    return api.concierge.send(trimmed)
  }

  function abort(): void {
    const api = window.piAtrium
    void api?.concierge.abort()
  }

  /**
   * Extract the visible text from an event. The SDK's events carry the message
   * state under `event.message` (with `event.message.content` being the array
   * of content blocks). We pull just the `text` blocks, skipping `thinking`.
   */
  function extractText(event: { [k: string]: unknown }): string {
    const msg = event['message'] as { content?: unknown } | undefined
    const content = msg?.content
    if (!Array.isArray(content)) return ''
    let text = ''
    for (const block of content) {
      if (block && typeof block === 'object' && (block as { type?: string }).type === 'text') {
        text += ((block as { text?: string }).text) || ''
      }
    }
    return text
  }

  function handleEvent(event: { type: string; [k: string]: unknown }): void {
    const type = event.type as string
    const eventMessage = event['message'] as { role?: string } | undefined
    const isAssistant = eventMessage?.role === 'assistant'

    if (type === 'message_start' || type === 'message_update') {
      // Only render assistant message content; user echoes are ignored
      if (!isAssistant) return
      const msg = messages.value.find((m) => m.id === streamingId.value)
      if (!msg) return
      const text = extractText(event)
      if (text) {
        msg.content = text
        if (firstTokenAt.value === null && lastSendStartedAt.value !== null) {
          firstTokenAt.value = Date.now()
          console.log(
            '[first-token]',
            firstTokenAt.value - lastSendStartedAt.value,
            'ms'
          )
        }
      }
    } else if (type === 'message_end') {
      // The assistant message is done; we keep streaming=true until turn_end
      // so the cursor stays visible across multiple message_updates within a turn.
    } else if (type === 'turn_end') {
      const msg = messages.value.find((m) => m.id === streamingId.value)
      if (msg) msg.streaming = false
      streamingId.value = null
    } else if (type === 'agent_end') {
      const msg = messages.value.find((m) => m.id === streamingId.value)
      if (msg) msg.streaming = false
      streamingId.value = null
    } else if (type === 'tool_call') {
      const msg = messages.value.find((m) => m.id === streamingId.value)
      if (msg) {
        msg.toolCall = {
          name: (event.toolName as string) || 'tool',
          args: (event.toolArgs as string) || undefined,
          durationMs: 0,
        }
      }
    } else if (type === 'tool_result') {
      const msg = messages.value.find((m) => m.id === streamingId.value)
      if (msg && msg.toolCall) {
        msg.toolCall.durationMs = Date.now() - msg.timestamp
      }
    } else if (type === 'prompt_error' || type === 'error') {
      const messageField = event['message']
      const errMsg = typeof messageField === 'string' ? messageField : 'agent error'
      finishStreamWithError(errMsg)
    }
  }

  function finishStreamWithError(message: string): void {
    const msg = messages.value.find((m) => m.id === streamingId.value)
    if (msg) {
      msg.streaming = false
      msg.content = msg.content || `_(${message})_`
    }
    streamingId.value = null
  }

  function clear(): void {
    messages.value = []
    streamingId.value = null
    firstTokenAt.value = null
    lastSendStartedAt.value = null
  }

  return {
    messages,
    streamingId,
    inputText,
    isSending,
    firstTokenMs,
    send,
    abort,
    handleEvent,
    clear,
  }
})
