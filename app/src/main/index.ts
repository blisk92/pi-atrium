/**
 * Pi Atrium — Electron main process entry point
 * Wave 0 / Slice 0.1: "Empty room" — app boots, shell renders, cold start measured
 */

import { app, BrowserWindow, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Cold-start instrumentation
const t0 = Date.now()
const markers: Record<string, number> = { 'process.spawn': 0 }
markers['process.spawn'] = t0

let mainWindow: BrowserWindow | null = null

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
      preload: path.join(__dirname, '../preload/index.js'),
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

app.whenReady().then(() => {
  markers['app.whenReady'] = Date.now() - t0

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
