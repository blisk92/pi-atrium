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
  // defaultPath: open at the user's home so the dialog starts fresh,
  // not at a stale recent path that may have been moved/deleted
  // (which previously surfaced as 'Windows cannot access' errors).
  const r = await dialog.showOpenDialog(win, {
    title: 'Pick your Obsidian vault folder (the one with the .obsidian subfolder)',
    defaultPath: app.getPath('home'),
    properties: ['openDirectory'],
  })
  if (r.canceled || r.filePaths.length === 0) return null
  return r.filePaths[0] || null
}

/**
 * Validate that the chosen path is a real, accessible directory that
 * looks like an Obsidian vault (has a .obsidian/ subfolder or
 * obsidian.json). Returns a human-readable reason if not, or null if OK.
 */
export async function validateVault(p: string): Promise<string | null> {
  if (!p) return 'No path provided.'
  let st: import('node:fs').Stats
  try {
    st = await fs.stat(p)
  } catch {
    return `Path is not accessible: ${p}`
  }
  if (!st.isDirectory()) return 'Path is not a directory.'
  // Heuristic: a real Obsidian vault has a .obsidian folder
  // (.obsidian/obsidian.json) OR an obsidian.json at the root
  // (for newer plugin-injected vaults).
  try {
    await fs.access(path.join(p, '.obsidian'))
    return null
  } catch {
    /* fall through */
  }
  try {
    await fs.access(path.join(p, 'obsidian.json'))
    return null
  } catch {
    /* fall through */
  }
  return 'No .obsidian folder found. Pick the vault itself (the folder that contains .obsidian/), not its parent.'
}
