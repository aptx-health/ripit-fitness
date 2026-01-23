import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import WorkoutDetail from '@/components/WorkoutDetail'
import { getBatchExercisePerformance } from '@/lib/queries/exercise-history'

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string; workoutId: string }>
}) {
  const { id: programId, workoutId } = await params

  // Get authenticated user
  const { user } = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch workout basic info and completion
  const workout = await prisma.workout.findUnique({
    where: {
      id: workoutId,
    },
    select: {
      id: true,
      name: true,
      dayNumber: true,
      week: {
        select: {
          weekNumber: true,
          program: {
            select: {
              userId: true, // Only for auth check
            },
          },
        },
      },
      completions: {
        where: {
          userId: user.id,
        },
        orderBy: {
          completedAt: 'desc',
        },
        take: 1,
        select: {
          id: true,
          completedAt: true,
          status: true,
          loggedSets: {
            orderBy: {
              setNumber: 'asc',
            },
            select: {
              id: true,
              setNumber: true,
              reps: true,
              weight: true,
              weightUnit: true,
              rpe: true,
              rir: true,
              exerciseId: true,
            },
          },
        },
      },
    },
  })

  if (!workout) {
    notFound()
  }

  // Verify user owns this program
  if (workout.week.program.userId !== user.id) {
    notFound()
  }

  // Get completion ID for one-off exercise lookup
  const completionId = workout.completions[0]?.id

  // Build where clause - only include one-offs if there's an active completion
  const whereConditions: Array<{ workoutId?: string; workoutCompletionId?: string; isOneOff?: boolean }> = [
    { workoutId: workoutId }, // Program exercises
  ]

  if (completionId) {
    // Only add one-off condition if we have a completion
    whereConditions.push({
      workoutCompletionId: completionId,
      isOneOff: true
    })
  }

  // Fetch all exercises (program + one-offs) in a single efficient query
  const exercises = await prisma.exercise.findMany({
    where: {
      OR: whereConditions,
      userId: user.id,
    },
    orderBy: {
      order: 'asc',
    },
    select: {
      id: true,
      name: true,
      order: true,
      exerciseGroup: true,
      notes: true,
      isOneOff: true,
      exerciseDefinitionId: true,
      prescribedSets: {
        orderBy: {
          setNumber: 'asc',
        },
        select: {
          id: true,
          setNumber: true,
          reps: true,
          weight: true,
          rpe: true,
          rir: true,
        },
      },
    },
  })

  // Fetch exercise history for all exercises in a single batch query
  const exerciseDefinitionIds = exercises.map(ex => ex.exerciseDefinitionId)
  const historyByDefinition = await getBatchExercisePerformance(
    exerciseDefinitionIds,
    user.id,
    new Date() // Get history before now
  )

  // Convert to map by exercise ID (not definition ID) for component lookup
  const historyMap = Object.fromEntries(
    exercises.map((exercise) => [
      exercise.id,
      historyByDefinition.get(exercise.exerciseDefinitionId) || null
    ])
  )

  // Merge exercises into workout structure for component
  const workoutWithExercises = {
    ...workout,
    exercises,
  }

  return (
    <WorkoutDetail
      workout={workoutWithExercises}
      programId={programId}
      exerciseHistory={historyMap}
    />
  )
}
