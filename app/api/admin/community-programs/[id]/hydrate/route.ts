import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { hydrateCommunityProgram } from '@/lib/admin/community-program-hydration'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/community-programs/[id]/hydrate
 * Creates a temporary Program from a CommunityProgram's programData JSON
 * so it can be edited via ProgramBuilder.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEditor({ rateLimit: true })
    if (auth.response) return auth.response

    const { id } = await params

    const result = await hydrateCommunityProgram(prisma, id, auth.user.id)

    if (!result.success) {
      const status = result.error === 'Community program not found' ? 404 : 400
      return NextResponse.json({ error: result.error }, { status })
    }

    return NextResponse.json({ tempProgramId: result.tempProgramId })
  } catch (error) {
    logger.error({ error }, 'Error hydrating community program')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
