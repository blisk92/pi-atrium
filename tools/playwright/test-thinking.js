// Verify thinking block is rendered in the chat pane.

const { _electron: electron } = require('playwright')
const path = require('path')
const fs = require('fs')

const appDir = path.resolve(__dirname, '../../app')
const outDir = path.join(__dirname, 'screenshots')
const runtimeTeams = path.join(appDir, '.runtime', 'teams')

try { fs.rmSync(runtimeTeams, { recursive: true, force: true }) } catch {}

;(async () => {
  const app = await electron.launch({
    args: [appDir],
    executablePath: path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe'),
  })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1500)

  // Expand the team and start
  const teamRow = page.locator('.team-row').filter({ hasText: 'HIMYM Dev Team' }).first()
  await teamRow.waitFor({ timeout: 5000 })
  await teamRow.click()
  await page.waitForTimeout(300)
  const startButton = page.locator('.team-body button.ta-btn.primary').filter({ hasText: 'Start' })
  if ((await startButton.count()) > 0) {
    await startButton.first().click()
    await page.waitForTimeout(8000)
  }

  // Click Tracy
  const tracy = page.locator('.team-member').filter({ hasText: 'Tracy' }).first()
  await tracy.waitFor({ timeout: 5000 })
  await tracy.click()
  await page.waitForTimeout(800)

  // Send a message
  console.log('Sending "Is the team ready?" to Tracy…')
  const input = page.locator('textarea').first()
  await input.fill('Is the team ready?')
  await input.press('Enter')

  // Poll for the thinking row as soon as it appears (likely within ~500ms)
  let thinking = 0
  let thinkingText = '(none)'
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(150)
    thinking = await page.locator('.message-thinking').count()
    if (thinking > 0) {
      thinkingText = await page.locator('.thinking-text').first().textContent().catch(() => '(none)')
      await page.screenshot({ path: path.join(outDir, 'thinking-during.png') })
      break
    }
  }
  console.log(`Thinking rows visible (mid-think): ${thinking}`)
  console.log(`First thinking text: ${(thinkingText || '').slice(0, 80)}…`)

  // Wait for the response to complete
  await page.waitForTimeout(8000)
  await page.screenshot({ path: path.join(outDir, 'thinking-after.png') })

  const responseText = await page.locator('.message.role-agent .message-body').last().textContent().catch(() => '(none)')
  console.log(`Final response: ${(responseText || '').slice(0, 100)}`)

  await app.close()

  if (thinking === 0) {
    console.error('\n❌ FAIL: no .message-thinking row was ever rendered')
    process.exit(1)
  }
  if (!responseText || responseText === '(none)') {
    console.error('\n❌ FAIL: no final response text')
    process.exit(1)
  }
  console.log('\n✅ PASS: thinking block is visible AND final response is rendered')
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
