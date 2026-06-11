/**
 * Pi Atrium — Preload script
 * Wave 0: exposes a minimal API to the renderer.
 * Will expand in Slice 0.2+ (agent lifecycle, IPC handlers, etc.)
 */

import { contextBridge } from 'electron'

const api = {
  // Filled in Slice 0.2+
  // For now, just a placeholder so the renderer can verify the bridge.
  version: '0.1.0',
}

contextBridge.exposeInMainWorld('piAtrium', api)

export type PiAtriumAPI = typeof api
