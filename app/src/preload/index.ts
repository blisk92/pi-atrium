/**
 * Pi Atrium — Preload script
 * Exposes a minimal IPC bridge to the renderer.
 * Wave 1 Task 1.3: sessions API + legacy concierge aliases.
 */

import { contextBridge, ipcRenderer } from 'electron'
import type { Team } from '../shared/types.js'

interface ConciergeState {
  status: 'idle' | 'starting' | 'active' | 'error'
  pid?: number
  port: number
  errorMessage?: string
  readyAtMs?: number
}

interface SessionSnapshot {
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

const api = {
  version: '0.4.0',
  concierge: {
    get: (): Promise<ConciergeState> => ipcRenderer.invoke('concierge:get'),
    send: (text: string): Promise<{ ok: boolean; status?: number; error?: string }> =>
      ipcRenderer.invoke('concierge:send', text),
    abort: (): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('concierge:abort'),
    onStateChange: (cb: (state: ConciergeState) => void): (() => void) => {
      const listener = (_evt: unknown, state: ConciergeState) => cb(state)
      ipcRenderer.on('concierge:state', listener)
      return () => ipcRenderer.removeListener('concierge:state', listener)
    },
    onEvent: (cb: (event: ConciergeEvent) => void): (() => void) => {
      const listener = (_evt: unknown, event: ConciergeEvent) => cb(event)
      ipcRenderer.on('concierge:event', listener)
      return () => ipcRenderer.removeListener('concierge:event', listener)
    },
  },
  sessions: {
    list: (): Promise<SessionSnapshot[]> => ipcRenderer.invoke('sessions:list'),
    get: (id: string): Promise<SessionSnapshot | null> => ipcRenderer.invoke('sessions:get', id),
    spawn: (name?: string): Promise<SessionSnapshot> => ipcRenderer.invoke('sessions:spawn', name),
    stop: (id: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('sessions:stop', id),
    setTts: (id: string, enabled: boolean): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke('sessions:setTts', id, enabled),
    send: (id: string, text: string): Promise<{ ok: boolean; status?: number; error?: string }> =>
      ipcRenderer.invoke('sessions:send', id, text),
    abort: (id: string): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke('sessions:abort', id),
    remember: (id: string, text: string): Promise<{ ok: boolean; count?: number; error?: string }> =>
      ipcRenderer.invoke('sessions:remember', id, text),
    recall: (id: string, query: string): Promise<{ ok: boolean; matches: string[]; error?: string }> =>
      ipcRenderer.invoke('sessions:recall', id, query),
    onUpdate: (cb: (sessions: SessionSnapshot[]) => void): (() => void) => {
      const listener = (_evt: unknown, list: SessionSnapshot[]) => cb(list)
      ipcRenderer.on('sessions:update', listener)
      return () => ipcRenderer.removeListener('sessions:update', listener)
    },
    onEvent: (cb: (id: string, event: ConciergeEvent) => void): (() => void) => {
      const listener = (
        _evt: unknown,
        payload: { sessionId: string; event: ConciergeEvent }
      ) => cb(payload.sessionId, payload.event)
      ipcRenderer.on('sessions:event', listener)
      return () => ipcRenderer.removeListener('sessions:event', listener)
    },
  },
  teams: {
    list: (): Promise<Team[]> => ipcRenderer.invoke('teams:list'),
    get: (id: string): Promise<Team | null> => ipcRenderer.invoke('teams:get', id),
    create: (partial: Partial<Team>): Promise<Team> =>
      ipcRenderer.invoke('teams:create', partial),
    update: (id: string, partial: Partial<Team>): Promise<Team | null> =>
      ipcRenderer.invoke('teams:update', id, partial),
    delete: (id: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('teams:delete', id),
    start: (id: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('teams:start', id),
    halt: (id: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('teams:halt', id),
    onUpdate: (cb: (teams: Team[]) => void): (() => void) => {
      const listener = (_evt: unknown, list: Team[]) => cb(list)
      ipcRenderer.on('teams:update', listener)
      return () => ipcRenderer.removeListener('teams:update', listener)
    },
  },
  agents: {
    brain: (agentId: string): Promise<BrainState | null> =>
      ipcRenderer.invoke('agents:brain', agentId),
    remember: (
      agentId: string,
      section: 'episodic' | 'semantic' | 'procedural' | 'working',
      text: string
    ): Promise<{ ok: boolean; entry?: BrainEntry; error?: string }> =>
      ipcRenderer.invoke('agents:brain:remember', agentId, section, text),
    recall: (
      agentId: string,
      query: string
    ): Promise<{ ok: boolean; matches: { section: string; text: string }[] }> =>
      ipcRenderer.invoke('agents:brain:recall', agentId, query),
  },
  tts: {
    speak: (text: string, voice?: string): Promise<{ audioPath?: string; error?: string }> =>
      ipcRenderer.invoke('tts:speak', text, voice),
    transcribe: (audioPath: string): Promise<{ text?: string; error?: string }> =>
      ipcRenderer.invoke('tts:transcribe', audioPath),
  },
  fs: {
    readTree: (rootPath: string): Promise<{ ok: boolean; tree: unknown[]; error?: string }> =>
      ipcRenderer.invoke('fs:readTree', rootPath),
  },
  settings: {
    get: (): Promise<unknown> => ipcRenderer.invoke('settings:get'),
    set: (s: unknown): Promise<{ ok: boolean }> => ipcRenderer.invoke('settings:set', s),
    pickFolder: (): Promise<string | null> => ipcRenderer.invoke('settings:pickFolder'),
  },
}

contextBridge.exposeInMainWorld('piAtrium', api)

export type PiAtriumAPI = typeof api
