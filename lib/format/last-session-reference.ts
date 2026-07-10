/**
 * Formats a compact "last session" summary string for display above the
 * logger input area. Answers the gym-floor question "what did I do last time?"
 *
 * Examples:
 *   formatLastSessionSummary({ sets: [...] })
 *     -> "185 × 5 × 3 @ RPE 8"       (3 working sets, same reps/weight)
 *     -> "185 × 5,5,4"                (varied reps)
 *     -> "135–185 × 5 × 3"            (varied weight)
 */

import { formatRelativeTime } from './relativeTime'

export interface LastSessionSet {
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
  isWarmup: boolean
}

export interface LastSessionResult {
  /** Headline line, e.g. "185 × 5 × 3 @ RPE 8". null when there's nothing to show. */
  summary: string | null
  /** Human-readable relative time, e.g. "3 days ago". null when no working sets. */
  relative: string | null
  /** Reason code for an empty result; UI can map this to a tip line. */
  emptyReason: 'never-logged' | 'warmups-only' | null
}

/**
 * Build a one-line summary of the user's last completed session for an exercise.
 *
 * @param history Previous session payload, or null when none exists.
 */
export function formatLastSessionSummary(
  history: { completedAt: Date | string; sets: LastSessionSet[] } | null
): LastSessionResult {
  if (!history || history.sets.length === 0) {
    return { summary: null, relative: null, emptyReason: 'never-logged' }
  }

  const workingSets = history.sets.filter((s) => !s.isWarmup)
  if (workingSets.length === 0) {
    return { summary: null, relative: null, emptyReason: 'warmups-only' }
  }

  // Weight component: collapse to single value when uniform; otherwise show range.
  const unit = workingSets[0].weightUnit
  const weights = workingSets.map((s) => s.weight)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const weightStr =
    minW === maxW
      ? minW === 0
        ? 'BW'
        : `${formatNumber(minW)} ${unit}`
      : `${formatNumber(minW)}–${formatNumber(maxW)} ${unit}`

  // Reps component: collapse when uniform; show comma-separated otherwise.
  const reps = workingSets.map((s) => s.reps)
  const allSameReps = reps.every((r) => r === reps[0])
  const repsStr = allSameReps ? `${reps[0]}` : reps.join(',')

  // Sets component: only show " × N" when reps and weight are uniform — that's
  // when "N sets of W × R" is the natural reading. With varied reps we already
  // show each set in the comma list, so don't repeat the count.
  const setsStr = allSameReps && minW === maxW ? ` × ${workingSets.length}` : ''

  // Intensity tag: prefer RIR (more concrete for users), fall back to RPE.
  // Only show when uniform across working sets so we don't lie about variance.
  const intensityStr = pickIntensityTag(workingSets)

  const summary = `${weightStr} × ${repsStr}${setsStr}${intensityStr}`
  const relative = formatRelativeTime(history.completedAt)

  return { summary, relative, emptyReason: null }
}

function formatNumber(n: number): string {
  // Drop trailing ".0" but keep meaningful fractional weights (e.g. 102.5).
  return Number.isInteger(n) ? String(n) : String(n)
}

function pickIntensityTag(sets: LastSessionSet[]): string {
  const rirs = sets.map((s) => s.rir).filter((v): v is number => v != null)
  if (rirs.length === sets.length && rirs.every((v) => v === rirs[0])) {
    return ` @ RIR ${rirs[0]}`
  }
  const rpes = sets.map((s) => s.rpe).filter((v): v is number => v != null)
  if (rpes.length === sets.length && rpes.every((v) => v === rpes[0])) {
    return ` @ RPE ${rpes[0]}`
  }
  return ''
}
