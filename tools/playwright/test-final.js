// Minimal: open app, start team, click Tracy, send message, wait 45s, screenshot.

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
  await page.waitForTimeout(2000)

  // Expand + start
  const teamRow = page.locator('.team-row').filter({ hasText: 'HIMYM Dev Team' }).first()
  await teamRow.waitFor({ timeout: 5000 })
  await teamRow.click()
  await page.waitForTimeout(300)
  const startButton = page.locator('.team-body button.ta-btn.primary').filter({ hasText: 'Start' })
  if ((await startButton.count()) > 0) {
    await startButton.first().click()
  }

  const tracyRow = page.locator('.team-member.member-active').filter({ hasText: 'Tracy' }).first()
  await tracyRow.waitFor({ timeout: 30_000 })
  await tracyRow.click()
  await page.waitForTimeout(500)

  // Send the message
  const input = page.locator('textarea').first()
  await input.fill('Use the intercom tool with action=list to show all available pi sessions. Then send "ping" to Ted and Barney. Give me a one-line summary at the end.')
  await input.press('Enter')
  console.log('Message sent. Waiting 45s for response…')
  await page.waitForTimeout(45_000)
  await page.screenshot({ path: path.join(outDir, 'tracy-after-45s.png') })

  // Dump the chat state
  const chatState = await page.evaluate(() => {
    const messages = document.querySelectorAll('.message.role-agent .message-body')
    return Array.from(messages).map((m) => m.textContent)
  })
  const thinkingState = await page.locator('.message-thinking').count()
  console.log(`Thinking rows: ${thinkingState}`)
  console.log(`Agent messages: ${chatState.length}`)
  chatState.forEach((text, i) => console.log(`  [${i}]: ${text.slice(0, 200).replace(/\n/g, ' ')}`))

  await app.close()
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
