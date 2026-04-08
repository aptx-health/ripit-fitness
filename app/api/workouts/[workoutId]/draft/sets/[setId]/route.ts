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

    if (loggedSet.completion.workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (loggedSet.completion.workoutId !== workoutId) {
      return NextResponse.json({ error: 'Set does not belong to this workout' }, { status: 400 })
    }

    if (loggedSet.completion.status !== 'draft') {
      return NextResponse.json({ error: 'Cannot delete sets from a completed workout' }, { status: 400 })
    }

    // Delete the set and renumber remaining sets for the same exercise
    const result = await prisma.$transaction(async (tx) => {
      await tx.loggedSet.delete({ where: { id: setId } })

      // Renumber remaining sets for this exercise to keep sequential
      const remainingSets = await tx.loggedSet.findMany({
        where: {
          completionId: loggedSet.completionId,
          exerciseId: loggedSet.exerciseId,
        },
        orderBy: { setNumber: 'asc' },
      })

      const renumbered: Array<{ id: string; setNumber: number }> = []

      for (let i = 0; i < remainingSets.length; i++) {
        const expectedSetNumber = i + 1
        if (remainingSets[i].setNumber !== expectedSetNumber) {
          await tx.loggedSet.update({
            where: { id: remainingSets[i].id },
            data: { setNumber: expectedSetNumber },
          })
          renumbered.push({ id: remainingSets[i].id, setNumber: expectedSetNumber })
        }
      }

      return { renumbered }
    })

    return NextResponse.json({ success: true, renumbered: result.renumbered })
  } catch (error) {
    logger.error({ error, context: 'draft-sets-delete' }, 'Error deleting draft set')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
