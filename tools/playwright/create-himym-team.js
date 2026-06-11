/**
 * Builds the real HIMYM Dev Team into pi-atrium from C:\Users\edmon\pi-agents\.
 * Reads each member's SYSTEM.md to extract name + role + persona, then
 * creates a team with the correct on-disk layout (team.md + per-member
 * .pi/SYSTEM.md + brain scaffold + config.json + any extra files like
 * tracy/.pi/skills/team-grill/SKILL.md or adr.md).
 *
 * Run with: node tools/playwright/create-himym-team.js
 */
const fs = require('fs')
const path = require('path')

const SOURCE_BASE = 'C:\\Users\\edmon\\pi-agents'
const APP_DIR = path.resolve(__dirname, '../../app')
const TARGET_BASE = path.join(APP_DIR, '.runtime', 'teams')
const TEAM_ID = 't-himym-dev'

// Friendly display names
const DISPLAY = {
  barney: 'Barney',
  lily: 'Lily',
  marshall: 'Marshall',
  patrice: 'Patrice',
  robin: 'Robin',
  ted: 'Ted',
  'the-captain': 'The Captain',
  tracy: 'Tracy',
}

// Hardcoded roles (parsed from each member's SYSTEM.md first line)
const ROLES = {
  barney: 'Frontend Developer',
  lily: 'UAT Engineer',
  marshall: 'QA Engineer',
  patrice: 'Documentation Writer',
  robin: 'Backend Developer',
  ted: 'Architect',
  'the-captain': 'DevOps Engineer',
  tracy: 'Project Manager',
}

const NOW = Date.now()

function readUtf8(p) {
  return fs.readFileSync(p, 'utf-8')
}

function extractPersona(systemMd) {
  // The SYSTEM.md opens with: "You are **Name**, the role." then has the body.
  // Persona = everything after the first heading (## Core responsibilities) and onward.
  // Actually — the full body is the persona. Strip just the first line.
  const lines = systemMd.split('\n')
  // Find the first blank line; everything after it is the persona
  let i = 0
  while (i < lines.length && lines[i].trim() !== '') i++
  while (i < lines.length && lines[i].trim() === '') i++
  return lines.slice(i).join('\n').trim()
}

function buildTeam(members) {
  return {
    id: TEAM_ID,
    name: 'HIMYM Dev Team',
    description:
      'A coordinated dev team imported from C:\\Users\\edmon\\pi-agents\\. ' +
      'All members work in the shared CWD and coordinate via pi-intercom. ' +
      'The PM (Tracy) also has a custom "team-grill" skill for Socratic ' +
      'multi-perspective stress-testing.',
    cwd: SOURCE_BASE,
    status: 'draft',
    members: members.map((m) => ({
      id: 'm-' + m.dir,
      name: m.display,
      role: m.role,
      persona: m.persona,
      status: 'draft',
    })),
    createdAt: NOW,
  }
}

function serializeTeamMd(t) {
  const state = JSON.stringify(t, null, 2)
  const body = [
    `# ${t.name}`,
    '',
    t.description,
    '',
    '## Members',
    '',
    ...t.members.flatMap((m) => [
      `### ${m.name}`,
      `- **Role**: ${m.role}`,
      m.persona ? `- **Persona**: (${m.persona.length} chars; see .pi/SYSTEM.md per member)` : '',
      `- **Status**: ${m.status}`,
      '',
    ]),
  ].join('\n')
  return `---\n${state}\n---\n\n${body}\n`
}

function copyDirSync(srcDir, dstDir) {
  fs.mkdirSync(dstDir, { recursive: true })
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name)
    const d = path.join(dstDir, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(s, d)
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d)
    }
  }
}

async function main() {
  const srcEntries = fs
    .readdirSync(SOURCE_BASE, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
  console.log('Found source agent dirs:', srcEntries.join(', '))

  const teamDir = path.join(TARGET_BASE, TEAM_ID)
  // Wipe any existing build
  if (fs.existsSync(teamDir)) {
    fs.rmSync(teamDir, { recursive: true, force: true })
    console.log('Removed existing team dir')
  }
  fs.mkdirSync(teamDir, { recursive: true })

  // Read each member
  const members = []
  for (const dir of srcEntries) {
    const sysPath = path.join(SOURCE_BASE, dir, '.pi', 'SYSTEM.md')
    if (!fs.existsSync(sysPath)) {
      console.warn('  Skipping', dir, '(no SYSTEM.md)')
      continue
    }
    const sys = readUtf8(sysPath)
    const persona = extractPersona(sys)
    members.push({
      dir,
      display: DISPLAY[dir] || dir,
      role: ROLES[dir] || 'Member',
      persona,
    })
  }
  console.log('Read', members.length, 'members')

  // Build the team.md
  const team = buildTeam(members)
  fs.writeFileSync(path.join(teamDir, 'team.md'), serializeTeamMd(team), 'utf-8')
  console.log('Wrote team.md')

  // Build per-member folders
  for (const m of team.members) {
    // Recover the source dir from the member id (e.g. 'm-ted' -> 'ted')
    const srcDirName = m.id.replace(/^m-/, '')
    const memberSrc = path.join(SOURCE_BASE, srcDirName)
    const memberDst = path.join(teamDir, m.id)
    fs.mkdirSync(memberDst, { recursive: true })

    // Copy the .pi/ folder (SYSTEM.md, skills, etc.) verbatim
    const piSrc = path.join(memberSrc, '.pi')
    if (fs.existsSync(piSrc)) {
      copyDirSync(piSrc, path.join(memberDst, '.pi'))
    }

    // Add a brain scaffold (placeholder; Wave 3 will populate)
    fs.mkdirSync(path.join(memberDst, 'brain', 'episodic'), { recursive: true })
    fs.mkdirSync(path.join(memberDst, 'brain', 'semantic'), { recursive: true })
    fs.mkdirSync(path.join(memberDst, 'brain', 'procedural'), { recursive: true })
    fs.mkdirSync(path.join(memberDst, 'brain', 'working'), { recursive: true })
    fs.writeFileSync(
      path.join(memberDst, 'brain.md'),
      `# ${m.name} — Brain Index\n\n_Populated by the agent via /remember and reflection._\n`,
      'utf-8'
    )

    // Copy any extra files at the agent root (e.g. tracy/adr.md, tracy/progress.md)
    for (const e of fs.readdirSync(memberSrc, { withFileTypes: true })) {
      if (e.isFile() && !e.name.startsWith('.')) {
        fs.copyFileSync(path.join(memberSrc, e.name), path.join(memberDst, e.name))
      }
    }

    // config.json (the new schema)
    fs.writeFileSync(
      path.join(memberDst, 'config.json'),
      JSON.stringify(
        { id: m.id, teamId: team.id, name: m.name, role: m.role, persona: m.persona },
        null,
        2
      ),
      'utf-8'
    )

    // The headless-pi sidecar uses .pi/SYSTEM.md; ensure it's there
    if (!fs.existsSync(path.join(memberDst, '.pi', 'SYSTEM.md'))) {
      fs.writeFileSync(
        path.join(memberDst, '.pi', 'SYSTEM.md'),
        '# ' + m.name + '\n\n_(no SYSTEM.md found in source)_\n',
        'utf-8'
      )
    }

    console.log('  Wrote', m.id, m.name, '·', m.role)
  }

  console.log('\n✓ HIMYM Dev Team built at', teamDir)
  console.log('  Team CWD:', team.cwd)
  console.log('  Members:', team.members.length)
  console.log('\nOpen the app and the team appears in the TEAMS sidebar.')
  console.log('Click Start to spawn all', team.members.length, 'agents (one Pi sidecar per member).')
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
