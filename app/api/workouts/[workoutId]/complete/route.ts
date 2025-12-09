import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

type LoggedSetInput = {
  exerciseId: string
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  try {
    const { workoutId } = await params

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { loggedSets } = body as { loggedSets: LoggedSetInput[] }

    if (!loggedSets || !Array.isArray(loggedSets) || loggedSets.length === 0) {
      return NextResponse.json(
        { error: 'loggedSets array is required and must not be empty' },
        { status: 400 }
      )
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

    // Check if workout is already completed
    const existingCompletion = await prisma.workoutCompletion.findFirst({
      where: {
        workoutId,
        userId: user.id,
        status: 'completed',
      },
    })

    if (existingCompletion) {
      return NextResponse.json(
        { error: 'Workout already completed. Clear it first to re-log.' },
        { status: 400 }
      )
    }

    // Create completion and logged sets in a transaction
    const completion = await prisma.$transaction(async (tx) => {
      // Create workout completion
      const newCompletion = await tx.workoutCompletion.create({
        data: {
          workoutId,
          userId: user.id,
          status: 'completed',
          completedAt: new Date(),
        },
      })

      // Create all logged sets
      await tx.loggedSet.createMany({
        data: loggedSets.map((set) => ({
          exerciseId: set.exerciseId,
          completionId: newCompletion.id,
          setNumber: set.setNumber,
          reps: set.reps,
          weight: set.weight,
          weightUnit: set.weightUnit,
          rpe: set.rpe,
          rir: set.rir,
        })),
      })

      return newCompletion
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
    console.error('Error completing workout:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
