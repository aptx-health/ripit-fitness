import {
  type FewShotExample,
  renderFewShotExample,
  selectFewShotExample,
} from './few-shot-examples'
import {
  type CandidateExercise,
  type ExerciseCountRange,
  exerciseCountRange,
  type SuggestWorkoutPayload,
  type WeeklyIntent,
} from './schemas'

/**
 * Suggest Workout prompt assembly.
 *
 * Layout (and why):
 * - System prompt is 100% static → provider prompt caching works.
 * - The payload is rendered as compact labeled text, not raw JSON.
 *   Text costs ~40% fewer tokens and keeps "JSON" unambiguous: the only
 *   JSON the model ever sees (example output, skeleton) looks like what
 *   it must produce.
 * - Candidates are a pipe table with the id in column one — the model
 *   copies ids from the start of lines far more reliably than from
 *   nested JSON.
 * - TODAY'S REQUEST is the last section before the final instruction.
 *   Cheap models weight the end of a long prompt heavily; this is the
 *   defense against regressing to a generic workout that ignores the
 *   session-specific input.
 * - Exercise counts are precomputed from the time budget. The model
 *   never does arithmetic.
 */

export const SUGGEST_WORKOUT_SYSTEM_PROMPT = `You are the workout planner inside Ripit Fitness, a strength training app. Each request gives you one user's profile, their recent training state, today's request, and a list of candidate exercises. You respond with exactly three workout options as a single JSON object.

An option is an ordered list of exercises for one session (no sets or reps — the user logs those live). Order exercises as they should be performed: the most demanding compound work first, isolation and accessory work last.

HARD RULES
1. Every exercise "id" is copied character-for-character from the CANDIDATE EXERCISES list. No other ids exist.
2. Exactly three options, with "id" values "user_preference", "data_driven", "wild_card", in that order.
3. No exercise appears twice in the same option.
4. Respond with the JSON object only — no markdown fences, no text before or after it.

THE THREE OPTIONS
user_preference — built around TODAY'S REQUEST. If the user named a focus, most exercises serve that focus. Anything they asked to avoid or deprioritize is fully respected. Fill remaining slots with their high-confidence likes and the movements they train most.
data_driven — built from TRAINING STATE alone. Satisfy any unsatisfied weekly intent first, then attack the largest positive deficits and the stalest muscle groups. Today's stated mood and focus do NOT steer this option; only hard limits do: the time budget, available equipment, and any pain, soreness, or injury the user mentioned — safety always wins. When this option contradicts the request, say so plainly in its description.
wild_card — a session the user would not have picked but a good coach could defend. Rotate to equipment, movement patterns, or exercises the user rarely or never uses, or use an unusual structure such as antagonist supersets. Keep it anchored: at least half its exercises still serve the user's goals or current deficits. Include at least two exercises that appear in neither other option. Never include high-confidence dislikes.

If user_preference and data_driven would come out nearly identical because the request already matches the data, force them apart: keep user_preference tightly on the requested focus and make data_driven a broader rebalancing session, and let each description say what distinguishes it.

SELECTION PRINCIPLES
- When barbells, dumbbells, cables, or machines are available, build around them. Bands and bodyweight are fillers, not defaults — use them only when equipment limits or the request calls for them.
- Use movement calibration to judge readiness: a pattern loaded heavy 1-2 days ago is not ready for more heavy work; 4 or more days is.
- status "neglected" plus a large positive deficit is the strongest signal to include that muscle group.
- Prefer high-confidence liked exercises in user_preference and data_driven. Avoid high-confidence dislikes in every option.
- Honor weekly intents when time allows; when one cannot fit today, add a warning instead of forcing it.
- Soreness or pain in the request overrides every deficit signal for the affected area.

WRITING STYLE for description, summary, and rationale
Write like a knowledgeable training partner: plain, direct, specific, one sentence each. Ground claims in the input data ("chest is 6 points under target over 14 days", "no hinge work in 9 days"). Use only numbers that appear in the input — never invent one. No emoji, no exclamation points, no hype words, no jargon the input does not use.

WARNINGS
Add a short warning string when an unsatisfied weekly intent cannot fit today's time budget, when today's request sharply contradicts the training data (state what the data says), or when an equipment override removes most relevant exercises. Otherwise "warnings" must be [].

OUTPUT SHAPE — exactly this structure:
{
  "options": [
    {
      "id": "user_preference",
      "name": "User Preference",
      "description": "one sentence: how this follows today's request",
      "summary": "N exercises, ~M min. One line on the session's character.",
      "exercises": [
        { "id": "copied from CANDIDATE EXERCISES", "name": "that exercise's name", "rationale": "one sentence" }
      ]
    },
    { "id": "data_driven", "name": "Data Driven", "description": "...", "summary": "...", "exercises": [ ... ] },
    { "id": "wild_card", "name": "Wild Card", "description": "...", "summary": "...", "exercises": [ ... ] }
  ],
  "warnings": []
}`

// ---------------------------------------------------------------------------
// Section renderers (exported for tests)
// ---------------------------------------------------------------------------

function formatDays(days: number | null): string {
  if (days === null) return 'never'
  return `${days}d`
}

function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`
}

function formatDeficit(deficit: number): string {
  const pts = Math.round(deficit * 100)
  return `${pts >= 0 ? '+' : ''}${pts}%`
}

export function summarizeWeeklyIntent(intent: WeeklyIntent): string {
  switch (intent.type) {
    case 'heavy_session':
      return `at least ${intent.min_per_week} heavy ${intent.muscle_group} session(s) per week`
    case 'volume_tilt':
      return `tilt volume toward ${intent.toward.join(', ')} and away from ${intent.away_from.join(', ')}`
    case 'movement_frequency':
      return `${intent.movement_pattern} at least ${intent.min_per_week}x per week`
    case 'free_text':
      return intent.text
  }
}

export function renderDurableProfile(payload: SuggestWorkoutPayload): string {
  const p = payload.durable_profile
  const lines = ['USER PROFILE']
  lines.push(
    `Goals: ${p.goal_sentences.length > 0 ? p.goal_sentences.join('; ') : '(none stated)'}`,
  )
  if (p.weekly_intent.length > 0) {
    lines.push(`Weekly intent: ${p.weekly_intent.map(summarizeWeeklyIntent).join('; ')}`)
  }
  if (p.default_intensity_preference) {
    lines.push(`Intensity preference: ${p.default_intensity_preference}`)
  }
  const equipment =
    payload.ephemeral_context.equipment_override ?? p.equipment_available
  const overridden = payload.ephemeral_context.equipment_override !== null
  lines.push(
    `Equipment${overridden ? ' today (overrides profile)' : ''}: ${equipment.join(', ')}`,
  )
  // banned_exercise_ids and ratio_targets are intentionally NOT rendered:
  // bans are already filtered out of candidates, and ratio targets are
  // fully expressed by the per-FAU target/deficit columns.
  return lines.join('\n')
}

export function renderTrainingState(payload: SuggestWorkoutPayload): string {
  const t = payload.training_state
  const sections: string[] = []

  sections.push(`TRAINING STATE (as of ${t.today_dow} ${t.now.slice(0, 10)})`)

  // Whole-body freshness & load (v2). Rendered here so the new fields are not
  // silently dropped by the tolerant input schema.
  const freshness: string[] = [
    `Sessions last 7d: ${t.sessions_last_7d}.`,
    t.days_since_any_session === null
      ? 'No sessions logged yet.'
      : `Last session ${formatDays(t.days_since_any_session)} ago.`,
  ]
  if (t.total_weekly_sets_baseline !== null) {
    freshness.push(`Baseline ~${Math.round(t.total_weekly_sets_baseline)} sets/week.`)
  }
  if (t.acute_chronic_ratio !== null) {
    freshness.push(`Acute:chronic load ratio ${t.acute_chronic_ratio.toFixed(2)}.`)
  }
  if (t.detraining_gap !== null) {
    freshness.push(
      `Detraining gap: ${t.detraining_gap.days}d off — ramp loads (~85-90% of prior) and reduce volume.`,
    )
  }
  if (payload.data_maturity === 'cold_start') {
    freshness.push(
      'COLD START: little to no history. Plan from goals + candidates; keep rationales free of history claims.',
    )
  }
  sections.push(freshness.join(' '))

  const fauLines = [
    'Muscle groups — sets and share of total volume vs target:',
    'muscle | last trained | last heavy | sets 7d | sets 14d | target | actual | deficit(+=under) | status',
    ...t.per_fau.map((f) =>
      [
        f.fau,
        formatDays(f.last_session_days_ago),
        formatDays(f.last_heavy_days_ago),
        f.rolling_7d_sets,
        f.rolling_14d_sets,
        formatShare(f.target_share),
        formatShare(f.actual_14d_share),
        formatDeficit(f.deficit_share),
        // status is omitted under low_data (spec rule 12) — show a marker so
        // the column stays aligned without inventing a label.
        f.status ?? 'low-data',
      ].join(' | '),
    ),
  ]
  sections.push(fauLines.join('\n'))

  if (t.per_movement_calibration.length > 0) {
    const calLines = [
      'Movement calibration (top working weight, lb):',
      ...t.per_movement_calibration.map((c) =>
        `${c.movement_pattern}: ~${c.current_ewma_top_weight_lbs} (recent ${c.recent_observations.map((o) => o.weight_lbs).join(',')}), ${c.typical_rep_range} reps${c.typical_rpe !== null ? ` @ RPE ${c.typical_rpe}` : ''}, last ${formatDays(c.last_session_days_ago)} ago`,
      ),
    ]
    sections.push(calLines.join('\n'))
  } else {
    sections.push(
      'No movement calibration yet (fewer than 3 logged sessions per pattern). Pick common, easy-to-learn movements and keep loads conservative.',
    )
  }

  if (t.weekly_intent_status.length > 0) {
    const intentLines = [
      'Weekly intent status (rolling 7-day window):',
      ...t.weekly_intent_status.map((s) => {
        if (s.satisfied_last_7d) {
          return `- satisfied: ${s.intent_summary}${s.evidence ? ` (${s.evidence})` : ''}`
        }
        const ago =
          s.last_satisfied_days_ago !== null &&
          s.last_satisfied_days_ago !== undefined
            ? ` (last satisfied ${s.last_satisfied_days_ago}d ago)`
            : ''
        return `- NOT satisfied: ${s.intent_summary}${ago}`
      }),
    ]
    sections.push(intentLines.join('\n'))
  }

  if (t.goal_progress.length > 0) {
    const goalLines = [
      'Goal progress:',
      ...t.goal_progress.map(
        (g) =>
          `- ${g.goal}: ${g.trend}, ${g.weeks_observed} week(s) observed (top sets ${g.recent_top_sets_lbs.join(', ')})`,
      ),
    ]
    sections.push(goalLines.join('\n'))
  }

  if (t.recent_sessions.length > 0) {
    const sessionLines = [
      'Recent sessions (newest first):',
      ...t.recent_sessions.map((s) => {
        const bits = [`${formatDays(s.days_ago)} ago`, `${s.total_sets} sets`]
        if (s.duration_min !== null) bits.push(`${s.duration_min} min`)
        if (s.abandoned) bits.push('abandoned')
        if (s.session_rpe !== undefined) bits.push(`session RPE ${s.session_rpe}`)
        const notes =
          s.notes.length > 0
            ? ` — notes: ${s.notes.map((n) => `${n.exercise}: ${n.text}`).join('; ')}`
            : ''
        return `- ${bits.join(', ')}${notes}`
      }),
    ]
    sections.push(sessionLines.join('\n'))
  }

  const fb = t.recent_feedback
  if (fb.suggestions_last_30d > 0) {
    const parts = [
      `Reaction to past suggestions (30d): ${fb.suggestions_last_30d} suggestions, ${Math.round(fb.swap_rate * 100)}% of exercises swapped.`,
    ]
    if (fb.common_swaps.length > 0) {
      parts.push(
        `Swaps: ${fb.common_swaps.map((s) => `${s.from} -> ${s.to} (${s.count})`).join('; ')}.`,
      )
    }
    if (fb.common_additions_fau.length > 0) {
      parts.push(`Often adds: ${fb.common_additions_fau.join(', ')}.`)
    }
    if (fb.common_deletions_fau.length > 0) {
      parts.push(`Often deletes: ${fb.common_deletions_fau.join(', ')}.`)
    }
    sections.push(parts.join(' '))
  } else {
    sections.push('No suggestion history yet.')
  }

  const prefs = t.preferences_summary
  if (
    prefs.high_confidence_likes.length > 0 ||
    prefs.high_confidence_dislikes.length > 0
  ) {
    sections.push(
      `Confident preferences — likes: ${prefs.high_confidence_likes.join(', ') || '(none)'}; dislikes: ${prefs.high_confidence_dislikes.join(', ') || '(none)'}. Everything else: not enough data.`,
    )
  } else {
    sections.push('Confident preferences: none yet — not enough data.')
  }

  return sections.join('\n\n')
}

export function renderCandidateLine(c: CandidateExercise): string {
  const targets =
    c.secondary_faus.length > 0
      ? `${c.primary_faus.join(',')} +${c.secondary_faus.join(',')}`
      : c.primary_faus.join(',')
  return [
    c.id,
    c.name,
    targets,
    c.equipment,
    c.movement_pattern ?? '-',
    c.intensity_class,
    c.user_preference_score !== undefined
      ? c.user_preference_score.toFixed(2)
      : '-',
  ].join(' | ')
}

export function renderCandidates(payload: SuggestWorkoutPayload): string {
  const candidates = payload.candidate_exercises
  return [
    `CANDIDATE EXERCISES — the only ${candidates.length} exercise ids that exist:`,
    'id | name | muscles | equipment | pattern | intensity | preference',
    ...candidates.map(renderCandidateLine),
  ].join('\n')
}

const VIBE_LABELS: Record<string, string> = {
  easy: 'easy — keep it light',
  solid: 'solid — normal working session',
  heavy: 'heavy — feeling strong, open to top-end loads',
}

export function renderTodaysRequest(
  payload: SuggestWorkoutPayload,
  countRange: ExerciseCountRange,
): string {
  const e = payload.ephemeral_context
  const lines = ["TODAY'S REQUEST — user_preference must be built around this"]
  lines.push(
    `Time: ${e.time_budget_minutes} minutes -> ${countRange.min} to ${countRange.max} exercises per option (~8 min each)`,
  )
  if (e.intensity_vibe) {
    lines.push(`Vibe: ${VIBE_LABELS[e.intensity_vibe] ?? e.intensity_vibe}`)
  }
  lines.push(`Prioritize: ${e.prioritize_freetext ? `"${e.prioritize_freetext}"` : '(none)'}`)
  lines.push(
    `Avoid/deprioritize: ${e.deprioritize_freetext ? `"${e.deprioritize_freetext}"` : '(none)'}`,
  )
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export interface AssembledSuggestPrompt {
  system: string
  user: string
  countRange: ExerciseCountRange
  candidateIds: string[]
  /** null when the example was dropped to stay inside the token budget. */
  exampleArchetype: string | null
  estimatedTokens: number
}

export interface AssembleOptions {
  /**
   * 'auto' (default) selects an archetype-matched example and drops it
   * if the total estimate exceeds maxTotalTokens. Pass null to omit,
   * or a specific example to pin one (used by evals).
   */
  example?: 'auto' | FewShotExample | null
  /** Rough ceiling for system + user, in estimated tokens. */
  maxTotalTokens?: number
}

const DEFAULT_MAX_TOTAL_TOKENS = 6000

/** chars/4 — crude but consistent; used only for budget decisions. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function assembleSuggestWorkoutPrompt(
  payload: SuggestWorkoutPayload,
  options: AssembleOptions = {},
): AssembledSuggestPrompt {
  const maxTotalTokens = options.maxTotalTokens ?? DEFAULT_MAX_TOTAL_TOKENS
  const countRange = exerciseCountRange(
    payload.ephemeral_context.time_budget_minutes,
  )

  const body = [
    renderDurableProfile(payload),
    renderTrainingState(payload),
    renderCandidates(payload),
    renderTodaysRequest(payload, countRange),
    `Return the JSON object now: exactly 3 options (user_preference, data_driven, wild_card), ${countRange.min} to ${countRange.max} exercises each, every id copied from CANDIDATE EXERCISES, "warnings" always present.`,
  ].join('\n\n')

  let example: FewShotExample | null
  if (options.example === undefined || options.example === 'auto') {
    example = selectFewShotExample(payload)
  } else {
    example = options.example
  }

  const systemTokens = estimateTokens(SUGGEST_WORKOUT_SYSTEM_PROMPT)
  let user = body
  if (example) {
    const withExample = `${renderFewShotExample(example)}\n\n${body}`
    if (systemTokens + estimateTokens(withExample) <= maxTotalTokens) {
      user = withExample
    } else {
      example = null
    }
  }

  return {
    system: SUGGEST_WORKOUT_SYSTEM_PROMPT,
    user,
    countRange,
    candidateIds: payload.candidate_exercises.map((c) => c.id),
    exampleArchetype: example?.archetype ?? null,
    estimatedTokens: systemTokens + estimateTokens(user),
  }
}
