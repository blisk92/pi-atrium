/**
 * Bundles the HIMYM Dev Team into the app's resources/ folder so it ships
 * with the app. NOT linked to the user's C:\Users\edmon\pi-agents\ — the
 * SYSTEM.md files are copied verbatim but the team is self-contained.
 *
 * Run with: node tools/playwright/bundle-himym-team.js
 */
const fs = require('fs')
const path = require('path')

const SOURCE_BASE = 'C:\\Users\\edmon\\pi-agents'
const APP_DIR = path.resolve(__dirname, '../../app')
const BUNDLE_BASE = path.join(APP_DIR, 'resources', 'teams', 'himym-dev')
const TEAM_ID = 't-himym-dev'

const DISPLAY = {
  barney: 'Barney',
  lily: 'Lily',
  'маршалл': 'Marshall',
  patrice: 'Patrice',
  robin: 'Robin',
  ted: 'Ted',
  'the-captain': 'The Captain',
  tracy: 'Tracy',
}

const ROLES = {
  barney: 'Frontend Developer',
  lily: 'UAT Engineer',
  'маршалл': 'QA Engineer',
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
  const lines = systemMd.split('\n')
  let i = 0
  while (i < lines.length && lines[i].trim() !== '') i++
  while (i < lines.length && lines[i].trim() === '') i++
  return lines.slice(i).join('\n').trim()
}

function copyDirSync(srcDir, dstDir) {
  fs.mkdirSync(dstDir, { recursive: true })
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    // Skip Windows NUL artifacts and hidden files
    if (entry.name === 'NUL' || entry.name.startsWith('.')) continue
    const s = path.join(srcDir, entry.name)
    const d = path.join(dstDir, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(s, d)
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d)
    }
  }
}

function buildTeam(members) {
  return {
    id: TEAM_ID,
    name: 'HIMYM Dev Team',
    description:
      'A starter team that ships with Pi Atrium. ' +
      'Eight specialized agents (Ted, Robin, Barney, Marshall, Lily, Patrice, The Captain, Tracy) ' +
      'coordinated for a full software project — architecture, frontend, backend, QA, UAT, ' +
      'docs, DevOps, and PM. The PM (Tracy) also has a "team-grill" skill for Socratic ' +
      'multi-perspective stress-testing.',
    // Empty cwd → sidecar falls back to its own runtime dir (no link to user's filesystem)
    cwd: '',
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
      `- **Persona**: (${m.persona.length} chars; see .pi/SYSTEM.md per member)`,
      `- **Status**: ${m.status}`,
      '',
    ]),
  ].join('\n')
  return `---\n${state}\n---\n\n${body}\n`
}

async function main() {
  const srcEntries = fs
    .readdirSync(SOURCE_BASE, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
  console.log('Source agent dirs:', srcEntries.join(', '))

  if (fs.existsSync(BUNDLE_BASE)) {
    fs.rmSync(BUNDLE_BASE, { recursive: true, force: true })
  }
  fs.mkdirSync(BUNDLE_BASE, { recursive: true })

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
      id: 'm-' + dir,
      display: DISPLAY[dir] || dir,
      role: ROLES[dir] || 'Member',
      persona,
    })
  }
  console.log('Read', members.length, 'members')

  // team.md
  const team = buildTeam(members)
  fs.writeFileSync(path.join(BUNDLE_BASE, 'team.md'), serializeTeamMd(team), 'utf-8')
  console.log('Wrote team.md')

  for (const m of team.members) {
    const srcDirName = m.id.replace(/^m-/, '')
    const memberSrc = path.join(SOURCE_BASE, srcDirName)
    const memberDst = path.join(BUNDLE_BASE, m.id)
    fs.mkdirSync(memberDst, { recursive: true })

    // Copy the .pi/ folder (SYSTEM.md + skills) verbatim
    const piSrc = path.join(memberSrc, '.pi')
    if (fs.existsSync(piSrc)) {
      copyDirSync(piSrc, path.join(memberDst, '.pi'))
    }

    // Copy root files (adr.md, progress.md, etc.)
    for (const e of fs.readdirSync(memberSrc, { withFileTypes: true })) {
      if (e.isFile() && !e.name.startsWith('.') && e.name !== 'NUL') {
        fs.copyFileSync(path.join(memberSrc, e.name), path.join(memberDst, e.name))
      }
    }

    // Add brain scaffold (Wave 3 placeholder)
    fs.mkdirSync(path.join(memberDst, 'brain', 'episodic'), { recursive: true })
    fs.mkdirSync(path.join(memberDst, 'brain', 'semantic'), { recursive: true })
    fs.mkdirSync(path.join(memberDst, 'brain', 'procedural'), { recursive: true })
    fs.mkdirSync(path.join(memberDst, 'brain', 'working'), { recursive: true })
    fs.writeFileSync(
      path.join(memberDst, 'brain.md'),
      `# ${m.name} — Brain Index\n\n_Populated by the agent via /remember and reflection._\n`,
      'utf-8'
    )

    // config.json
    fs.writeFileSync(
      path.join(memberDst, 'config.json'),
      JSON.stringify(
        { id: m.id, teamId: team.id, name: m.name, role: m.role, persona: m.persona },
        null,
        2
      ),
      'utf-8'
    )
    console.log('  Wrote', m.id, m.name)
  }

  console.log('\n✓ Bundled HIMYM Dev Team at', BUNDLE_BASE)
  console.log('  This team ships with the app and is NOT linked to the user\'s pi-agents dir.')
  console.log('  The CWD is empty (the sidecar falls back to its own runtime dir).')
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
