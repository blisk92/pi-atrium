// Smoke test: messages sent while the agent is busy should queue, not error.
//
// Strategy: send one message and IMMEDIATELY (before the first response
// arrives) send a second. The second should NOT trigger the
// "Agent is already processing. Specify streamingBehavior..." error,
// because we now pass streamingBehavior: 'followUp'.

const { spawn } = require('node:child_process')
const { setTimeout: sleep } = require('node:timers/promises')
const http = require('node:http')

const PORT = 49153
const APP_DIR = 'C:/Users/edmon/Documents/ObsidianVault/SecondBrain/Projects/pi-atrium/app'

function startSidecar() {
  const child = spawn(
    'node',
    ['--experimental-strip-types', '--no-warnings', 'src/headless-pi/server.ts'],
    { cwd: APP_DIR, env: { ...process.env, PI_PORT: String(PORT) } }
  )
  child.stdout.on('data', (d) => process.stdout.write(`[sidecar] ${d}`))
  child.stderr.on('data', (d) => process.stderr.write(`[sidecar!] ${d}`))
  return child
}

async function waitForActive() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/health`)
      if (res.ok) return
    } catch {}
    await sleep(200)
  }
  throw new Error('sidecar did not become active')
}

function sseCollect(ms) {
  return new Promise((resolve) => {
    const events = []
    const req = http.get(`http://127.0.0.1:${PORT}/events`, (res) => {
      res.setEncoding('utf8')
      let buf = ''
      res.on('data', (chunk) => {
        buf += chunk
        let idx
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, idx)
          buf = buf.slice(idx + 2)
          const data = block.split('\n').find((l) => l.startsWith('data: ')) || ''
          if (data) {
            try { events.push(JSON.parse(data.slice(6))) } catch {}
          }
        }
      })
    })
    setTimeout(() => {
      req.destroy()
      resolve(events)
    }, ms)
  })
}

function postMessage(text, streamingBehavior) {
  return fetch(`http://127.0.0.1:${PORT}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, streamingBehavior }),
  })
}

;(async () => {
  const child = startSidecar()
  await waitForActive()
  console.log('[test] sidecar active')

  // Start the SSE collector BEFORE sending
  const collectPromise = sseCollect(30_000)

  // Give SSE a moment to attach
  await sleep(300)

  // Send msg 1
  const t0 = Date.now()
  const r1 = await postMessage('Hi, please count to 5 very slowly (one number per line).', 'followUp')
  console.log(`[test] msg 1 → ${r1.status} (${Date.now() - t0}ms)`)

  // Immediately send msg 2 — Tracy should be still busy, this should queue
  await sleep(50)
  const r2 = await postMessage('What is 7 + 3? Just the number.', 'followUp')
  console.log(`[test] msg 2 → ${r2.status}`)

  // Wait for the SSE collector's 30s window to expire
  const events = await collectPromise
  const types = events.map((e) => e.type)
  const errEvents = events.filter(
    (e) => e.type === 'prompt_error' && /streamingBehavior/.test(String(e.message))
  )
  const assistantMessages = events.filter(
    (e) => e.type === 'message_start' && e.message && e.message.role === 'assistant'
  )

  console.log('\n[test] event types seen:', types)
  console.log(`[test] assistant messages: ${assistantMessages.length}`)
  console.log(`[test] streamingBehavior errors: ${errEvents.length}`)

  child.kill()

  if (errEvents.length > 0) {
    console.error('\n❌ FAIL: got streamingBehavior error:', errEvents)
    process.exit(1)
  }
  if (assistantMessages.length < 2) {
    console.error(`\n❌ FAIL: expected ≥2 assistant messages, got ${assistantMessages.length}`)
    process.exit(1)
  }
  console.log('\n✅ PASS: messages queued successfully')
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
