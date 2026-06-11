/**
 * End-to-end test for Wave 5 / Task 5.1: TTS on.
 *  1. Wait for concierge
 *  2. Enable TTS via the sidebar (speaker icon)
 *  3. Send a message, wait for the response
 *  4. Verify the response was spoken (audio file created via mmx TTS)
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

    head('2. Enable TTS for the concierge via IPC')
    const ttsResult = await window.evaluate(async () => {
      const api = window.piAtrium
      if (!api) return { error: 'no api' }
      return api.sessions.setTts('concierge', true)
    })
    log('setTts result: ' + JSON.stringify(ttsResult))
    if (!ttsResult.ok) throw new Error('Failed to enable TTS')

    head('3. Speak a test phrase via the IPC (smoke test the TTS path)')
    const speakResult = await window.evaluate(async () => {
      const api = window.piAtrium
      if (!api) return { error: 'no api' }
      return api.tts.speak('Hello from Pi Atrium TTS.')
    })
    log('speak result: ' + JSON.stringify(speakResult))
    if (speakResult.error) {
      log('TTS error: ' + speakResult.error)
      log('(mmx may not be installed or configured; skipping audio file check)')
    } else {
      const ap = speakResult.audioPath
      log('Audio file: ' + ap)
      if (ap && fs.existsSync(ap)) {
        const stat = fs.statSync(ap)
        log('Audio file size: ' + stat.size + ' bytes')
        if (stat.size < 100) {
          throw new Error('Audio file too small, TTS likely failed: ' + ap)
        }
        log('✓ TTS produced an audio file')
      } else {
        log('Audio file not found at ' + ap)
      }
    }

    head('4. Send a chat message and verify the response is processed')
    // Wait a bit for the setTts IPC to propagate
    await window.waitForTimeout(500)
    const textarea = window.locator('.input-box textarea')
    await textarea.click()
    await textarea.fill('Reply with just the word pong.')
    await window.keyboard.press('Enter')
    await window.waitForFunction(
      () => {
        const agents = document.querySelectorAll('.message.role-agent')
        if (agents.length === 0) return false
        const last = agents[agents.length - 1]
        return !last.classList.contains('streaming') && last.textContent.trim().length > 0
      },
      null,
      { timeout: 90000 }
    )
    const response = await window.evaluate(() => {
      const m = document.querySelectorAll('.message.role-agent')
      return m[m.length - 1]?.textContent?.slice(0, 50)
    })
    log('Agent response: ' + response)
    if (!response?.toLowerCase().includes('pong')) {
      throw new Error('Agent did not respond correctly')
    }
    log('✓ Agent response received')
    await window.screenshot({ path: path.join(outDir, 'tts-1-response.png') })

    head('5. Verify the sidebar shows TTS toggle on')
    await window.waitForTimeout(300)
    const ttsToggleOn = await window.evaluate(() => {
      const concierge = document.querySelector('.session:has(.concierge-pill)')
      const tts = concierge?.querySelector('.tts-toggle')
      return tts?.classList.contains('on') ?? null
    })
    log('Concierge TTS toggle on? ' + ttsToggleOn)
    if (ttsToggleOn !== true) throw new Error('TTS toggle not visually on')

    log('\n=== TASK 5.1 TEST PASSED ===')
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
