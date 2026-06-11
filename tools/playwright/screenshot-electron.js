// Launch the built Electron app and screenshot the main window.
// Usage: node screenshot-electron.js [app-path]
//   app-path defaults to the Pi Atrium app at ../../app

const { _electron: electron } = require('playwright')
const path = require('path')
const fs = require('fs')

const PROJECT_ROOT = path.resolve(__dirname, '../..')
const appPath = process.argv[2] || path.join(PROJECT_ROOT, 'app')
const outDir = path.resolve(__dirname, './screenshots')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

;(async () => {
  console.log('Launching Electron app at:', appPath)
  const electronBin = path.join(appPath, 'node_modules', 'electron', 'dist', 'electron.exe')
  const app = await electron.launch({
    executablePath: electronBin,
    args: [appPath],
    cwd: appPath,
    timeout: 30000,
  })

  console.log('App launched. Waiting for first window...')
  const window = await app.firstWindow({ timeout: 15000 })
  console.log('Window ready. Title:', await window.title())

  // Capture cold-start logs from main process
  const logs = []
  app.process().stdout.on('data', d => logs.push(d.toString()))
  app.process().stderr.on('data', d => logs.push(d.toString()))

  // Wait for the cold-start timer to record
  await window.waitForLoadState('networkidle', { timeout: 10000 })
  await window.waitForTimeout(500)

  const out = path.join(outDir, 'electron-app-1400x900.png')
  await window.screenshot({ path: out })
  console.log('Screenshot:', out)

  // Print any console errors from the renderer
  window.on('console', msg => {
    if (msg.type() === 'error') console.log('RENDERER ERROR:', msg.text())
  })
  window.on('pageerror', err => console.log('PAGE ERROR:', err.message))

  console.log('\n--- Main process logs ---')
  logs.forEach(l => console.log(l.trim()))

  await app.close()
})().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
