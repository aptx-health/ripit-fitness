/**
 * Suggest Workout prompt module. Typical worker usage:
 *
 *   const prompt = assembleSuggestWorkoutPrompt(payload)
 *   const schema = buildSuggestionResponseSchema(prompt.candidateIds, prompt.countRange)
 *   const result = await getLLMClient().callWithStructuredOutput(prompt.user, schema, { system: prompt.system })
 *
 * On LLMValidationError, make one focused retry with
 * buildSuggestRetryPrompt (see retry-prompt.ts).
 *
 * Design rationale: docs/SUGGEST_PROMPT_DESIGN.md
 */

export {
  buildSuggestionResponseSchema,
  exerciseCountRange,
  suggestionResponseBaseSchema,
  suggestWorkoutPayloadSchema,
  wildCardNoveltyFloor,
  OPTION_IDS,
  INTENSITY_VIBES,
  type CandidateExercise,
  type ExerciseCountRange,
  type IntensityVibe,
  type OptionId,
  type SuggestedExercise,
  type SuggestionResponse,
  type SuggestWorkoutPayload,
  type WeeklyIntent,
  type WorkoutOption,
} from './schemas'

export {
  assembleSuggestWorkoutPrompt,
  estimateTokens,
  SUGGEST_WORKOUT_SYSTEM_PROMPT,
  type AssembledSuggestPrompt,
  type AssembleOptions,
} from './system-prompt'

export {
  FEW_SHOT_EXAMPLES,
  renderFewShotExample,
  selectFewShotExample,
  type FewShotExample,
} from './few-shot-examples'

export {
  buildSuggestRetryPrompt,
  summarizeValidationError,
  type SuggestRetryContext,
} from './retry-prompt'

export {
  buildAnthropicToolRequest,
  buildJsonModeRequest,
  buildNoSchemaRequest,
  buildOpenAIStructuredRequest,
  buildThinkingModelRequest,
  extractAnthropicToolInput,
  SUGGEST_TOOL_NAME,
  SUGGESTION_RESPONSE_JSON_SCHEMA,
} from './provider-variants'
