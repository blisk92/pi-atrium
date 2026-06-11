// Click a team member from inside the team group and verify the chat
// pane shows that member.

const { _electron: electron } = require('playwright')
const path = require('path')
const fs = require('fs')

const appDir = path.resolve(__dirname, '../../app')
const outDir = path.join(__dirname, 'screenshots')
const runtimeTeams = path.join(appDir, '.runtime', 'teams')

try {
  fs.rmSync(runtimeTeams, { recursive: true, force: true })
} catch {}

;(async () => {
  const app = await electron.launch({
    args: [appDir],
    executablePath: path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe'),
  })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1500)

  // Expand the team
  const teamRow = page.locator('.team-row').filter({ hasText: 'HIMYM Dev Team' }).first()
  await teamRow.waitFor({ timeout: 5000 })
  await teamRow.click()
  await page.waitForTimeout(300)

  // Start the team (it's in draft state)
  const startButton = page.locator('.team-body button.ta-btn.primary').filter({ hasText: 'Start' })
  if ((await startButton.count()) > 0) {
    await startButton.first().click()
    await page.waitForTimeout(8000) // spawn 8 members
  }

  // Click Tracy inside the team group
  console.log('Clicking Tracy inside the team group…')
  const tracyRow = page.locator('.team-body .team-member').filter({ hasText: 'Tracy' }).first()
  await tracyRow.waitFor({ timeout: 5000 })
  await tracyRow.click()
  await page.waitForTimeout(1000)

  // Take a screenshot to verify the chat pane shows Tracy
  await page.screenshot({ path: path.join(outDir, 'click-tracy-from-team.png') })

  // Verify the chat pane header mentions Tracy
  const chatText = await page.locator('main, .chat-pane, .empty-state').first().textContent().catch(() => '(none)')
  console.log('Chat pane text (truncated):', chatText.slice(0, 200).replace(/\s+/g, ' '))

  // Check what session is in the SESSIONS section (should NOT include Tracy)
  const sessionCount = await page.locator('.sidebar-section .session').count()
  console.log('Sessions in sidebar (should be just Concierge):', sessionCount)

  // Check what team members are visible in TEAMS
  const memberCount = await page.locator('.team-body .team-member').count()
  console.log('Team members visible in TEAMS:', memberCount)

  await app.close()

  if (!chatText.includes('Tracy')) {
    console.error('\n❌ FAIL: chat pane does not mention Tracy after click')
    process.exit(1)
  }
  if (memberCount !== 8) {
    console.error(`\n❌ FAIL: expected 8 team members in TEAMS, got ${memberCount}`)
    process.exit(1)
  }
  console.log('\n✅ PASS: clicking team member from inside the group opens the session')
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
