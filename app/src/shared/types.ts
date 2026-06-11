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
