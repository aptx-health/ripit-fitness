import { type NextRequest, NextResponse } from 'next/server'
import { AGENT_TOKEN_NAME_MAX, agentTokenView, MAX_ACTIVE_AGENT_TOKENS } from '@/lib/agent-token-view'
import { createAgentTokenWithinLimit } from '@/lib/agent-tokens'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, programManagementLimiter } from '@/lib/rate-limit'

/**
 * GET  /api/agent-tokens  the signed-in user's agent tokens, newest first.
 * POST /api/agent-tokens  { name } creates one; the plain token (`secret`) is
 *                          in this response only. At most 5 active per user.
 * Admins keep their own manager under /api/admin/agent-tokens.
 */

export async function GET() {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const limited = await checkRateLimit(programManagementLimiter, user.id)
    if (limited) return limited

    const rows = await prisma.agentToken.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ tokens: rows.map(agentTokenView) })
  } catch (error) {
    logger.error({ error, context: 'agent-tokens-list' }, 'Failed to list agent tokens')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const limited = await checkRateLimit(programManagementLimiter, user.id)
    if (limited) return limited

    const body = await request.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > AGENT_TOKEN_NAME_MAX) {
      return NextResponse.json(
        { error: `Name is required (${AGENT_TOKEN_NAME_MAX} characters or less)` },
        { status: 400 }
      )
    }

    const result = await createAgentTokenWithinLimit(prisma, user.id, name)
    if (!result.ok) {
      return NextResponse.json(
        {
          error: `You can have at most ${MAX_ACTIVE_AGENT_TOKENS} active tokens. Revoke one to create another.`,
          code: 'TOKEN_LIMIT',
        },
        { status: 409 }
      )
    }

    const { token, record } = result
    logger.info({ userId: user.id, tokenId: record.id }, 'Agent token created')

    const { revokedAt: _revokedAt, ...created } = agentTokenView(record)
    return NextResponse.json({ token: created, secret: token }, { status: 201 })
  } catch (error) {
    logger.error({ error, context: 'agent-tokens-create' }, 'Failed to create agent token')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
