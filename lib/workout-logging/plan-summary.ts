import { parseRepsFromPrescribed } from '@/lib/constants/intensity-presets'

/**
 * The plan of an exercise in the workout logger: the PrescribedSets copied
 * from a saved or generated workout. Pure: the summary line's text and the
 * next planned set. Warm-ups are not part of the plan.
 */

export interface PlannedSet {
  setNumber: number
  /** As stored: "8", "60", "8-10". */
  reps: string
  rpe: number | null
  rir: number | null
  isWarmup?: boolean
}

/** The plan's working sets, in setNumber order. */
export function workingSets(prescribed: PlannedSet[]): PlannedSet[] {
  return prescribed.filter((s) => !s.isWarmup).sort((a, b) => a.setNumber - b.setNumber)
}

/** "8", or the range "7–9" when the values differ; null unless every set has one. */
function effortValue(values: Array<number | null>): string | null {
  if (values.some((v) => v == null)) return null
  const low = Math.min(...(values as number[]))
  const high = Math.max(...(values as number[]))
  return low === high ? String(low) : `${low}–${high}`
}

/** " @ RPE 8", " @ 2 RIR", or "" when the sets don't all carry the same kind of target. */
function effortText(plan: PlannedSet[]): string {
  const rpe = effortValue(plan.map((s) => s.rpe))
  if (rpe != null) return ` @ RPE ${rpe}`
  const rir = effortValue(plan.map((s) => s.rir))
  if (rir != null) return ` @ ${rir} RIR`
  return ''
}

/**
 * "3 × 8 @ RPE 8 · set 2 next", "3 sets · 5, 5, 8 reps @ RPE 8 · done";
 * null with no plan. `loggedCount` is the exercise's logged working sets.
 */
export function summarizePlan(prescribed: PlannedSet[], loggedCount: number): string | null {
  const plan = workingSets(prescribed)
  if (plan.length === 0) return null
  const reps = plan.map((s) => s.reps)
  const shape = reps.every((r) => r === reps[0]) ? `${plan.length} × ${reps[0]}` : `${plan.length} sets · ${reps.join(', ')} reps`
  const progress = loggedCount < plan.length ? `set ${loggedCount + 1} next` : 'done'
  return `${shape}${effortText(plan)} · ${progress}`
}

/** The planned set the next logged set fills; null when the plan is done or there is none. */
export function nextPlannedSet(prescribed: PlannedSet[], loggedCount: number): PlannedSet | null {
  return workingSets(prescribed)[loggedCount] ?? null
}

/**
 * The log form's values for the next planned set: reps (a range's high end,
 * as the program logger does) and its effort target. A set with an RPE
 * target clears RIR and the other way round; a set with neither leaves the
 * form's effort alone. Null when the plan is done or there is none.
 */
export function planFormValues(
  prescribed: PlannedSet[],
  loggedCount: number,
): { reps: string; rpe?: string; rir?: string } | null {
  const next = nextPlannedSet(prescribed, loggedCount)
  if (!next) return null
  const reps = parseRepsFromPrescribed(next.reps)
  if (next.rpe != null) return { reps, rpe: String(next.rpe), rir: '' }
  if (next.rir != null) return { reps, rir: String(next.rir), rpe: '' }
  return { reps }
}
