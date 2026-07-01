import { describe, it, expect } from 'vitest'

import {
  buildSuggestionResponseSchema,
  exerciseCountRange,
  suggestWorkoutPayloadSchema,
  type SuggestionResponse,
  type SuggestWorkoutPayload,
} from '@/lib/llm/prompts/suggest-workout/schemas'
import {
  assembleSuggestWorkoutPrompt,
  estimateTokens,
} from '@/lib/llm/prompts/suggest-workout/system-prompt'
import {
  FEW_SHOT_EXAMPLES,
  selectFewShotExample,
} from '@/lib/llm/prompts/suggest-workout/few-shot-examples'
import {
  buildSuggestRetryPrompt,
  summarizeValidationError,
} from '@/lib/llm/prompts/suggest-workout/retry-prompt'

function buildTestPayload(
  overrides: {
    timeBudget?: number
    candidateCount?: number
    goalSentences?: string[]
    prioritize?: string | null
    calibration?: boolean
  } = {},
): SuggestWorkoutPayload {
  const candidateCount = overrides.candidateCount ?? 12
  const payload: SuggestWorkoutPayload = {
    durable_profile: {
      goal_sentences: overrides.goalSentences ?? ['Upper-body hypertrophy focus'],
      weekly_intent: [
        { type: 'heavy_session', muscle_group: 'legs', min_per_week: 1 },
      ],
      equipment_available: ['barbell', 'dumbbells', 'cable', 'machines'],
      banned_exercise_ids: [],
      default_intensity_preference: 'hypertrophy',
      ratio_targets: { chest: 1.3, 'mid-back': 1.2 },
    },
    ephemeral_context: {
      time_budget_minutes: overrides.timeBudget ?? 45,
      intensity_vibe: 'solid',
      deprioritize_freetext: 'legs sore',
      prioritize_freetext:
        overrides.prioritize === undefined
          ? 'want to hit chest hard'
          : overrides.prioritize,
      equipment_override: null,
    },
    training_state: {
      now: '2026-06-29T18:00:00Z',
      today_dow: 'monday',
      per_fau: [
        {
          fau: 'chest',
          last_session_days_ago: 3,
          last_heavy_days_ago: 3,
          rolling_7d_sets: 12,
          rolling_14d_sets: 21,
          target_share: 0.1,
          actual_14d_share: 0.07,
          deficit_share: 0.03,
          status: 'neglected',
        },
        {
          fau: 'quads',
          last_session_days_ago: 9,
          last_heavy_days_ago: null,
          rolling_7d_sets: 0,
          rolling_14d_sets: 4,
          target_share: 0.08,
          actual_14d_share: 0.03,
          deficit_share: 0.05,
          status: 'neglected',
        },
      ],
      per_movement_calibration: overrides.calibration === false
        ? []
        : [
            {
              movement_pattern: 'horizontal_push',
              current_ewma_top_weight_lbs: 192,
              recent_observations: [185, 190, 190, 195, 195],
              typical_rep_range: '5-8',
              typical_rpe: 8,
              last_session_days_ago: 3,
            },
          ],
      weekly_intent_status: [
        {
          intent_summary: 'At least 1 heavy legs session per week',
          satisfied_this_week: false,
          last_satisfied_days_ago: 8,
        },
      ],
      goal_progress: [],
      recent_feedback: {
        suggestions_last_30d: 0,
        swap_rate: 0,
        common_swaps: [],
        common_additions_fau: [],
        common_deletions_fau: [],
      },
      preferences_summary: {
        high_confidence_likes: [],
        high_confidence_dislikes: [],
      },
    },
    candidate_exercises: Array.from({ length: candidateCount }, (_, i) => ({
      id: `exr_${i.toString().padStart(3, '0')}`,
      name: `Exercise ${i}`,
      primary_faus: i % 2 === 0 ? ['chest'] : ['quads'],
      secondary_faus: [],
      equipment: 'dumbbells',
      movement_pattern: i % 2 === 0 ? 'horizontal_push' : 'squat',
      intensity_class: 'moderate',
    })),
  }
  return payload
}

function buildValidResponse(ids: string[]): SuggestionResponse {
  const exercise = (id: string) => ({
    id,
    name: 'Exercise',
    rationale: 'Grounded in the data.',
  })
  return {
    options: [
      {
        id: 'user_preference',
        name: 'User Preference',
        description: 'Honors the request.',
        summary: '4 exercises, ~40 min.',
        exercises: [ids[0], ids[2], ids[4], ids[6]].map(exercise),
      },
      {
        id: 'data_driven',
        name: 'Data Driven',
        description: 'Attacks deficits.',
        summary: '4 exercises, ~40 min.',
        exercises: [ids[1], ids[3], ids[5], ids[7]].map(exercise),
      },
      {
        id: 'wild_card',
        name: 'Wild Card',
        description: 'Something different.',
        summary: '4 exercises, ~40 min.',
        exercises: [ids[8], ids[9], ids[0], ids[1]].map(exercise),
      },
    ],
    warnings: [],
  }
}

describe('few-shot examples', () => {
  it.each(FEW_SHOT_EXAMPLES.map((e) => [e.archetype, e] as const))(
    '%s example output passes its own validation schema',
    (_name, example) => {
      const schema = buildSuggestionResponseSchema(
        example.candidateIds,
        exerciseCountRange(example.timeBudgetMinutes),
      )
      const result = schema.safeParse(example.output)
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true)
    },
  )

  it('selects beginner example when calibration is empty', () => {
    const payload = buildTestPayload({ calibration: false })
    expect(selectFewShotExample(payload).archetype).toBe('beginner')
  })

  it('selects short-session example for tight time budgets', () => {
    const payload = buildTestPayload({ timeBudget: 20 })
    expect(selectFewShotExample(payload).archetype).toBe('short-session')
  })

  it('selects cyclist example on keyword match', () => {
    const payload = buildTestPayload({
      goalSentences: ['Spare legs for biking'],
      prioritize: 'biking tomorrow',
    })
    expect(selectFewShotExample(payload).archetype).toBe('cyclist')
  })
})

describe('assembleSuggestWorkoutPrompt', () => {
  it('validates against the payload schema and assembles within budget', () => {
    const payload = buildTestPayload()
    expect(suggestWorkoutPayloadSchema.safeParse(payload).success).toBe(true)

    const prompt = assembleSuggestWorkoutPrompt(payload)
    expect(prompt.estimatedTokens).toBeLessThanOrEqual(6000)
    expect(prompt.exampleArchetype).not.toBeNull()
    // Every candidate id appears in the user message
    for (const id of prompt.candidateIds) {
      expect(prompt.user).toContain(id)
    }
    // Ephemeral context sits after the candidate list (recency position)
    expect(prompt.user.indexOf("TODAY'S REQUEST")).toBeGreaterThan(
      prompt.user.indexOf('CANDIDATE EXERCISES'),
    )
    expect(prompt.user).toContain('want to hit chest hard')
    expect(prompt.user).toContain('legs sore')
  })

  it('drops the example when a large payload would exceed the budget', () => {
    const payload = buildTestPayload({ candidateCount: 400 })
    const prompt = assembleSuggestWorkoutPrompt(payload)
    expect(prompt.exampleArchetype).toBeNull()
    expect(prompt.user).not.toContain('EXAMPLE')
  })

  it('estimates tokens as chars/4', () => {
    expect(estimateTokens('abcd'.repeat(10))).toBe(10)
  })
})

describe('buildSuggestionResponseSchema', () => {
  const payload = buildTestPayload()
  const ids = payload.candidate_exercises.map((c) => c.id)
  const range = exerciseCountRange(45)
  const schema = buildSuggestionResponseSchema(ids, range)

  it('accepts a valid response', () => {
    const result = schema.safeParse(buildValidResponse(ids))
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true)
  })

  it('rejects hallucinated ids with the offending id in the message', () => {
    const response = buildValidResponse(ids)
    response.options[0].exercises[0].id = 'exr_fake'
    const result = schema.safeParse(response)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('exr_fake')
  })

  it('rejects duplicate exercises within an option', () => {
    const response = buildValidResponse(ids)
    response.options[0].exercises[1].id =
      response.options[0].exercises[0].id
    const result = schema.safeParse(response)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('Duplicate')
  })

  it('rejects out-of-order option ids', () => {
    const response = buildValidResponse(ids)
    const [a, b] = [response.options[0], response.options[1]]
    response.options[0] = { ...b }
    response.options[1] = { ...a }
    const result = schema.safeParse(response)
    expect(result.success).toBe(false)
  })

  it('rejects identical user_preference and data_driven', () => {
    const response = buildValidResponse(ids)
    response.options[1].exercises = response.options[0].exercises.map((e) => ({
      ...e,
    }))
    const result = schema.safeParse(response)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('data_driven')
  })

  it('rejects a wild_card with no novel exercises', () => {
    const response = buildValidResponse(ids)
    response.options[2].exercises = [
      ...response.options[0].exercises.slice(0, 2),
      ...response.options[1].exercises.slice(0, 2),
    ].map((e) => ({ ...e }))
    const result = schema.safeParse(response)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('wild_card')
  })

  it('rejects exercise counts outside the time budget range', () => {
    const response = buildValidResponse(ids)
    response.options[0].exercises = response.options[0].exercises.slice(0, 2)
    const result = schema.safeParse(response)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('time budget')
  })

  it('defaults a missing warnings key instead of failing', () => {
    const response = buildValidResponse(ids) as Record<string, unknown>
    delete response.warnings
    const result = schema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.warnings).toEqual([])
  })
})

describe('retry prompt', () => {
  it('includes errors, valid ids, count range, and previous output', () => {
    const prompt = buildSuggestRetryPrompt({
      errorSummary: 'These exercise ids do not exist: exr_fake.',
      previousOutput: '{"options": []}',
      candidateIds: ['exr_001', 'exr_002'],
      countRange: { min: 4, max: 6 },
    })
    expect(prompt).toContain('exr_fake')
    expect(prompt).toContain('exr_001, exr_002')
    expect(prompt).toContain('4 and 6')
    expect(prompt).toContain('{"options": []}')
  })

  it('summarizes zod-style issues with deduplication', () => {
    const summary = summarizeValidationError([
      { path: ['options', 0, 'exercises'], message: 'Bad id' },
      { path: ['options', 0, 'exercises'], message: 'Bad id' },
      { path: ['warnings'], message: 'Too many' },
    ])
    expect(summary).toBe('options.0.exercises: Bad id\nwarnings: Too many')
  })

  it('summarizes parse errors', () => {
    const summary = summarizeValidationError({ parseError: 'Unexpected token' })
    expect(summary).toContain('not valid JSON')
  })
})
