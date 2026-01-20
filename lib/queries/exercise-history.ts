// Exercise History Queries

import { prisma } from '@/lib/db';

export interface ExerciseHistorySet {
  setNumber: number;
  reps: number;
  weight: number;
  weightUnit: string;
  rpe: number | null;
  rir: number | null;
}

export interface ExerciseHistory {
  completedAt: Date;
  workoutName: string;
  sets: ExerciseHistorySet[];
}

/**
 * Get last performance for multiple exercise definitions in a single query
 * Much more efficient than calling getLastExercisePerformance multiple times
 *
 * @param exerciseDefinitionIds - Array of exercise definition IDs to look up
 * @param userId - The user ID to filter by
 * @param beforeDate - Optional date to get history before
 * @returns Map of exerciseDefinitionId to ExerciseHistory
 */
export async function getBatchExercisePerformance(
  exerciseDefinitionIds: string[],
  userId: string,
  beforeDate?: Date
): Promise<Map<string, ExerciseHistory>> {
  if (exerciseDefinitionIds.length === 0) {
    return new Map();
  }

  // Fetch recent completed workouts that contain any of these exercises
  // Limit to 50 most recent to avoid fetching entire workout history
  const completions = await prisma.workoutCompletion.findMany({
    where: {
      userId,
      status: 'completed',
      completedAt: beforeDate ? { lt: beforeDate } : undefined,
      loggedSets: {
        some: {
          exercise: {
            exerciseDefinitionId: { in: exerciseDefinitionIds }
          }
        }
      }
    },
    orderBy: { completedAt: 'desc' },
    take: 50, // Limit to recent workouts - sufficient for finding last performance
    select: {
      completedAt: true,
      workout: { select: { name: true } },
      loggedSets: {
        where: {
          exercise: {
            exerciseDefinitionId: { in: exerciseDefinitionIds }
          }
        },
        select: {
          setNumber: true,
          reps: true,
          weight: true,
          weightUnit: true,
          rpe: true,
          rir: true,
          exercise: {
            select: { exerciseDefinitionId: true }
          }
        },
        orderBy: { setNumber: 'asc' }
      }
    }
  });

  // Build a map of exerciseDefinitionId -> most recent history
  const historyMap = new Map<string, ExerciseHistory>();

  for (const completion of completions) {
    for (const set of completion.loggedSets) {
      const defId = set.exercise.exerciseDefinitionId;

      // Only set if this is the first time we've seen this exercise (most recent)
      if (!historyMap.has(defId)) {
        // Find all sets for this exercise in this completion
        const exerciseSets = completion.loggedSets
          .filter(s => s.exercise.exerciseDefinitionId === defId)
          .map(s => ({
            setNumber: s.setNumber,
            reps: s.reps,
            weight: s.weight,
            weightUnit: s.weightUnit,
            rpe: s.rpe,
            rir: s.rir
          }));

        historyMap.set(defId, {
          completedAt: completion.completedAt,
          workoutName: completion.workout.name,
          sets: exerciseSets
        });
      }
    }
  }

  return historyMap;
}

/**
 * Get last performance for an exercise definition
 * Returns most recent completed workout's sets for this exercise
 *
 * @param exerciseDefinitionId - The exercise definition ID to look up
 * @param userId - The user ID to filter by
 * @param beforeDate - Optional date to get history before (useful for "last time" before current workout)
 * @returns Exercise history or null if no previous performance found
 */
export async function getLastExercisePerformance(
  exerciseDefinitionId: string,
  userId: string,
  beforeDate?: Date
): Promise<ExerciseHistory | null> {
  // Find most recent completion with this exercise
  const lastCompletion = await prisma.workoutCompletion.findFirst({
    where: {
      userId,
      status: 'completed',
      completedAt: beforeDate ? { lt: beforeDate } : undefined,
      loggedSets: {
        some: {
          exercise: { exerciseDefinitionId }
        }
      }
    },
    orderBy: { completedAt: 'desc' },
    include: {
      workout: { select: { name: true } },
      loggedSets: {
        where: {
          exercise: { exerciseDefinitionId }
        },
        orderBy: { setNumber: 'asc' }
      }
    }
  });

  if (!lastCompletion || lastCompletion.loggedSets.length === 0) {
    return null;
  }

  return {
    completedAt: lastCompletion.completedAt,
    workoutName: lastCompletion.workout.name,
    sets: lastCompletion.loggedSets.map(set => ({
      setNumber: set.setNumber,
      reps: set.reps,
      weight: set.weight,
      weightUnit: set.weightUnit,
      rpe: set.rpe,
      rir: set.rir
    }))
  };
}
