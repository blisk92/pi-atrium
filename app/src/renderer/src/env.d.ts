/**
 * Global Window.piAtrium type — single source of truth for the preload API.
 * The preload (`app/src/preload/index.ts`) is the implementation; this file
 * mirrors the surface so TypeScript in the renderer can call it.
 */

import type { ConciergeState } from './stores/app'
import type { SessionSnapshot } from './stores/sessions'

interface ConciergeEvent {
  type: string
  [k: string]: unknown
}

interface PiAtriumAPI {
  version: string
  concierge: {
    get: () => Promise<ConciergeState>
    send: (text: string) => Promise<{ ok: boolean; status?: number; error?: string }>
    abort: () => Promise<{ ok: boolean; error?: string }>
    onStateChange: (cb: (state: ConciergeState) => void) => () => void
    onEvent: (cb: (event: ConciergeEvent) => void) => () => void
  }
  sessions: {
    list: () => Promise<SessionSnapshot[]>
    get: (id: string) => Promise<SessionSnapshot | null>
    spawn: (name?: string) => Promise<SessionSnapshot>
    stop: (id: string) => Promise<{ ok: boolean }>
    setTts: (id: string, enabled: boolean) => Promise<{ ok: boolean; error?: string }>
    send: (id: string, text: string) => Promise<{ ok: boolean; status?: number; error?: string }>
    abort: (id: string) => Promise<{ ok: boolean; error?: string }>
    remember: (id: string, text: string) => Promise<{ ok: boolean; count?: number; error?: string }>
    recall: (id: string, query: string) => Promise<{ ok: boolean; matches: string[]; error?: string }>
    onUpdate: (cb: (sessions: SessionSnapshot[]) => void) => () => void
    onEvent: (cb: (id: string, event: ConciergeEvent) => void) => () => void
  }
}

declare global {
  interface Window {
    piAtrium?: PiAtriumAPI
  }
}

export {}
