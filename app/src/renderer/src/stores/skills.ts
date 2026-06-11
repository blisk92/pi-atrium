import { defineStore } from 'pinia'
import { reactive, computed } from 'vue'

/**
 * Skills store (Wave 4 / Task 4.1 + Task 4.2 partial).
 *
 * Holds:
 *   - BUILTIN_SKILLS: hardcoded app-level skills (obsidian_retrieve,
 *     app_context, skill-manager, pi-intercom) — available to every agent.
 *   - Per-agent custom skills discovered from the agent's
 *     <agentDir>/.pi/skills/<name>/SKILL.md (Task 4.2 partial — list only;
 *     no editor yet). Currently used for the HIMYM Dev Team's
 *     `team-grill` skill on Tracy, plus any other skill bundled in
 *     app/resources/teams/<id>/m-<name>/.pi/skills/.
 *
 * The toggle is still a UI affordance — the Pi SDK's actual tool
 * surface isn't disabled by it. A future wave can plumb per-agent
 * preferences into the agent's system prompt.
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

interface CustomSkills {
  loadedFor: string | null
  loading: boolean
  error: string | null
  skills: Skill[]
}

export const useSkillStore = defineStore('skills', () => {
  // Per-agent enabled state: { [agentId]: { [skillName]: enabled } }
  const enabledByAgent = reactive<Record<string, Record<string, boolean>>>({})
  // Per-agent custom skills cache: { [agentId]: CustomSkills }
  const customByAgent = reactive<Record<string, CustomSkills>>({})

  function getCustom(agentId: string): CustomSkills {
    if (!customByAgent[agentId]) {
      customByAgent[agentId] = {
        loadedFor: null,
        loading: false,
        error: null,
        skills: [],
      }
    }
    return customByAgent[agentId]
  }

  /** All skills (builtin + per-agent custom) for the given agent. */
  function skillsFor(agentId: string | null): Skill[] {
    if (!agentId) return BUILTIN_SKILLS
    const custom = customByAgent[agentId]?.skills ?? []
    return [...BUILTIN_SKILLS, ...custom]
  }

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

  /**
   * Load custom skills for an agent from the main process.
   * No-op if already loaded for this agent.
   * Call this when the Skills tab is opened or the active agent changes.
   */
  async function refresh(agentId: string): Promise<void> {
    if (!agentId) return
    const c = getCustom(agentId)
    if (c.loadedFor === agentId || c.loading) return
    const api = window.piAtrium
    if (!api) return
    c.loading = true
    c.error = null
    try {
      const res = await api.agents.listSkills(agentId)
      if (res.ok) {
        c.skills = res.skills
        c.loadedFor = agentId
      } else {
        c.error = res.error || 'unknown'
      }
    } catch (err) {
      c.error = (err as Error).message
    } finally {
      c.loading = false
    }
  }

  /** Force a re-fetch (e.g. after the team starts and skills land on disk). */
  function invalidate(agentId: string): void {
    const c = getCustom(agentId)
    c.loadedFor = null
    c.skills = []
  }

  return { allSkills, skillsFor, isEnabled, toggle, countOn, refresh, invalidate }
})
