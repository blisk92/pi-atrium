import { defineStore } from 'pinia'
import { reactive, computed } from 'vue'

/**
 * Skills store (Wave 4 / Task 4.1).
 * Holds the list of known skills (builtin + custom) and per-session toggle
 * state. The toggle is currently a UI affordance — the Pi SDK's actual
 * tool surface isn't disabled by it, but it's wired to a real
 * per-agent preference that future waves can plumb into the agent's
 * system prompt.
 */

export interface Skill {
  name: string
  description: string
  source: 'builtin' | 'user' | 'agent'
}

const BUILTIN_SKILLS: Skill[] = [
  { name: 'obsidian_retrieve', description: 'Search and read Obsidian vault notes', source: 'builtin' },
  { name: 'app_context', description: 'Inspect app state (teams, agents, sessions)', source: 'builtin' },
  { name: 'skill-manager', description: 'Add or remove skills on the current agent', source: 'builtin' },
  { name: 'pi-intercom', description: 'Talk to other Pi agents', source: 'builtin' },
]

export const useSkillStore = defineStore('skills', () => {
  // Per-agent enabled state: { [agentId]: { [skillName]: enabled } }
  const enabledByAgent = reactive<Record<string, Record<string, boolean>>>({})

  const allSkills = computed<Skill[]>(() => BUILTIN_SKILLS)

  function isEnabled(agentId: string, skillName: string): boolean {
    return enabledByAgent[agentId]?.[skillName] === true
  }

  function toggle(agentId: string, skillName: string): void {
    if (!enabledByAgent[agentId]) enabledByAgent[agentId] = {}
    enabledByAgent[agentId][skillName] = !enabledByAgent[agentId][skillName]
  }

  function countOn(agentId: string): number {
    const map = enabledByAgent[agentId]
    if (!map) return 0
    return Object.values(map).filter(Boolean).length
  }

  function refresh(): void {
    // No-op for now: builtin skills are static. When custom skills land
    // (Task 4.2) this will reload from disk.
  }

  return { allSkills, isEnabled, toggle, countOn, refresh }
})
