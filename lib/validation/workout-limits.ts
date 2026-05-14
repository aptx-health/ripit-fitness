import type { Prisma, PrismaClient } from '@prisma/client'
import { pluralize } from '@/lib/format/pluralize'

export const MAX_WORKOUTS_PER_WEEK = 10

export async function validateWorkoutLimit(
  prisma: PrismaClient | Prisma.TransactionClient,
  weekId: string,
  additionalWorkouts: number = 1
): Promise<{ valid: boolean; currentCount: number; error?: string }> {
  const currentCount = await prisma.workout.count({ where: { weekId } })
  const newTotal = currentCount + additionalWorkouts

  if (newTotal > MAX_WORKOUTS_PER_WEEK) {
    return {
      valid: false,
      currentCount,
      error: `Cannot add ${pluralize(additionalWorkouts, 'workout')}. Week already has ${pluralize(currentCount, 'workout')}. Maximum ${MAX_WORKOUTS_PER_WEEK} workouts per week allowed.`
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
