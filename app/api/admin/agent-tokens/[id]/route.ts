import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { revokeAgentToken } from '@/lib/agent-tokens'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * DELETE /api/admin/agent-tokens/[id]
 * Revokes the token. The row stays so its proposals keep their history.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireAdmin({ rateLimit: true })
    if (auth.response) return auth.response

    const revoked = await revokeAgentToken(prisma, id, auth.user.id)
    if (!revoked) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    logger.info({ userId: auth.user.id, tokenId: id }, 'Agent token revoked')
    return NextResponse.json({
      success: true,
      data: { id: revoked.id, name: revoked.name, revokedAt: revoked.revokedAt },
    })
  } catch (error) {
    logger.error({ error }, 'Error revoking agent token')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
