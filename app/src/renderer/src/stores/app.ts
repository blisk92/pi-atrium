import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AgentStatus } from '@shared/types'

/**
 * App-wide Pinia store.
 * Wave 0 / Slice 0.2: cold-start timing + concierge lifecycle.
 * Will expand in Slice 0.3+ (messages, file tabs, etc.)
 */

export interface ConciergeState {
  status: 'idle' | 'starting' | 'active' | 'error'
  pid?: number
  port: number
  errorMessage?: string
  readyAtMs?: number
}

declare global {
  interface Window {
    piAtrium?: {
      version: string
      concierge: {
        get: () => Promise<ConciergeState>
        send: (text: string) => Promise<{ ok: boolean; status?: number; error?: string }>
        onStateChange: (cb: (state: ConciergeState) => void) => () => void
      }
    }
  }
}

export const useAppStore = defineStore('app', () => {
  // Cold-start instrumentation
  const bootStartedAt = ref<number>(Date.now())
  const rendererReadyAt = ref<number | null>(null)
  const coldStartMs = computed(() =>
    rendererReadyAt.value !== null ? rendererReadyAt.value - bootStartedAt.value : null
  )

  // Concierge state (from main process via IPC)
  const concierge = ref<ConciergeState>({
    status: 'idle',
    port: 49152,
  })

  // Time from "starting" → "active" (the spawn benchmark)
  const spawnMs = ref<number | null>(null)
  let startingAt: number | null = null

  // Map concierge status to AgentStatus for the sidebar dot
  const conciergeAgentStatus = computed<AgentStatus>(() => {
    switch (concierge.value.status) {
      case 'idle': return 'idle'
      case 'starting': return 'starting'
      case 'active': return 'active'
      case 'error': return 'error'
      default: return 'idle'
    }
  })

  // Actions
  function recordRendererReady(): void {
    rendererReadyAt.value = Date.now()
    console.log('[cold-start] renderer ready:', coldStartMs.value, 'ms')
  }

  // IPC subscription (called on mount)
  function subscribeConcierge(): () => void {
    const api = window.piAtrium
    if (!api) {
      console.warn('[concierge] no API bridge available')
      return () => {}
    }
    void api.concierge
      .get()
      .then((s) => {
        concierge.value = s
        if (s.status === 'starting' && startingAt === null) startingAt = Date.now()
        if (s.status === 'active' && startingAt !== null && spawnMs.value === null) {
          spawnMs.value = Date.now() - startingAt
          console.log('[spawn] concierge ready in', spawnMs.value, 'ms')
        }
      })
      .catch((err) => {
        console.error('[concierge] initial get failed:', err)
      })
    return api.concierge.onStateChange((s) => {
      concierge.value = s
      if (s.status === 'starting' && startingAt === null) startingAt = Date.now()
      if (s.status === 'active' && startingAt !== null && spawnMs.value === null) {
        spawnMs.value = Date.now() - startingAt
        console.log('[spawn] concierge ready in', spawnMs.value, 'ms')
      }
    })
  }

  return {
    bootStartedAt,
    rendererReadyAt,
    coldStartMs,
    concierge,
    conciergeAgentStatus,
    spawnMs,
    recordRendererReady,
    subscribeConcierge,
  }
})
