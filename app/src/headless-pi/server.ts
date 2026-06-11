/**
 * Headless Pi sidecar.
 *
 * Spawns a single Pi agent session and exposes it over HTTP + SSE on localhost.
 *
 * Endpoints:
 *   GET  /health    → { status, agent, cwd, port, readyAt }
 *   POST /message   body: { text: string }  → { ok: true, queued: true }
 *   GET  /events    → Server-Sent Events stream of agent events
 *   POST /abort     → { ok: true }
 *
 * Usage:
 *   PI_PORT=49152 PI_CWD=<dir-with-.pi/SYSTEM.md> node headless-pi.js
 */

import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createAgentSession } from '@earendil-works/pi-coding-agent'

const PORT = parseInt(process.env['PI_PORT'] || '49152', 10)
const CWD = process.env['PI_CWD'] || process.cwd()
const AGENT_DIR = process.env['PI_AGENT_DIR'] // optional, defaults to ~/.pi/agent

const t0 = Date.now()
const markers: Record<string, number> = {}

interface SSEClient {
  id: number
  res: http.ServerResponse
}

const clients = new Set<SSEClient>()
let nextClientId = 1

function broadcast(event: { type: string; [k: string]: unknown }): void {
  const payload = `data: ${JSON.stringify(event)}\n\n`
  for (const c of clients) {
    try {
      c.res.write(payload)
    } catch {
      clients.delete(c)
    }
  }
}

function readJson<T = unknown>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(c as Buffer))
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf-8')
        resolve(text ? (JSON.parse(text) as T) : ({} as T))
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function jsonResponse(res: http.ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function startSse(res: http.ServerResponse): SSEClient {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.writeHead(200)
  res.write(': pi-atrium headless-pi\n\n')
  const client: SSEClient = { id: nextClientId++, res }
  clients.add(client)
  return client
}

async function ensureSystemPromptSymlink(cwd: string): Promise<void> {
  // Pi reads <cwd>/.pi/SYSTEM.md automatically. If our SYSTEM.md isn't there,
  // symlink it. (We don't write to the user's vault here — the app does that later.)
  const piDir = path.join(cwd, '.pi')
  const target = path.join(piDir, 'SYSTEM.md')
  try {
    await fs.access(target)
    return // already exists
  } catch {
    // not present — create symlink
    await fs.mkdir(piDir, { recursive: true })
    // The actual SYSTEM.md content lives in resources/system/ of the app.
    // For dev, point to a relative path; for prod, the app passes an absolute path.
    const source = process.env['PI_SYSTEM_PROMPT']
    if (!source) return
    try {
      await fs.symlink(source, target)
    } catch (err) {
      console.warn('[headless-pi] could not symlink SYSTEM.md:', (err as Error).message)
    }
  }
}

async function main(): Promise<void> {
  markers['start'] = Date.now() - t0
  console.log(`[headless-pi] boot: PORT=${PORT} CWD=${CWD} PID=${process.pid}`)

  // Ensure cwd/.pi/SYSTEM.md exists (symlink to bundled persona)
  await ensureSystemPromptSymlink(CWD)
  markers['systemPrompt'] = Date.now() - t0
  console.log(`[headless-pi] system prompt ready (${markers['systemPrompt']}ms)`)

  // Build a custom resource loader that injects the SYSTEM.md content
  // (we skip this for Task 0.2 — the symlink above is enough for now)
  const sessionOptions = {
    cwd: CWD,
    ...(AGENT_DIR ? { agentDir: AGENT_DIR } : {}),
  }
  markers['optionsBuilt'] = Date.now() - t0

  // Create the agent session
  const { session } = await createAgentSession(sessionOptions)
  markers['agentCreated'] = Date.now() - t0
  console.log(`[headless-pi] agent session created (${markers['agentCreated']}ms)`)

  // Subscribe to events; forward via SSE
  const unsubscribe = session.subscribe((event) => {
    // Forward the entire event as JSON. The renderer knows the schema.
    // (Event fields observed: type, messageStart, messageUpdate, messageEnd, turnEnd, etc.)
    broadcast(event as unknown as { type: string; [k: string]: unknown })
  })

  // HTTP server
  const server = http.createServer(async (req, res) => {
    // CORS (renderer on a different port during dev)
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
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/events') {
      const client = startSse(res)
      req.on('close', () => {
        clients.delete(client)
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/message') {
      try {
        const body = await readJson<{ text?: string; streamingBehavior?: 'steer' | 'followUp' }>(req)
        const text = (body.text || '').trim()
        if (!text) return jsonResponse(res, 400, { error: 'text required' })
        // Fire and forget — events stream via SSE.
        // streamingBehavior:
        //   'steer'    — redirect the current response mid-flight
        //   'followUp' — wait for the current turn to finish, then process this
        // Default to 'followUp' so that sending a message while the agent is
        // busy queues it instead of erroring out.
        const streamingBehavior: 'steer' | 'followUp' =
          body.streamingBehavior === 'steer' ? 'steer' : 'followUp'
        session.prompt(text, { streamingBehavior }).catch((err: Error) => {
          broadcast({ type: 'prompt_error', message: err.message })
        })
        return jsonResponse(res, 202, { ok: true, queued: true })
      } catch (err) {
        return jsonResponse(res, 400, { error: (err as Error).message })
      }
    }

    if (req.method === 'POST' && url.pathname === '/abort') {
      try {
        if (typeof session.abort === 'function') {
          await session.abort()
        }
        return jsonResponse(res, 200, { ok: true })
      } catch (err) {
        return jsonResponse(res, 500, { error: (err as Error).message })
      }
    }

    jsonResponse(res, 404, { error: 'not found' })
  })

  server.listen(PORT, '127.0.0.1', () => {
    markers['listening'] = Date.now() - t0
    console.log(`[headless-pi] listening on http://127.0.0.1:${PORT}`)
    console.log(`[headless-pi] spawn markers: ${JSON.stringify(markers)}`)
  })

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`[headless-pi] received ${signal}, shutting down…`)
    try {
      unsubscribe()
    } catch (err) {
      console.warn('[headless-pi] unsubscribe error:', (err as Error).message)
    }
    for (const c of clients) {
      try { c.res.end() } catch { /* ignore */ }
    }
    server.close(() => {
      console.log('[headless-pi] closed')
      process.exit(0)
    })
    // Hard exit after 5s
    setTimeout(() => process.exit(0), 5000).unref()
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err) => {
  console.error('[headless-pi] fatal:', err)
  process.exit(1)
})
