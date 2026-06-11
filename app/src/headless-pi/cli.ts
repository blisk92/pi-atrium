/**
 * Spawns the headless Pi sidecar as a child process.
 * The main process owns lifecycle (spawn, health check, kill).
 */

import { spawn, ChildProcess } from 'node:child_process'

interface SpawnOptions {
  port: number
  cwd: string
  agentDir?: string
  systemPrompt?: string
  serverScriptPath: string // absolute path to the headless-pi server (server.ts in dev, server.js in prod)
}

let children: ChildProcess[] = []

export function spawnHeadlessPi(opts: SpawnOptions): { pid: number; port: number; child: ChildProcess } {
  // In dev, we use Node's built-in --experimental-strip-types to run the TS source.
  // (Faster startup than spawning npx, and Electron's PATH may not include npx.)
  // In prod, this would be a compiled .js file run directly with node.
  const isDev = opts.serverScriptPath.endsWith('.ts')
  const command = 'node'
  const args = isDev
    ? ['--experimental-strip-types', '--no-warnings', opts.serverScriptPath]
    : [opts.serverScriptPath]

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PI_PORT: String(opts.port),
    PI_CWD: opts.cwd,
    ...(opts.agentDir ? { PI_AGENT_DIR: opts.agentDir } : {}),
    ...(opts.systemPrompt ? { PI_SYSTEM_PROMPT: opts.systemPrompt } : {}),
  }

  const proc = spawn(command, args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  console.log(`[spawn] started: pid=${proc.pid} cmd=${command} ${args.join(' ')}`)

  proc.stdout?.on('data', (d) => process.stdout.write(d))
  proc.stderr?.on('data', (d) => process.stderr.write(d))

  proc.on('error', (err) => {
    console.error(`[spawn] error: ${err.message}`)
  })
  proc.on('exit', (code, signal) => {
    console.log(`[spawn] exited: code=${code} signal=${signal}`)
    if (code !== 0 && code !== null) {
      console.error(`[headless-pi] exited with code ${code}`)
    }
    children = children.filter((c) => c !== proc)
  })

  children.push(proc)
  return { pid: proc.pid ?? 0, port: opts.port, child: proc }
}

export function killHeadlessPi(): void {
  for (const c of children) {
    try {
      c.kill('SIGTERM')
    } catch (err) {
      console.warn('[spawn] kill error:', (err as Error).message)
    }
  }
  children = []
}
