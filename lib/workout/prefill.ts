/**
 * Prefill-source selection for the workout logging form.
 *
 * When an exercise is shown in the logger we pre-populate the reps/weight/
 * intensity inputs so the user rarely has to type from scratch. The value to
 * carry forward is chosen by priority:
 *
 *   1. The last working set already completed *this session* for the exercise
 *      (so swiping away and back — e.g. during supersets — keeps your numbers).
 *   2. The last working set from the *previous workout* (history).
 *
 * Only when there's neither do we fall back to the prescribed plan / zeros.
 */

import { parseRepsFromPrescribed } from '@/lib/constants/intensity-presets'

export type PrefillCandidateSet = {
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
  isWarmup?: boolean
}

/**
 * Returns the highest-numbered working set from the list, ignoring warm-ups.
 * Falls back to the last set overall when every set was a warm-up. Returns null
 * for an empty list.
 */
function lastWorkingSet<T extends PrefillCandidateSet>(sets: T[]): T | null {
  if (sets.length === 0) return null
  const byOrder = [...sets].sort((a, b) => a.setNumber - b.setNumber)
  const working = byOrder.filter((s) => !s.isWarmup)
  const pool = working.length > 0 ? working : byOrder
  return pool[pool.length - 1]
}

/**
 * Pick the set whose performance should pre-fill the logging form.
 *
 * @param sessionSets Sets already logged this session for the current exercise.
 * @param historySets Sets from the previous workout for the current exercise.
 * @returns The set to carry forward, or null when there's no prior performance
 *          (a brand-new exercise the user has never logged).
 */
export function pickPrefillSourceSet(
  sessionSets: PrefillCandidateSet[],
  historySets: PrefillCandidateSet[] | undefined | null
): PrefillCandidateSet | null {
  return lastWorkingSet(sessionSets) ?? lastWorkingSet(historySets ?? []) ?? null
}

/** The prescribed target for the set being logged, used only as a fallback. */
export type PrefillPrescribedTarget = {
  reps?: string | null
  rpe?: number | null
  rir?: number | null
}

/** String form values ready to drop into the logging form's `currentSet`. */
export type PrefillValues = {
  reps: string
  weight: string
  /** null means "keep whatever unit is currently selected". */
  weightUnit: 'lbs' | 'kg' | null
  rpe: string
  rir: string
}

/**
 * Compute the reps/weight/intensity to pre-fill for the next set of an
 * exercise. Prior performance (session, then history) wins; the prescribed
 * plan and a 0 weight are used only when there's nothing to carry forward.
 */
export function computePrefillValues(
  sessionSets: PrefillCandidateSet[],
  historySets: PrefillCandidateSet[] | undefined | null,
  prescribed: PrefillPrescribedTarget | undefined
): PrefillValues {
  const sourceSet = pickPrefillSourceSet(sessionSets, historySets)

  if (sourceSet) {
    const unit = sourceSet.weightUnit === 'lbs' || sourceSet.weightUnit === 'kg'
      ? sourceSet.weightUnit
      : null
    return {
      reps: String(sourceSet.reps),
      weight: String(sourceSet.weight),
      weightUnit: unit,
      rpe: sourceSet.rpe != null ? String(sourceSet.rpe) : '',
      rir: sourceSet.rir != null ? String(sourceSet.rir) : '',
    }
  }

  return {
    reps: parseRepsFromPrescribed(prescribed?.reps ?? undefined),
    weight: '0',
    weightUnit: null,
    rpe: prescribed?.rpe != null ? String(prescribed.rpe) : '',
    rir: prescribed?.rir != null ? String(prescribed.rir) : '',
  }
}

/** The reps/weight/intensity currently shown in (or last written to) the form. */
export type PrefillFormState = {
  reps: string
  weight: string
  rpe: string
  rir: string
}

/** A set the user tapped to copy into the form (history or logged set). */
export type ApplicableSet = {
  reps: number
  weight: number
  weightUnit?: string | null
  rpe: number | null
  rir: number | null
}

/**
 * Map a tapped set to form field strings. Intensity is dropped when the user
 * doesn't have intensity tracking enabled. `weightUnit` is null when the source
 * unit is unknown, meaning "keep the current unit".
 */
export function appliedSetToForm(
  source: ApplicableSet,
  includeIntensity: boolean
): PrefillFormState & { weightUnit: 'lbs' | 'kg' | null } {
  const unit = source.weightUnit === 'lbs' || source.weightUnit === 'kg' ? source.weightUnit : null
  return {
    reps: String(source.reps),
    weight: String(source.weight),
    weightUnit: unit,
    rpe: includeIntensity && source.rpe != null ? String(source.rpe) : '',
    rir: includeIntensity && source.rir != null ? String(source.rir) : '',
  }
}

function sameForm(a: PrefillFormState, b: PrefillFormState): boolean {
  return a.reps === b.reps && a.weight === b.weight && a.rpe === b.rpe && a.rir === b.rir
}

/**
 * Decide whether to (re)prefill the logging form and with what values.
 *
 * Previous-workout history arrives asynchronously, so the form is prefilled
 * immediately with the best data available and *upgraded* once history loads.
 * To avoid clobbering the user's own input (or the in-exercise set progression),
 * a re-apply only happens while the form is untouched — i.e. still equal to the
 * `snapshot` of what we last wrote.
 *
 * @returns the values to apply, or null to leave the form as-is.
 */
export function resolvePrefill(params: {
  /** True when this is a freshly-entered exercise/set we haven't prefilled. */
  isNewTarget: boolean
  /** Current form values. */
  current: PrefillFormState
  /** What we last prefilled for this target (null if none yet). */
  snapshot: PrefillFormState | null
  sessionSets: PrefillCandidateSet[]
  historySets?: PrefillCandidateSet[] | null
  prescribed: PrefillPrescribedTarget | undefined
}): PrefillValues | null {
  const { isNewTarget, current, snapshot, sessionSets, historySets, prescribed } = params

  // Already prefilled this target: only re-apply if the user hasn't touched it.
  if (!isNewTarget && (snapshot == null || !sameForm(snapshot, current))) {
    return null
  }

  const values = computePrefillValues(sessionSets, historySets, prescribed)

  // Nothing new to show — skip a redundant re-render.
  if (!isNewTarget && snapshot != null && sameForm(snapshot, values)) {
    return null
  }

  return values
}
