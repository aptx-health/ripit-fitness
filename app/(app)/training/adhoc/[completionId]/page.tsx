import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import AdHocLoggerView, { type AdHocExercise } from '@/components/adhoc/AdHocLoggerView'
import { RestoringWorkoutSpinner } from '@/components/ui/RestoringWorkoutSpinner'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

type Props = {
  params: Promise<{ completionId: string }>
  searchParams: Promise<{ new?: string }>
}

/**
 * Outer page returns synchronously so the HTML shell + spinner stream to
 * the browser immediately on cold load. The data fetch happens inside the
 * Suspense boundary so React streams the logger in once Prisma returns.
 * `?new=1` (set by QuickActionSheet when starting a freestyle) flips the
 * fallback copy from "Restoring…" to "Loading…".
 */
export default async function AdHocLoggerPage({ params, searchParams }: Props) {
  const [{ completionId }, { new: newParam }] = await Promise.all([params, searchParams])
  const isNew = newParam === '1'
  return (
    <Suspense
      fallback={
        <RestoringWorkoutSpinner
          label={isNew ? 'Loading workout…' : 'Restoring workout…'}
        />
      }
    >
      <AdHocLoggerLoader completionId={completionId} />
    </Suspense>
  )
}

async function AdHocLoggerLoader({ completionId }: { completionId: string }) {
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  const completion = await prisma.workoutCompletion.findUnique({
    where: { id: completionId },
    select: {
      id: true,
      userId: true,
      status: true,
      isAdHoc: true,
      name: true,
      startedAt: true,
      exercises: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          notes: true,
          order: true,
          exerciseDefinition: {
            select: {
              primaryFAUs: true,
              secondaryFAUs: true,
              equipment: true,
              instructions: true,
              imageUrls: true,
            },
          },
        },
      },
      loggedSets: {
        orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }],
        select: {
          id: true,
          exerciseId: true,
          setNumber: true,
          reps: true,
          weight: true,
          weightUnit: true,
          rpe: true,
          rir: true,
          isWarmup: true,
        },
      },
    },
  })

  if (!completion || completion.userId !== user.id || !completion.isAdHoc) {
    redirect('/training')
  }

  if (completion.status !== 'draft') {
    redirect('/training')
  }

  const exercises: AdHocExercise[] = completion.exercises.map((e) => ({
    id: e.id,
    name: e.name,
    notes: e.notes,
    exerciseDefinition: {
      primaryFAUs: e.exerciseDefinition.primaryFAUs,
      secondaryFAUs: e.exerciseDefinition.secondaryFAUs,
      equipment: e.exerciseDefinition.equipment,
      instructions: e.exerciseDefinition.instructions ?? undefined,
      imageUrls: e.exerciseDefinition.imageUrls,
    },
  }))

  return (
    <AdHocLoggerView
      completionId={completion.id}
      completionName={completion.name ?? 'Open Workout'}
      startedAt={completion.startedAt?.toISOString() ?? null}
      initialExercises={exercises}
      initialLoggedSets={completion.loggedSets}
    />
  )
}
