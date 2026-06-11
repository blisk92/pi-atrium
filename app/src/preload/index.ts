/**
 * Pi Atrium — Preload script
 * Exposes a minimal IPC bridge to the renderer.
 * Will expand in Slice 0.3+ (chat streaming, file tree, etc.)
 */

import { contextBridge, ipcRenderer } from 'electron'

interface ConciergeState {
  status: 'idle' | 'starting' | 'active' | 'error'
  pid?: number
  port: number
  errorMessage?: string
  readyAtMs?: number
}

const api = {
  version: '0.2.0',
  concierge: {
    get: (): Promise<ConciergeState> => ipcRenderer.invoke('concierge:get'),
    send: (text: string): Promise<{ ok: boolean; status?: number; error?: string }> =>
      ipcRenderer.invoke('concierge:send', text),
    onStateChange: (cb: (state: ConciergeState) => void): (() => void) => {
      const listener = (_evt: unknown, state: ConciergeState) => cb(state)
      ipcRenderer.on('concierge:state', listener)
      return () => ipcRenderer.removeListener('concierge:state', listener)
    },
  },
}

contextBridge.exposeInMainWorld('piAtrium', api)

export type PiAtriumAPI = typeof api
