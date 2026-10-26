import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAgentToken } from '@/lib/agent-tokens'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

const MAX_NAME_LENGTH = 50

const tokenSelect = {
  id: true,
  name: true,
  createdAt: true,
  lastUsedAt: true,
  revokedAt: true,
} as const

/**
 * GET /api/admin/agent-tokens
 * The admin's agent tokens (never the hash or plaintext).
 */
export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth.response) return auth.response

    const tokens = await prisma.agentToken.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: 'desc' },
      select: tokenSelect,
    })
    return NextResponse.json({ success: true, data: tokens })
  } catch (error) {
    logger.error({ error }, 'Error listing agent tokens')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/agent-tokens  { name }
 * Creates a token. The plaintext is in the response once and never again.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin({ rateLimit: true })
    if (auth.response) return auth.response

    const body = await request.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Name is required (${MAX_NAME_LENGTH} characters or less)` },
        { status: 422 }
      )
    }

    const { token, record } = await createAgentToken(prisma, auth.user.id, name)
    logger.info({ userId: auth.user.id, tokenId: record.id, name }, 'Agent token created')

    const { tokenHash: _hash, userId: _user, ...safe } = record
    return NextResponse.json({ success: true, data: { token, record: safe } }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Error creating agent token')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
