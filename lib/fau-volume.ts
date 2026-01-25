/**
 * FAU (Functional Aesthetic Unit) Volume Calculation Utilities
 *
 * Calculates training volume per muscle group based on set counts.
 */

export type FAUVolume = {
  [fau: string]: number
}

export type Exercise = {
  prescribedSets: { id: string }[]
  exerciseDefinition: {
    primaryFAUs: string[]
    secondaryFAUs: string[]
  }
}

export type Workout = {
  exercises: Exercise[]
}

export type Week = {
  workouts: Workout[]
}

export type VolumeOptions = {
  includeSecondary: boolean
  secondaryWeight: number // 0.1 to 1.0
}

/**
 * Calculate FAU volume for a single week
 */
export function calculateWeekFAUVolume(
  week: Week,
  options: VolumeOptions = { includeSecondary: false, secondaryWeight: 0.5 }
): FAUVolume {
  const volume: FAUVolume = {}

  for (const workout of week.workouts) {
    for (const exercise of workout.exercises) {
      const setCount = exercise.prescribedSets.length

      // Count primary FAUs (full weight)
      for (const fau of exercise.exerciseDefinition.primaryFAUs) {
        volume[fau] = (volume[fau] || 0) + setCount
      }

      // Count secondary FAUs (weighted) if enabled
      if (options.includeSecondary) {
        for (const fau of exercise.exerciseDefinition.secondaryFAUs) {
          volume[fau] = (volume[fau] || 0) + setCount * options.secondaryWeight
        }
      }
    }
  }

  return volume
}

/**
 * Get FAU volumes sorted by volume (descending)
 * Filters out FAUs with 0 volume
 */
export function getSortedFAUVolumes(volume: FAUVolume): Array<{ fau: string; volume: number }> {
  return Object.entries(volume)
    .filter(([, vol]) => vol > 0)
    .map(([fau, vol]) => ({ fau, volume: vol }))
    .sort((a, b) => b.volume - a.volume)
}

/**
 * Display names for FAUs (matches ExerciseSearchModal)
 */
export const FAU_DISPLAY_NAMES: Record<string, string> = {
  'chest': 'Chest',
  'mid-back': 'Mid Back',
  'lower-back': 'Lower Back',
  'front-delts': 'Front Delts',
  'side-delts': 'Side Delts',
  'rear-delts': 'Rear Delts',
  'lats': 'Lats',
  'traps': 'Traps',
  'biceps': 'Biceps',
  'triceps': 'Triceps',
  'forearms': 'Forearms',
  'quads': 'Quads',
  'adductors': 'Adductors',
  'hamstrings': 'Hamstrings',
  'glutes': 'Glutes',
  'calves': 'Calves',
  'abs': 'Abs',
  'obliques': 'Obliques'
}
