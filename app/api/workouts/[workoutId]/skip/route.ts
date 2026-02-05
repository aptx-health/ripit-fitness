import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  try {
    const { workoutId } = await params

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify workout exists and user owns it
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        week: {
          include: {
            program: true,
          },
        },
      },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    if (workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if workout already has a non-archived completion record
    const existingCompletion = await prisma.workoutCompletion.findFirst({
      where: {
        workoutId,
        userId: user.id,
        isArchived: false,
      },
    })

    if (existingCompletion) {
      return NextResponse.json(
        {
          error: `Workout already has status: ${existingCompletion.status}. Clear it first to skip.`,
        },
        { status: 400 }
      )
    }

    // Create skipped completion record (no logged sets)
    const completion = await prisma.workoutCompletion.create({
      data: {
        workoutId,
        userId: user.id,
        status: 'skipped',
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      completion: {
        id: completion.id,
        completedAt: completion.completedAt,
        status: completion.status,
      },
    })
  } catch (error) {
    console.error('Error skipping workout:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
