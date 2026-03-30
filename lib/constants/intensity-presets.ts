export type IntensityPreset = {
  value: number
  label: string
  description: string
}

export const RIR_PRESETS: IntensityPreset[] = [
  { value: 0, label: '0', description: 'Max effort, failure reached. Use sparingly' },
  { value: 1, label: '1', description: '1 rep left in the tank' },
  { value: 2, label: '2', description: '2 reps left in the tank' },
  { value: 3, label: '3', description: '3 reps left in the tank' },
  { value: 4, label: '4', description: '4 reps left in the tank' },
  { value: 5, label: '5+', description: 'Warmup / Deload sets' },
]

export const RPE_PRESETS: IntensityPreset[] = [
  { value: 6.0, label: '6', description: 'Light effort, easy reps' },
  { value: 6.5, label: '6.5', description: 'Light to moderate effort' },
  { value: 7.0, label: '7', description: 'Moderate effort, could do several more' },
  { value: 7.5, label: '7.5', description: 'Moderate to challenging' },
  { value: 8.0, label: '8', description: 'Challenging, 2-3 reps left' },
  { value: 8.5, label: '8.5', description: 'Very challenging, 1-2 reps left' },
  { value: 9.0, label: '9', description: 'Very hard, 1 rep left' },
  { value: 9.5, label: '9.5', description: 'Near maximal, failure on next rep' },
  { value: 10, label: '10', description: 'Max effort, failure reached. Use sparingly' },
]

/**
 * Parse prescribed reps string to a numeric pre-fill value.
 * - "8-12" -> "12" (high end of range — hitting top signals time to increase weight)
 * - "15+" -> "15"
 * - "AMRAP" -> "" (user must enter)
 * - "10" -> "10"
 */
export function parseRepsFromPrescribed(reps: string | undefined): string {
  if (!reps) return ''

  const trimmed = reps.trim()

  // AMRAP — no pre-fill
  if (trimmed.toUpperCase() === 'AMRAP') return ''

  // Range like "8-12" — use high end
  const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/)
  if (rangeMatch) return rangeMatch[2]

  // Plus notation like "15+" — use the number
  const plusMatch = trimmed.match(/^(\d+)\+$/)
  if (plusMatch) return plusMatch[1]

  // Single number like "10"
  const singleMatch = trimmed.match(/^(\d+)$/)
  if (singleMatch) return singleMatch[1]

  return ''
}
