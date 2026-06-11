/**
 * Per-agent brain (Wave 3 / Task 3.1).
 *
 * Each agent (session or team member) has a structured brain folder:
 *
 *   <agent-dir>/
 *     brain/
 *       episodic/    — recent events, what happened
 *       semantic/    — curated knowledge, facts
 *       procedural/  — skills, routines, how-tos
 *       working/     — current task context
 *     brain.md       — index file with Profile + per-section summaries
 *
 * For Task 3.1 we just create the scaffold + an initial brain.md.
 * Reading/writing entries is the focus of Task 3.2 (remember/recall).
 */

import path from 'node:path'
import fs from 'node:fs/promises'

export type BrainSectionId = 'episodic' | 'semantic' | 'procedural' | 'working'

export const BRAIN_SECTIONS: { id: BrainSectionId; name: string; description: string }[] = [
  { id: 'episodic', name: 'Episodic', description: 'Recent events, what happened' },
  { id: 'semantic', name: 'Semantic', description: 'Curated knowledge, facts' },
  { id: 'procedural', name: 'Procedural', description: 'Skills, routines, how-tos' },
  { id: 'working', name: 'Working', description: 'Current task context' },
]

export interface BrainEntry {
  id: string
  text: string
  createdAt: number
  source?: string
}

export interface BrainSectionState {
  id: BrainSectionId
  name: string
  description: string
  entries: BrainEntry[]
}

export interface BrainState {
  agentId: string
  agentName: string
  role?: string
  profile: string
  sections: BrainSectionState[]
  totalEntries: number
}

/** Create the brain scaffold + initial brain.md if not present. */
export async function ensureBrainScaffold(agentDir: string, agentName: string, role?: string): Promise<void> {
  const brainDir = path.join(agentDir, 'brain')
  for (const sec of BRAIN_SECTIONS) {
    await fs.mkdir(path.join(brainDir, sec.id), { recursive: true })
  }
  const brainMd = path.join(agentDir, 'brain.md')
  try {
    await fs.access(brainMd)
    // exists
  } catch {
    const initial = generateBrainMd(agentName, role, 'Self-model goes here. (Updated by the agent via /remember + reflection.)')
    await fs.writeFile(brainMd, initial, 'utf-8')
  }
}

/** Generate an initial brain.md with the Profile section. */
function generateBrainMd(agentName: string, role: string | undefined, profile: string): string {
  return `# ${agentName} — Brain\n\n` +
    (role ? `_Role: ${role}_\n\n` : '') +
    `## Profile\n\n${profile}\n\n` +
    `## Sections\n\n` +
    BRAIN_SECTIONS.map((s) => `- **${s.name}** — ${s.description}`).join('\n') +
    `\n\n_This file is auto-generated. The agent updates it via \`/remember\` (Wave 3.2) and reflection._\n`
}

/** Read the brain state for an agent (entries + profile). */
export async function readBrain(agentDir: string, agentId: string, agentName: string, role?: string): Promise<BrainState> {
  const brainDir = path.join(agentDir, 'brain')
  const sections: BrainSectionState[] = []
  let total = 0

  for (const sec of BRAIN_SECTIONS) {
    const sectionDir = path.join(brainDir, sec.id)
    const entries: BrainEntry[] = []
    try {
      const files = await fs.readdir(sectionDir)
      for (const f of files) {
        if (!f.endsWith('.md')) continue
        try {
          const raw = await fs.readFile(path.join(sectionDir, f), 'utf-8')
          const entry = parseBrainEntry(f, raw)
          if (entry) entries.push(entry)
        } catch {
          /* skip unreadable */
        }
      }
    } catch {
      /* section dir might not exist yet */
    }
    entries.sort((a, b) => b.createdAt - a.createdAt)
    sections.push({ id: sec.id, name: sec.name, description: sec.description, entries })
    total += entries.length
  }

  // Profile: extract the Profile section from brain.md (or empty)
  let profile = 'Self-model goes here. (Updated by the agent via /remember + reflection.)'
  try {
    const raw = await fs.readFile(path.join(agentDir, 'brain.md'), 'utf-8')
    const m = raw.match(/## Profile\s*\n+([\s\S]*?)(?=\n## |\s*$)/)
    if (m) profile = m[1]!.trim()
  } catch {
    /* no brain.md */
  }

  return {
    agentId,
    agentName,
    role,
    profile,
    sections,
    totalEntries: total,
  }
}

/** Parse a single brain entry file. */
function parseBrainEntry(filename: string, content: string): BrainEntry | null {
  // Filename: <id>-<slug>.md
  const id = filename.replace(/\.md$/, '')
  // Frontmatter or just text. Support both:
  let text = content
  let createdAt = 0
  let source: string | undefined
  const fm = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (fm) {
    const meta = fm[1]!
    const body = fm[2]!
    const cm = meta.match(/created:\s*(\d+)/)
    if (cm) createdAt = parseInt(cm[1]!, 10)
    const sm = meta.match(/source:\s*(\S+)/)
    if (sm) source = sm[1]
    text = body.trim()
  }
  return { id, text, createdAt, source }
}

/** Add an entry to a section. Returns the new entry. */
export async function addBrainEntry(
  agentDir: string,
  section: BrainSectionId,
  text: string,
  source?: string
): Promise<BrainEntry> {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/-+$/, '') || 'note'
  const filename = `${id}-${slug}.md`
  const entry: BrainEntry = { id, text, createdAt: Date.now(), source }
  const fm = `---\ncreated: ${entry.createdAt}${source ? `\nsource: ${source}` : ''}\n---\n\n${text}\n`
  await fs.writeFile(path.join(agentDir, 'brain', section, filename), fm, 'utf-8')
  return entry
}

/** Search entries across all sections by query (substring match). */
export async function searchBrain(agentDir: string, query: string): Promise<{ section: BrainSectionId; entry: BrainEntry }[]> {
  const q = query.toLowerCase().trim()
  const results: { section: BrainSectionId; entry: BrainEntry }[] = []
  const brain = await readBrain(agentDir, '', '', '')
  if (!q) return []
  for (const s of brain.sections) {
    for (const e of s.entries) {
      if (e.text.toLowerCase().includes(q)) {
        results.push({ section: s.id, entry: e })
      }
    }
  }
  return results
}
