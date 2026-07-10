/**
 * Zod schema for the Suggest Workout planner output — the three-option
 * shape locked in #877. Shared by the eval loop today and the real
 * planner (#880) when it lands, so eval and production validate the
 * exact same contract.
 */

import { z } from 'zod'

export const OPTION_IDS = ['user_preference', 'data_driven', 'wild_card'] as const

export const suggestedExerciseSchema = z.object({
  id: z.string().min(1),
  rationale: z.string().min(1),
})

export const suggestionOptionSchema = z.object({
  id: z.enum(OPTION_IDS),
  name: z.string().min(1),
  description: z.string().min(1),
  summary: z.string().min(1),
  exercises: z.array(suggestedExerciseSchema).min(1).max(12),
})

export const suggestionResponseSchema = z.object({
  options: z.array(suggestionOptionSchema).length(3),
  warnings: z.array(z.string()).default([]),
})

export type SuggestionResponseParsed = z.infer<typeof suggestionResponseSchema>
