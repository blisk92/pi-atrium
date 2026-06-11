/**
 * Team storage and operations (Wave 2).
 *
 * Storage layout:
 *   <runtime>/teams/<team-id>/
 *     team.md            — state (JSON-in-frontmatter) + human-readable body
 *     <member-id>/
 *       config.json      — member's config (role, initial task, etc.)
 *       .pi/SYSTEM.md    — member's system prompt (generated from role + initial task)
 *       brain.md         — placeholder (Wave 3 fills it in)
 *       brain/{episodic,semantic,procedural,working}/ — placeholder
 */

import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import type { Team, TeamMember } from '../shared/types.js'

void (null as unknown) // ts-noop

function teamsBase(): string {
  const appPath = app.getAppPath()
  return app.isPackaged
    ? path.join(app.getPath('userData'), 'teams')
    : path.join(appPath, '.runtime', 'teams')
}

function teamDir(teamId: string): string {
  return path.join(teamsBase(), teamId)
}

function teamFile(teamId: string): string {
  return path.join(teamDir(teamId), 'team.md')
}

function memberDir(teamId: string, memberId: string): string {
  return path.join(teamDir(teamId), memberId)
}

/** Parse a team.md file. Returns null if file doesn't exist or is malformed. */
function parseTeamMd(content: string): Team | null {
  // Frontmatter: ---\n<json>\n---\n<body>
  const m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return null
  let state: Team
  try {
    state = JSON.parse(m[1]!) as Team
  } catch {
    return null
  }
  return state
}

/** Serialize a Team to a .md file. */
function serializeTeamMd(team: Team): string {
  const state = JSON.stringify(team, null, 2)
  const body = generateBody(team)
  return `---\n${state}\n---\n\n${body}\n`
}

function generateBody(team: Team): string {
  const lines: string[] = []
  lines.push(`# ${team.name}`)
  lines.push('')
  if (team.description) {
    lines.push(team.description)
    lines.push('')
  }
  if (team.members.length) {
    lines.push('## Members')
    lines.push('')
    for (const m of team.members) {
      lines.push(`### ${m.name}`)
      lines.push(`- **Role**: ${m.role}`)
      if (m.initialTask) lines.push(`- **Task**: ${m.initialTask}`)
      lines.push(`- **Status**: ${m.status}`)
      lines.push('')
    }
  }
  return lines.join('\n')
}

/** Generate a member's SYSTEM.md from their role + initial task. */
export function generateMemberSystemPrompt(member: TeamMember, teamName: string): string {
  return `---
name: ${member.name}
team: ${teamName}
role: ${member.role}
---

# ${member.name}

You are a **${member.role}** on the team "${teamName}" in Pi Atrium.

## Your initial task

${member.initialTask}

## How to work

- Be concise and direct — the user and other team members are busy.
- When you take an action, show the skill call inline (the app renders this).
- Use \`pi-intercom\` (a skill) to talk to other members if you need to coordinate.
- Use \`obsidian_retrieve\` (a skill, when enabled) to read vault context.

## When in doubt

- Ask before doing anything destructive.
- Say "I don't know" rather than making things up.
- Prefer one concrete next step over a long plan.
`
}

export async function listTeams(): Promise<Team[]> {
  try {
    await fs.mkdir(teamsBase(), { recursive: true })
    const entries = await fs.readdir(teamsBase(), { withFileTypes: true })
    const teams: Team[] = []
    for (const e of entries) {
      if (!e.isDirectory()) continue
      try {
        const content = await fs.readFile(teamFile(e.name), 'utf-8')
        const t = parseTeamMd(content)
        if (t) teams.push(t)
      } catch {
        // skip malformed
      }
    }
    return teams
  } catch (err) {
    console.error('[teams] listTeams failed:', (err as Error).message)
    return []
  }
}

export async function readTeam(id: string): Promise<Team | null> {
  try {
    const content = await fs.readFile(teamFile(id), 'utf-8')
    return parseTeamMd(content)
  } catch {
    return null
  }
}

export async function writeTeam(team: Team): Promise<void> {
  await fs.mkdir(teamDir(team.id), { recursive: true })
  await fs.writeFile(teamFile(team.id), serializeTeamMd(team), 'utf-8')
}

export async function deleteTeam(id: string): Promise<boolean> {
  try {
    await fs.rm(teamDir(id), { recursive: true, force: true })
    return true
  } catch (err) {
    console.error('[teams] deleteTeam failed:', (err as Error).message)
    return false
  }
}

let _teamCounter = 0
function nextTeamId(): string {
  _teamCounter++
  return `t-${Date.now().toString(36)}-${_teamCounter}`
}

let _memberCounter = 0
export function nextMemberId(): string {
  _memberCounter++
  return `m-${Date.now().toString(36)}-${_memberCounter}`
}

/** Create the per-member subfolder with config.json + .pi/SYSTEM.md + brain/. */
export async function setupMemberDir(team: Team, member: TeamMember): Promise<string> {
  const dir = memberDir(team.id, member.id)
  await fs.mkdir(path.join(dir, '.pi'), { recursive: true })
  await fs.writeFile(
    path.join(dir, 'config.json'),
    JSON.stringify(
      {
        id: member.id,
        teamId: team.id,
        name: member.name,
        role: member.role,
        initialTask: member.initialTask,
      },
      null,
      2
    ),
    'utf-8'
  )

  await fs.writeFile(
    path.join(dir, '.pi', 'SYSTEM.md'),
    generateMemberSystemPrompt(member, team.name),
    'utf-8'
  )

  // Brain scaffold is added in Wave 3 by ensureBrainScaffold(); keep
  // this function focused on member identity.
  return dir
}

export function getMemberDir(teamId: string, memberId: string): string {
  return memberDir(teamId, memberId)
}

export function newTeamId(): string {
  return nextTeamId()
}
