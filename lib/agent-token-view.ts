import type { AgentToken } from '@prisma/client'

/** Active (unrevoked) tokens a user may hold at once. */
export const MAX_ACTIVE_AGENT_TOKENS = 5

export const AGENT_TOKEN_NAME_MAX = 50

/** What the user-facing token routes return: never the hash, the secret or lastUsedAt. */
export type AgentTokenView = Pick<AgentToken, 'id' | 'name' | 'createdAt' | 'revokedAt'>

export function agentTokenView(row: AgentToken): AgentTokenView {
  return { id: row.id, name: row.name, createdAt: row.createdAt, revokedAt: row.revokedAt }
}
