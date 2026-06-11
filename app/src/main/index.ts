/**
 * Pi Atrium — Electron main process entry point
 * Wave 0 / Slice 0.2: spawn the concierge headless Pi sidecar on app start.
 */

import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import http from 'node:http'
import { spawnHeadlessPi, killHeadlessPi } from '../headless-pi/cli.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Cold-start instrumentation
const t0 = Date.now()
const markers: Record<string, number> = { 'process.spawn': 0 }
markers['process.spawn'] = t0

// Concierge state
const CONCIERGE_PORT = 49152
interface ConciergeState {
  status: 'idle' | 'starting' | 'active' | 'error'
  pid?: number
  port: number
  errorMessage?: string
  readyAtMs?: number
}
let concierge: ConciergeState = { status: 'idle', port: CONCIERGE_PORT }
let mainWindow: BrowserWindow | null = null

function broadcastConcierge(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('concierge:state', concierge)
  }
}

async function setupConciergeCwd(): Promise<string> {
  // app.getAppPath() returns the app's root directory (where package.json lives).
  // Dev: <repo>/Projects/pi-atrium/app   Prod: <install-dir>/resources/app
  const appPath = app.getAppPath()

  // Runtime dir holds the concierge's .pi/ folder (system prompt, etc.)
  const userDataPath = app.isPackaged
    ? path.join(app.getPath('userData'), 'concierge')
    : path.join(appPath, '.runtime', 'concierge')
  await fs.mkdir(path.join(userDataPath, '.pi'), { recursive: true })

  // Copy the bundled SYSTEM.md to the runtime dir
  const sourcePath = app.isPackaged
    ? path.join(process.resourcesPath, 'system', 'concierge.md')
    : path.join(appPath, 'resources', 'system', 'concierge.md')
  const targetPath = path.join(userDataPath, '.pi', 'SYSTEM.md')
  try {
    const content = await fs.readFile(sourcePath, 'utf-8')
    await fs.writeFile(targetPath, content, 'utf-8')
  } catch (err) {
    console.warn('[main] could not write SYSTEM.md:', (err as Error).message)
  }
  return userDataPath
}

async function pollConciergeHealth(retries = 30): Promise<void> {
  for (let i = 0; i < retries; i++) {
    await new Promise((r) => setTimeout(r, 500))
    try {
      const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = http.get(
          { hostname: '127.0.0.1', port: CONCIERGE_PORT, path: '/health', timeout: 1000 },
          (r) => {
            const chunks: Buffer[] = []
            r.on('data', (c) => chunks.push(c as Buffer))
            r.on('end', () => resolve({ status: r.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf-8') }))
          }
        )
        req.on('error', reject)
        req.on('timeout', () => req.destroy(new Error('timeout')))
      })
      if (res.status === 200) {
        const health = JSON.parse(res.body) as { status: string; readyAt: number }
        concierge = {
          status: 'active',
          pid: concierge.pid,
          port: CONCIERGE_PORT,
          readyAtMs: health.readyAt,
        }
        markers['concierge.active'] = Date.now() - t0
        console.log(`[main] concierge is active (${markers['concierge.active']}ms, ready in ${health.readyAt}ms)`)
        broadcastConcierge()
        return
      }
    } catch {
      // not ready yet
    }
  }
  // Timed out
  concierge = {
    status: 'error',
    pid: concierge.pid,
    port: CONCIERGE_PORT,
    errorMessage: 'Health check timed out after 15s',
  }
  console.error('[main] concierge health check timed out')
  broadcastConcierge()
}

async function startConcierge(): Promise<void> {
  concierge = { status: 'starting', port: CONCIERGE_PORT }
  broadcastConcierge()
  markers['concierge.spawnStart'] = Date.now() - t0

  try {
    const cwd = await setupConciergeCwd()
    const appPath = app.getAppPath()
    // Dev: <app>/src/headless-pi/server.ts (run via tsx)
    // Prod: <resources>/app/out/main/headless-pi-server.js (after Slice 9.3 packaging)
    const serverScriptPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app', 'out', 'main', 'headless-pi-server.js')
      : path.join(appPath, 'src', 'headless-pi', 'server.ts')
    const { pid } = spawnHeadlessPi({
      port: CONCIERGE_PORT,
      cwd,
      serverScriptPath,
    })
    concierge = { ...concierge, pid }
    markers['concierge.spawned'] = Date.now() - t0
    console.log(`[main] concierge spawned, pid=${pid}, cwd=${cwd}`)
    console.log(`[main] server script: ${serverScriptPath}`)
    broadcastConcierge()
  } catch (err) {
    concierge = { ...concierge, status: 'error', errorMessage: (err as Error).message }
    markers['concierge.error'] = Date.now() - t0
    console.error('[main] failed to spawn concierge:', err)
    broadcastConcierge()
    return
  }

  // Poll for health (the concierge is "starting" until /health returns 200)
  void pollConciergeHealth()
}

function createWindow(): void {
  markers['createWindow.start'] = Date.now() - t0

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0F172A',
    show: false,
    title: 'Pi Atrium',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Open external links in the user's browser, not in-app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    markers['ready-to-show'] = Date.now() - t0
    console.log('[cold-start]', JSON.stringify(markers, null, 2))
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  markers['app.whenReady'] = Date.now() - t0

  // IPC: renderer asks for current concierge state
  ipcMain.handle('concierge:get', () => concierge)

  // IPC: renderer sends a message to the concierge (will be wired in Slice 0.3)
  ipcMain.handle('concierge:send', async (_evt, text: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:${CONCIERGE_PORT}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      return { ok: res.ok, status: res.status }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  createWindow()

  // Spawn the concierge (parallel to window creation)
  void startConcierge()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  killHeadlessPi()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  killHeadlessPi()
})
