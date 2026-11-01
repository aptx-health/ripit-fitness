import { createHash, randomBytes } from 'node:crypto'
import type { AgentToken, Prisma, PrismaClient } from '@prisma/client'
import { MAX_ACTIVE_AGENT_TOKENS } from './agent-token-view'

const TOKEN_PREFIX = 'ripit_at_'

export function hashAgentToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Create a personal access token for an agent. The plaintext token is
 * returned once; only its SHA-256 hash is stored.
 */
export async function createAgentToken(
  prisma: PrismaClient | Prisma.TransactionClient,
  userId: string,
  name: string
): Promise<{ token: string; record: AgentToken }> {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`
  const record = await prisma.agentToken.create({
    data: { userId, name, tokenHash: hashAgentToken(token) },
  })
  return { token, record }
}

/**
 * Create a token unless the user already has the maximum active ones. The count
 * and the insert run in one transaction under a per-user advisory lock, so
 * parallel requests can't both pass the count and go over the limit.
 */
export async function createAgentTokenWithinLimit(
  prisma: PrismaClient,
  userId: string,
  name: string
): Promise<{ ok: true; token: string; record: AgentToken } | { ok: false; code: 'TOKEN_LIMIT' }> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`agent-tokens:${userId}`}))`
    const active = await tx.agentToken.count({ where: { userId, revokedAt: null } })
    if (active >= MAX_ACTIVE_AGENT_TOKENS) return { ok: false, code: 'TOKEN_LIMIT' }
    return { ok: true, ...(await createAgentToken(tx, userId, name)) }
  })
}

/**
 * Resolve a bearer token to its user. Returns null for unknown or revoked
 * tokens. Records lastUsedAt on success.
 */
export async function resolveAgentToken(
  prisma: PrismaClient,
  bearer: string
): Promise<{ userId: string; tokenId: string } | null> {
  if (!bearer) return null
  const row = await prisma.agentToken.findUnique({
    where: { tokenHash: hashAgentToken(bearer) },
    select: { id: true, userId: true, revokedAt: true },
  })
  if (!row || row.revokedAt) return null

  await prisma.agentToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
  return { userId: row.userId, tokenId: row.id }
}

export async function revokeAgentToken(
  prisma: PrismaClient,
  tokenId: string,
  userId: string
): Promise<AgentToken | null> {
  const row = await prisma.agentToken.findFirst({ where: { id: tokenId, userId } })
  if (!row) return null
  if (row.revokedAt) return row
  return prisma.agentToken.update({ where: { id: tokenId }, data: { revokedAt: new Date() } })
}
