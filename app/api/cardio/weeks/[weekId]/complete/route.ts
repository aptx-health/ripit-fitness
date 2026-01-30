import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { weekId } = await params

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify week exists and user owns it
    const week = await prisma.cardioWeek.findUnique({
      where: { id: weekId },
      include: {
        cardioProgram: true,
        sessions: {
          include: {
            loggedSessions: {
              where: {
                userId: user.id,
              },
            },
          },
        },
      },
    })

    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 })
    }

    if (week.cardioProgram.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Find all sessions without logged records
    const unloggedSessions = week.sessions.filter(
      (session) => session.loggedSessions.length === 0
    )

    if (unloggedSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All sessions already have status',
        skipped: 0,
      })
    }

    // Mark all unlogged sessions as skipped
    const skippedLogs = await prisma.loggedCardioSession.createMany({
      data: unloggedSessions.map((session) => ({
        prescribedSessionId: session.id,
        userId: user.id,
        status: 'skipped',
        completedAt: new Date(),
        name: session.name,
        equipment: session.equipment || 'other',
        duration: 0,
      })),
    })

    return NextResponse.json({
      success: true,
      message: `Week completed. ${skippedLogs.count} session(s) marked as skipped.`,
      skipped: skippedLogs.count,
    })
  } catch (error) {
    console.error('Error completing cardio week:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
