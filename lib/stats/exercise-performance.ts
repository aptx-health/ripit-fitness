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
