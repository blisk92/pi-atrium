/**
 * End-to-end test for Task 0.3: send a message to the concierge and verify
 * the streamed response appears in the chat pane.
 *
 * Usage: node test-chat.js
 */

const { _electron: electron } = require('playwright')
const path = require('path')

const appDir = path.resolve(__dirname, '../../app')
const outDir = path.join(__dirname, 'screenshots')

;(async () => {
  console.log('Launching Electron app at:', appDir)
  const app = await electron.launch({
    args: [appDir],
    executablePath: path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe'),
  })

  const window = await app.firstWindow({ timeout: 30000 })
  console.log('Window ready. Title:', await window.title())

  const logs = []
  app.process().stdout.on('data', d => logs.push(d.toString()))
  app.process().stderr.on('data', d => logs.push(d.toString()))

  const rendererLogs = []
  window.on('console', msg => rendererLogs.push(`[${msg.type()}] ${msg.text()}`))
  window.on('pageerror', err => rendererLogs.push(`[pageerror] ${err.message}`))

  // Wait for concierge to be active
  console.log('Waiting for concierge to be active...')
  await window.waitForFunction(
    () => document.querySelector('.dot-active') !== null,
    { timeout: 15000 }
  )
  console.log('Concierge active.')

  // Take "empty" screenshot
  await window.screenshot({ path: path.join(outDir, 'chat-0-empty.png') })
  console.log('Empty-state screenshot saved.')

  // Find the input textarea and type a message
  const textarea = await window.locator('.input-box textarea')
  const testMessage = 'Reply with exactly "pong" and nothing else.'
  console.log('Typing message:', testMessage)
  await textarea.click()
  await textarea.fill(testMessage)

  // Press Enter to send
  const sendStart = Date.now()
  await window.keyboard.press('Enter')
  console.log('Message sent at', sendStart, 'ms')

  // Wait for the user message to appear
  await window.waitForFunction(
    (msg) => Array.from(document.querySelectorAll('.message.role-user .message-body'))
      .some(el => el.textContent.includes(msg)),
    testMessage,
    { timeout: 5000 }
  )
  console.log('User message rendered.')

  // Wait for the agent to start responding (streaming class)
  await window.waitForFunction(
    () => document.querySelector('.message.role-agent.streaming') !== null
    || document.querySelectorAll('.message.role-agent .message-body').length > 0,
    { timeout: 5000 }
  )
  console.log('Agent started responding.')

  // Wait for streaming to complete (no more .streaming class) and have content
  console.log('Waiting for response to complete (up to 30s)...')
  // First, log what events we receive
  await window.evaluate(() => {
    if (window.__eventLog) return
    window.__eventLog = []
    const api = window.piAtrium
    if (api) {
      api.concierge.onEvent((e) => {
        window.__eventLog.push({ type: e.type, content: e.content, messageEnd: !!e.messageEnd, turnEnd: !!e.turnEnd })
      })
    }
  })
  try {
    await window.waitForFunction(
      () => {
        const agents = document.querySelectorAll('.message.role-agent')
        if (agents.length === 0) return false
        const last = agents[agents.length - 1]
        return !last.classList.contains('streaming') && last.textContent.trim().length > 0
      },
      { timeout: 30000 }
    )
  } catch (e) {
    // Dump debug info
    const debug = await window.evaluate(() => ({
      eventLog: (window.__eventLog || []).slice(-20),
      agentMessages: Array.from(document.querySelectorAll('.message.role-agent')).map(m => ({
        streaming: m.classList.contains('streaming'),
        text: m.textContent.slice(0, 200),
      })),
    }))
    console.log('--- DEBUG (events received) ---')
    console.log(JSON.stringify(debug, null, 2))
    console.log('\n--- Main process logs ---')
    logs.forEach(l => console.log(l.trim()))
    console.log('\n--- Renderer console ---')
    rendererLogs.forEach(l => console.log(l))
    await app.close()
    process.exit(1)
  }
  const responseEnd = Date.now()
  const totalMs = responseEnd - sendStart
  console.log(`Response complete in ~${totalMs}ms`)

  // Wait an extra moment for the latency badge to appear
  await window.waitForTimeout(500)

  // Screenshot the full conversation
  await window.screenshot({ path: path.join(outDir, 'chat-1-response.png') })
  console.log('Response screenshot saved.')

  // Extract the agent's response text
  const agentText = await window.evaluate(() => {
    const msgs = document.querySelectorAll('.message.role-agent .message-body')
    return Array.from(msgs).map(m => m.textContent).join('\n---\n')
  })
  console.log('\n=== Agent response ===')
  console.log(agentText)
  console.log('=== End response ===\n')

  // Extract the latency badge
  const latency = await window.evaluate(() => {
    const badge = document.querySelector('.latency-badge')
    return badge ? badge.textContent.trim() : null
  })
  console.log('Latency badge:', latency)

  // Send a second message to test multi-turn
  console.log('\n--- Test 2: second message ---')
  await textarea.click()
  await textarea.fill('What can you do? Reply in one sentence.')
  await window.keyboard.press('Enter')
  await window.waitForFunction(
    () => {
      const agents = document.querySelectorAll('.message.role-agent')
      if (agents.length < 2) return false
      const last = agents[agents.length - 1]
      return !last.classList.contains('streaming') && last.textContent.trim().length > 0
    },
    { timeout: 30000 }
  )
  await window.waitForTimeout(500)
  await window.screenshot({ path: path.join(outDir, 'chat-2-second.png') })
  console.log('Second-message screenshot saved.')

  const allAgentText = await window.evaluate(() => {
    const msgs = document.querySelectorAll('.message.role-agent .message-body')
    return Array.from(msgs).map(m => m.textContent).join('\n---\n')
  })
  console.log('\n=== All agent responses ===')
  console.log(allAgentText)
  console.log('=== End ===\n')

  console.log('\n--- Renderer console ---')
  rendererLogs.forEach(l => console.log(l))

  console.log('\n--- Main process logs ---')
  logs.forEach(l => console.log(l.trim()))

  await app.close()
  console.log('Done.')
  process.exit(0)
})().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
