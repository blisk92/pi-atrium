/**
 * Screenshot each right-pane tab for Task 0.4 verification.
 * Usage: node screenshot-tabs.js
 */

const { _electron: electron } = require('playwright')
const path = require('path')

const appDir = path.resolve(__dirname, '../../app')
const outDir = path.join(__dirname, 'screenshots')

;(async () => {
  console.log('Launching...')
  const app = await electron.launch({
    args: [appDir],
    executablePath: path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe'),
  })
  const window = await app.firstWindow({ timeout: 30000 })

  await window.waitForFunction(
    () => document.querySelector('.dot-active') !== null,
    { timeout: 15000 }
  )
  await window.waitForTimeout(1500)

  const tabs = ['files', 'brain', 'skills', 'activity']
  for (const tab of tabs) {
    console.log(`Switching to ${tab}...`)
    await window.click(`.rp-tab:has-text("${tab[0].toUpperCase() + tab.slice(1)}")`)
    await window.waitForTimeout(400)
    const out = path.join(outDir, `tab-${tab}.png`)
    await window.screenshot({ path: out })
    console.log('Saved', out)
  }

  // Now switch back to files, then send a message, then screenshot activity tab
  await window.click('.rp-tab:has-text("Files")')
  await window.waitForTimeout(300)
  const textarea = await window.locator('.input-box textarea')
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
    { timeout: 60000 }
  )
  await window.waitForTimeout(500)
  await window.click('.rp-tab:has-text("Activity")')
  await window.waitForTimeout(500)
  const out = path.join(outDir, 'tab-activity-with-events.png')
  await window.screenshot({ path: out })
  console.log('Saved', out)

  await app.close()
  process.exit(0)
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
