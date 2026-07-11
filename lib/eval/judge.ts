/**
 * LLM-as-judge for Suggest Workout suggestions.
 *
 * Robustness measures (cheap judges diverge easily):
 * - 4-point anchored scales from rating-rubric.ts, not open-ended 1-10.
 * - Evidence-before-score: the judge must quote the payload/response
 *   facts it is judging BEFORE emitting the number. Scoring without
 *   evidence is where cheap models drift.
 * - The judge sees a compact digest, not the raw 100-candidate payload:
 *   less context to get lost in, and the digest highlights exactly the
 *   facts the rubric dimensions ask about.
 * - Scenario `judge` expectations are injected so the judge scores
 *   against scenario intent, not its own taste.
 * - Deterministic gates run BEFORE judging (hard-checks.ts); the judge
 *   is told which gates failed so it does not spend evidence on them.
 * - Optional K runs: run 1 at temperature 0, runs 2..K at 0.4, then
 *   median-aggregate. The spread across runs is reported as judge
 *   stability — if it is wide, fix the rubric before trusting scores.
 */

import { z } from 'zod'

import type { LLMClient } from '@/lib/llm/client'

import { compositeScore, renderRubric, RUBRIC_DIMENSIONS } from './rating-rubric'
import type {
  EvalScenario,
  HardCheckResult,
  JudgeResult,
  SuggestionResponse,
} from './types'

const dimensionScoreSchema = z.object({
  dimension: z.string(),
  evidence: z.string(),
  score: z.number().int().min(1).max(4),
})

const judgeOutputSchema = z.object({
  per_option: z
    .array(
      z.object({
        option_id: z.enum(['user_preference', 'data_driven', 'wild_card']),
        dimension_scores: z.array(dimensionScoreSchema),
        note: z.string().default(''),
      }),
    )
    .length(3),
  option_identity: dimensionScoreSchema,
  overall_note: z.string().default(''),
})

export interface JudgeOptions {
  model?: string
  /** Total judge runs per suggestion. Default 1. */
  runs?: number
  timeoutMs?: number
}

const PER_OPTION_DIMS = RUBRIC_DIMENSIONS.filter((d) => !d.crossOption)

// ---------------------------------------------------------------------------
// Digest
// ---------------------------------------------------------------------------

export function buildJudgeDigest(
  scenario: EvalScenario,
  response: SuggestionResponse,
  failedGates: HardCheckResult[],
): string {
  const p = scenario.payload
  const state = p.training_state
  const byId = new Map(p.candidate_exercises.map((c) => [c.id, c]))

  const fauLines = state.per_fau.map((f) => {
    const parts = [
      `${f.fau}: deficit ${f.deficit_share >= 0 ? '+' : ''}${f.deficit_share.toFixed(3)} (${f.status})`,
      `last ${f.last_session_days_ago === null ? 'never/21d+' : `${f.last_session_days_ago}d ago`}`,
      f.last_heavy_days_ago !== null ? `last heavy ${f.last_heavy_days_ago}d` : null,
      `7d sets ${f.rolling_7d_sets}`,
    ].filter(Boolean)
    return `- ${parts.join(', ')}`
  })

  const neglected = state.per_fau.filter((f) => f.status === 'neglected')
  const availabilityLines = neglected.map((f) => {
    const names = p.candidate_exercises
      .filter((c) => c.primary_faus.includes(f.fau))
      .slice(0, 6)
      .map((c) => c.name)
    return `- ${f.fau}: ${names.length > 0 ? names.join(', ') : 'NO candidates available'}`
  })

  const calibrationLines = state.per_movement_calibration.map(
    (m) =>
      `- ${m.movement_pattern}: ewma ${m.current_ewma_top_weight_lbs}lbs, recent [${m.recent_observations.join(', ')}], ${m.typical_rep_range} reps @ RPE ${m.typical_rpe}, last ${m.last_session_days_ago}d ago`,
  )

  const intentLines = state.weekly_intent_status.map(
    (w) =>
      `- "${w.intent_summary}" — ${w.satisfied_this_week ? `satisfied (${w.evidence ?? ''})` : `NOT satisfied (last ${w.last_satisfied_days_ago ?? '?'}d ago)`}`,
  )

  const expectationLines = scenario.expectations
    .filter((e) => e.kind === 'judge')
    .map((e) => `- ${e.description}`)

  const optionBlocks = response.options.map((o) => {
    const lines = o.exercises.map((e) => {
      const c = byId.get(e.id)
      const meta = c
        ? `[${c.primary_faus.join('/')}, ${c.intensity_class}, ${c.movement_pattern ?? 'untagged'}, ${c.equipment}${c.user_preference_score !== undefined ? `, pref ${c.user_preference_score}` : ''}]`
        : '[NOT IN CANDIDATE LIST]'
      return `  - ${c?.name ?? e.id} ${meta} — "${e.rationale}"`
    })
    return [
      `### Option ${o.id} — "${o.name}"`,
      `description: ${o.description}`,
      `summary: ${o.summary}`,
      ...lines,
    ].join('\n')
  })

  const ec = p.ephemeral_context

  return [
    '## User profile',
    `Goals: ${p.durable_profile.goal_sentences.map((g) => `"${g}"`).join('; ')}`,
    `Weekly intents: ${p.durable_profile.weekly_intent.join('; ')}`,
    `Intensity preference: ${p.durable_profile.default_intensity_preference ?? 'unset'}`,
    '',
    '## Ephemeral request (what the user asked for right now)',
    `Time: ${ec.time_budget_minutes} min. Vibe: ${ec.intensity_vibe}.`,
    `Prioritize: ${ec.prioritize_freetext ?? '(none)'}. Deprioritize: ${ec.deprioritize_freetext ?? '(none)'}.`,
    ec.equipment_override ? `Equipment override: ${ec.equipment_override.join(', ')}` : '',
    '',
    '## Training state (per FAU)',
    ...fauLines,
    '',
    '## Candidates available for neglected FAUs',
    ...(availabilityLines.length > 0 ? availabilityLines : ['(no neglected FAUs)']),
    '',
    '## Movement calibration',
    ...(calibrationLines.length > 0 ? calibrationLines : ['(insufficient data)']),
    '',
    '## Weekly intent status',
    ...(intentLines.length > 0 ? intentLines : ['(none)']),
    '',
    `## Preferences`,
    `Likes: ${state.preferences_summary.high_confidence_likes.join(', ') || '(none high-confidence)'}`,
    `Dislikes: ${state.preferences_summary.high_confidence_dislikes.join(', ') || '(none high-confidence)'}`,
    '',
    '## Scenario-specific expectations (score against these)',
    ...(expectationLines.length > 0 ? expectationLines : ['(none beyond the rubric)']),
    '',
    '## Deterministic gate failures already detected (do NOT re-litigate; factor into relevant dimensions)',
    ...(failedGates.length > 0
      ? failedGates.map((g) => `- ${g.name}${g.optionId ? ` (${g.optionId})` : ''}: ${g.detail}`)
      : ['(all gates passed)']),
    '',
    '## The suggestion being judged',
    ...optionBlocks,
    '',
    `Warnings emitted: ${response.warnings.length > 0 ? response.warnings.join(' | ') : '(none)'}`,
  ]
    .filter((l) => l !== '')
    .join('\n')
}

// ---------------------------------------------------------------------------
// Judge prompt + call
// ---------------------------------------------------------------------------

function buildJudgePrompt(digest: string): { system: string; user: string } {
  const system = [
    'You are a meticulous strength-coaching evaluator. You grade AI-generated workout suggestions against an anchored rubric.',
    '',
    'Rules:',
    '- For each dimension, first write `evidence`: 1-3 short quotes or concrete facts from the material (exercise picks, rationale text, state numbers). THEN pick the score whose anchor best matches the evidence. Never score without evidence.',
    '- Use the anchor descriptions literally. If torn between two levels, pick the lower one.',
    '- Judge each option independently on the per-option dimensions. Judge option_identity ONCE across all three options.',
    '- Scenario-specific expectations override generic taste: if an expectation is violated, the relevant dimension cannot exceed 2.',
    '- Do not reward verbosity. A short correct rationale beats a long generic one.',
    '',
    '## Per-option rubric dimensions',
    renderRubric({ crossOption: false }),
    '',
    '## Cross-option dimension',
    renderRubric({ crossOption: true }),
    '',
    'Respond with ONLY JSON matching:',
    '{"per_option": [{"option_id": "user_preference" | "data_driven" | "wild_card", "dimension_scores": [{"dimension": string, "evidence": string, "score": 1|2|3|4}], "note": string}], "option_identity": {"dimension": "option_identity", "evidence": string, "score": 1|2|3|4}, "overall_note": string}',
    `Per-option dimension keys, all required for each option: ${PER_OPTION_DIMS.map((d) => d.key).join(', ')}.`,
  ].join('\n')

  return { system, user: digest }
}

export async function judgeSuggestion(
  client: LLMClient,
  scenario: EvalScenario,
  response: SuggestionResponse,
  gateFailures: HardCheckResult[],
  options: JudgeOptions = {},
): Promise<JudgeResult[]> {
  const runs = Math.max(1, options.runs ?? 1)
  const digest = buildJudgeDigest(scenario, response, gateFailures)
  const { system, user } = buildJudgePrompt(digest)

  const results: JudgeResult[] = []
  for (let i = 0; i < runs; i++) {
    const { data } = await client.callWithStructuredOutput(user, judgeOutputSchema, {
      system,
      model: options.model,
      // Run 0 at temp 0 (the canonical score); extra runs at 0.4 to
      // measure how sensitive the rubric is to sampling noise.
      temperature: i === 0 ? 0 : 0.4,
      timeoutMs: options.timeoutMs ?? 90_000,
      schemaName: 'suggestion_judgement',
    })
    results.push(data)
  }
  return results
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export interface AggregatedJudgement {
  composite: number | null
  dimensionMedians: Record<string, number>
  /** Mean absolute deviation of per-run composites. 0 when runs === 1. */
  compositeSpread: number
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** Per-run: mean score per dimension across options, + option_identity. */
export function perRunDimensionScores(run: JudgeResult): Record<string, number> {
  const byDim: Record<string, number[]> = {}
  for (const option of run.per_option) {
    for (const ds of option.dimension_scores) {
      if (!PER_OPTION_DIMS.some((d) => d.key === ds.dimension)) continue
      byDim[ds.dimension] = byDim[ds.dimension] ?? []
      byDim[ds.dimension].push(ds.score)
    }
  }
  const out: Record<string, number> = {}
  for (const [dim, scores] of Object.entries(byDim)) {
    out[dim] = scores.reduce((a, b) => a + b, 0) / scores.length
  }
  out.option_identity = run.option_identity.score
  return out
}

export function aggregateJudgeRuns(runs: JudgeResult[]): AggregatedJudgement {
  if (runs.length === 0) {
    return { composite: null, dimensionMedians: {}, compositeSpread: 0 }
  }
  const perRun = runs.map(perRunDimensionScores)
  const dims = new Set(perRun.flatMap((r) => Object.keys(r)))

  const dimensionMedians: Record<string, number> = {}
  for (const dim of dims) {
    const values = perRun.map((r) => r[dim]).filter((v): v is number => v !== undefined)
    if (values.length > 0) {
      dimensionMedians[dim] = Math.round(median(values) * 100) / 100
    }
  }

  const runComposites = perRun
    .map((r) => compositeScore(r))
    .filter((c): c is number => c !== null)
  const composite = runComposites.length > 0 ? median(runComposites) : null
  const mean =
    runComposites.length > 0
      ? runComposites.reduce((a, b) => a + b, 0) / runComposites.length
      : 0
  const compositeSpread =
    runComposites.length > 1
      ? Math.round(
          (runComposites.reduce((a, c) => a + Math.abs(c - mean), 0) /
            runComposites.length) *
            1000,
        ) / 1000
      : 0

  return { composite, dimensionMedians, compositeSpread }
}
