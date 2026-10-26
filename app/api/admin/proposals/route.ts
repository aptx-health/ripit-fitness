import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { PROPOSAL_STATUSES, type ProposalStatus } from '@/lib/proposals/service'

/**
 * GET /api/admin/proposals?status=pending
 * The admin's proposals, newest first.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth.response) return auth.response

    const status = request.nextUrl.searchParams.get('status')
    if (status && !PROPOSAL_STATUSES.includes(status as ProposalStatus)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 })
    }

    const proposals = await prisma.proposal.findMany({
      where: { userId: auth.user.id, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        kind: true,
        status: true,
        summary: true,
        targetId: true,
        error: true,
        createdAt: true,
        decidedAt: true,
        agentToken: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: proposals })
  } catch (error) {
    logger.error({ error }, 'Error listing proposals')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
