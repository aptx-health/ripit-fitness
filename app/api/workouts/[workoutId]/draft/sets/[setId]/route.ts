import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, setLoggingLimiter } from '@/lib/rate-limit'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ workoutId: string; setId: string }> }
) {
  try {
    const { workoutId, setId } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(setLoggingLimiter, user.id)
    if (limited) return limited

    // Find the set and verify ownership through the completion -> workout -> program chain
    const loggedSet = await prisma.loggedSet.findUnique({
      where: { id: setId },
      include: {
        completion: {
          include: {
            workout: {
              include: { week: { include: { program: { select: { userId: true } } } } },
            },
          },
        },
      },
    })

    if (!loggedSet) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 })
    }

    // This is the programmed-workout deletion path; ad-hoc sets are deleted
    // via /api/workouts/adhoc/[completionId]/sets/[setId].
    if (!loggedSet.completion.workout) {
      return NextResponse.json({ error: 'Set does not belong to this workout' }, { status: 400 })
    }

    if (loggedSet.completion.workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (loggedSet.completion.workoutId !== workoutId) {
      return NextResponse.json({ error: 'Set does not belong to this workout' }, { status: 400 })
    }

    if (loggedSet.completion.status !== 'draft') {
      return NextResponse.json({ error: 'Cannot delete sets from a completed workout' }, { status: 400 })
    }

    // Bulk decrement-renumber: two round trips instead of 1 + N. The
    // (completionId, exerciseId, setNumber) unique constraint is safe under
    // this downward shift because we're filling the gap left by the deleted
    // set.
    const deletedSetNumber = loggedSet.setNumber
    const result = await prisma.$transaction(async (tx) => {
      await tx.loggedSet.delete({ where: { id: setId } })

      await tx.$executeRaw`
        UPDATE "LoggedSet"
        SET "setNumber" = "setNumber" - 1
        WHERE "completionId" = ${loggedSet.completionId}
          AND "exerciseId" = ${loggedSet.exerciseId}
          AND "setNumber" > ${deletedSetNumber}
      `

      const renumbered = await tx.loggedSet.findMany({
        where: {
          completionId: loggedSet.completionId,
          exerciseId: loggedSet.exerciseId,
          setNumber: { gte: deletedSetNumber },
        },
        select: { id: true, setNumber: true },
        orderBy: { setNumber: 'asc' },
      })

      return { renumbered }
    })

    return NextResponse.json({ success: true, renumbered: result.renumbered })
  } catch (error) {
    logger.error({ error, context: 'draft-sets-delete' }, 'Error deleting draft set')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
