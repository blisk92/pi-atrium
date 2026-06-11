import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Team, TeamMember } from '@shared/types'

/**
 * Team store (Wave 2) — registry of all teams (Draft + Active + Stopped).
 * Provides list, create, update, delete, start, halt.
 */

export const useTeamStore = defineStore('teams', () => {
  const teams = ref<Team[]>([])
  let unsubscribe: (() => void) | null = null

  function refresh(): Promise<Team[]> {
    return window.piAtrium!.teams.list().then((list) => {
      teams.value = list
      return list
    })
  }

  function findById(id: string): Team | undefined {
    return teams.value.find((t) => t.id === id)
  }

  async function create(partial: Partial<Team>): Promise<Team | null> {
    try {
      const t = await window.piAtrium!.teams.create(partial)
      await refresh()
      return t
    } catch (err) {
      console.error('[teams] create failed:', err)
      return null
    }
  }

  async function update(id: string, partial: Partial<Team>): Promise<void> {
    await window.piAtrium!.teams.update(id, partial)
    await refresh()
  }

  async function remove(id: string): Promise<{ ok: boolean }> {
    const r = await window.piAtrium!.teams.delete(id)
    await refresh()
    return r
  }

  async function start(id: string): Promise<{ ok: boolean }> {
    return window.piAtrium!.teams.start(id)
  }

  async function halt(id: string): Promise<{ ok: boolean }> {
    return window.piAtrium!.teams.halt(id)
  }

  function subscribe(): void {
    if (!window.piAtrium) return
    void refresh()
    unsubscribe = window.piAtrium.teams.onUpdate((list) => {
      teams.value = list
    })
  }

  function unbind(): void {
    unsubscribe?.()
    unsubscribe = null
  }

  return {
    teams,
    refresh,
    findById,
    create,
    update,
    remove,
    start,
    halt,
    subscribe,
    unbind,
  }
})

export type { Team, TeamMember }
