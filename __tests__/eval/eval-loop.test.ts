/**
 * Unit tests for the eval-loop building blocks. No LLM calls, no DB —
 * everything here is pure and fast.
 */

import { describe, expect, it } from 'vitest'

import { EXERCISE_CATALOG } from '@/lib/eval/exercise-catalog'
import {
  allowedExerciseCountRange,
  runHardChecks,
} from '@/lib/eval/hard-checks'
import { aggregateJudgeRuns } from '@/lib/eval/judge'
import {
  compositeScore,
  RUBRIC_DIMENSIONS,
} from '@/lib/eval/rating-rubric'
import { createRng } from '@/lib/eval/rng'
import {
  buildScenarioMatrix,
  generateScenarios,
  MODIFIER_KEYS,
} from '@/lib/eval/scenario-generator'
import type { JudgeResult, SuggestionResponse } from '@/lib/eval/types'
import { applyDiff } from '@/lib/eval/refinement-engine'
import { buildPlannerPrompt, PLANNER_PROMPT_VARIANTS } from '@/lib/suggest/prompts/registry'
import { suggestionResponseSchema } from '@/lib/suggest/schema'

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng('seed-1')
    const b = createRng('seed-1')
    expect([a.next(), a.next(), a.int(1, 100)]).toEqual([
      b.next(),
      b.next(),
      b.int(1, 100),
    ])
  })

  it('diverges for different seeds and forks', () => {
    const a = createRng('seed-1')
    const b = createRng('seed-2')
    expect(a.next()).not.toEqual(b.next())
    const parent = createRng('seed-1')
    expect(parent.fork('x').next()).not.toEqual(parent.fork('y').next())
  })
})

describe('scenario generator', () => {
  it('same seed + count produces byte-identical scenarios', () => {
    const a = generateScenarios({ count: 20, seed: 'repro' })
    const b = generateScenarios({ count: 20, seed: 'repro' })
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b))
  })

  it('different seeds produce different jitter', () => {
    const a = generateScenarios({ count: 5, seed: 'one' })
    const b = generateScenarios({ count: 5, seed: 'two' })
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b))
  })

  it('covers all archetypes in the first 5 and every modifier within the matrix', () => {
    const matrix = buildScenarioMatrix()
    const first5 = new Set(matrix.slice(0, 5).map((c) => c.archetype))
    expect(first5.size).toBe(5)
    const modifiersInMatrix = new Set(matrix.flatMap((c) => c.modifiers))
    for (const m of MODIFIER_KEYS) expect(modifiersInMatrix.has(m)).toBe(true)
  })

  it('candidate lists respect equipment and bans', () => {
    const scenarios = generateScenarios({ count: 55, seed: 'coverage' })
    for (const s of scenarios) {
      const equipment = new Set(
        s.payload.ephemeral_context.equipment_override ??
          s.payload.durable_profile.equipment_available,
      )
      const banned = new Set(s.payload.durable_profile.banned_exercise_ids)
      for (const c of s.payload.candidate_exercises) {
        expect(equipment.has(c.equipment)).toBe(true)
        expect(banned.has(c.id)).toBe(false)
      }
      expect(s.payload.candidate_exercises.length).toBeGreaterThan(10)
    }
  })

  it('per-FAU shares sum to ~1 and statuses follow deficit rule', () => {
    const [scenario] = generateScenarios({ count: 1, seed: 'shares' })
    const targetSum = scenario.payload.training_state.per_fau.reduce(
      (a, f) => a + f.target_share,
      0,
    )
    const actualSum = scenario.payload.training_state.per_fau.reduce(
      (a, f) => a + f.actual_14d_share,
      0,
    )
    expect(targetSum).toBeGreaterThan(0.98)
    expect(targetSum).toBeLessThan(1.02)
    expect(actualSum).toBeGreaterThan(0.98)
    expect(actualSum).toBeLessThan(1.02)
    for (const f of scenario.payload.training_state.per_fau) {
      if (f.deficit_share > 0.03) expect(f.status).toBe('neglected')
      else if (f.deficit_share < -0.03) expect(f.status).toBe('over')
      else expect(f.status).toBe('balanced')
    }
  })

  it('time-crunch scenarios carry the max_exercise_count hard rule', () => {
    const scenarios = generateScenarios({ count: 55, seed: 'tc' })
    const timeCrunch = scenarios.filter((s) => s.modifiers.includes('time-crunch'))
    expect(timeCrunch.length).toBeGreaterThan(0)
    for (const s of timeCrunch) {
      expect(s.payload.ephemeral_context.time_budget_minutes).toBe(15)
      expect(
        s.expectations.some(
          (e) => e.kind === 'hard' && e.rule?.type === 'max_exercise_count',
        ),
      ).toBe(true)
    }
  })
})

function makeResponse(ids: string[][]): SuggestionResponse {
  const optionIds = ['user_preference', 'data_driven', 'wild_card'] as const
  return {
    options: ids.map((exerciseIds, i) => ({
      id: optionIds[i],
      name: `Option ${i}`,
      description: 'desc',
      summary: 'summary',
      exercises: exerciseIds.map((id) => ({ id, rationale: 'because' })),
    })),
    warnings: [],
  }
}

describe('hard checks', () => {
  it('flags hallucinated ids, duplicates, and time-budget violations', () => {
    const [scenario] = generateScenarios({ count: 1, seed: 'gates' })
    scenario.payload.ephemeral_context.time_budget_minutes = 45
    const someIds = scenario.payload.candidate_exercises.slice(0, 6).map((c) => c.id)
    const response = makeResponse([
      [someIds[0], someIds[0], 'not-a-real-exercise'],
      someIds.slice(0, 5),
      [someIds[5]],
    ])
    const checks = runHardChecks(scenario, response)
    const byName = (name: string, optionId?: string) =>
      checks.filter((c) => c.name === name && (!optionId || c.optionId === optionId))

    expect(byName('ids_in_candidate_list', 'user_preference')[0].passed).toBe(false)
    expect(byName('no_duplicate_exercises', 'user_preference')[0].passed).toBe(false)
    expect(byName('ids_in_candidate_list', 'data_driven')[0].passed).toBe(true)
    // 1 exercise for 45min is below floor(45/12)=3
    expect(byName('count_fits_time_budget', 'wild_card')[0].passed).toBe(false)
  })

  it('enforces scenario exclude_heavy_fau rules', () => {
    const scenarios = generateScenarios({ count: 55, seed: 'injury' })
    const injured = scenarios.find(
      (s) =>
        s.modifiers.includes('injury-recovery') &&
        s.expectations.some((e) => e.rule?.type === 'exclude_heavy_fau'),
    )
    expect(injured).toBeDefined()
    if (!injured) return
    const rule = injured.expectations.find((e) => e.rule?.type === 'exclude_heavy_fau')!
      .rule as { type: 'exclude_heavy_fau'; fau: string }
    const violating = injured.payload.candidate_exercises.find(
      (c) => c.intensity_class === 'heavy' && c.primary_faus.includes(rule.fau as never),
    )
    // The banned-list removes obvious offenders, so a violating candidate
    // may not exist; when it does, the gate must catch it.
    if (!violating) return
    const safeIds = injured.payload.candidate_exercises
      .filter((c) => c.id !== violating.id)
      .slice(0, 4)
      .map((c) => c.id)
    const checks = runHardChecks(
      injured,
      makeResponse([[violating.id, ...safeIds.slice(0, 2)], safeIds.slice(0, 3), safeIds.slice(1, 4)]),
    )
    const gate = checks.find(
      (c) => c.name === 'scenario_exclude_heavy_fau' && c.optionId === 'user_preference',
    )
    expect(gate?.passed).toBe(false)
  })

  it('allowedExerciseCountRange is sane across budgets', () => {
    expect(allowedExerciseCountRange(15)).toEqual({ min: 1, max: 3 })
    expect(allowedExerciseCountRange(45)).toEqual({ min: 3, max: 8 })
    expect(allowedExerciseCountRange(90).max).toBeGreaterThanOrEqual(10)
  })
})

describe('rubric + aggregation', () => {
  it('weights sum to 1 and composite renormalizes on partial scores', () => {
    const total = RUBRIC_DIMENSIONS.reduce((a, d) => a + d.weight, 0)
    expect(total).toBeCloseTo(1)
    expect(compositeScore({ state_grounding: 4 })).toBe(4)
    expect(compositeScore({})).toBeNull()
    const all4 = Object.fromEntries(RUBRIC_DIMENSIONS.map((d) => [d.key, 4]))
    expect(compositeScore(all4)).toBe(4)
  })

  it('aggregates judge runs via median and reports spread', () => {
    const run = (score: number): JudgeResult => ({
      per_option: (['user_preference', 'data_driven', 'wild_card'] as const).map(
        (id) => ({
          option_id: id,
          dimension_scores: RUBRIC_DIMENSIONS.filter((d) => !d.crossOption).map(
            (d) => ({ dimension: d.key, evidence: 'e', score }),
          ),
          note: '',
        }),
      ),
      option_identity: { dimension: 'option_identity', evidence: 'e', score },
      overall_note: '',
    })
    const agg = aggregateJudgeRuns([run(2), run(4), run(4)])
    expect(agg.composite).toBe(4)
    expect(agg.compositeSpread).toBeGreaterThan(0)
    expect(agg.dimensionMedians.state_grounding).toBe(4)
  })
})

describe('prompt registry + diffs', () => {
  it('builds a planner prompt containing payload and all sections', () => {
    const [scenario] = generateScenarios({ count: 1, seed: 'prompt' })
    const { system, user } = buildPlannerPrompt(
      PLANNER_PROMPT_VARIANTS.v1,
      scenario.payload,
    )
    for (const section of PLANNER_PROMPT_VARIANTS.v1.sections) {
      expect(system).toContain(`## ${section.name}`)
    }
    expect(user).toContain('"candidate_exercises"')
  })

  it('applyDiff replaces or appends exactly one section with lineage', () => {
    const base = PLANNER_PROMPT_VARIANTS.v1
    const applied = applyDiff(
      base,
      {
        id: 'test-diff',
        target_section: 'safety',
        operation: 'append',
        proposed_content: 'ADDED SENTENCE.',
        motivation: 'm',
        addresses: 'safety_recovery',
        risk: 'r',
      },
      'v1+test-diff',
    )
    expect(applied.base).toBe('v1')
    const safety = applied.sections.find((s) => s.name === 'safety')!
    expect(safety.content.endsWith('ADDED SENTENCE.')).toBe(true)
    const others = applied.sections.filter((s) => s.name !== 'safety')
    for (const s of others) {
      expect(s.content).toBe(base.sections.find((b) => b.name === s.name)!.content)
    }
  })

  it('planner output schema accepts the locked shape and rejects wrong counts', () => {
    const good = makeResponse([
      [EXERCISE_CATALOG[0].id],
      [EXERCISE_CATALOG[1].id],
      [EXERCISE_CATALOG[2].id],
    ])
    expect(suggestionResponseSchema.safeParse(good).success).toBe(true)
    const bad = { ...good, options: good.options.slice(0, 2) }
    expect(suggestionResponseSchema.safeParse(bad).success).toBe(false)
  })
})
