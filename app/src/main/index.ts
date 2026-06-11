/**
 * Pi Atrium — Electron main process entry point
 * Wave 0: spawn concierge headless Pi sidecar on app start
 * Wave 1 Task 1.3: multi-session registry (concierge = session #0, plus spawnable sessions)
 * Wave 2: teams — define/run/halt a team of N agents
 */

import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import {
  listTeams as storageListTeams,
  readTeam as storageReadTeam,
  writeTeam as storageWriteTeam,
  deleteTeam as storageDeleteTeam,
  setupMemberDir,
  getMemberDir,
  nextMemberId,
  newTeamId,
} from './teams.js'
import {
  ensureBrainScaffold,
  readBrain,
  addBrainEntry,
  searchBrain,
  type BrainState,
} from './brain.js'
import type { Team } from '../shared/types.js'
// Note: readBrain/addBrainEntry/searchBrain are used by the Wave 3 IPC handlers
void readBrain; void addBrainEntry; void searchBrain; void (null as unknown as BrainState)
import http from 'node:http'
import { spawnHeadlessPi, killHeadlessPi } from '../headless-pi/cli.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Cold-start instrumentation
const t0 = Date.now()
const markers: Record<string, number> = { 'process.spawn': 0 }
markers['process.spawn'] = t0

// ----- Session registry (Wave 1 Task 1.3) -----

const CONCIERGE_PORT = 49152
const PORT_RANGE_START = 49152
const PORT_RANGE_END = 49200

type SessionStatus = 'idle' | 'starting' | 'active' | 'error'
interface MemoryEntry {
  id: string
  text: string
  createdAt: number
}
interface Session {
  id: string
  name: string
  role: string
  status: SessionStatus
  port: number
  pid?: number
  isConcierge: boolean
  ttsEnabled: boolean
  readyAtMs?: number
  /** Absolute path to the agent's on-disk directory (where brain/ lives). */
  agentDir?: string
  errorMessage?: string
  sseReq: http.ClientRequest | null
  memory: MemoryEntry[]
}

let mainWindow: BrowserWindow | null = null
const sessions = new Map<string, Session>()

// ----- Broadcast helpers -----

function broadcastSessions(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  // Send a stable JSON snapshot
  const snapshot = Array.from(sessions.values()).map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    status: s.status,
    port: s.port,
    pid: s.pid,
    isConcierge: s.isConcierge,
    ttsEnabled: s.ttsEnabled,
    readyAtMs: s.readyAtMs,
    errorMessage: s.errorMessage,
  }))
  mainWindow.webContents.send('sessions:update', snapshot)
}

function broadcastSessionEvent(id: string, event: { type: string; [k: string]: unknown }): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('sessions:event', { sessionId: id, event })
}

function sessionSnapshot(s: Session): Record<string, unknown> {
  return {
    id: s.id,
    name: s.name,
    role: s.role,
    status: s.status,
    port: s.port,
    pid: s.pid,
    isConcierge: s.isConcierge,
    ttsEnabled: s.ttsEnabled,
    readyAtMs: s.readyAtMs,
    errorMessage: s.errorMessage,
  }
}

function publicSnapshot(): Record<string, unknown>[] {
  return Array.from(sessions.values()).map(sessionSnapshot)
}

// ----- Per-session setup -----

async function setupSessionCwd(session: Session): Promise<string> {
  const appPath = app.getAppPath()
  const runtimeBase = app.isPackaged
    ? path.join(app.getPath('userData'), 'sessions')
    : path.join(appPath, '.runtime', 'sessions')
  const runtimePath = path.join(runtimeBase, session.id)
  await fs.mkdir(path.join(runtimePath, '.pi'), { recursive: true })

  // Copy the bundled SYSTEM.md. For the concierge, use concierge.md.
  // For new sessions, use a generic agent.md (or concierge.md for now).
  const sourcePath = app.isPackaged
    ? path.join(process.resourcesPath, 'system', 'concierge.md')
    : path.join(appPath, 'resources', 'system', 'concierge.md')
  const targetPath = path.join(runtimePath, '.pi', 'SYSTEM.md')
  try {
    const content = await fs.readFile(sourcePath, 'utf-8')
    await fs.writeFile(targetPath, content, 'utf-8')
  } catch (err) {
    console.warn(`[main] could not write SYSTEM.md for ${session.id}:`, (err as Error).message)
  }
  // Wave 3: create the brain scaffold (4 sections + brain.md) on first spawn
  try {
    await ensureBrainScaffold(runtimePath, session.name, session.role)
  } catch (err) {
    console.warn(`[main] could not init brain for ${session.id}:`, (err as Error).message)
  }
  // Set the agentDir on the session so the renderer can read the brain
  session.agentDir = runtimePath
  return runtimePath
}

async function pollSessionHealth(session: Session, retries = 30): Promise<void> {
  for (let i = 0; i < retries; i++) {
    await new Promise((r) => setTimeout(r, 500))
    try {
      const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = http.get(
          { hostname: '127.0.0.1', port: session.port, path: '/health', timeout: 1000 },
          (r) => {
            const chunks: Buffer[] = []
            r.on('data', (c) => chunks.push(c as Buffer))
            r.on('end', () =>
              resolve({ status: r.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf-8') })
            )
          }
        )
        req.on('error', reject)
        req.on('timeout', () => req.destroy(new Error('timeout')))
      })
      if (res.status === 200) {
        const health = JSON.parse(res.body) as { readyAt: number }
        session.status = 'active'
        session.readyAtMs = health.readyAt
        broadcastSessions()
        console.log(`[main] session ${session.id} active (port ${session.port})`)
        return
      }
    } catch {
      // not ready yet
    }
  }
  session.status = 'error'
  session.errorMessage = `Health check timed out after ${retries / 2}s`
  broadcastSessions()
}

/**
 * Open a long-lived SSE connection to a session's sidecar and forward events
 * to the renderer over IPC. Reconnects on failure.
 */
function startSessionSse(session: Session): void {
  const connect = (): void => {
    if (!session.pid) return
    session.sseReq = http.get(
      {
        hostname: '127.0.0.1',
        port: session.port,
        path: '/events',
        headers: { Accept: 'text/event-stream' },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume()
          setTimeout(connect, 1000)
          return
        }
        let buffer = ''
        res.setEncoding('utf-8')
        res.on('data', (chunk: string) => {
          buffer += chunk
          let idx: number
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, idx)
            buffer = buffer.slice(idx + 2)
            for (const line of block.split('\n')) {
              if (line.startsWith('data: ')) {
                try {
                  const event = JSON.parse(line.slice(6)) as { type: string; [k: string]: unknown }
                  broadcastSessionEvent(session.id, event)
                } catch {
                  /* ignore non-JSON */
                }
                break
              }
            }
          }
        })
        res.on('end', () => setTimeout(connect, 1000))
        res.on('error', () => setTimeout(connect, 1000))
      }
    )
    session.sseReq.on('error', () => {
      // will reconnect on close
    })
    session.sseReq.setTimeout(0)
  }
  connect()
}

function findFreePort(start: number): number {
  // For dev: just increment. (No real "is this port in use" check — collisions
  // will be caught by the spawn failing. In a future task we'll do a proper check.)
  for (let p = start; p <= PORT_RANGE_END; p++) {
    let used = false
    for (const s of sessions.values()) {
      if (s.port === p) {
        used = true
        break
      }
    }
    if (!used) return p
  }
  throw new Error('no free ports in range')
}

function nextSessionId(): string {
  // s1, s2, ...  (concierge is fixed id 'concierge')
  let n = 1
  while (sessions.has(`s${n}`)) n++
  return `s${n}`
}

async function spawnSession(name?: string): Promise<Session> {
  const id = sessions.has('concierge') && sessions.size === 1 ? nextSessionId() : nextSessionId()
  const isConcierge = id === 'concierge'
  const port = isConcierge ? CONCIERGE_PORT : findFreePort(PORT_RANGE_START + 1)
  const session: Session = {
    id,
    name: name || (isConcierge ? 'Concierge' : `Session ${id}`),
    role: isConcierge ? 'concierge' : 'agent',
    status: 'idle',
    port,
    isConcierge,
    ttsEnabled: false,
    sseReq: null,
    memory: [],
  }
  sessions.set(id, session)
  session.status = 'starting'
  broadcastSessions()

  try {
    const cwd = await setupSessionCwd(session)
    const appPath = app.getAppPath()
    const serverScriptPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app', 'out', 'main', 'headless-pi-server.js')
      : path.join(appPath, 'src', 'headless-pi', 'server.ts')
    const { pid } = spawnHeadlessPi({
      port: session.port,
      cwd,
      serverScriptPath,
    })
    session.pid = pid
    console.log(`[main] session ${id} spawned, pid=${pid}, port=${session.port}`)
    broadcastSessions()
    // Poll health then start SSE
    void pollSessionHealth(session).then(() => {
      if (session.status === 'active') startSessionSse(session)
    })
  } catch (err) {
    session.status = 'error'
    session.errorMessage = (err as Error).message
    broadcastSessions()
  }
  return session
}

function stopSession(id: string): boolean {
  const s = sessions.get(id)
  if (!s) return false
  if (s.sseReq) {
    try {
      s.sseReq.destroy()
    } catch {
      /* ignore */
    }
    s.sseReq = null
  }
  if (s.pid) {
    try {
      process.kill(s.pid)
    } catch {
      /* ignore */
    }
  }
  sessions.delete(id)
  broadcastSessions()
  return true
}

// ----- Backward-compat: keep `concierge` as session #0 -----
// Spawned in app.whenReady() below. Legacy `concierge:*` IPC handlers are kept
// for now and just delegate to the first session.

function getConcierge(): Session | undefined {
  return sessions.get('concierge')
}

async function ensureConcierge(): Promise<void> {
  if (sessions.has('concierge')) return
  const concierge: Session = {
    id: 'concierge',
    name: 'Concierge',
    role: 'concierge',
    status: 'idle',
    port: CONCIERGE_PORT,
    isConcierge: true,
    ttsEnabled: false,
    sseReq: null,
    memory: [],
  }
  sessions.set('concierge', concierge)
  concierge.status = 'starting'
  broadcastSessions()
  markers['concierge.spawnStart'] = Date.now() - t0
  try {
    const cwd = await setupSessionCwd(concierge)
    const appPath = app.getAppPath()
    const serverScriptPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app', 'out', 'main', 'headless-pi-server.js')
      : path.join(appPath, 'src', 'headless-pi', 'server.ts')
    const { pid } = spawnHeadlessPi({ port: CONCIERGE_PORT, cwd, serverScriptPath })
    concierge.pid = pid
    markers['concierge.spawned'] = Date.now() - t0
    console.log(`[main] concierge spawned, pid=${pid}, cwd=${cwd}`)
    broadcastSessions()
  } catch (err) {
    concierge.status = 'error'
    concierge.errorMessage = (err as Error).message
    console.error('[main] failed to spawn concierge:', err)
    broadcastSessions()
    return
  }
  await pollSessionHealth(concierge)
  // pollSessionHealth sets status to 'active' on success or 'error' on timeout.
  if (concierge.status === ('active' as SessionStatus)) {
    markers['concierge.active'] = Date.now() - t0
    startSessionSse(concierge)
  }
}

// ----- Window -----

function createWindow(): void {
  markers['createWindow.start'] = Date.now() - t0
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0F172A',
    show: false,
    title: 'Pi Atrium',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    markers['ready-to-show'] = Date.now() - t0
    console.log('[cold-start]', JSON.stringify(markers, null, 2))
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ----- Team registry (Wave 2) -----

const teams = new Map<string, Team>()

async function refreshTeam(teamId: string): Promise<Team | null> {
  const t = await storageReadTeam(teamId)
  if (t) teams.set(teamId, t)
  else teams.delete(teamId)
  broadcastTeams()
  return t
}
void refreshTeam

function broadcastTeams(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const list = Array.from(teams.values())
  mainWindow.webContents.send('teams:update', list)
}

async function loadAllTeams(): Promise<void> {
  const list = await storageListTeams()
  teams.clear()
  for (const t of list) teams.set(t.id, t)
  broadcastTeams()
}

async function startTeamMembers(teamId: string): Promise<void> {
  const team = teams.get(teamId)
  if (!team) return
  if (team.status === 'active' || team.status === 'starting') return

  team.status = 'starting'
  team.startedAt = Date.now()
  for (const m of team.members) {
    m.status = 'starting'
    m.errorMessage = undefined
  }
  await storageWriteTeam(team)
  broadcastTeams()

  // Spawn one session per member, in parallel. Per-member port in the
  // session range. The per-member folder is the sidecar's cwd.
  const appPath = app.getAppPath()
  const serverScriptPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'out', 'main', 'headless-pi-server.js')
    : path.join(appPath, 'src', 'headless-pi', 'server.ts')

  await Promise.all(
    team.members.map(async (m) => {
      try {
        const memberFolder = getMemberDir(teamId, m.id)
        // Wave 3: ensure brain scaffold for team members (sessions are handled
        // in setupSessionCwd; here we call it directly because member dirs
        // were created by setupMemberDir without the brain).
        try {
          await ensureBrainScaffold(memberFolder, m.name, m.role)
        } catch (err) {
          console.warn(`[teams] could not init brain for ${m.id}:`, (err as Error).message)
        }
        const port = findFreePort(PORT_RANGE_START + 1)
        const sessionId = `team-${teamId}-${m.id}`

        const memberSession: Session = {
          id: sessionId,
          name: `${m.name} (${m.role})`,
          role: m.role,
          status: 'idle',
          port,
          isConcierge: false,
          ttsEnabled: false,
          sseReq: null,
          memory: [],
          agentDir: memberFolder,
        }
        sessions.set(sessionId, memberSession)
        memberSession.status = 'starting'
        broadcastSessions()

        const { pid } = spawnHeadlessPi({
          port,
          cwd: memberFolder,
          serverScriptPath,
        })
        memberSession.pid = pid
        m.sessionId = sessionId
        m.port = port
        m.pid = pid
        broadcastSessions()
        broadcastTeams()

        await pollSessionHealth(memberSession)
        if ((memberSession.status as string) === 'active') {
          m.status = 'active'
          startSessionSse(memberSession)
        } else {
          m.status = 'error'
          m.errorMessage = memberSession.errorMessage
        }
      } catch (err) {
        m.status = 'error'
        m.errorMessage = (err as Error).message
        console.error(`[teams] failed to start member ${m.id}:`, err)
      }
      await storageWriteTeam(team)
      broadcastTeams()
    })
  )

  // After all members settle, mark the team
  const allActive = team.members.every((m) => m.status === 'active')
  team.status = allActive ? 'active' : 'error'
  await storageWriteTeam(team)
  broadcastTeams()
}

async function haltTeamMembers(teamId: string): Promise<void> {
  const team = teams.get(teamId)
  if (!team) return
  if (team.status !== 'active' && team.status !== 'starting') return

  team.status = 'stopping'
  for (const m of team.members) {
    m.status = (team.status === 'stopping' ? 'stopped' : 'stopping') as typeof m.status
  }
  // Note: MemberStatus doesn't include 'stopping' (only draft|starting|active|error|stopped),
  // so we move members directly to 'stopped' before the final loop in the rest of this fn.
  await storageWriteTeam(team)
  broadcastTeams()

  // Send SIGTERM to all members in parallel; wait 10s; force-quit any survivors.
  const terminatePromises = team.members.map(async (m) => {
    if (!m.sessionId) return
    const s = sessions.get(m.sessionId)
    if (!s) return
    try {
      // Best-effort graceful shutdown via the /abort endpoint (which is also
      // what the slash-command /abort calls; for the actual brain-save
      // window we'll wire that in Wave 3). For now, just kill the process.
      process.kill(s.pid!, 'SIGTERM')
    } catch {
      /* ignore */
    }
  })
  await Promise.all(terminatePromises)

  // Wait up to 10s for processes to exit gracefully
  const graceMs = 10_000
  const start = Date.now()
  while (Date.now() - start < graceMs) {
    const allGone = team.members.every((m) => {
      if (!m.sessionId) return true
      const s = sessions.get(m.sessionId)
      if (!s?.pid) return true
      try {
        process.kill(s.pid, 0) // signal 0 = check existence
        return false
      } catch {
        return true
      }
    })
    if (allGone) break
    await new Promise((r) => setTimeout(r, 250))
  }

  // Force-quit any survivors and clean up session state
  for (const m of team.members) {
    if (!m.sessionId) continue
    const s = sessions.get(m.sessionId)
    if (s?.pid) {
      try {
        process.kill(s.pid, 'SIGKILL')
      } catch {
        /* ignore */
      }
    }
    if (s?.sseReq) {
      try {
        s.sseReq.destroy()
      } catch {
        /* ignore */
      }
    }
    sessions.delete(m.sessionId)
    m.sessionId = undefined
    m.port = undefined
    m.pid = undefined
    m.status = 'stopped'
  }
  team.status = 'stopped'
  team.stoppedAt = Date.now()
  await storageWriteTeam(team)
  broadcastTeams()
  broadcastSessions()
}

// ----- App lifecycle -----

app.whenReady().then(async () => {
  markers['app.whenReady'] = Date.now() - t0

  // --- Team IPC (Wave 2) ---
  await loadAllTeams()
  ipcMain.handle('teams:list', () => Array.from(teams.values()))
  ipcMain.handle('teams:get', (_evt, id: string) => {
    const t = teams.get(id)
    return t || null
  })
  ipcMain.handle('teams:create', async (_evt, partial: Partial<Team>) => {
    const team: Team = {
      id: newTeamId(),
      name: partial.name || 'Untitled Team',
      description: partial.description || '',
      cwd: partial.cwd || '',
      status: 'draft',
      members: (partial.members || []).map((m) => ({
        ...m,
        id: m.id || nextMemberId(),
        status: 'draft' as const,
      })),
      createdAt: Date.now(),
    }
    // Set up per-member subfolders + SYSTEM.md
    for (const m of team.members) {
      try {
        await setupMemberDir(team, m)
      } catch (err) {
        console.error(`[teams] failed to set up member ${m.id}:`, err)
      }
    }
    await storageWriteTeam(team)
    teams.set(team.id, team)
    broadcastTeams()
    return team
  })
  ipcMain.handle('teams:update', async (_evt, id: string, partial: Partial<Team>) => {
    const t = teams.get(id)
    if (!t) return null
    // If running, only allow description/name/cwd updates — not membership.
    if (t.status === 'active' || t.status === 'starting') {
      const safe: Partial<Team> = {}
      if (partial.name !== undefined) safe.name = partial.name
      if (partial.description !== undefined) safe.description = partial.description
      if (partial.cwd !== undefined) safe.cwd = partial.cwd
      Object.assign(t, safe)
    } else {
      Object.assign(t, partial)
      // If members changed, regenerate their SYSTEM.md
      if (partial.members) {
        for (const m of t.members) {
          try {
            await setupMemberDir(t, m)
          } catch (err) {
            console.error(`[teams] failed to refresh member ${m.id}:`, err)
          }
        }
      }
    }
    await storageWriteTeam(t)
    broadcastTeams()
    return t
  })
  ipcMain.handle('teams:delete', async (_evt, id: string) => {
    // Halt first if running
    const t = teams.get(id)
    if (t && (t.status === 'active' || t.status === 'starting')) {
      await haltTeamMembers(id)
    }
    const ok = await storageDeleteTeam(id)
    if (ok) {
      teams.delete(id)
      broadcastTeams()
    }
    return { ok }
  })
  ipcMain.handle('teams:start', async (_evt, id: string) => {
    void startTeamMembers(id)
    return { ok: true }
  })
  ipcMain.handle('teams:halt', async (_evt, id: string) => {
    void haltTeamMembers(id)
    return { ok: true }
  })

  // --- Brain IPC (Wave 3) ---
  ipcMain.handle('agents:brain', async (_evt, agentId: string) => {
    const s = sessions.get(agentId)
    if (!s) return null
    if (!s.agentDir) {
      // Lazily create the scaffold if missing (defensive)
      const appPath = app.getAppPath()
      const runtimeBase = app.isPackaged
        ? path.join(app.getPath('userData'), 'sessions')
        : path.join(appPath, '.runtime', 'sessions')
      s.agentDir = path.join(runtimeBase, s.id)
    }
    try {
      return await readBrain(s.agentDir!, s.id, s.name, s.role)
    } catch (err) {
      console.warn(`[main] readBrain failed for ${s.id}:`, (err as Error).message)
      return null
    }
  })
  ipcMain.handle('agents:brain:remember', async (_evt, agentId: string, section: string, text: string) => {
    const s = sessions.get(agentId)
    if (!s?.agentDir) return { ok: false, error: 'no agent dir' }
    const valid = ['episodic', 'semantic', 'procedural', 'working']
    if (!valid.includes(section)) return { ok: false, error: 'invalid section' }
    try {
      const entry = await addBrainEntry(s.agentDir, section as 'episodic', text, 'user')
      return { ok: true, entry }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })
  ipcMain.handle('agents:brain:recall', async (_evt, agentId: string, query: string) => {
    const s = sessions.get(agentId)
    if (!s?.agentDir) return { ok: false, matches: [] as string[] }
    try {
      const results = await searchBrain(s.agentDir, query)
      return { ok: true, matches: results.map((r) => ({ section: r.section, text: r.entry.text })) }
    } catch (err) {
      return { ok: false, matches: [] as string[], error: (err as Error).message }
    }
  })

  // --- Legacy single-concierge IPC (kept for back-compat) ---
  ipcMain.handle('concierge:get', () => sessionSnapshot(getConcierge() as Session))
  ipcMain.handle('concierge:send', async (_evt, text: string) => {
    const c = getConcierge()
    if (!c || c.status !== 'active') return { ok: false, error: 'concierge not active' }
    try {
      const res = await fetch(`http://127.0.0.1:${c.port}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      return { ok: res.ok, status: res.status }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })
  ipcMain.handle('concierge:abort', async () => {
    const c = getConcierge()
    if (!c) return { ok: false, error: 'no concierge' }
    try {
      const res = await fetch(`http://127.0.0.1:${c.port}/abort`, { method: 'POST' })
      return { ok: res.ok, status: res.status }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  // --- Multi-session IPC (Wave 1 Task 1.3) ---
  ipcMain.handle('sessions:list', () => publicSnapshot())
  ipcMain.handle('sessions:get', (_evt, id: string) => {
    const s = sessions.get(id)
    return s ? sessionSnapshot(s) : null
  })
  ipcMain.handle('sessions:spawn', async (_evt, name?: string) => {
    const s = await spawnSession(name)
    return sessionSnapshot(s)
  })
  ipcMain.handle('sessions:stop', (_evt, id: string) => {
    return { ok: stopSession(id) }
  })
  ipcMain.handle('sessions:setTts', (_evt, id: string, enabled: boolean) => {
    const s = sessions.get(id)
    if (!s) return { ok: false, error: 'no such session' }
    s.ttsEnabled = enabled
    broadcastSessions()
    return { ok: true }
  })
  ipcMain.handle('sessions:send', async (_evt, id: string, text: string) => {
    const s = sessions.get(id)
    if (!s) return { ok: false, error: 'no such session' }
    if (s.status !== 'active') return { ok: false, error: 'not active' }
    try {
      const res = await fetch(`http://127.0.0.1:${s.port}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      return { ok: res.ok, status: res.status }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })
  ipcMain.handle('sessions:abort', async (_evt, id: string) => {
    const s = sessions.get(id)
    if (!s) return { ok: false, error: 'no such session' }
    try {
      const res = await fetch(`http://127.0.0.1:${s.port}/abort`, { method: 'POST' })
      return { ok: res.ok, status: res.status }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })
  ipcMain.handle('sessions:remember', (_evt, id: string, text: string) => {
    const s = sessions.get(id)
    if (!s) return { ok: false, error: 'no such session' }
    const trimmed = text.trim()
    if (!trimmed) return { ok: false, error: 'empty' }
    s.memory.push({
      id: `m${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      createdAt: Date.now(),
    })
    return { ok: true, count: s.memory.length }
  })
  ipcMain.handle('sessions:recall', (_evt, id: string, query: string) => {
    const s = sessions.get(id)
    if (!s) return { ok: false, error: 'no such session', matches: [] as string[] }
    const q = query.toLowerCase().trim()
    if (!q) {
      return { ok: true, matches: s.memory.map((m) => m.text) }
    }
    // Naive: substring match (case-insensitive). Good enough for Wave 1.
    const matches = s.memory
      .filter((m) => m.text.toLowerCase().includes(q))
      .map((m) => m.text)
    return { ok: true, matches }
  })

  createWindow()
  // Spawn the concierge + initial SSE
  void ensureConcierge().then(() => {
    const c = getConcierge()
    if (c && c.status === 'active') {
      // SSE was opened inside ensureConcierge
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Stop all sessions
  for (const id of Array.from(sessions.keys())) {
    if (id !== 'concierge') stopSession(id) // keep concierge until app quits
  }
  killHeadlessPi()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  for (const id of Array.from(sessions.keys())) stopSession(id)
  killHeadlessPi()
})
