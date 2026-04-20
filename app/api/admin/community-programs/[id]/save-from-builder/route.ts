import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { serializeAndSaveToCommunity } from '@/lib/admin/community-program-hydration'

/**
 * POST /api/admin/community-programs/[id]/save-from-builder
 * Serializes a temporary Program back into the CommunityProgram's programData JSON,
 * then deletes the temp program.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEditor({ rateLimit: true })
    if (auth.response) return auth.response

    const { id } = await params
    const body = await request.json()
    const { tempProgramId } = body

    if (!tempProgramId || typeof tempProgramId !== 'string') {
      return NextResponse.json(
        { error: 'tempProgramId is required' },
        { status: 422 }
      )
    }

    // Verify the temp program belongs to this admin
    const tempProgram = await prisma.program.findUnique({
      where: { id: tempProgramId },
      select: { userId: true, copyStatus: true },
    })

    if (!tempProgram) {
      return NextResponse.json({ error: 'Temp program not found' }, { status: 404 })
    }

    if (tempProgram.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (tempProgram.copyStatus !== 'admin_draft') {
      return NextResponse.json(
        { error: 'Program is not an admin draft' },
        { status: 400 }
      )
    }

    const result = await serializeAndSaveToCommunity(prisma, tempProgramId, id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, 'Error saving community program from builder')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
