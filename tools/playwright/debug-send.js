/**
 * Quick debug: send a message and screenshot the state after 15s.
 */
const { _electron: electron } = require('playwright')
const path = require('path')

const appDir = path.resolve(__dirname, '../../app')
const outDir = path.join(__dirname, 'screenshots')

;(async () => {
  const app = await electron.launch({
    args: [appDir],
    executablePath: path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe'),
  })
  const window = await app.firstWindow(null, { timeout: 30000 })

  const logs = []
  window.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`))

  await window.waitForFunction(
    () => document.querySelector('.dot-active') !== null,
    null,
    { timeout: 15000 }
  )
  console.log('Concierge active')

  const textarea = window.locator('.input-box textarea')
  await textarea.click()
  await textarea.fill('What is 2+2? Reply briefly.')
  await window.keyboard.press('Enter')
  console.log('Message sent')

  await window.waitForTimeout(20000)

  await window.screenshot({ path: path.join(outDir, 'debug-after-20s.png') })

  const state = await window.evaluate(() => ({
    messageCount: document.querySelectorAll('.message').length,
    userMsgs: document.querySelectorAll('.message.role-user').length,
    agentMsgs: document.querySelectorAll('.message.role-agent').length,
    streamingMsgs: document.querySelectorAll('.message.streaming').length,
    lastAgentText: (() => {
      const m = document.querySelectorAll('.message.role-agent')
      return m[m.length - 1]?.textContent?.slice(0, 200)
    })(),
  }))
  console.log('State after 20s:', JSON.stringify(state, null, 2))

  console.log('\n--- Renderer logs ---')
  logs.forEach((l) => console.log(l))

  await app.close()
  process.exit(0)
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
