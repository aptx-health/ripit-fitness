import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import WorkoutDetail from '@/components/WorkoutDetail'
import { getLastExercisePerformance } from '@/lib/queries/exercise-history'

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string; workoutId: string }>
}) {
  const { id: programId, workoutId } = await params

  // Get authenticated user
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch workout with exercises, prescribed sets, and completion status
  const workout = await prisma.workout.findUnique({
    where: {
      id: workoutId,
    },
    include: {
      week: {
        include: {
          program: true,
        },
      },
      exercises: {
        orderBy: {
          order: 'asc',
        },
        include: {
          exerciseDefinition: true, // NEW: Include exercise definition
          prescribedSets: {
            orderBy: {
              setNumber: 'asc',
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
        include: {
          loggedSets: {
            orderBy: {
              setNumber: 'asc',
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

  // Only mark as completed if there's a completion with status 'completed' (not 'draft')
  const isCompleted = workout.completions.length > 0 && workout.completions[0].status === 'completed'

  // NEW: Fetch exercise history for each exercise
  const exerciseHistory = await Promise.all(
    workout.exercises.map(async (exercise) => ({
      exerciseId: exercise.id,
      history: await getLastExercisePerformance(
        exercise.exerciseDefinitionId,
        user.id,
        new Date() // Get history before now
      ),
    }))
  )

  // Convert to map for easy lookup in components
  const historyMap = Object.fromEntries(
    exerciseHistory.map((h) => [h.exerciseId, h.history])
  )

  return (
    <WorkoutDetail
      workout={workout}
      programId={programId}
      isCompleted={isCompleted}
      exerciseHistory={historyMap} // NEW: Pass history to component
    />
  )
}
