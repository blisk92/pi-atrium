const { _electron: electron } = require('playwright')
const path = require('path')
;(async () => {
  const app = await electron.launch({
    args: [path.resolve(__dirname, '../../app')],
    executablePath: path.resolve(__dirname, '../../app/node_modules/electron/dist/electron.exe'),
  })
  const window = await app.firstWindow(null, { timeout: 30000 })
  const logs = []
  window.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`))
  window.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`))
  await window.waitForFunction(() => document.querySelector('.dot-active') !== null, null, { timeout: 15000 })
  await window.waitForTimeout(2500)
  const state = await window.evaluate(() => ({
    tabs: Array.from(document.querySelectorAll('.rp-tab')).map((t) => t.textContent),
    sidebarExists: !!document.querySelector('.sidebar'),
    rightPaneExists: !!document.querySelector('.right-pane'),
    allRoots: Array.from(document.querySelectorAll('*')).length,
  }))
  console.log('State:', JSON.stringify(state, null, 2))
  console.log('\nLogs:')
  logs.forEach((l) => console.log(l))
  await app.close()
})()
