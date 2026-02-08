import { PrismaClient } from '@prisma/client'

export const MAX_WORKOUTS_PER_WEEK = 10

export async function validateWorkoutLimit(
  prisma: PrismaClient | any, // TransactionClient
  weekId: string,
  additionalWorkouts: number = 1
): Promise<{ valid: boolean; currentCount: number; error?: string }> {
  const currentCount = await prisma.workout.count({ where: { weekId } })
  const newTotal = currentCount + additionalWorkouts

  if (newTotal > MAX_WORKOUTS_PER_WEEK) {
    return {
      valid: false,
      currentCount,
      error: `Cannot add ${additionalWorkouts} workout${additionalWorkouts > 1 ? 's' : ''}. Week already has ${currentCount} workout${currentCount !== 1 ? 's' : ''}. Maximum ${MAX_WORKOUTS_PER_WEEK} workouts per week allowed.`
    }
  }

  return { valid: true, currentCount }
}

export function validateBatchWorkoutLimit(
  workoutCount: number
): { valid: boolean; error?: string } {
  if (workoutCount > MAX_WORKOUTS_PER_WEEK) {
    return {
      valid: false,
      error: `Cannot import ${workoutCount} workouts. Maximum ${MAX_WORKOUTS_PER_WEEK} workouts per week allowed.`
    }
  }

  return { valid: true }
}
