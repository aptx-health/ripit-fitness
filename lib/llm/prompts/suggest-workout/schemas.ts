import { z } from 'zod'

/**
 * Zod schemas for the Suggest Workout LLM call.
 *
 * Input side: `suggestWorkoutPayloadSchema` validates the training-state
 * builder's output (locked contract — issue #877 comment) BEFORE we spend
 * LLM tokens on it. It is deliberately tolerant of extra keys so the
 * payload can grow without breaking the prompt layer.
 *
 * Output side: `buildSuggestionResponseSchema` produces a per-request
 * schema whose refinement messages are written FOR THE MODEL — the LLM
 * client appends zod issues verbatim to its retry prompt, so every
 * message here doubles as repair instructions.
 */

export const OPTION_IDS = ['user_preference', 'data_driven', 'wild_card'] as const
export type OptionId = (typeof OPTION_IDS)[number]

export const INTENSITY_VIBES = ['easy', 'solid', 'heavy'] as const
export type IntensityVibe = (typeof INTENSITY_VIBES)[number]

// ---------------------------------------------------------------------------
// Input payload (training-state builder → prompt assembler)
// ---------------------------------------------------------------------------

/** Weekly intent discriminated union — mirrors issue #884. */
export const weeklyIntentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('heavy_session'),
    muscle_group: z.enum(['legs', 'upper', 'pull', 'push']),
    min_per_week: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('volume_tilt'),
    toward: z.array(z.string()),
    away_from: z.array(z.string()),
    ratio: z.number(),
  }),
  z.object({
    type: z.literal('movement_frequency'),
    movement_pattern: z.string(),
    min_per_week: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('free_text'),
    text: z.string(),
  }),
])
export type WeeklyIntent = z.infer<typeof weeklyIntentSchema>

export const durableProfileSchema = z.object({
  goal_sentences: z.array(z.string()),
  weekly_intent: z.array(weeklyIntentSchema),
  equipment_available: z.array(z.string()),
  banned_exercise_ids: z.array(z.string()),
  default_intensity_preference: z
    .enum(['hypertrophy', 'strength', 'balanced'])
    .nullable(),
  ratio_targets: z.record(z.string(), z.number()),
})

export const ephemeralContextSchema = z.object({
  time_budget_minutes: z.number().int().min(10).max(240),
  intensity_vibe: z.enum(INTENSITY_VIBES).nullable(),
  deprioritize_freetext: z.string().nullable(),
  prioritize_freetext: z.string().nullable(),
  equipment_override: z.array(z.string()).nullable(),
})

export const perFauStateSchema = z.object({
  fau: z.string(),
  last_session_days_ago: z.number().nullable(),
  last_heavy_days_ago: z.number().nullable(),
  rolling_7d_sets: z.number(),
  rolling_14d_sets: z.number(),
  target_share: z.number(),
  actual_14d_share: z.number(),
  /** Positive = under-trained relative to target. */
  deficit_share: z.number(),
  status: z.enum(['neglected', 'balanced', 'over']),
})

export const movementCalibrationSchema = z.object({
  movement_pattern: z.string(),
  current_ewma_top_weight_lbs: z.number(),
  recent_observations: z.array(z.number()),
  typical_rep_range: z.string(),
  // Nullable (deviation from the #877 sample, which showed a bare number):
  // RPE logging is opt-in, so the builder cannot always produce one.
  typical_rpe: z.number().nullable(),
  last_session_days_ago: z.number(),
})

export const weeklyIntentStatusSchema = z.object({
  intent_summary: z.string(),
  satisfied_this_week: z.boolean(),
  /** Populated iff satisfied_this_week === true (spec rule 3). */
  evidence: z.string().optional(),
  /** Populated iff satisfied_this_week === false (spec rule 4). */
  last_satisfied_days_ago: z.number().nullable().optional(),
})

export const goalProgressSchema = z.object({
  goal: z.string(),
  interpretation: z.string(),
  recent_top_sets_lbs: z.array(z.number()),
  trend: z.enum(['progressing', 'stalled', 'regressing', 'new']),
  weeks_observed: z.number(),
})

export const recentFeedbackSchema = z.object({
  suggestions_last_30d: z.number(),
  swap_rate: z.number(),
  common_swaps: z.array(
    z.object({ from: z.string(), to: z.string(), count: z.number() }),
  ),
  common_additions_fau: z.array(z.string()),
  common_deletions_fau: z.array(z.string()),
})

export const preferencesSummarySchema = z.object({
  high_confidence_likes: z.array(z.string()),
  high_confidence_dislikes: z.array(z.string()),
  low_confidence_note: z.string().optional(),
})

export const trainingStateSchema = z.object({
  now: z.string(),
  today_dow: z.string(),
  per_fau: z.array(perFauStateSchema),
  per_movement_calibration: z.array(movementCalibrationSchema),
  weekly_intent_status: z.array(weeklyIntentStatusSchema),
  goal_progress: z.array(goalProgressSchema),
  recent_feedback: recentFeedbackSchema,
  preferences_summary: preferencesSummarySchema,
})

export const candidateExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  primary_faus: z.array(z.string()),
  secondary_faus: z.array(z.string()),
  equipment: z.string(),
  /** null = untagged; the LLM infers from name/FAUs (locked decision). */
  movement_pattern: z.string().nullable(),
  intensity_class: z.enum(['heavy', 'moderate', 'light']),
  /** Present only when Beta-distribution confidence is high (spec rule 8). */
  user_preference_score: z.number().optional(),
  user_preference_confidence: z.literal('high').optional(),
})
export type CandidateExercise = z.infer<typeof candidateExerciseSchema>

export const suggestWorkoutPayloadSchema = z.object({
  durable_profile: durableProfileSchema,
  ephemeral_context: ephemeralContextSchema,
  training_state: trainingStateSchema,
  candidate_exercises: z.array(candidateExerciseSchema).min(1),
})
export type SuggestWorkoutPayload = z.infer<typeof suggestWorkoutPayloadSchema>

// ---------------------------------------------------------------------------
// Exercise count budgeting (shared by prompt text AND output validation so
// the instruction and the check can never drift apart)
// ---------------------------------------------------------------------------

export interface ExerciseCountRange {
  min: number
  max: number
}

/**
 * Time budget → exercise count. Assumes ~8 minutes per exercise including
 * rest and setup (v1 has no sets/reps — the user logs those live).
 */
export function exerciseCountRange(timeBudgetMinutes: number): ExerciseCountRange {
  if (timeBudgetMinutes <= 20) return { min: 2, max: 3 }
  if (timeBudgetMinutes <= 35) return { min: 3, max: 5 }
  if (timeBudgetMinutes <= 50) return { min: 4, max: 6 }
  if (timeBudgetMinutes <= 75) return { min: 5, max: 8 }
  return { min: 6, max: 10 }
}

/**
 * How many wild_card exercises must appear in neither other option.
 * Short sessions get a lower bar — there isn't room for two novelties
 * in a 2-exercise workout.
 */
export function wildCardNoveltyFloor(countRange: ExerciseCountRange): number {
  return countRange.min <= 3 ? 1 : 2
}

// ---------------------------------------------------------------------------
// LLM output
// ---------------------------------------------------------------------------

export const suggestedExerciseSchema = z.object({
  id: z.string().min(1),
  // The model echoes the candidate's name next to its id. This is a
  // grounding device (binds attention to a real candidate row), not data —
  // the transform step reads the canonical name from the DB. Presence-only
  // validation: a paraphrased name must never fail a correct id.
  name: z.string().min(1),
  rationale: z.string().min(1).max(240),
})
export type SuggestedExercise = z.infer<typeof suggestedExerciseSchema>

export const workoutOptionSchema = z.object({
  id: z.enum(OPTION_IDS),
  name: z.string().min(1).max(60),
  description: z.string().min(1).max(240),
  summary: z.string().min(1).max(240),
  exercises: z.array(suggestedExerciseSchema).min(1),
})
export type WorkoutOption = z.infer<typeof workoutOptionSchema>

/**
 * Structure-only output schema. Use `buildSuggestionResponseSchema` for
 * real calls — it adds the per-request semantic checks (candidate ids,
 * counts, distinctness).
 */
export const suggestionResponseBaseSchema = z.object({
  options: z.array(workoutOptionSchema).length(3),
  // default([]) — a missing warnings key must not burn a retry.
  warnings: z.array(z.string().min(1).max(300)).max(5).default([]),
})
export type SuggestionResponse = z.infer<typeof suggestionResponseBaseSchema>

function setEquals(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

/**
 * Per-request output schema. Every refinement message is phrased as a
 * repair instruction because the LLM client feeds zod issues straight
 * back to the model on its internal retry.
 */
export function buildSuggestionResponseSchema(
  candidateIds: Iterable<string>,
  countRange: ExerciseCountRange,
): z.ZodType<SuggestionResponse> {
  const validIds = new Set(candidateIds)
  const noveltyFloor = wildCardNoveltyFloor(countRange)

  return suggestionResponseBaseSchema.superRefine((res, ctx) => {
    const idSets = res.options.map(
      (o) => new Set(o.exercises.map((e) => e.id)),
    )

    res.options.forEach((option, i) => {
      if (option.id !== OPTION_IDS[i]) {
        ctx.addIssue({
          code: 'custom',
          path: ['options', i, 'id'],
          message: `options[${i}].id must be "${OPTION_IDS[i]}". The three options must appear in this exact order: user_preference, data_driven, wild_card.`,
        })
      }

      const unknown = option.exercises
        .map((e) => e.id)
        .filter((id) => !validIds.has(id))
      if (unknown.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['options', i, 'exercises'],
          message: `These exercise ids do not exist: ${unknown.join(', ')}. Replace each with an id copied exactly from the CANDIDATE EXERCISES list. Do not invent ids.`,
        })
      }

      const seen = new Set<string>()
      const dupes = new Set<string>()
      for (const e of option.exercises) {
        if (seen.has(e.id)) dupes.add(e.id)
        seen.add(e.id)
      }
      if (dupes.size > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['options', i, 'exercises'],
          message: `Duplicate exercises in ${option.id}: ${[...dupes].join(', ')}. Each exercise may appear at most once per option.`,
        })
      }

      const n = option.exercises.length
      if (n < countRange.min || n > countRange.max) {
        ctx.addIssue({
          code: 'custom',
          path: ['options', i, 'exercises'],
          message: `${option.id} has ${n} exercises but the time budget requires between ${countRange.min} and ${countRange.max}. Add or remove exercises to fit.`,
        })
      }
    })

    // Distinctness backstops. The option recipes in the system prompt do
    // the real work; these catch collapse.
    if (res.options.length === 3) {
      if (setEquals(idSets[0], idSets[1])) {
        ctx.addIssue({
          code: 'custom',
          path: ['options', 1, 'exercises'],
          message:
            'user_preference and data_driven contain the same exercises. data_driven must be built from training-state deficits and weekly intent, not from today\'s request — change at least two of its exercises.',
        })
      }
      const novel = [...idSets[2]].filter(
        (id) => !idSets[0].has(id) && !idSets[1].has(id),
      )
      if (novel.length < noveltyFloor) {
        ctx.addIssue({
          code: 'custom',
          path: ['options', 2, 'exercises'],
          message: `wild_card must include at least ${noveltyFloor} exercise(s) that appear in neither other option. Swap in something the user rarely does.`,
        })
      }
    }
  })
}
