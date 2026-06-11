/**
 * App settings persistence (Wave 9 / Task 9.1).
 * Reads/writes `userData/settings.json` on the main process. The renderer
 * never touches disk directly — it goes through IPC.
 */
import { app, dialog, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'

export interface Settings {
  vaultPath: string
  defaultModel: string
  theme: 'dark' | 'light'
  voiceProvider: 'mmx' | 'web-speech'
}

const DEFAULTS: Settings = {
  vaultPath: '',
  defaultModel: '',
  theme: 'dark',
  voiceProvider: 'mmx',
}

function settingsFile(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

export async function readSettings(): Promise<Settings> {
  try {
    const raw = await fs.readFile(settingsFile(), 'utf-8')
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return { ...DEFAULTS }
  }
}

export async function writeSettings(s: Settings): Promise<void> {
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(settingsFile(), JSON.stringify(s, null, 2), 'utf-8')
}

export async function pickVaultFolder(): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  if (!win) return null
  const r = await dialog.showOpenDialog(win, {
    title: 'Pick your Obsidian vault folder',
    properties: ['openDirectory'],
  })
  if (r.canceled || r.filePaths.length === 0) return null
  return r.filePaths[0] || null
}
