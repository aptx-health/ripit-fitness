/**
 * Build a smart-suggested name for a SavedWorkout from the top exercises in
 * the source completion. Falls back to "Saved Workout" when the list is empty.
 *
 * Examples (topN=3, maxLength=60):
 *   ["Bench"] -> "Bench"
 *   ["Bench", "Row", "OHP"] -> "Bench · Row · OHP"
 *   ["Bench", "Row", "OHP", "Curl", "Pulldown"] -> "Bench · Row · OHP + 2 more"
 */
export function buildSuggestedSavedWorkoutName(
  exerciseNames: string[],
  topN = 3,
  maxLength = 60
): string {
  const head = exerciseNames.slice(0, topN)
  const remaining = Math.max(0, exerciseNames.length - head.length)
  let label = head.join(' · ')
  if (remaining > 0) label = `${label} + ${remaining} more`
  if (label.length > maxLength) {
    label = `${label.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
  }
  return label || 'Saved Workout'
}
