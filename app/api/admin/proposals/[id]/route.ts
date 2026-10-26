import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/proposals/[id]
 * One proposal with its payload, before snapshot and current target.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireAdmin()
    if (auth.response) return auth.response

    const proposal = await prisma.proposal.findFirst({
      where: { id, userId: auth.user.id },
      include: { agentToken: { select: { id: true, name: true } } },
    })
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    const current = proposal.targetId
      ? await prisma.exerciseDefinition.findUnique({ where: { id: proposal.targetId } })
      : null

    return NextResponse.json({ success: true, data: { ...proposal, current } })
  } catch (error) {
    logger.error({ error }, 'Error fetching proposal')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
