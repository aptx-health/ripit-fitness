/**
 * Deterministic gates on planner output. Anything a program can verify
 * is checked here, never delegated to the LLM judge: the judge scores
 * judgment calls, gates catch violations. Gate failures are reported
 * separately from judged scores and are never blended into the
 * composite — blending hides regressions.
 */

import type {
  EvalScenario,
  HardCheckResult,
  SuggestionOption,
  SuggestionResponse,
} from './types'

/** Nominal minutes per exercise; bounds are generous on both sides. */
export const MINUTES_PER_EXERCISE = 8

export function allowedExerciseCountRange(timeBudgetMinutes: number): {
  min: number
  max: number
} {
  return {
    min: Math.max(1, Math.floor(timeBudgetMinutes / 12)),
    max: Math.max(2, Math.ceil(timeBudgetMinutes / 6)),
  }
}

export function runHardChecks(
  scenario: EvalScenario,
  response: SuggestionResponse,
): HardCheckResult[] {
  const results: HardCheckResult[] = []
  const candidateIds = new Set(scenario.payload.candidate_exercises.map((c) => c.id))
  const candidateById = new Map(
    scenario.payload.candidate_exercises.map((c) => [c.id, c]),
  )
  const bannedIds = new Set(scenario.payload.durable_profile.banned_exercise_ids)

  // Exactly one of each option id, in any order (schema enforces 3 total)
  const seenOptionIds = response.options.map((o) => o.id)
  const uniqueOptionIds = new Set(seenOptionIds)
  results.push({
    name: 'option_ids_complete',
    passed:
      uniqueOptionIds.size === 3 &&
      uniqueOptionIds.has('user_preference') &&
      uniqueOptionIds.has('data_driven') &&
      uniqueOptionIds.has('wild_card'),
    detail:
      uniqueOptionIds.size === 3 ? null : `got option ids: ${seenOptionIds.join(', ')}`,
  })

  for (const option of response.options) {
    results.push(...checkOption(scenario, option, candidateIds, candidateById, bannedIds))
  }

  return results
}

function checkOption(
  scenario: EvalScenario,
  option: SuggestionOption,
  candidateIds: Set<string>,
  candidateById: Map<string, EvalScenario['payload']['candidate_exercises'][number]>,
  bannedIds: Set<string>,
): HardCheckResult[] {
  const results: HardCheckResult[] = []
  const ids = option.exercises.map((e) => e.id)

  const unknown = ids.filter((id) => !candidateIds.has(id))
  results.push({
    name: 'ids_in_candidate_list',
    optionId: option.id,
    passed: unknown.length === 0,
    detail: unknown.length > 0 ? `hallucinated ids: ${unknown.join(', ')}` : null,
  })

  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
  results.push({
    name: 'no_duplicate_exercises',
    optionId: option.id,
    passed: dupes.length === 0,
    detail: dupes.length > 0 ? `duplicated: ${[...new Set(dupes)].join(', ')}` : null,
  })

  const banned = ids.filter((id) => bannedIds.has(id))
  results.push({
    name: 'no_banned_exercises',
    optionId: option.id,
    passed: banned.length === 0,
    detail: banned.length > 0 ? `banned ids present: ${banned.join(', ')}` : null,
  })

  const budget = scenario.payload.ephemeral_context.time_budget_minutes
  const range = allowedExerciseCountRange(budget)
  const count = option.exercises.length
  results.push({
    name: 'count_fits_time_budget',
    optionId: option.id,
    passed: count >= range.min && count <= range.max,
    detail:
      count >= range.min && count <= range.max
        ? null
        : `${count} exercises for ${budget}min (allowed ${range.min}-${range.max})`,
  })

  // Scenario-specific hard rules
  for (const expectation of scenario.expectations) {
    if (expectation.kind !== 'hard' || !expectation.rule) continue
    const rule = expectation.rule

    if (rule.type === 'exclude_exercises') {
      const hits = ids.filter((id) => rule.exerciseIds.includes(id))
      results.push({
        name: 'scenario_exclude_exercises',
        optionId: option.id,
        passed: hits.length === 0,
        detail: hits.length > 0 ? `${expectation.description}: ${hits.join(', ')}` : null,
      })
    } else if (rule.type === 'exclude_heavy_fau') {
      const hits = ids.filter((id) => {
        const c = candidateById.get(id)
        return (
          c !== undefined &&
          c.intensity_class === 'heavy' &&
          c.primary_faus.includes(rule.fau)
        )
      })
      results.push({
        name: 'scenario_exclude_heavy_fau',
        optionId: option.id,
        passed: hits.length === 0,
        detail: hits.length > 0 ? `${expectation.description}: ${hits.join(', ')}` : null,
      })
    } else if (rule.type === 'max_exercise_count') {
      results.push({
        name: 'scenario_max_exercise_count',
        optionId: option.id,
        passed: count <= rule.max,
        detail: count > rule.max ? `${count} exercises > max ${rule.max}` : null,
      })
    }
  }

  return results
}

export function gatePassRate(checks: HardCheckResult[]): number {
  if (checks.length === 0) return 1
  return checks.filter((c) => c.passed).length / checks.length
}

export function failedGates(checks: HardCheckResult[]): HardCheckResult[] {
  return checks.filter((c) => !c.passed)
}
