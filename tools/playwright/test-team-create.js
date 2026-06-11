/**
 * End-to-end test for Wave 2 / Task 2.1: Define team.
 *  1. Open the team form via the "+" in the Teams section
 *  2. Fill in name, description, and 2 members
 *  3. Save the team
 *  4. Verify the team appears in the sidebar with "Draft" status
 *  5. Expand the team and verify both members are listed
 *  6. Reload (kill + restart) and verify the team persisted
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

    head('2. Open the New Team form')
    // The Teams section has its own + button — find it.
    const teamsAddBtn = await window.evaluateHandle(() => {
      const sections = document.querySelectorAll('.sidebar-section')
      // Last section is Teams (Sessions is first, Teams is second)
      const teamsSection = sections[sections.length - 1]
      return teamsSection?.querySelector('.spawn-btn')
    })
    await teamsAddBtn.asElement().click()
    await window.waitForTimeout(400)
    await window.screenshot({ path: path.join(outDir, 'team-1-form-open.png') })
    log('Form opened')

    head('3. Fill in name, description, and members')
    // Name
    const nameInput = window.locator('.modal .field').first().locator('input')
    await nameInput.fill('Research team')
    // Description
    const descInput = window.locator('.modal textarea')
    await descInput.fill('Research the latest agent harness patterns.')
    // First member (already in form, just fill it)
    const memberRows = window.locator('.member-row')
    const r0 = memberRows.nth(0)
    await r0.locator('.member-name').fill('Alice')
    await r0.locator('.member-role').fill('researcher')
    await r0.locator('.member-task').fill('Find 3 papers on multi-agent orchestration')
    // Add a second member
    await window.click('.add-btn')
    await window.waitForTimeout(200)
    const r1 = memberRows.nth(1)
    await r1.locator('.member-name').fill('Bob')
    await r1.locator('.member-role').fill('writer')
    await r1.locator('.member-task').fill('Write a summary of findings')
    await window.screenshot({ path: path.join(outDir, 'team-2-form-filled.png') })
    log('Form filled')

    head('4. Submit the form')
    await window.click('.modal .btn-primary')
    // Wait for the form to close and the team to appear
    await window.waitForFunction(
      () => !document.querySelector('.modal-backdrop'),
      null,
      { timeout: 10000 }
    )
    log('Form closed')
    await window.waitForFunction(
      () => {
        const teams = document.querySelectorAll('.team')
        return teams.length > 0
      },
      null,
      { timeout: 5000 }
    )
    await window.screenshot({ path: path.join(outDir, 'team-3-created.png') })

    head('5. Verify the team is in the sidebar')
    const teamInfo = await window.evaluate(() => {
      const team = document.querySelector('.team')
      if (!team) return null
      const name = team.querySelector('.team-name')?.textContent
      const sub = team.querySelector('.team-sub')?.textContent
      const pill = team.querySelector('.pill')?.textContent
      return { name, sub, pill }
    })
    log('Team: ' + JSON.stringify(teamInfo))
    if (!teamInfo || teamInfo.name !== 'Research team') {
      throw new Error('Team not found in sidebar')
    }
    if (teamInfo.pill !== 'draft') {
      throw new Error('Team status should be draft, got: ' + teamInfo.pill)
    }
    if (!teamInfo.sub || !teamInfo.sub.includes('2 members')) {
      throw new Error('Team should have 2 members, got: ' + teamInfo.sub)
    }
    log('✓ Team created with Draft status and 2 members')

    head('6. Expand the team and verify members')
    await window.click('.team-row')
    await window.waitForTimeout(300)
    const memberInfo = await window.evaluate(() => {
      const rows = document.querySelectorAll('.team-member')
      return Array.from(rows).map((r) => ({
        name: r.querySelector('.member-name')?.textContent,
        role: r.querySelector('.member-role')?.textContent,
      }))
    })
    log('Members: ' + JSON.stringify(memberInfo))
    if (memberInfo.length !== 2) throw new Error('Expected 2 members, got ' + memberInfo.length)
    if (memberInfo[0].name !== 'Alice' || memberInfo[0].role !== 'researcher') {
      throw new Error('First member mismatch')
    }
    if (memberInfo[1].name !== 'Bob' || memberInfo[1].role !== 'writer') {
      throw new Error('Second member mismatch')
    }
    log('✓ Members render correctly')
    await window.screenshot({ path: path.join(outDir, 'team-4-expanded.png') })

    head('7. Verify on-disk persistence')
    const teamDir = 'C:/Users/edmon/Documents/ObsidianVault/SecondBrain/Projects/pi-atrium/app/.runtime/teams'
    const fs = require('fs')
    const dirs = fs.readdirSync(teamDir)
    log('Team dirs: ' + JSON.stringify(dirs))
    if (dirs.length !== 1) throw new Error('Expected 1 team dir')
    const teamFolder = path.join(teamDir, dirs[0])
    const files = fs.readdirSync(teamFolder)
    log('Files in team folder: ' + JSON.stringify(files))
    if (!files.includes('team.md')) throw new Error('team.md not found')
    const memberFolders = files.filter((f) => f.startsWith('m-'))
    if (memberFolders.length !== 2) throw new Error('Expected 2 member folders, got ' + memberFolders.length)
    for (const mf of memberFolders) {
      const memberFiles = fs.readdirSync(path.join(teamFolder, mf))
      log('  ' + mf + ': ' + JSON.stringify(memberFiles))
      if (!memberFiles.includes('config.json')) throw new Error('Missing config.json in ' + mf)
      if (!memberFiles.includes('.pi')) throw new Error('Missing .pi in ' + mf)
      const piFiles = fs.readdirSync(path.join(teamFolder, mf, '.pi'))
      if (!piFiles.includes('SYSTEM.md')) throw new Error('Missing SYSTEM.md in ' + mf)
    }
    log('✓ On-disk layout correct (team.md + per-member .pi/SYSTEM.md)')

    log('\n=== TASK 2.1 TEST PASSED ===')
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
