import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AgentSession } from '@shared/types'

/**
 * App-wide Pinia store.
 * Wave 0 / Slice 0.1: cold-start timing + minimal session state.
 * Will expand in Slice 0.2+ (concierge, messages, file tabs, etc.)
 */

export const useAppStore = defineStore('app', () => {
  // Cold-start instrumentation
  const bootStartedAt = ref<number>(Date.now())
  const rendererReadyAt = ref<number | null>(null)
  const coldStartMs = computed(() =>
    rendererReadyAt.value !== null ? rendererReadyAt.value - bootStartedAt.value : null
  )

  // Sessions (placeholder for Slice 0.1)
  const sessions = ref<AgentSession[]>([
    { id: 'concierge', name: 'Concierge', status: 'idle', isConcierge: true },
  ])

  // Actions
  function recordRendererReady() {
    rendererReadyAt.value = Date.now()
    console.log('[cold-start] renderer ready:', coldStartMs.value, 'ms')
  }

  return {
    bootStartedAt,
    rendererReadyAt,
    coldStartMs,
    sessions,
    recordRendererReady,
  }
})
