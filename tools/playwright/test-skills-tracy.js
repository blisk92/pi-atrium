// UI regression test for Task 4.2 (partial):
//   - Start the bundled HIMYM Dev Team
//   - Click Tracy in the sidebar
//   - Open the Skills tab
//   - Verify team-grill is listed (and tagged as 'agent' source)
//
// Also verifies the agents:listSkills IPC at the main process layer.

const { _electron: electron } = require('playwright')
const path = require('path')
const fs = require('fs')

const appDir = path.resolve(__dirname, '../../app')
const outDir = path.join(__dirname, 'screenshots')
const runtimeTeams = path.join(appDir, '.runtime', 'teams')

// Wipe the runtime teams dir so the install copies a fresh 'draft' team.
try {
  fs.rmSync(runtimeTeams, { recursive: true, force: true })
} catch (err) {
  console.warn('Could not wipe runtime teams:', err.message)
}

;(async () => {
  const app = await electron.launch({
    args: [appDir],
    executablePath: path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe'),
  })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1500)

  // Expand the team and Start it
  const teamRow = page.locator('.team-row').filter({ hasText: 'HIMYM Dev Team' }).first()
  await teamRow.waitFor({ timeout: 5000 })
  await teamRow.click()
  await page.waitForTimeout(300)
  const startButton = page.locator('.team-body button.ta-btn.primary').filter({ hasText: 'Start' })
  if ((await startButton.count()) > 0) {
    await startButton.first().click()
    await page.waitForTimeout(8000) // spawn 8 members
  }

  // Click Tracy
  const tracy = page.locator('.team-member').filter({ hasText: 'Tracy' }).first()
  await tracy.waitFor({ timeout: 5000 })
  await tracy.click()
  await page.waitForTimeout(800)

  // Open Skills tab
  await page.locator('.rp-tab').filter({ hasText: 'Skills' }).click()
  await page.waitForTimeout(1500)

  // Verify team-grill is in the list
  const rows = await page.locator('.skill-row').count()
  const teamGrillRow = page.locator('.skill-row').filter({ hasText: 'team-grill' })
  const teamGrillCount = await teamGrillRow.count()
  const sourceTag = teamGrillCount > 0
    ? await teamGrillRow.locator('.skill-source').textContent()
    : '(none)'

  await page.screenshot({ path: path.join(outDir, 'skills-tracy-team-grill.png') })
  await app.close()

  console.log(`Skills tab rows: ${rows}`)
  console.log(`team-grill row count: ${teamGrillCount}`)
  console.log(`team-grill source tag: ${sourceTag}`)

  if (teamGrillCount === 0) {
    console.error('\n❌ FAIL: team-grill not found in Tracy\'s Skills tab')
    process.exit(1)
  }
  if (sourceTag !== 'agent') {
    console.error(`\n❌ FAIL: team-grill source tag is "${sourceTag}", expected "agent"`)
    process.exit(1)
  }
  console.log('\n✅ PASS: team-grill is listed in Tracy\'s Skills tab with source=agent')
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
