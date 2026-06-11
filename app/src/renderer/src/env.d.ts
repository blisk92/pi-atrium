/**
 * Global Window.piAtrium type — single source of truth for the preload API.
 * The preload (`app/src/preload/index.ts`) is the implementation; this file
 * mirrors the surface so TypeScript in the renderer can call it.
 */

import type { ConciergeState } from './stores/app'
import type { SessionSnapshot } from './stores/sessions'
import type { Team } from '../../shared/types'

interface ConciergeEvent {
  type: string
  [k: string]: unknown
}

interface BrainEntry {
  id: string
  text: string
  createdAt: number
  source?: string
}
interface BrainSectionState {
  id: 'episodic' | 'semantic' | 'procedural' | 'working'
  name: string
  description: string
  entries: BrainEntry[]
}
interface BrainState {
  agentId: string
  agentName: string
  role?: string
  profile: string
  sections: BrainSectionState[]
  totalEntries: number
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
    send: (id: string, text: string, opts?: { streamingBehavior?: 'steer' | 'followUp' }) => Promise<{ ok: boolean; status?: number; error?: string }>
    abort: (id: string) => Promise<{ ok: boolean; error?: string }>
    remember: (id: string, text: string) => Promise<{ ok: boolean; count?: number; error?: string }>
    recall: (id: string, query: string) => Promise<{ ok: boolean; matches: string[]; error?: string }>
    onUpdate: (cb: (sessions: SessionSnapshot[]) => void) => () => void
    onEvent: (cb: (id: string, event: ConciergeEvent) => void) => () => void
  }
  teams: {
    list: () => Promise<Team[]>
    get: (id: string) => Promise<Team | null>
    create: (partial: Partial<Team>) => Promise<Team>
    update: (id: string, partial: Partial<Team>) => Promise<Team | null>
    delete: (id: string) => Promise<{ ok: boolean }>
    start: (id: string) => Promise<{ ok: boolean }>
    halt: (id: string) => Promise<{ ok: boolean }>
    onUpdate: (cb: (teams: Team[]) => void) => () => void
  }
  agents: {
    brain: (agentId: string) => Promise<BrainState | null>
    listSkills: (agentId: string) => Promise<{ ok: boolean; skills: { name: string; description: string; source: 'agent' }[]; error?: string }>
    remember: (
      agentId: string,
      section: 'episodic' | 'semantic' | 'procedural' | 'working',
      text: string
    ) => Promise<{ ok: boolean; entry?: BrainEntry; error?: string }>
    recall: (
      agentId: string,
      query: string
    ) => Promise<{ ok: boolean; matches: { section: string; text: string }[] }>
  }
  tts: {
    speak: (text: string, voice?: string) => Promise<{ audioPath?: string; error?: string }>
    transcribe: (audioPath: string) => Promise<{ text?: string; error?: string }>
  }
  fs: {
    readTree: (rootPath: string) => Promise<{ ok: boolean; tree: unknown[]; error?: string }>
  }
  settings: {
    get: () => Promise<unknown>
    set: (s: unknown) => Promise<{ ok: boolean }>
    pickFolder: () => Promise<string | null>
    validateVault: (p: string) => Promise<string | null>
  }
}

declare global {
  interface Window {
    piAtrium?: PiAtriumAPI
  }
}

export {}
