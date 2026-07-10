/**
 * Deterministic goal-sentence synthesis for the Suggest payload (issue #920,
 * docs/SUGGEST_PAYLOAD_SPEC.md § "Goal-sentence synthesis").
 *
 * `durable_profile.goal_sentences` is the most LLM-legible field in the
 * payload, but the free-text Goal Interview that produces polished sentences is
 * descoped from the beta wave. When `UserTrainingProfile.goalSentences` is
 * empty, the training-state builder synthesizes sentences from the Goals
 * Wizard's structured fields via the template below. **No LLM call** — output
 * is a stable, pure function of the profile input, which is what makes the
 * cold-start golden snapshot assertable verbatim (spec rule 16).
 *
 * Vocabulary reconciliation (PR #943): the spec's illustrative template used
 * injury severity values `active`/`past` and an illustrative `signupIntent`
 * key. This module keys off the values the *code* actually stores:
 *   - injury severities: `avoid_loading` | `caution` | `recovered`
 *     (lib/user-training-profile.ts INJURY_SEVERITIES); `recovered` is
 *     historical and never synthesized, mirroring the spec's `past`.
 *   - signupIntent: the four values written by app/api/welcome/intent/route.ts
 *     (`new_to_apps` | `from_another_app` | `returning_to_training` |
 *     `just_curious`), read from `UserSettings.signupIntent` (NOT `User`).
 */

import type {
  GoalCategory,
  InjuryArea,
  PatternPreference,
  UserTrainingProfileDTO,
} from '@/lib/user-training-profile'

/** goal category → sentence lead-in (spec § lookup tables). */
export const GOAL_PHRASES: Record<GoalCategory, string> = {
  build_muscle: 'Build muscle',
  get_stronger: 'Get stronger',
  lose_fat: 'Lose fat',
  general_fitness: 'General fitness',
  sport_performance: 'Sport performance',
  rehabilitation: 'Rehabilitation / return from injury',
  aesthetic_specific: 'Aesthetic focus',
  other: 'Other goal',
}

/** pattern preference → split label. `no_preference` is never rendered. */
export const PATTERN_LABELS: Record<Exclude<PatternPreference, 'no_preference'>, string> = {
  full_body: 'full-body',
  upper_lower: 'upper/lower',
  push_pull_legs: 'push/pull/legs',
  body_part_split: 'body-part',
  custom: 'custom',
}

/** injured body area → human-readable name. */
export const AREA_LABELS: Record<InjuryArea, string> = {
  neck: 'neck',
  shoulder: 'shoulder',
  elbow: 'elbow',
  wrist: 'wrist',
  upper_back: 'upper back',
  lower_back: 'lower back',
  hip: 'hip',
  knee: 'knee',
  ankle: 'ankle',
}

/** UserSettings.signupIntent → one contextual sentence. Free-form column, so
 * unknown values are skipped rather than mapped to a wrong sentence. */
export const SIGNUP_INTENT_SENTENCES: Record<string, string> = {
  new_to_apps:
    'New to training apps — prioritize simple, learnable movements and clear guidance.',
  from_another_app:
    'Coming from another training app — comfortable with structured logging.',
  returning_to_training:
    'Returning to training after time off — ramp intensity back up gradually.',
  just_curious: 'Just exploring for now — keep it approachable and low-pressure.',
}

const IMPORTANCE_WORDS = [
  'very low priority',
  'low priority',
  'medium priority',
  'high priority',
  'top priority',
] as const

/** Importance rating (1-5) → priority word. Clamped defensively. */
function importanceWord(n: number): string {
  const idx = Math.min(IMPORTANCE_WORDS.length, Math.max(1, Math.round(n))) - 1
  return IMPORTANCE_WORDS[idx]
}

/** Stable sort by importance descending, preserving original array order on ties. */
function byImportanceDesc<T extends { importance: number }>(items: readonly T[]): T[] {
  return items
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => b.item.importance - a.item.importance || a.idx - b.idx)
    .map((w) => w.item)
}

/** Humanize an OtherActivity enum key (e.g. `team_sports` → `team sports`). */
function activityLabel(activity: string): string {
  return activity.replace(/_/g, ' ')
}

/**
 * Synthesize goal sentences from the Goals Wizard's structured fields. Used
 * only when `profile.goalSentences` is empty — interview-produced sentences,
 * when present, are passed through verbatim by the builder with no mixing.
 *
 * @param profile      Normalized training profile.
 * @param signupIntent `UserSettings.signupIntent`, or null when unset.
 */
export function synthesizeGoalSentences(
  profile: UserTrainingProfileDTO,
  signupIntent: string | null,
): string[] {
  const out: string[] = []

  for (const g of byImportanceDesc(profile.goalCategories)) {
    out.push(`${GOAL_PHRASES[g.category]} (${importanceWord(g.importance)}).`)
  }

  for (const a of byImportanceDesc(profile.otherActivities)) {
    const cadence = a.cadence ? ` ${a.cadence}` : ''
    out.push(
      `Also does ${activityLabel(a.activity)}${cadence} (${importanceWord(a.importance)}) — factor recovery.`,
    )
  }

  if (profile.targetSessionsPerWeek) {
    out.push(
      `Aims for ${profile.targetSessionsPerWeek} sessions/week` +
        (profile.targetMinutesPerSession
          ? `, ~${profile.targetMinutesPerSession} min each.`
          : '.'),
    )
  }

  if (profile.patternPreference && profile.patternPreference !== 'no_preference') {
    out.push(`Prefers a ${PATTERN_LABELS[profile.patternPreference]} split.`)
  }

  // Reconciled vocab: `recovered` is historical (skip); `avoid_loading` is the
  // active/avoid case; `caution` is the mindful case.
  for (const inj of profile.injuryAreas.filter((i) => i.severity !== 'recovered')) {
    const lead = inj.severity === 'avoid_loading' ? 'Active injury' : 'Mindful of injury'
    out.push(`${lead}: ${AREA_LABELS[inj.area]}.`)
  }

  if (signupIntent && SIGNUP_INTENT_SENTENCES[signupIntent]) {
    out.push(SIGNUP_INTENT_SENTENCES[signupIntent])
  }

  if (out.length === 0) {
    out.push('General fitness; no specific goals stated yet.')
  }

  return out
}
