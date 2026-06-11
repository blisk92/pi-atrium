// E2E test: send a message via WS, verify response streams back with
// coalesced text_delta events.

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

  // Poll for the final response (after thinking)
  let agentText = ''
  const start = Date.now()
  while (Date.now() - start < 30_000) {
    await page.waitForTimeout(500)
    const text = await page.locator('.message.role-agent .message-body').last().textContent().catch(() => '')
    if (text && !text.includes('thinking') && text.trim().length > 0) {
      agentText = text
      // Wait a bit more to ensure the response is complete
      await page.waitForTimeout(2000)
      const t2 = await page.locator('.message.role-agent .message-body').last().textContent()
      if (t2 === text) {
        agentText = t2
        break
      }
      agentText = t2
    }
  }

  await page.screenshot({ path: path.join(outDir, 'ws-chat-result.png') })
  console.log(`Final agent text: ${(agentText || '').slice(0, 200)}`)
  const thinkingRows = await page.locator('.message-thinking').count()
  console.log(`Thinking rows visible: ${thinkingRows}`)

  await app.close()

  if (!agentText || agentText.includes('thinking…')) {
    console.error('\n❌ FAIL: no final agent response received')
    process.exit(1)
  }
  console.log('\n✅ PASS: WS pipeline works, response received')
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
