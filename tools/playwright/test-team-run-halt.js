/**
 * End-to-end test for Wave 2 / Tasks 2.2 + 2.3: Start + Halt a team.
 *  1. Use the team created by test-team-create.js (or create fresh)
 *  2. Click Start → wait for all members to become active
 *  3. Send a message to one member's session
 *  4. Click Halt → wait for all members to stop
 *  5. Verify team is back in "stopped" status
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
    log('\n--- Main process logs (last 30) ---')
    logs.slice(-30).forEach((l) => log(l.trim()))
  }

  try {
    head('1. Wait for concierge + check for existing team')
    await window.waitForFunction(
      () => document.querySelector('.dot-active') !== null,
      null,
      { timeout: 15000 }
    )

    // Check if there's already a team from previous test
    const existingTeams = await window.evaluate(() =>
      document.querySelectorAll('.team').length
    )
    log('Existing teams: ' + existingTeams)
    if (existingTeams === 0) {
      // Create a fresh team
      head('1b. Create a fresh team')
      const teamsAddBtn = await window.evaluateHandle(() => {
        const sections = document.querySelectorAll('.sidebar-section')
        return sections[sections.length - 1]?.querySelector('.spawn-btn')
      })
      await teamsAddBtn.asElement().click()
      await window.waitForTimeout(400)
      await window.locator('.modal .field').first().locator('input').fill('Test team')
      const memberRows = window.locator('.member-row')
      await memberRows.nth(0).locator('.member-name').fill('Alice')
      await memberRows.nth(0).locator('.member-role').fill('researcher')
      await memberRows.nth(0).locator('.member-task').fill('Greet the user briefly.')
      await window.click('.modal .btn-primary')
      await window.waitForFunction(
        () => !document.querySelector('.modal-backdrop'),
        null,
        { timeout: 10000 }
      )
      await window.waitForFunction(
        () => document.querySelectorAll('.team').length > 0,
        null,
        { timeout: 5000 }
      )
    }

    // If the existing team is already active from a previous test, halt it first
    const currentPill = await window.evaluate(() => {
      return document.querySelector('.team .pill')?.textContent
    })
    log('Team status before start: ' + currentPill)
    if (currentPill === 'active' || currentPill === 'starting') {
      log('Halting existing active team first')
      await window.click('.team-row')
      await window.waitForTimeout(200)
      await window.click('.ta-btn.warn') // Halt button
      await window.waitForFunction(
        () => document.querySelector('.team .pill')?.textContent === 'stopped',
        null,
        { timeout: 30000 }
      )
      log('Existing team halted')
    }

    head('2. Click Start')
    // Expand the team first to see the Start button
    await window.click('.team-row')
    await window.waitForTimeout(200)
    const t0 = Date.now()
    await window.click('.ta-btn.primary') // Start button
    log('Start clicked at ' + t0 + 'ms')
    await window.screenshot({ path: path.join(outDir, 'team-5-starting.png') })

    head('3. Wait for team to be active')
    await window.waitForFunction(
      () => {
        const pill = document.querySelector('.team .pill')?.textContent
        return pill === 'active'
      },
      null,
      { timeout: 60000 }
    )
    const elapsed = Date.now() - t0
    log(`✓ Team is ACTIVE after ${elapsed}ms`)
    await window.screenshot({ path: path.join(outDir, 'team-6-active.png') })

    head('4. Verify all members are active')
    const memberStatus = await window.evaluate(() => {
      const members = document.querySelectorAll('.team-member')
      return Array.from(members).map((m) => ({
        name: m.querySelector('.member-name')?.textContent,
        dotClass: m.querySelector('.status-dot')?.className,
        port: m.querySelector('.member-port')?.textContent,
      }))
    })
    log('Members: ' + JSON.stringify(memberStatus, null, 2))
    const allActive = memberStatus.every((m) => m.dotClass?.includes('dot-active'))
    if (!allActive) {
      throw new Error('Not all members are active')
    }
    log(`✓ All ${memberStatus.length} members are active`)

    head('5. Click on a member to switch to their session')
    await window.click('.team-member')
    await window.waitForTimeout(500)
    const activeSessionName = await window.evaluate(() => {
      const active = document.querySelector('.session.active')
      return active?.querySelector('.session-name')?.textContent
    })
    log('Active session: ' + activeSessionName)
    if (!activeSessionName || !activeSessionName.includes('Alice')) {
      throw new Error('Did not switch to Alice session')
    }
    log('✓ Switched to member session')

    head('6. Halt the team')
    // Re-expand the team (it may have collapsed during member click)
    await window.evaluate(() => {
      const row = document.querySelector('.team-row')
      if (row && !row.nextElementSibling?.classList.contains('team-body')) {
        // Not expanded — find the caret indicator and check
        const team = row.parentElement
        const body = team?.querySelector('.team-body')
        if (!body) row.click()
      }
    })
    await window.waitForTimeout(200)
    // Make sure body is visible
    await window.waitForSelector('.team-body', { state: 'visible' })
    const haltStart = Date.now()
    await window.click('.ta-btn.warn') // Halt button
    log('Halt clicked at ' + haltStart + 'ms')

    await window.waitForFunction(
      () => {
        const pill = document.querySelector('.team .pill')?.textContent
        return pill === 'stopped' || pill === 'error'
      },
      null,
      { timeout: 30000 }
    )
    const haltElapsed = Date.now() - haltStart
    log(`✓ Team is ${await window.evaluate(() => document.querySelector('.team .pill')?.textContent)} after ${haltElapsed}ms`)
    await window.screenshot({ path: path.join(outDir, 'team-7-stopped.png') })

    head('7. Verify all members are stopped')
    const stoppedMembers = await window.evaluate(() => {
      const members = document.querySelectorAll('.team-member')
      return Array.from(members).map((m) => ({
        name: m.querySelector('.member-name')?.textContent,
        dotClass: m.querySelector('.status-dot')?.className,
      }))
    })
    log('Stopped members: ' + JSON.stringify(stoppedMembers))
    const allStopped = stoppedMembers.every((m) => !m.dotClass?.includes('dot-active'))
    if (!allStopped) {
      throw new Error('Some members are still active after halt')
    }
    log('✓ All members stopped')

    log('\n=== TASKS 2.2 + 2.3 TEST PASSED ===')
    log(`Benchmarks: start=${elapsed}ms, halt=${haltElapsed}ms`)
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
