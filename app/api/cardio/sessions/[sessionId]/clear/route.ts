import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { deleteCardioPerformance } from '@/lib/stats/exercise-performance'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify session exists and user owns it
    const session = await prisma.prescribedCardioSession.findUnique({
      where: { id: sessionId },
      include: {
        week: {
          include: {
            cardioProgram: true,
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.week.cardioProgram.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get all logged sessions for this prescribed session
    const loggedSessions = await prisma.loggedCardioSession.findMany({
      where: {
        prescribedSessionId: sessionId,
        userId: user.id,
      },
      select: { id: true },
    })

    // Delete performance logs for each session
    await Promise.all(
      loggedSessions.map(session =>
        deleteCardioPerformance(prisma, session.id, user.id)
      )
    )

    // Delete all logged sessions for this prescribed session
    const deleted = await prisma.loggedCardioSession.deleteMany({
      where: {
        prescribedSessionId: sessionId,
        userId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      deletedCount: deleted.count,
    })
  } catch (error) {
    console.error('Error clearing cardio session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
