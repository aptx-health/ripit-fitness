import type { UserSettings } from '@/hooks/useUserSettings'

/**
 * Session effort rating (word-label chips) — RPE-equivalent storage.
 *
 * One word-label scale for everyone regardless of `defaultIntensityRating`
 * (RIR does not extend to a whole session). Stored as RPE 6–10 in
 * `WorkoutCompletion.sessionRpe`.
 */
export const EFFORT_OPTIONS = [
  { label: 'Easy', rpe: 6 },
  { label: 'Moderate', rpe: 7 },
  { label: 'Hard', rpe: 8 },
  { label: 'Very hard', rpe: 9 },
  { label: 'Maximal', rpe: 10 },
] as const

export const MIN_SESSION_RPE = 6
export const MAX_SESSION_RPE = 10

/**
 * Map a stored session RPE (6–10) to its word label (Easy → Maximal). Returns
 * null for null/out-of-range values so callers can omit the effort chip rather
 * than render a placeholder.
 */
export function sessionEffortLabel(rpe: number | null | undefined): string | null {
  if (rpe == null) return null
  const match = EFFORT_OPTIONS.find(option => option.rpe === rpe)
  return match?.label ?? null
}

export function isValidSessionRpe(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_SESSION_RPE &&
    value <= MAX_SESSION_RPE
  )
}

/**
 * Throttle cooldown for the effort-rating row. The row surfaces on the rollup
 * at most once per window so back-to-back completions (or reopening the modal)
 * don't nag. Roughly one training day.
 */
export const EFFORT_PROMPT_COOLDOWN_MS = 20 * 60 * 60 * 1000 // 20 hours

/**
 * Decide whether to show the effort-rating chips, throttled via the existing
 * post-session prompt fields (`lastPostSessionPromptAt`). Returns false until
 * settings load so we don't double-count or flash the row before we know the
 * throttle state.
 */
export function shouldShowEffortPrompt(
  settings: Pick<UserSettings, 'lastPostSessionPromptAt'> | null,
  now: number = Date.now()
): boolean {
  if (!settings) return false
  const last = settings.lastPostSessionPromptAt
  if (!last) return true
  const lastMs = new Date(last).getTime()
  if (Number.isNaN(lastMs)) return true
  return now - lastMs >= EFFORT_PROMPT_COOLDOWN_MS
}
