/**
 * End-to-end test for Wave 1 Task 1.3: multi-session.
 */

const { _electron: electron } = require('playwright')
const path = require('path')

const appDir = path.resolve(__dirname, '../../app')
const outDir = path.join(__dirname, 'screenshots')

async function main() {
  const log = (s) => console.log(s)
  const head = (s) => log('\n=== ' + s + ' ===')

  log('Launching Electron app at: ' + appDir)
  const app = await electron.launch({
    args: [appDir],
    executablePath: path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe'),
  })
  const window = await app.firstWindow(null, { timeout: 30000 })
  log('Window ready. Title: ' + await window.title())

  const logs = []
  app.process().stdout.on('data', (d) => logs.push(d.toString()))
  app.process().stderr.on('data', (d) => logs.push(d.toString()))

  const rendererLogs = []
  window.on('console', (msg) => rendererLogs.push(`[${msg.type()}] ${msg.text()}`))
  window.on('pageerror', (err) => rendererLogs.push(`[pageerror] ${err.message}`))

  const printLogs = () => {
    log('\n--- Renderer console (last 40) ---')
    rendererLogs.slice(-40).forEach((l) => log(l))
    log('\n--- Main process logs (last 30) ---')
    logs.slice(-30).forEach((l) => log(l.trim()))
  }

  try {
    head('1. Wait for concierge')
    await window.waitForFunction(
      () => document.querySelectorAll('.session').length > 0,
      null,
      { timeout: 15000 }
    )
    await window.waitForFunction(
      () => document.querySelector('.dot-active') !== null,
      null,
      { timeout: 15000 }
    )
    const initialSessions = await window.evaluate(() =>
      Array.from(document.querySelectorAll('.session')).map((s) => ({
        name: s.querySelector('.session-name')?.textContent,
        sub: s.querySelector('.session-sub')?.textContent,
      }))
    )
    log('Initial sessions: ' + JSON.stringify(initialSessions))
    await window.screenshot({ path: path.join(outDir, 'multi-1-concierge.png') })

    head('2. Concierge: send a real question')
    const textarea = window.locator('.input-box textarea')
    await textarea.click()
    await textarea.fill('What can you do in one short sentence?')
    await window.keyboard.press('Enter')
    await window.waitForFunction(
      () => {
        const agents = document.querySelectorAll('.message.role-agent')
        if (agents.length === 0) return false
        const last = agents[agents.length - 1]
        return !last.classList.contains('streaming') && last.textContent.trim().length > 0
      },
      null,
      { timeout: 90000 }
    )
    await window.screenshot({ path: path.join(outDir, 'multi-2-concierge-msg.png') })
    const conciergeResponse = await window.evaluate(() => {
      const m = document.querySelectorAll('.message.role-agent')
      return m[m.length - 1]?.textContent
    })
    log('Concierge response: ' + conciergeResponse?.slice(0, 120))

    head('3. Concierge: /remember + /recall')
    await textarea.click()
    await textarea.fill('/remember my favorite color is blue')
    await window.keyboard.press('Enter')
    await window.waitForTimeout(800)
    await textarea.click()
    await textarea.fill('/recall color')
    await window.keyboard.press('Enter')
    await window.waitForTimeout(1000)
    const conciergeRecall = await window.evaluate(() => {
      const sys = document.querySelectorAll('.message.role-system .message-body')
      return Array.from(sys).map((s) => s.textContent).slice(-1)[0]
    })
    log('Concierge recall: ' + conciergeRecall)
    if (!conciergeRecall || !conciergeRecall.includes('blue')) {
      throw new Error('Concierge did not recall the remembered fact')
    }
    log('✓ Memory works in concierge')

    head('4. Spawn 2nd session')
    await window.click('.spawn-btn')
    await window.waitForFunction(
      () => document.querySelectorAll('.session').length === 2,
      null,
      { timeout: 15000 }
    )
    log('Two sessions visible')
    const sessionsNow = await window.evaluate(() =>
      Array.from(document.querySelectorAll('.session')).map((s) => ({
        name: s.querySelector('.session-name')?.textContent,
        sub: s.querySelector('.session-sub')?.textContent,
        active: s.classList.contains('active'),
        dotClass: s.querySelector('.status-dot')?.className,
      }))
    )
    log('Sessions: ' + JSON.stringify(sessionsNow, null, 2))
    await window.waitForFunction(
      () => {
        const ss = document.querySelectorAll('.session')
        return (
          ss.length === 2 &&
          ss[1].classList.contains('active') &&
          ss[1].querySelector('.dot-active') !== null
        )
      },
      null,
      { timeout: 60000 }
    )
    log('2nd session is active')
    await window.screenshot({ path: path.join(outDir, 'multi-3-second-spawned.png') })

    head('5. Send message to 2nd session')
    await textarea.click()
    await textarea.fill('Reply with just the word ok.')
    await window.keyboard.press('Enter')
    await window.waitForFunction(
      () => {
        const agents = document.querySelectorAll('.message.role-agent')
        if (agents.length === 0) return false
        const last = agents[agents.length - 1]
        return !last.classList.contains('streaming') && last.textContent.trim().length > 0
      },
      null,
      { timeout: 90000 }
    )
    await window.screenshot({ path: path.join(outDir, 'multi-4-second-msg.png') })

    head('6. Verify memory isolation')
    await textarea.click()
    await textarea.fill('/recall color')
    await window.keyboard.press('Enter')
    await window.waitForTimeout(1000)
    const secondRecall = await window.evaluate(() => {
      const sys = document.querySelectorAll('.message.role-system .message-body')
      return Array.from(sys).map((s) => s.textContent).slice(-1)[0]
    })
    log('2nd session recall: ' + secondRecall)
    if (!secondRecall || !secondRecall.includes('no matches')) {
      throw new Error('Expected no matches in 2nd session, got: ' + secondRecall)
    }
    log('✓ Memory isolated per session')

    head('7. Switch back to concierge')
    // Use the concierge pill (★) to identify the concierge session reliably
    await window.click('.session:has(.concierge-pill)')
    await window.waitForTimeout(1500)
    await window.waitForFunction(
      () => {
        const active = document.querySelector('.session.active')
        const name = active?.querySelector('.session-name')?.textContent
        return name === 'Concierge' && document.querySelectorAll('.message.role-agent').length > 0
      },
      null,
      { timeout: 15000 }
    )
    await window.screenshot({ path: path.join(outDir, 'multi-5-back-to-concierge.png') })

    const conciergeAgentCount = await window.evaluate(
      () => document.querySelectorAll('.message.role-agent').length
    )
    log('Concierge agent messages count: ' + conciergeAgentCount)
    if (conciergeAgentCount < 1) {
      throw new Error('Concierge messages should still be there')
    }
    log('✓ Concierge messages persisted across session switch')

    log('\n=== ALL MULTI-SESSION TESTS PASSED ===')
    printLogs()
    await app.close()
    process.exit(0)
  } catch (err) {
    console.error('TEST FAILED:', err)
    console.error(err.stack)
    printLogs()
    await app.close()
    process.exit(1)
  }
}

main()
