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

    // Delete + renumber remaining sets for this exercise to stay sequential.
    const result = await prisma.$transaction(async (tx) => {
      await tx.loggedSet.delete({ where: { id: setId } })

      const remainingSets = await tx.loggedSet.findMany({
        where: {
          completionId: loggedSet.completionId,
          exerciseId: loggedSet.exerciseId,
        },
        orderBy: { setNumber: 'asc' },
      })

      const renumbered: Array<{ id: string; setNumber: number }> = []
      for (let i = 0; i < remainingSets.length; i++) {
        const expected = i + 1
        if (remainingSets[i].setNumber !== expected) {
          await tx.loggedSet.update({
            where: { id: remainingSets[i].id },
            data: { setNumber: expected },
          })
          renumbered.push({ id: remainingSets[i].id, setNumber: expected })
        }
      }

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
