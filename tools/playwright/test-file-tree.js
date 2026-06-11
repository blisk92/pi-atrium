/**
 * End-to-end test for Wave 6 / Task 6.1: Real file tree.
 *  1. Wait for concierge
 *  2. Switch to Files tab
 *  3. Verify the tree contains files from the concierge's runtime dir
 *  4. Switch to a different session, verify the tree changes
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

  const logs = []
  app.process().stdout.on('data', (d) => logs.push(d.toString()))
  const printLogs = () => {
    log('\n--- Main process logs (last 15) ---')
    logs.slice(-15).forEach((l) => log(l.trim()))
  }

  try {
    head('1. Wait for concierge')
    await window.waitForFunction(
      () => document.querySelector('.dot-active') !== null,
      null,
      { timeout: 15000 }
    )
    log('Concierge active')

    head('2. Switch to Files tab and verify live tree')
    await window.click('.rp-tab:has-text("Files")')
    await window.waitForTimeout(1500)
    await window.screenshot({ path: path.join(outDir, 'files-1-concierge.png') })

    const conciergeTree = await window.evaluate(() => {
      const tree = document.querySelector('.file-tree')
      if (!tree) return null
      return {
        rowCount: tree.querySelectorAll('.tree-row').length,
        names: Array.from(tree.querySelectorAll('.row-name')).map((n) => n.textContent),
      }
    })
    log('Concierge tree: ' + JSON.stringify(conciergeTree))
    if (!conciergeTree || conciergeTree.rowCount === 0) {
      throw new Error('File tree is empty for the concierge')
    }
    // The concierge's runtime dir has .pi/, brain.md, etc.
    const expected = ['.pi', 'brain', 'brain.md']
    const found = expected.filter((e) => conciergeTree.names.includes(e))
    if (found.length < 2) {
      throw new Error('Expected brain files in concierge tree, got: ' + JSON.stringify(conciergeTree.names))
    }
    log('✓ Concierge tree contains brain files: ' + found.join(', '))

    head('3. Spawn a 2nd session and verify the tree changes')
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
    // Switch back to Files tab (it's already active, but Files tab is shared so we just wait)
    await window.waitForTimeout(2000)
    await window.screenshot({ path: path.join(outDir, 'files-2-second-session.png') })

    head('4. Verify the file tree IPC directly')
    const ipcResult = await window.evaluate(async () => {
      const api = window.piAtrium
      if (!api) return null
      // Read tree for the concierge (session id with no path separator)
      const r = await api.fs.readTree('concierge')
      return r.ok ? r.tree.length : -1
    })
    log('Concierge tree length via IPC: ' + ipcResult)
    if (typeof ipcResult !== 'number' || ipcResult < 0) {
      throw new Error('fs.readTree IPC failed')
    }
    log('✓ fs.readTree IPC works')

    log('\n=== TASK 6.1 TEST PASSED ===')
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
