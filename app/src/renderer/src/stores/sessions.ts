import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Session store (Wave 1 Task 1.3) — registry of all active single-agent sessions.
 * The concierge is just session #0. Sessions can be spawned, stopped, selected.
 *
 * Each session has its own chat state, which lives in `useChatStore` and is
 * keyed by `sessionId`. The chat store exposes `messages`, `send`, `abort`,
 * `handleEvent`, etc. for a single session.
 */

export interface SessionSnapshot {
  id: string
  name: string
  role: string
  status: 'idle' | 'starting' | 'active' | 'error'
  port: number
  pid?: number
  isConcierge: boolean
  ttsEnabled: boolean
  readyAtMs?: number
  errorMessage?: string
}

export const useSessionStore = defineStore('sessions', () => {
  const sessions = ref<SessionSnapshot[]>([])
  const activeId = ref<string | null>(null)
  let unsubscribeUpdate: (() => void) | null = null
  let unsubscribeEvent: (() => void) | null = null

  const activeSession = computed(() =>
    sessions.value.find((s) => s.id === activeId.value) || null
  )
  const isConciergeActive = computed(() => activeSession.value?.isConcierge === true)

  function refresh(): Promise<SessionSnapshot[]> {
    return window.piAtrium!.sessions.list().then((list) => {
      sessions.value = list
      // Auto-select first session if none active
      if (activeId.value === null && list.length > 0) {
        activeId.value = list[0].id
      }
      return list
    })
  }

  function select(id: string): void {
    if (sessions.value.find((s) => s.id === id)) {
      activeId.value = id
    }
  }

  async function spawn(name?: string): Promise<SessionSnapshot | null> {
    try {
      const s = await window.piAtrium!.sessions.spawn(name)
      await refresh()
      activeId.value = s.id
      return s
    } catch (err) {
      console.error('[sessions] spawn failed:', err)
      return null
    }
  }

  async function stop(id: string): Promise<void> {
    await window.piAtrium!.sessions.stop(id)
    if (activeId.value === id) {
      activeId.value = sessions.value[0]?.id ?? null
    }
    await refresh()
  }

  async function setTts(id: string, enabled: boolean): Promise<void> {
    await window.piAtrium!.sessions.setTts(id, enabled)
  }

  async function send(id: string, text: string): Promise<{ ok: boolean; status?: number; error?: string }> {
    return window.piAtrium!.sessions.send(id, text)
  }

  async function remember(id: string, text: string): Promise<{ ok: boolean; count?: number; error?: string }> {
    return window.piAtrium!.sessions.remember(id, text)
  }

  async function recall(id: string, query: string): Promise<{ matches: string[]; error?: string }> {
    return window.piAtrium!.sessions.recall(id, query)
  }

  function subscribe(): void {
    if (!window.piAtrium) return
    void refresh()
    unsubscribeUpdate = window.piAtrium.sessions.onUpdate((list) => {
      console.log(`[session:onUpdate] ${list.length} sessions`)
      sessions.value = list
      if (activeId.value === null && list.length > 0) {
        activeId.value = list[0].id
      }
      // Drop activeId if that session was removed
      if (activeId.value !== null && !list.find((s) => s.id === activeId.value)) {
        activeId.value = list[0]?.id ?? null
      }
    })
    unsubscribeEvent = window.piAtrium.sessions.onEvent((id, event) => {
      console.log(`[session:onEvent] ${event.type} for ${id.slice(-12)}`)
      // Forward to chat store. The chat store will pick the right session by id.
      // We use a custom event on window to avoid circular imports.
      window.dispatchEvent(new CustomEvent('piAtrium:sessionEvent', { detail: { id, event } }))
    })
  }

  function unsubscribe(): void {
    unsubscribeUpdate?.()
    unsubscribeEvent?.()
    unsubscribeUpdate = null
    unsubscribeEvent = null
  }

  return {
    sessions,
    activeId,
    activeSession,
    isConciergeActive,
    refresh,
    select,
    spawn,
    stop,
    setTts,
    send,
    remember,
    recall,
    subscribe,
    unsubscribe,
  }
})
