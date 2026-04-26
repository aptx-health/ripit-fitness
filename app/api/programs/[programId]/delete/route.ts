import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, destructiveOpLimiter } from '@/lib/rate-limit'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(destructiveOpLimiter, user.id)
    if (limited) return limited

    // Verify program exists and user owns it
    const program = await prisma.program.findUnique({
      where: { id: programId },
    })

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    if (program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Already deleted
    if (program.deletedAt) {
      return NextResponse.json(
        { error: 'Program is already deleted' },
        { status: 400 }
      )
    }

    // Block deletion if there's an in-progress draft workout for this program
    const activeDraft = await prisma.workoutCompletion.findFirst({
      where: {
        userId: user.id,
        status: 'draft',
        isArchived: false,
        workout: { week: { programId } },
      },
    })
    if (activeDraft) {
      return NextResponse.json(
        { error: 'Complete or discard your in-progress workout before deleting this program.' },
        { status: 400 }
      )
    }

    // Soft delete: set deletedAt timestamp, also mark archived for backwards compat
    const deletedProgram = await prisma.program.update({
      where: { id: programId },
      data: {
        deletedAt: new Date(),
        isArchived: true,
        archivedAt: new Date(),
        isActive: false,
      },
    })

    return NextResponse.json({
      success: true,
      program: deletedProgram,
    })
  } catch (error) {
    logger.error({ error, context: 'program-delete' }, 'Failed to delete program')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
