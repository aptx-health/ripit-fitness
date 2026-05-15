import { pluralize } from './pluralize'

/**
 * Minimal shape needed to format a prescribed set summary. Mirrors the fields
 * on `PrescribedSet` that contribute to the displayed string.
 */
export type PrescribedSummarySet = {
  reps: string
  weight: string | null
  rpe: number | null
  rir: number | null
}

export type PrescribedSummaryOptions = {
  /**
   * When false, RPE/RIR are omitted. Defaults to true.
   * Callers should pass the user's intensity preference here so the banner
   * matches the rest of the logger UI.
   */
  showIntensity?: boolean
}

/**
 * Format the reps portion of a prescribed summary.
 *
 * - "5"     -> "5 reps"
 * - "1"     -> "1 rep"
 * - "8-12"  -> "8-12 reps"
 * - "15+"   -> "15+ reps"
 * - "AMRAP" -> "AMRAP"   (verbatim, no trailing word)
 * - ""      -> ""        (caller treats this as "no summary")
 */
function formatReps(reps: string): string {
  const trimmed = reps.trim()
  if (!trimmed) return ''
  if (trimmed.toUpperCase() === 'AMRAP') return 'AMRAP'
  if (/^\d+$/.test(trimmed)) {
    return pluralize(parseInt(trimmed, 10), 'rep')
  }
  return `${trimmed} reps`
}

function formatIntensity(set: PrescribedSummarySet): string | null {
  if (set.rir !== null && set.rir !== undefined) return `RIR ${set.rir}`
  if (set.rpe !== null && set.rpe !== undefined) return `RPE ${set.rpe}`
  return null
}

/**
 * Produce a one-line summary of a prescribed set for the persistent
 * `<DrawerContextBanner>` (and any other read-only surface).
 *
 * Output shape (per spec in issue #726):
 *
 *   Reps + weight + intensity:     "5 reps @ 135 lb, RIR 2"
 *   Reps + weight, no intensity:   "5 reps @ 135 lb"
 *   Reps + intensity, no weight:   "5 reps @ RIR 2"
 *   Reps only:                     "5 reps"
 *   Freeform weight (verbatim):    "5 reps @ 65%"  /  "5 reps @ RPE 8"
 *
 * Returns an empty string if `reps` is empty — callers should treat that as
 * "no prescription available" and omit the line entirely.
 */
export function formatPrescribedSummary(
  set: PrescribedSummarySet,
  options: PrescribedSummaryOptions = {}
): string {
  const { showIntensity = true } = options
  const repsLabel = formatReps(set.reps)
  if (!repsLabel) return ''

  const intensity = showIntensity ? formatIntensity(set) : null
  const weight = set.weight && set.weight.trim() ? set.weight.trim() : null

  if (weight && intensity) return `${repsLabel} @ ${weight}, ${intensity}`
  if (weight) return `${repsLabel} @ ${weight}`
  if (intensity) return `${repsLabel} @ ${intensity}`
  return repsLabel
}
