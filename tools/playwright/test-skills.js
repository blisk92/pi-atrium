/**
 * End-to-end test for Wave 4 / Task 4.1: Skills visible.
 *  1. Open the Skills tab
 *  2. Verify the 4 builtin skills are listed
 *  3. Toggle a skill on, verify the count updates
 *  4. Switch to a different session (concierge → s1)
 *  5. Verify the skill is off for the new session (per-session state)
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

  const logs = []
  app.process().stdout.on('data', (d) => logs.push(d.toString()))
  const printLogs = () => {
    log('\n--- Main process logs (last 15) ---')
    logs.slice(-15).forEach((l) => log(l.trim()))
  }

  try {
    head('1. Wait for concierge + open Skills tab')
    await window.waitForFunction(
      () => document.querySelector('.dot-active') !== null,
      null,
      { timeout: 15000 }
    )
    await window.waitForTimeout(500)
    await window.click('.rp-tab:has-text("Skills")')
    await window.waitForTimeout(300)
    // Debug: check that the toggle's @click sees an activeId
    const debugInfo = await window.evaluate(() => {
      const visible = Array.from(document.querySelectorAll('.tab-pane')).find(
        (p) => p.offsetParent !== null
      )
      const t = visible?.querySelector('.skill-toggle')
      return {
        toggleExists: !!t,
        toggleHasOnClass: t?.classList.contains('on'),
        activeSessionName: document.querySelector('.session.active .session-name')?.textContent,
        subtitleText: document.querySelector('.pane-subtitle')?.textContent,
      }
    })
    log('Debug before toggle: ' + JSON.stringify(debugInfo))
    await window.waitForTimeout(500)
    await window.screenshot({ path: path.join(outDir, 'skills-1-list.png') })

    head('2. Verify the 4 builtin skills are listed')
    const skillNames = await window.evaluate(() => {
      const rows = document.querySelectorAll('.skill-row .skill-name')
      return Array.from(rows).map((r) => r.textContent)
    })
    log('Skill names: ' + JSON.stringify(skillNames))
    const expected = ['obsidian_retrieve', 'app_context', 'skill-manager', 'pi-intercom']
    if (skillNames.length !== 4 || !expected.every((n) => skillNames.includes(n))) {
      throw new Error('Expected 4 builtin skills, got: ' + JSON.stringify(skillNames))
    }
    log('✓ All 4 builtin skills listed')

    head('3. Toggle obsidian_retrieve on')
    // Debug before clicking
    const debugBefore = await window.evaluate(() => {
      const visible = Array.from(document.querySelectorAll('.tab-pane')).find(
        (p) => p.offsetParent !== null
      )
      const rows = visible?.querySelectorAll('.skill-row') || []
      return {
        activeSession: document.querySelector('.session.active .session-name')?.textContent,
        toggleCount: rows.length,
        subtitle: visible?.querySelector('.pane-subtitle')?.textContent,
      }
    })
    log('Debug before click: ' + JSON.stringify(debugBefore))
    // Helper: read the count of .skill-toggle.on elements in the visible pane
    async function onCount() {
      return await window.evaluate(() => {
        const visible = Array.from(document.querySelectorAll('.tab-pane')).find(
          (p) => p.offsetParent !== null
        )
        if (!visible) return -1
        return visible.querySelectorAll('.skill-toggle.on').length
      })
    }
    // Toggle obsidian_retrieve
    await window.evaluate(() => {
      const visible = Array.from(document.querySelectorAll('.tab-pane')).find(
        (p) => p.offsetParent !== null
      )
      const rows = visible?.querySelectorAll('.skill-row') || []
      for (const r of rows) {
        if (r.querySelector('.skill-name')?.textContent === 'obsidian_retrieve') {
          r.querySelector('.skill-toggle')?.click()
          return
        }
      }
    })
    await window.waitForTimeout(200)
    let count = await onCount()
    log('Toggle count after first click: ' + count)
    if (count !== 1) throw new Error('Expected 1 skill on, got ' + count)
    log('✓ Skill toggle works (1 on)')

    head('4. Toggle app_context on too')
    await window.evaluate(() => {
      const visible = Array.from(document.querySelectorAll('.tab-pane')).find(
        (p) => p.offsetParent !== null
      )
      const rows = visible?.querySelectorAll('.skill-row') || []
      for (const r of rows) {
        if (r.querySelector('.skill-name')?.textContent === 'app_context') {
          r.querySelector('.skill-toggle')?.click()
          return
        }
      }
    })
    await window.waitForTimeout(200)
    count = await onCount()
    log('Toggle count after second click: ' + count)
    if (count !== 2) throw new Error('Expected 2 skills on, got ' + count)
    log('✓ Second toggle works (2 on)')

    head('4. Toggle app_context on too')

    head('5. Spawn a 2nd session and verify the toggle is independent')
    await window.click('.spawn-btn')
    await window.waitForFunction(
      () => document.querySelectorAll('.session').length === 2,
      null,
      { timeout: 15000 }
    )
    await window.waitForFunction(
      () => {
        const ss = document.querySelectorAll('.session')
        return ss.length === 2 && ss[1].classList.contains('active')
      },
      null,
      { timeout: 15000 }
    )
    await window.waitForTimeout(800)
    count = await onCount()
    log('Toggle count on 2nd session: ' + count)
    if (count !== 0) throw new Error('Expected 0 skills on for new session, got ' + count)
    log('✓ Per-session skill state is independent')
    await window.screenshot({ path: path.join(outDir, 'skills-2-second-session.png') })

    head('6. Switch back to concierge, verify state preserved')
    await window.click('.session:has(.concierge-pill)')
    await window.waitForTimeout(500)
    count = await onCount()
    log('Back on concierge toggle count: ' + count)
    if (count !== 2) throw new Error('Concierge skill state lost; expected 2 on, got ' + count)
    log('✓ Concierge skill state preserved across session switches')

    log('\n=== TASK 4.1 TEST PASSED ===')
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
