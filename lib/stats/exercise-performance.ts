import { PrismaClient } from '@prisma/client'

/**
 * Calculate estimated 1 rep max using Epley formula
 * Formula: weight × (1 + reps/30)
 */
export function calculateE1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

/**
 * Find the best estimated 1RM across multiple sets
 */
export function getBestE1RM(sets: { weight: number; reps: number }[]): number {
  if (sets.length === 0) return 0
  return Math.max(...sets.map(s => calculateE1RM(s.weight, s.reps)))
}

/**
 * Normalize weight to lbs for consistent storage
 */
export function normalizeWeightToLbs(weight: number, unit: string): number {
  if (unit === 'kg') {
    return weight * 2.20462 // Convert kg to lbs
  }
  return weight // Already in lbs
}

/**
 * Calculate average pace in seconds per distance unit
 * @param duration - Duration in seconds
 * @param distance - Distance in miles or km
 * @returns Pace in seconds per unit (e.g., seconds per mile)
 */
export function calculateAvgPace(duration: number, distance: number): number | null {
  if (!distance || distance === 0) return null
  return Math.round(duration / distance)
}

/**
 * Record strength performance when a workout is completed
 * Creates ExercisePerformanceLog entries for each exercise in the workout
 */
export async function recordStrengthPerformance(
  prisma: PrismaClient,
  completionId: string,
  userId: string
): Promise<void> {
  // Fetch workout completion with all logged sets and exercise info
  const completion = await prisma.workoutCompletion.findUnique({
    where: { id: completionId },
    include: {
      exercises: {
        include: {
          exerciseDefinition: true,
          loggedSets: true,
        },
      },
    },
  })

  if (!completion) {
    throw new Error(`WorkoutCompletion ${completionId} not found`)
  }

  // Group logged sets by exercise
  for (const exercise of completion.exercises) {
    const sets = exercise.loggedSets

    if (sets.length === 0) continue

    // Normalize all weights to lbs
    const normalizedSets = sets.map(s => ({
      weight: normalizeWeightToLbs(s.weight, s.weightUnit),
      reps: s.reps,
      rpe: s.rpe,
    }))

    // Calculate metrics
    const totalSets = sets.length
    const totalReps = sets.reduce((sum, s) => sum + s.reps, 0)
    const totalVolumeLbs = normalizedSets.reduce(
      (sum, s) => sum + s.weight * s.reps,
      0
    )
    const maxWeightLbs = Math.max(...normalizedSets.map(s => s.weight))
    const estimated1RMLbs = getBestE1RM(normalizedSets)

    // Calculate average RPE if any sets have RPE
    const setsWithRPE = normalizedSets.filter(s => s.rpe !== null && s.rpe !== undefined)
    const avgRPE = setsWithRPE.length > 0
      ? setsWithRPE.reduce((sum, s) => sum + (s.rpe || 0), 0) / setsWithRPE.length
      : null

    // Create performance log entry
    await prisma.exercisePerformanceLog.create({
      data: {
        userId,
        completedAt: completion.completedAt,
        type: 'strength',
        exerciseDefinitionId: exercise.exerciseDefinitionId,
        exerciseName: exercise.name,
        totalSets,
        totalReps,
        totalVolumeLbs,
        maxWeightLbs,
        estimated1RMLbs,
        avgRPE,
        workoutCompletionId: completionId,
      },
    })
  }
}

/**
 * Record cardio performance when a cardio session is logged
 */
export async function recordCardioPerformance(
  prisma: PrismaClient,
  sessionId: string,
  userId: string
): Promise<void> {
  // Fetch cardio session
  const session = await prisma.loggedCardioSession.findUnique({
    where: { id: sessionId },
  })

  if (!session) {
    throw new Error(`LoggedCardioSession ${sessionId} not found`)
  }

  // Calculate pace if distance is available
  let avgPaceSeconds: number | null = null
  if (session.distance && session.duration) {
    avgPaceSeconds = calculateAvgPace(session.duration, session.distance)
  }

  // Create performance log entry
  await prisma.exercisePerformanceLog.create({
    data: {
      userId,
      completedAt: session.completedAt,
      type: 'cardio',
      equipment: session.equipment,
      exerciseName: session.name,
      distance: session.distance,
      distanceUnit: session.distance ? 'miles' : null, // TODO: Get from user preferences
      duration: session.duration,
      avgPaceSeconds,
      cardioSessionId: sessionId,
    },
  })
}

/**
 * Update strength performance when logged sets are edited
 * Deletes old entry and creates a new one with recalculated metrics
 */
export async function updateStrengthPerformance(
  prisma: PrismaClient,
  completionId: string,
  userId: string
): Promise<void> {
  // Delete existing performance log entries for this completion
  await prisma.exercisePerformanceLog.deleteMany({
    where: {
      workoutCompletionId: completionId,
      userId,
    },
  })

  // Recreate with updated data
  await recordStrengthPerformance(prisma, completionId, userId)
}

/**
 * Delete performance logs when a workout completion is deleted
 */
export async function deleteStrengthPerformance(
  prisma: PrismaClient,
  completionId: string,
  userId: string
): Promise<void> {
  await prisma.exercisePerformanceLog.deleteMany({
    where: {
      workoutCompletionId: completionId,
      userId,
    },
  })
}

/**
 * Delete performance logs when a cardio session is deleted
 */
export async function deleteCardioPerformance(
  prisma: PrismaClient,
  sessionId: string,
  userId: string
): Promise<void> {
  await prisma.exercisePerformanceLog.deleteMany({
    where: {
      cardioSessionId: sessionId,
      userId,
    },
  })
}
