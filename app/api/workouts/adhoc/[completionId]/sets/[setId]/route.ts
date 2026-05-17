import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, setLoggingLimiter } from '@/lib/rate-limit'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ completionId: string; setId: string }> }
) {
  try {
    const { completionId, setId } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(setLoggingLimiter, user.id)
    if (limited) return limited

    const loggedSet = await prisma.loggedSet.findUnique({
      where: { id: setId },
      include: { completion: true },
    })

    if (!loggedSet) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 })
    }
    if (loggedSet.completion.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    if (loggedSet.completionId !== completionId) {
      return NextResponse.json(
        { error: 'Set does not belong to this workout' },
        { status: 400 }
      )
    }
    if (!loggedSet.completion.isAdHoc) {
      return NextResponse.json(
        { error: 'Not an ad-hoc workout' },
        { status: 400 }
      )
    }
    if (loggedSet.completion.status !== 'draft') {
      return NextResponse.json(
        { error: 'Cannot delete sets from a completed workout' },
        { status: 400 }
      )
    }

    // Delete + decrement-renumber in a single tx. Two round trips instead of
    // 1 + N: one DELETE, one UPDATE that shifts every higher set down by one,
    // and a final findMany for the renumbered ids so the client can reconcile.
    // The (completionId, exerciseId, setNumber) unique constraint is safe under
    // the bulk decrement because we're moving values downward into the gap left
    // by the deleted set.
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
  } catch (err) {
    logger.error(
      { error: err, context: 'adhoc-sets-delete' },
      'Error deleting set from ad-hoc workout'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
