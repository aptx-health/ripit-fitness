import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
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
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { loggedSets } = body as { loggedSets: LoggedSetInput[] }

    // Enhanced input validation
    if (!loggedSets || !Array.isArray(loggedSets)) {
      console.error('Draft API: Invalid input - loggedSets must be an array')
      return NextResponse.json(
        { error: 'loggedSets array is required' },
        { status: 400 }
      )
    }

    // Log the operation type for safety monitoring
    if (loggedSets.length === 0) {
      console.warn(`⚠️ Draft API: Deletion-only sync for workout ${workoutId} - will remove all existing sets`)
    } else {
      console.log(`📝 Draft API: Sync ${loggedSets.length} sets for workout ${workoutId}`)
    }

    // Validate set data structure
    for (const set of loggedSets) {
      if (!set.exerciseId || typeof set.setNumber !== 'number' || typeof set.reps !== 'number') {
        console.error('Draft API: Invalid set data structure:', set)
        return NextResponse.json(
          { error: 'Invalid set data structure' },
          { status: 422 }
        )
      }
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
        exercises: true,
      },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    if (workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Validate that all exerciseIds exist in this workout
    const validExerciseIds = new Set(workout.exercises.map(e => e.id))
    const invalidSets = loggedSets.filter(set => !validExerciseIds.has(set.exerciseId))

    if (invalidSets.length > 0) {
      console.error('Draft API: Invalid exercise IDs detected:', invalidSets.map(s => s.exerciseId))
      return NextResponse.json(
        {
          error: 'Some exercises no longer exist in this workout. Please refresh and try again.',
          invalidExerciseIds: invalidSets.map(s => s.exerciseId)
        },
        { status: 422 }
      )
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
        { error: 'Workout already completed. Cannot save draft.' },
        { status: 400 }
      )
    }

    // Find or create draft completion
    const result = await prisma.$transaction(async (tx) => {
      // Look for existing draft and get current set count for safety logging
      const existingDraft = await tx.workoutCompletion.findFirst({
        where: {
          workoutId,
          userId: user.id,
          status: 'draft',
        },
        include: {
          loggedSets: true
        }
      })

      const currentSetCount = existingDraft?.loggedSets?.length || 0
      
      // Create or update draft completion
      const draftCompletion = existingDraft 
        ? await tx.workoutCompletion.update({
            where: { id: existingDraft.id },
            data: { completedAt: new Date() }
          })
        : await tx.workoutCompletion.create({
            data: {
              workoutId,
              userId: user.id,
              status: 'draft',
              completedAt: new Date(),
            },
          })

      // Remove existing logged sets for this draft (we'll replace them)
      const deletedSets = await tx.loggedSet.deleteMany({
        where: {
          completionId: draftCompletion.id,
        },
      })
      
      // Enhanced safety logging with data transformation details
      console.log(`Draft sync: Deleted ${deletedSets.count} existing sets, creating ${loggedSets.length} new sets`)
      
      if (loggedSets.length === 0 && deletedSets.count > 0) {
        console.log('🗑️ DELETION OPERATION: All sets deleted - this was a deletion-only sync')
      } else if (currentSetCount > loggedSets.length) {
        console.warn(`⚠️ PARTIAL DELETION: ${currentSetCount} → ${loggedSets.length} sets (${currentSetCount - loggedSets.length} sets removed)`)
      } else if (currentSetCount < loggedSets.length) {
        console.log(`📈 ADDITION: ${currentSetCount} → ${loggedSets.length} sets (${loggedSets.length - currentSetCount} sets added)`)
      } else {
        console.log(`📝 UPDATE: ${loggedSets.length} sets modified (same count)`)
      }

      // Create all logged sets for the draft
      if (loggedSets.length > 0) {
        await tx.loggedSet.createMany({
          data: loggedSets.map((set) => ({
            exerciseId: set.exerciseId,
            completionId: draftCompletion.id,
            userId: user.id,
            setNumber: set.setNumber,
            reps: set.reps,
            weight: set.weight,
            weightUnit: set.weightUnit,
            rpe: set.rpe,
            rir: set.rir,
          })),
        })
      }

      return draftCompletion
    })

    return NextResponse.json({
      success: true,
      draft: {
        id: result.id,
        lastUpdated: result.completedAt,
        status: result.status,
        setsCount: loggedSets.length,
      },
    })
  } catch (error) {
    console.error('Error saving workout draft:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
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

    // Find draft completion with logged sets
    const draftCompletion = await prisma.workoutCompletion.findFirst({
      where: {
        workoutId,
        userId: user.id,
        status: 'draft',
      },
      include: {
        loggedSets: {
          orderBy: [
            { exerciseId: 'asc' },
            { setNumber: 'asc' }
          ]
        }
      }
    })

    if (!draftCompletion) {
      return NextResponse.json({
        success: true,
        draft: null,
        message: 'No draft found'
      })
    }

    // Transform logged sets to match expected format
    const loggedSets = draftCompletion.loggedSets.map(set => ({
      exerciseId: set.exerciseId,
      setNumber: set.setNumber,
      reps: set.reps,
      weight: set.weight,
      weightUnit: set.weightUnit,
      rpe: set.rpe,
      rir: set.rir,
    }))

    return NextResponse.json({
      success: true,
      draft: {
        id: draftCompletion.id,
        lastUpdated: draftCompletion.completedAt,
        status: draftCompletion.status,
        loggedSets,
        setsCount: loggedSets.length,
      },
    })
  } catch (error) {
    console.error('Error retrieving workout draft:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}