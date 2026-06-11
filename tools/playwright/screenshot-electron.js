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
  const window = await app.firstWindow({ timeout: 30000 })
  console.log('Window ready. Title:', await window.title())

  // Capture cold-start logs from main process
  const logs = []
  app.process().stdout.on('data', d => logs.push(d.toString()))
  app.process().stderr.on('data', d => logs.push(d.toString()))

  // Capture renderer console output
  const rendererLogs = []
  window.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`
    rendererLogs.push(text)
  })
  window.on('pageerror', err => {
    rendererLogs.push(`[pageerror] ${err.message}`)
  })

  // Wait for concierge to be active in the renderer
  console.log('Waiting for concierge to be active (up to 15s)...')
  try {
    await window.waitForFunction(
      () => {
        const t = (window).__PINIA__ || null
        // Fallback: check the DOM for the active state
        return document.querySelector('.dot-active') !== null
      },
      { timeout: 15000 }
    )
    console.log('Concierge is active in the UI!')
  } catch (e) {
    console.log('Timed out waiting for active state, taking screenshot anyway...')
  }

  await window.waitForTimeout(1000)

  const out = path.join(outDir, 'electron-app-1400x900.png')
  await window.screenshot({ path: out })
  console.log('Screenshot:', out)

  console.log('\n--- Renderer console ---')
  rendererLogs.forEach(l => console.log(l))

  console.log('\n--- Main process logs ---')
  logs.forEach(l => console.log(l.trim()))

  await app.close()
})().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
