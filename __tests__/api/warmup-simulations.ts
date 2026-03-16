import type { PrismaClient } from '@prisma/client'

export async function simulateDraftSave(
  prisma: PrismaClient,
  workoutId: string,
  userId: string,
  loggedSets: Array<{
    exerciseId: string
    setNumber: number
    reps: number
    weight: number
    weightUnit: string
    rpe: number | null
    rir: number | null
    isWarmup?: boolean
  }>
) {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { week: { include: { program: true } } },
  })

  if (!workout || workout.week.program.userId !== userId) {
    return { success: false, error: 'Unauthorized' }
  }

  await prisma.$transaction(async (tx) => {
    let draft = await tx.workoutCompletion.findFirst({
      where: { workoutId, userId, status: 'draft' },
    })

    if (!draft) {
      draft = await tx.workoutCompletion.create({
        data: { workoutId, userId, status: 'draft', completedAt: new Date() },
      })
    }

    await tx.loggedSet.deleteMany({ where: { completionId: draft.id } })

    if (loggedSets.length > 0) {
      await tx.loggedSet.createMany({
        data: loggedSets.map((set) => ({
          exerciseId: set.exerciseId,
          completionId: draft!.id,
          userId,
          setNumber: set.setNumber,
          reps: set.reps,
          weight: set.weight,
          weightUnit: set.weightUnit,
          rpe: set.rpe,
          rir: set.rir,
          isWarmup: set.isWarmup ?? false,
        })),
      })
    }
  })

  return { success: true }
}

export async function simulateDraftLoad(
  prisma: PrismaClient,
  workoutId: string,
  userId: string
) {
  const draft = await prisma.workoutCompletion.findFirst({
    where: { workoutId, userId, status: 'draft' },
    include: {
      loggedSets: { orderBy: { setNumber: 'asc' } },
    },
  })

  if (!draft) {
    return { success: false, sets: null }
  }

  return {
    success: true,
    sets: draft.loggedSets.map((s) => ({
      exerciseId: s.exerciseId,
      setNumber: s.setNumber,
      reps: s.reps,
      weight: s.weight,
      weightUnit: s.weightUnit,
      rpe: s.rpe,
      rir: s.rir,
      isWarmup: s.isWarmup,
    })),
  }
}

export async function simulateWorkoutDuplication(
  prisma: PrismaClient,
  workoutId: string,
  targetWeekId: string,
  userId: string
) {
  const original = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      week: { include: { program: true } },
      exercises: {
        include: { prescribedSets: { orderBy: { setNumber: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!original || original.week.program.userId !== userId) {
    return { success: false, workoutId: null }
  }

  const newWorkout = await prisma.$transaction(async (tx) => {
    const workout = await tx.workout.create({
      data: {
        name: `${original.name} (Copy)`,
        dayNumber: original.dayNumber + 100,
        weekId: targetWeekId,
        userId,
      },
    })

    for (const exercise of original.exercises) {
      const newExercise = await tx.exercise.create({
        data: {
          name: exercise.name,
          exerciseDefinitionId: exercise.exerciseDefinitionId,
          order: exercise.order,
          exerciseGroup: exercise.exerciseGroup,
          workoutId: workout.id,
          userId,
          notes: exercise.notes,
        },
      })

      if (exercise.prescribedSets.length > 0) {
        await tx.prescribedSet.createMany({
          data: exercise.prescribedSets.map((set) => ({
            setNumber: set.setNumber,
            reps: set.reps,
            weight: set.weight,
            rpe: set.rpe,
            rir: set.rir,
            isWarmup: set.isWarmup,
            exerciseId: newExercise.id,
            userId,
          })),
        })
      }
    }

    return workout
  })

  return { success: true, workoutId: newWorkout.id }
}
