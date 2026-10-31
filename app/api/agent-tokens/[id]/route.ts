import { type NextRequest, NextResponse } from 'next/server'
import { agentTokenView } from '@/lib/agent-token-view'
import { revokeAgentToken } from '@/lib/agent-tokens'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, programManagementLimiter } from '@/lib/rate-limit'

/**
 * DELETE /api/agent-tokens/[id]: revokes one of the user's tokens. It stops
 * working at once; revoking again keeps the first time. Another user's or an
 * unknown id is a 404.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const limited = await checkRateLimit(programManagementLimiter, user.id)
    if (limited) return limited

    const row = await revokeAgentToken(prisma, id, user.id)
    if (!row) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }
    logger.info({ userId: user.id, tokenId: row.id }, 'Agent token revoked')
    return NextResponse.json({ token: agentTokenView(row) })
  } catch (error) {
    logger.error({ error, context: 'agent-tokens-revoke' }, 'Failed to revoke agent token')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
