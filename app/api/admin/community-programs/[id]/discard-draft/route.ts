import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { discardDraftProgram } from '@/lib/admin/community-program-hydration'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/community-programs/[id]/discard-draft
 * Deletes a temporary admin draft program.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEditor({ rateLimit: true })
    if (auth.response) return auth.response

    await params // consume params (route requires [id] but we use tempProgramId from body)
    const body = await request.json()
    const { tempProgramId } = body

    if (!tempProgramId || typeof tempProgramId !== 'string') {
      return NextResponse.json(
        { error: 'tempProgramId is required' },
        { status: 422 }
      )
    }

    const result = await discardDraftProgram(prisma, tempProgramId, auth.user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, 'Error discarding admin draft')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
