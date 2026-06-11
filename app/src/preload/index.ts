/**
 * Pi Atrium — Preload script
 * Exposes a minimal IPC bridge to the renderer.
 * Wave 1 Task 1.3: sessions API + legacy concierge aliases.
 */

import { contextBridge, ipcRenderer } from 'electron'

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
}

contextBridge.exposeInMainWorld('piAtrium', api)

export type PiAtriumAPI = typeof api
