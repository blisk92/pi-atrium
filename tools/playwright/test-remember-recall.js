/**
 * End-to-end test for Wave 3 / Task 3.2: Remember/recall via slash commands.
 *  1. Send /remember semantic the user prefers short answers
 *  2. Send /remember procedural always greet the user on first message
 *  3. Send /recall short — should match the semantic entry
 *  4. Switch to Brain tab, verify both entries are visible
 *  5. Restart the app, verify the brain entries persisted (Task 3.3 aspect)
 */

const { _electron: electron } = require('playwright')
const path = require('path')
const fs = require('fs')

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
  log('Window ready.')

  const logs = []
  app.process().stdout.on('data', (d) => logs.push(d.toString()))
  app.process().stderr.on('data', (d) => logs.push(d.toString()))

  const printLogs = () => {
    log('\n--- Main process logs (last 25) ---')
    logs.slice(-25).forEach((l) => log(l.trim()))
  }

  try {
    head('1. Wait for concierge')
    await window.waitForFunction(
      () => document.querySelector('.dot-active') !== null,
      null,
      { timeout: 15000 }
    )
    log('Concierge active')

    head('2. Send /remember semantic the user prefers short answers')
    const textarea = window.locator('.input-box textarea')
    await textarea.click()
    await textarea.fill('/remember semantic the user prefers short answers')
    await window.keyboard.press('Enter')
    await window.waitForFunction(
      () => {
        const sys = document.querySelectorAll('.message.role-system .message-body')
        return Array.from(sys).some((s) => s.textContent.includes('remembered in **semantic**'))
      },
      null,
      { timeout: 5000 }
    )
    log('✓ Semantic entry added')

    head('3. Send /remember procedural always greet the user on first message')
    await textarea.click()
    await textarea.fill('/remember procedural always greet the user on first message')
    await window.keyboard.press('Enter')
    await window.waitForFunction(
      () => {
        const sys = document.querySelectorAll('.message.role-system .message-body')
        return Array.from(sys).some((s) => s.textContent.includes('remembered in **procedural**'))
      },
      null,
      { timeout: 5000 }
    )
    log('✓ Procedural entry added')

    head('4. Send /recall short — should match the semantic entry')
    await textarea.click()
    await textarea.fill('/recall short')
    await window.keyboard.press('Enter')
    await window.waitForFunction(
      () => {
        const sys = document.querySelectorAll('.message.role-system .message-body')
        return Array.from(sys).some((s) => /1 brain match/i.test(s.textContent))
      },
      null,
      { timeout: 5000 }
    )
    const recallResult = await window.evaluate(() => {
      const sys = document.querySelectorAll('.message.role-system .message-body')
      return Array.from(sys).map((s) => s.textContent).slice(-1)[0]
    })
    log('Recall result: ' + recallResult)
    if (!recallResult?.includes('semantic') || !recallResult?.includes('short answers')) {
      throw new Error('Recall did not return the semantic entry: ' + recallResult)
    }
    log('✓ Recall matched the semantic entry')

    head('5. Verify the entries are on disk')
    const semanticDir = path.join(appDir, '.runtime', 'sessions', 'concierge', 'brain', 'semantic')
    const proceduralDir = path.join(appDir, '.runtime', 'sessions', 'concierge', 'brain', 'procedural')
    const semFiles = fs.readdirSync(semanticDir).filter((f) => f.endsWith('.md'))
    const procFiles = fs.readdirSync(proceduralDir).filter((f) => f.endsWith('.md'))
    log('Semantic files: ' + JSON.stringify(semFiles))
    log('Procedural files: ' + JSON.stringify(procFiles))
    if (semFiles.length === 0) throw new Error('No semantic brain files')
    if (procFiles.length === 0) throw new Error('No procedural brain files')
    log('✓ Brain entries are on disk')

    head('6. Switch to Brain tab and verify entries are visible')
    await window.click('.rp-tab:has-text("Brain")')
    await window.waitForTimeout(800)
    await window.screenshot({ path: path.join(outDir, 'brain-3-recall.png') })

    const sectionCounts = await window.evaluate(() => {
      const cards = document.querySelectorAll('.brain-card')
      return Array.from(cards).map((c) => ({
        name: c.querySelector('.brain-name')?.textContent,
        count: c.querySelector('.brain-count')?.textContent,
      }))
    })
    log('Section counts: ' + JSON.stringify(sectionCounts))
    const sem = sectionCounts.find((c) => c.name === 'Semantic')
    const proc = sectionCounts.find((c) => c.name === 'Procedural')
    if (!sem?.count?.startsWith('1 ')) throw new Error('Semantic should have 1 entry')
    if (!proc?.count?.startsWith('1 ')) throw new Error('Procedural should have 1 entry')
    log('✓ Brain tab shows entry counts correctly')

    head('7. Restart the app and verify brain persisted (Task 3.3)')
    await app.close()
    log('App closed. Reopening...')
    const app2 = await electron.launch({
      args: [appDir],
      executablePath: path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe'),
    })
    const window2 = await app2.firstWindow(null, { timeout: 30000 })
    await window2.waitForFunction(
      () => document.querySelector('.dot-active') !== null,
      null,
      { timeout: 15000 }
    )
    // Switch to Brain tab
    await window2.click('.rp-tab:has-text("Brain")')
    await window2.waitForTimeout(1000)
    const persistedCounts = await window2.evaluate(() => {
      const cards = document.querySelectorAll('.brain-card')
      return Array.from(cards).map((c) => ({
        name: c.querySelector('.brain-name')?.textContent,
        count: c.querySelector('.brain-count')?.textContent,
      }))
    })
    log('After restart: ' + JSON.stringify(persistedCounts))
    const semAfter = persistedCounts.find((c) => c.name === 'Semantic')
    const procAfter = persistedCounts.find((c) => c.name === 'Procedural')
    if (!semAfter?.count?.startsWith('1 ')) throw new Error('Semantic not persisted after restart')
    if (!procAfter?.count?.startsWith('1 ')) throw new Error('Procedural not persisted after restart')
    log('✓ Brain persisted across app restart (Task 3.3)')

    log('\n=== TASKS 3.2 + 3.3 TEST PASSED ===')
    printLogs()
    await app2.close()
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
