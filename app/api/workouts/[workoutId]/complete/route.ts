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

    // Verify workout exists and check existing completion in parallel
    const [workout, existingCompletion] = await Promise.all([
      prisma.workout.findUnique({
        where: { id: workoutId },
        select: {
          id: true,
          week: {
            select: {
              program: {
                select: { userId: true }
              }
            }
          }
        }
      }),
      prisma.workoutCompletion.findFirst({
        where: {
          workoutId,
          userId: user.id,
          status: 'completed',
        },
      })
    ])

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    if (workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (existingCompletion) {
      return NextResponse.json(
        { error: 'Workout already completed. Clear it first to re-log.' },
        { status: 400 }
      )
    }

    // Create or update completion and logged sets in a transaction
    const completion = await prisma.$transaction(async (tx) => {
      // Check for existing draft completion
      const existingDraft = await tx.workoutCompletion.findFirst({
        where: {
          workoutId,
          userId: user.id,
          status: 'draft',
        },
      })

      // Create or update workout completion
      const completionRecord = existingDraft
        ? await tx.workoutCompletion.update({
            where: { id: existingDraft.id },
            data: {
              status: 'completed',
              completedAt: new Date(),
            },
          })
        : await tx.workoutCompletion.create({
            data: {
              workoutId,
              userId: user.id,
              status: 'completed',
              completedAt: new Date(),
            },
          })

      // Delete existing logged sets (if updating from draft)
      if (existingDraft) {
        await tx.loggedSet.deleteMany({
          where: {
            completionId: completionRecord.id,
          },
        })
      }

      // Create all logged sets
      await tx.loggedSet.createMany({
        data: loggedSets.map((set) => ({
          exerciseId: set.exerciseId,
          completionId: completionRecord.id,
          userId: user.id,
          setNumber: set.setNumber,
          reps: set.reps,
          weight: set.weight,
          weightUnit: set.weightUnit,
          rpe: set.rpe,
          rir: set.rir,
        })),
      })

      return completionRecord
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
