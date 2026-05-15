import type { PrismaClient } from '@prisma/client'
import { getBatchExercisePerformance } from '@/lib/queries/exercise-history'

export type RollupExercise = {
  exerciseDefinitionId: string
  name: string
  workingSets: number
  reps: number
  volumeLbs: number
  isBodyweight: boolean
  topSet: { weight: number; reps: number } | null
  vsLastTime: {
    previousCompletedAt: Date
    previousVolumeLbs: number
    previousTopSet: { weight: number; reps: number } | null
  } | null
}

export type WorkoutRollup = {
  completionId: string
  isMinimal: boolean
  durationSeconds: number | null
  exerciseCount: number
  workingSetCount: number
  totalReps: number
  totalVolumeLbs: number
  hasBodyweightOnlyExercises: boolean
  lifetimeWorkoutCount: number
  workoutsLast7Days: number
  exercises: RollupExercise[]
  workoutId: string | null
  workoutName: string | null
  isCommunitySourced: boolean
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function computeWorkoutRollup(
  prisma: PrismaClient,
  completionId: string,
  userId: string
): Promise<WorkoutRollup | null> {
  const completion = await prisma.workoutCompletion.findFirst({
    where: { id: completionId, userId, status: 'completed', isArchived: false },
    select: {
      id: true,
      completedAt: true,
      startedAt: true,
      workoutId: true,
      name: true,
      workout: {
        select: {
          name: true,
          week: {
            select: {
              program: { select: { sourceCommunityProgramId: true } },
            },
          },
        },
      },
    },
  })

  if (!completion) return null

  const workoutName = completion.workout?.name ?? completion.name ?? null
  const isCommunitySourced = Boolean(
    completion.workout?.week?.program?.sourceCommunityProgramId
  )

  const loggedSets = await prisma.loggedSet.findMany({
    where: { completionId },
    select: {
      reps: true,
      weight: true,
      isWarmup: true,
      exercise: {
        select: {
          id: true,
          name: true,
          exerciseDefinitionId: true,
        },
      },
    },
  })

  const workingSets = loggedSets.filter((s) => !s.isWarmup)

  const [lifetimeWorkoutCount, workoutsLast7Days] = await Promise.all([
    prisma.workoutCompletion.count({
      where: { userId, status: 'completed', isArchived: false },
    }),
    prisma.workoutCompletion.count({
      where: {
        userId,
        status: 'completed',
        isArchived: false,
        completedAt: { gte: new Date(Date.now() - SEVEN_DAYS_MS) },
      },
    }),
  ])

  const durationSeconds =
    completion.startedAt && completion.completedAt
      ? Math.max(
          0,
          Math.round(
            (completion.completedAt.getTime() - completion.startedAt.getTime()) / 1000
          )
        )
      : null

  if (workingSets.length === 0) {
    return {
      completionId: completion.id,
      isMinimal: true,
      durationSeconds,
      exerciseCount: 0,
      workingSetCount: 0,
      totalReps: 0,
      totalVolumeLbs: 0,
      hasBodyweightOnlyExercises: false,
      lifetimeWorkoutCount,
      workoutsLast7Days,
      exercises: [],
      workoutId: completion.workoutId,
      workoutName,
      isCommunitySourced,
    }
  }

  type Agg = {
    exerciseDefinitionId: string
    name: string
    workingSets: number
    reps: number
    volumeLbs: number
    maxWeight: number
    topSet: { weight: number; reps: number } | null
  }
  const byDef = new Map<string, Agg>()

  for (const set of workingSets) {
    const defId = set.exercise.exerciseDefinitionId
    const existing = byDef.get(defId) ?? {
      exerciseDefinitionId: defId,
      name: set.exercise.name,
      workingSets: 0,
      reps: 0,
      volumeLbs: 0,
      maxWeight: -1,
      topSet: null,
    }
    existing.workingSets += 1
    existing.reps += set.reps
    existing.volumeLbs += set.weight * set.reps
    if (set.weight > existing.maxWeight) {
      existing.maxWeight = set.weight
      existing.topSet = { weight: set.weight, reps: set.reps }
    }
    byDef.set(defId, existing)
  }

  const defIds = Array.from(byDef.keys())
  const previousMap = await getBatchExercisePerformance(
    defIds,
    userId,
    completion.completedAt
  )

  const exercises: RollupExercise[] = []
  let totalReps = 0
  let totalVolumeLbs = 0
  let hasBodyweightOnly = false

  for (const agg of byDef.values()) {
    const isBodyweight = agg.maxWeight <= 0
    if (isBodyweight) hasBodyweightOnly = true

    const previous = previousMap.get(agg.exerciseDefinitionId)
    let vsLastTime: RollupExercise['vsLastTime'] = null
    if (previous) {
      const prevWorking = previous.sets.filter((s) => !s.isWarmup)
      const prevVolume = prevWorking.reduce(
        (sum, s) => sum + s.weight * s.reps,
        0
      )
      let prevTop: { weight: number; reps: number } | null = null
      for (const s of prevWorking) {
        if (!prevTop || s.weight > prevTop.weight) {
          prevTop = { weight: s.weight, reps: s.reps }
        }
      }
      vsLastTime = {
        previousCompletedAt: previous.completedAt,
        previousVolumeLbs: prevVolume,
        previousTopSet: prevTop,
      }
    }

    exercises.push({
      exerciseDefinitionId: agg.exerciseDefinitionId,
      name: agg.name,
      workingSets: agg.workingSets,
      reps: agg.reps,
      volumeLbs: isBodyweight ? 0 : agg.volumeLbs,
      isBodyweight,
      topSet: agg.topSet,
      vsLastTime,
    })

    totalReps += agg.reps
    if (!isBodyweight) totalVolumeLbs += agg.volumeLbs
  }

  return {
    completionId: completion.id,
    isMinimal: false,
    durationSeconds,
    exerciseCount: byDef.size,
    workingSetCount: workingSets.length,
    totalReps,
    totalVolumeLbs,
    hasBodyweightOnlyExercises: hasBodyweightOnly,
    lifetimeWorkoutCount,
    workoutsLast7Days,
    exercises,
    workoutId: completion.workoutId,
    workoutName,
    isCommunitySourced,
  }
}
