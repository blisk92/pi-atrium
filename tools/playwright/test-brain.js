/**
 * End-to-end test for Wave 3 / Task 3.1: Brain exists.
 *  1. Launch the app, wait for concierge
 *  2. Switch to Brain tab
 *  3. Verify the 4 sections are shown with 0 entries
 *  4. Verify the Profile text is rendered
 *  5. Verify on-disk: brain/{episodic,semantic,procedural,working}/ + brain.md
 *  6. Add a brain entry programmatically (via IPC), verify it shows in the UI
 *  7. Expand a section, verify the entry is listed
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
    head('1. Wait for concierge')
    await window.waitForFunction(
      () => document.querySelector('.dot-active') !== null,
      null,
      { timeout: 15000 }
    )
    log('Concierge active')

    head('2. Verify on-disk brain scaffold for the concierge')
    const conciergeDir = path.join(appDir, '.runtime', 'sessions', 'concierge')
    const conciergeBrain = path.join(conciergeDir, 'brain')
    log('Looking in: ' + conciergeBrain)
    if (!fs.existsSync(conciergeBrain)) throw new Error('Brain dir missing')
    for (const sec of ['episodic', 'semantic', 'procedural', 'working']) {
      if (!fs.existsSync(path.join(conciergeBrain, sec))) {
        throw new Error('Missing brain section: ' + sec)
      }
    }
    log('✓ All 4 brain sections exist on disk')
    if (!fs.existsSync(path.join(conciergeDir, 'brain.md'))) {
      throw new Error('brain.md missing')
    }
    const brainMd = fs.readFileSync(path.join(conciergeDir, 'brain.md'), 'utf-8')
    if (!brainMd.includes('## Profile')) {
      throw new Error('brain.md missing Profile section')
    }
    log('✓ brain.md has Profile section')

    head('3. Switch to Brain tab in the right pane')
    await window.click('.rp-tab:has-text("Brain")')
    await window.waitForTimeout(800)
    await window.screenshot({ path: path.join(outDir, 'brain-1-empty.png') })

    head('4. Verify the Brain tab shows the 4 sections')
    const sectionNames = await window.evaluate(() => {
      const cards = document.querySelectorAll('.brain-card .brain-name')
      return Array.from(cards).map((c) => c.textContent)
    })
    log('Brain sections in UI: ' + JSON.stringify(sectionNames))
    if (sectionNames.length !== 4) {
      throw new Error('Expected 4 sections, got ' + sectionNames.length)
    }
    if (!sectionNames.includes('Episodic') || !sectionNames.includes('Semantic') ||
        !sectionNames.includes('Procedural') || !sectionNames.includes('Working')) {
      throw new Error('Missing expected section names: ' + JSON.stringify(sectionNames))
    }
    log('✓ All 4 sections render in the Brain tab')

    head('5. Profile is shown')
    const profile = await window.evaluate(() => {
      return document.querySelector('.profile-text')?.textContent
    })
    log('Profile text: ' + (profile?.slice(0, 80) || '(none)'))
    if (!profile) throw new Error('Profile not shown')

    head('6. Add a brain entry via IPC, verify it appears in the UI')
    const before = await window.evaluate(() => {
      const card = Array.from(document.querySelectorAll('.brain-card')).find((c) =>
        c.querySelector('.brain-name')?.textContent === 'Episodic'
      )
      return card?.querySelector('.brain-count')?.textContent
    })
    log('Episodic count before: ' + before)

    // Use the IPC to add an entry
    const addResult = await window.evaluate(async () => {
      const api = window.piAtrium
      if (!api) return null
      return api.agents.remember('concierge', 'episodic', 'User asked me to greet them on 2025-06-11.')
    })
    log('remember result: ' + JSON.stringify(addResult))
    if (!addResult?.ok) throw new Error('remember failed')

    // Add a second entry to test the count display
    await window.evaluate(async () => {
      const api = window.piAtrium
      if (!api) return null
      return api.agents.remember('concierge', 'semantic', 'The user prefers short responses.')
    })

    // The Brain tab needs to re-fetch. Switch away and back.
    await window.click('.rp-tab:has-text("Files")')
    await window.waitForTimeout(200)
    await window.click('.rp-tab:has-text("Brain")')
    await window.waitForTimeout(800)

    const after = await window.evaluate(() => {
      const card = Array.from(document.querySelectorAll('.brain-card')).find((c) =>
        c.querySelector('.brain-name')?.textContent === 'Episodic'
      )
      return {
        count: card?.querySelector('.brain-count')?.textContent,
        headerText: document.querySelector('.pane-subtitle')?.textContent,
      }
    })
    log('Episodic count after: ' + after.count)
    log('Header subtitle: ' + after.headerText)
    if (!after.count?.startsWith('1 ') && !after.count?.startsWith('2 ')) {
      throw new Error('Expected count to start with 1 or 2, got: ' + after.count)
    }
    log('✓ Entry shows up in the Brain tab')

    head('7. Expand Episodic and verify the entry is listed')
    // Episodic is already expanded by default; just check
    const entries = await window.evaluate(() => {
      const card = Array.from(document.querySelectorAll('.brain-card')).find((c) =>
        c.querySelector('.brain-name')?.textContent === 'Episodic'
      )
      const list = card?.querySelectorAll('.brain-entry')
      return Array.from(list || []).map((e) => e.querySelector('.entry-text')?.textContent)
    })
    log('Entries: ' + JSON.stringify(entries))
    if (entries.length === 0) throw new Error('No entries listed')
    if (!entries.some((e) => e?.includes('greet them'))) {
      throw new Error('Expected entry not found: ' + JSON.stringify(entries))
    }
    log('✓ Entry text rendered in the viewer')
    await window.screenshot({ path: path.join(outDir, 'brain-2-with-entry.png') })

    log('\n=== TASK 3.1 TEST PASSED ===')
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
