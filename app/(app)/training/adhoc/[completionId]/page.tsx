import { redirect } from 'next/navigation'
import AdHocLoggerView, { type AdHocExercise } from '@/components/adhoc/AdHocLoggerView'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

type Props = {
  params: Promise<{ completionId: string }>
}

export default async function AdHocLoggerPage({ params }: Props) {
  const { completionId } = await params
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

  // Group logged sets by exerciseId for fast lookups in the client.
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
