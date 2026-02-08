import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

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

    // Check if session already has a logged record
    const existingLog = await prisma.loggedCardioSession.findFirst({
      where: {
        prescribedSessionId: sessionId,
        userId: user.id,
      },
    })

    if (existingLog) {
      return NextResponse.json(
        {
          error: `Session already has status: ${existingLog.status}. Clear it first to skip.`,
        },
        { status: 400 }
      )
    }

    // Create skipped log record with minimal data from prescribed session
    const loggedSession = await prisma.loggedCardioSession.create({
      data: {
        prescribedSessionId: sessionId,
        userId: user.id,
        status: 'skipped',
        completedAt: new Date(),
        name: session.name,
        equipment: session.equipment || 'other',
        duration: 0, // No duration for skipped sessions
      },
    })

    return NextResponse.json({
      success: true,
      loggedSession: {
        id: loggedSession.id,
        completedAt: loggedSession.completedAt,
        status: loggedSession.status,
      },
    })
  } catch (error) {
    console.error('Error skipping cardio session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
