/**
 * Maps weekly-intent evaluator verdicts into the payload's
 * `training_state.weekly_intent_status[]` block (issue #920).
 *
 * The evaluator (lib/learning/weekly-intent.ts) is deliberately payload-shape
 * agnostic: it returns `lastSatisfiedDaysAgo` in *every* verdict (downstream
 * deload detection needs it even while an intent is currently satisfied). The
 * payload spec's emit-only-when-unsatisfied rule (spec rules 3-5) is therefore
 * **this builder's** responsibility, not the evaluator's — see the integration
 * note on issue #920.
 *
 *   - `evidence` is emitted iff `satisfied_last_7d === true` (rule 3).
 *   - `last_satisfied_days_ago` is emitted iff `satisfied_last_7d === false`
 *     (rule 4); within that it may be `null` (never satisfied in history).
 *   - `free_text` intents (not machine-evaluable) get NEITHER field (rule 5).
 */

import type { WeeklyIntentVerdict } from '@/lib/learning/weekly-intent'
import type { WeeklyIntent } from '@/lib/llm/prompts/suggest-workout/types'

export interface WeeklyIntentStatus {
  intent_summary: string
  satisfied_last_7d: boolean
  evidence?: string
  last_satisfied_days_ago?: number | null
}

/** Human-readable one-line rendering of a structured intent. */
export function summarizeWeeklyIntent(intent: WeeklyIntent): string {
  switch (intent.type) {
    case 'heavy_session': {
      const plural = intent.min_per_week === 1 ? '' : 's'
      return `At least ${intent.min_per_week} heavy ${intent.muscle_group} session${plural} per week`
    }
    case 'movement_frequency': {
      return `${intent.movement_pattern} at least ${intent.min_per_week}x per week`
    }
    case 'volume_tilt': {
      const toward = intent.toward.join('/') || '(unspecified)'
      const away = intent.away_from.join('/') || '(unspecified)'
      return `Tilt volume toward ${toward} over ${away} (>=${intent.ratio}x)`
    }
    case 'free_text':
      return intent.text
  }
}

/** Map a single verdict to its payload status entry, applying rules 3-5. */
export function toWeeklyIntentStatus(verdict: WeeklyIntentVerdict): WeeklyIntentStatus {
  const status: WeeklyIntentStatus = {
    intent_summary: summarizeWeeklyIntent(verdict.intent),
    satisfied_last_7d: verdict.satisfiedLast7d,
  }

  if (verdict.satisfiedLast7d) {
    // Rule 3: evidence only when satisfied. The evaluator already scopes it.
    if (verdict.evidence !== undefined) status.evidence = verdict.evidence
  } else if (verdict.evaluable) {
    // Rule 4: last_satisfied_days_ago only when unsatisfied AND evaluable.
    // Rule 5: free_text (non-evaluable) intents get neither field.
    status.last_satisfied_days_ago = verdict.lastSatisfiedDaysAgo
  }

  return status
}

/** Map every verdict to its payload status entry. */
export function toWeeklyIntentStatuses(
  verdicts: readonly WeeklyIntentVerdict[],
): WeeklyIntentStatus[] {
  return verdicts.map(toWeeklyIntentStatus)
}
