/**
 * Shared types between main, preload, and renderer.
 * Add to this file when introducing new shared shapes (agent status, message, etc.)
 */

export type AgentStatus =
  | 'idle'
  | 'starting'
  | 'active'
  | 'thinking'
  | 'tool'
  | 'attention'
  | 'error'
  | 'stopping'
  | 'stopped'

export interface AgentSession {
  id: string
  name: string
  role?: string
  status: AgentStatus
  port?: number
  isConcierge?: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  timestamp: number
  streaming?: boolean
  toolCall?: {
    name: string
    args?: string
    durationMs?: number
  }
}

// ----- Wave 2: Teams -----

export type TeamStatus =
  | 'draft'
  | 'starting'
  | 'active'
  | 'stopping'
  | 'stopped'
  | 'error'

export type MemberStatus =
  | 'draft'
  | 'starting'
  | 'active'
  | 'error'
  | 'stopped'

export interface TeamMember {
  id: string
  name: string
  role: string
  initialTask: string
  /** When running, the session ID assigned to this member. */
  sessionId?: string
  status: MemberStatus
  port?: number
  pid?: number
  errorMessage?: string
}

export interface Team {
  id: string
  name: string
  description: string
  /** CWD for the team. Empty string = use default (vault / app dir). */
  cwd: string
  status: TeamStatus
  members: TeamMember[]
  createdAt: number
  startedAt?: number
  stoppedAt?: number
}
