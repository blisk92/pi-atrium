/**
 * Headless Pi sidecar.
 *
 * One process per agent. Exposes a single WebSocket endpoint for the main
 * process to drive and observe the agent session.
 *
 * Endpoints (HTTP, kept for boot probing only):
 *   GET  /health   → { status, agent, cwd, port, readyAt }
 *   GET  /         → 426 Upgrade Required
 *
 * WebSocket /ws (full-duplex):
 *   C → S commands:
 *     { type: 'send', text, streamingBehavior?: 'steer' | 'followUp' }
 *     { type: 'abort' }
 *     { type: 'ping' }
 *   S → C events:
 *     Agent event JSON (same shape as before). message_update events with
 *     `assistantMessageEvent.type === 'text_delta'` are coalesced on the
 *     server side — multiple deltas arriving within COALESCE_MS collapse
 *     into a single outgoing frame so the renderer doesn't get flooded.
 *
 * Usage:
 *   PI_PORT=49152 PI_CWD=<dir-with-.pi/SYSTEM.md> node headless-pi.js
 */

import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { WebSocketServer, type WebSocket as WsSocket } from 'ws'
import { createAgentSession } from '@earendil-works/pi-coding-agent'

const PORT = parseInt(process.env['PI_PORT'] || '49152', 10)
const CWD = process.env['PI_CWD'] || process.cwd()
const AGENT_DIR = process.env['PI_AGENT_DIR']
const COALESCE_MS = parseInt(process.env['PI_COALESCE_MS'] || '30', 10)

const t0 = Date.now()
const markers: Record<string, number> = {}

// ----- Outgoing coalescing for text_delta events -----
//
// We buffer the LATEST text_delta per contentIndex and flush once per
// COALESCE_MS. Non-text_delta events flush immediately and reset the
// buffer for that contentIndex.
type OutgoingFrame = { type: string; [k: string]: unknown }
const pendingTextDeltas = new Map<number, OutgoingFrame>()
let flushTimer: NodeJS.Timeout | null = null

function scheduleFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(flushNow, COALESCE_MS)
}
function flushNow(): void {
  flushTimer = null
  if (pendingTextDeltas.size === 0) return
  for (const frame of pendingTextDeltas.values()) {
    sendToAll(frame)
  }
  pendingTextDeltas.clear()
}
function flushImmediately(): void {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  flushNow()
}

function isTextDeltaEvent(e: { type: string; [k: string]: unknown }): boolean {
  if (e.type !== 'message_update') return false
  const ame = e['assistantMessageEvent'] as { type?: string; contentIndex?: number } | undefined
  return ame?.type === 'text_delta' && typeof ame.contentIndex === 'number'
}

function dispatchOutgoing(event: OutgoingFrame): void {
  if (isTextDeltaEvent(event)) {
    const ame = event['assistantMessageEvent'] as { contentIndex: number }
    pendingTextDeltas.set(ame.contentIndex, event)
    scheduleFlush()
  } else {
    // Structural / important event: flush any pending text first so the
    // order is preserved, then send this event.
    flushImmediately()
    sendToAll(event)
  }
}

// ----- WebSocket connection management -----
const sockets = new Set<WsSocket>()
let nextClientId = 1

function sendToAll(event: OutgoingFrame): void {
  const payload = JSON.stringify(event)
  for (const s of sockets) {
    if (s.readyState === s.OPEN) {
      try {
        s.send(payload)
      } catch {
        sockets.delete(s)
      }
    }
  }
}

function jsonResponse(res: http.ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function ensureSystemPromptSymlink(cwd: string): Promise<void> {
  // Pi reads <cwd>/.pi/SYSTEM.md automatically. If our SYSTEM.md isn't there,
  // symlink it.
  const piDir = path.join(cwd, '.pi')
  const target = path.join(piDir, 'SYSTEM.md')
  try {
    await fs.access(target)
    return
  } catch {
    /* fall through */
  }
  await fs.mkdir(piDir, { recursive: true })
  const source = process.env['PI_SYSTEM_PROMPT']
  if (!source) return
  try {
    await fs.symlink(source, target)
  } catch (err) {
    console.warn('[headless-pi] could not symlink SYSTEM.md:', (err as Error).message)
  }
}

async function main(): Promise<void> {
  markers['start'] = Date.now() - t0
  console.log(`[headless-pi] boot: PORT=${PORT} CWD=${CWD} PID=${process.pid} COALESCE_MS=${COALESCE_MS}`)

  await ensureSystemPromptSymlink(CWD)
  markers['systemPrompt'] = Date.now() - t0
  console.log(`[headless-pi] system prompt ready (${markers['systemPrompt']}ms)`)

  const sessionOptions = {
    cwd: CWD,
    ...(AGENT_DIR ? { agentDir: AGENT_DIR } : {}),
  }
  markers['optionsBuilt'] = Date.now() - t0

  const { session } = await createAgentSession(sessionOptions)
  markers['agentCreated'] = Date.now() - t0
  console.log(`[headless-pi] agent session created (${markers['agentCreated']}ms)`)

  // Forward agent events to all WS clients (with text_delta coalescing).
  const unsubscribe = session.subscribe((event) => {
    dispatchOutgoing(event as unknown as OutgoingFrame)
  })

  // HTTP + WS server on the same port. /ws upgrades to WebSocket.
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }

    const url = new URL(req.url || '/', `http://localhost:${PORT}`)

    if (req.method === 'GET' && url.pathname === '/health') {
      jsonResponse(res, 200, {
        status: 'active',
        cwd: CWD,
        port: PORT,
        readyAt: markers['agentCreated'],
        markers,
        protocol: 'ws',
      })
      return
    }

    // Anything else over plain HTTP: tell the client to upgrade.
    res.statusCode = 426
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Upgrade', 'websocket')
    res.end(JSON.stringify({ error: 'WebSocket required', upgradeTo: `ws://127.0.0.1:${PORT}/ws` }))
  })

  const wss = new WebSocketServer({ noServer: true })
  wss.on('connection', (ws: WsSocket) => {
    const id = nextClientId++
    sockets.add(ws)
    console.log(`[headless-pi] ws client #${id} connected (${sockets.size} total)`)

    ws.on('message', async (data) => {
      let msg: { type?: string; [k: string]: unknown } | null = null
      try {
        msg = JSON.parse(data.toString('utf-8')) as { type?: string }
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'invalid JSON' }))
        return
      }
      if (!msg || typeof msg.type !== 'string') return

      switch (msg.type) {
        case 'send': {
          const text = typeof msg.text === 'string' ? msg.text.trim() : ''
          if (!text) {
            ws.send(JSON.stringify({ type: 'error', message: 'text required' }))
            return
          }
          const streamingBehavior: 'steer' | 'followUp' =
            msg.streamingBehavior === 'steer' ? 'steer' : 'followUp'
          // Fire and forget — events stream back over WS.
          session.prompt(text, { streamingBehavior }).catch((err: Error) => {
            dispatchOutgoing({ type: 'prompt_error', message: err.message })
          })
          ws.send(JSON.stringify({ type: 'sent', ok: true, queued: true }))
          break
        }
        case 'abort': {
          try {
            if (typeof session.abort === 'function') {
              await session.abort()
            }
            ws.send(JSON.stringify({ type: 'aborted', ok: true }))
          } catch (err) {
            ws.send(JSON.stringify({ type: 'error', message: (err as Error).message }))
          }
          break
        }
        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong', t: Date.now() }))
          break
        }
        default:
          ws.send(JSON.stringify({ type: 'error', message: `unknown command: ${msg.type}` }))
      }
    })

    ws.on('close', () => {
      sockets.delete(ws)
      console.log(`[headless-pi] ws client #${id} disconnected (${sockets.size} total)`)
    })

    ws.on('error', (err: Error) => {
      console.warn(`[headless-pi] ws client #${id} error:`, err.message)
      sockets.delete(ws)
    })
  })

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`)
    if (url.pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req)
      })
    } else {
      socket.destroy()
    }
  })

  server.listen(PORT, '127.0.0.1', () => {
    markers['listening'] = Date.now() - t0
    console.log(`[headless-pi] listening on http://127.0.0.1:${PORT} (ws on /ws)`)
    console.log(`[headless-pi] spawn markers: ${JSON.stringify(markers)}`)
  })

  // Heartbeat: detect dead WS clients. Server pings every 30s.
  const heartbeat = setInterval(() => {
    for (const s of sockets) {
      if (s.readyState === s.OPEN) {
        try {
          ;(s as WsSocket & { ping?: () => void }).ping?.()
        } catch {
          /* ignore */
        }
      }
    }
  }, 30_000)
  heartbeat.unref()

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`[headless-pi] received ${signal}, shutting down…`)
    try {
      unsubscribe()
    } catch (err) {
      console.warn('[headless-pi] unsubscribe error:', (err as Error).message)
    }
    for (const s of sockets) {
      try { s.close(1001, 'shutting down') } catch { /* ignore */ }
    }
    clearInterval(heartbeat)
    if (flushTimer) clearTimeout(flushTimer)
    wss.close(() => {
      server.close(() => {
        console.log('[headless-pi] closed')
        process.exit(0)
      })
    })
    setTimeout(() => process.exit(0), 5000).unref()
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err) => {
  console.error('[headless-pi] fatal:', err)
  process.exit(1)
})
