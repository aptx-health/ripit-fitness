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
  FEW_SHOT_EXAMPLES,
  type FewShotExample,
  renderFewShotExample,
  selectFewShotExample,
} from './few-shot-examples'
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
export {
  buildSuggestRetryPrompt,
  type SuggestRetryContext,
  summarizeValidationError,
} from './retry-prompt'
export {
  buildSuggestionResponseSchema,
  type CandidateExercise,
  type ExerciseCountRange,
  exerciseCountRange,
  INTENSITY_VIBES,
  type IntensityVibe,
  OPTION_IDS,
  type OptionId,
  type SuggestedExercise,
  type SuggestionResponse,
  type SuggestWorkoutPayload,
  suggestionResponseBaseSchema,
  suggestWorkoutPayloadSchema,
  type WeeklyIntent,
  type WorkoutOption,
  wildCardNoveltyFloor,
} from './schemas'
export {
  type AssembledSuggestPrompt,
  type AssembleOptions,
  assembleSuggestWorkoutPrompt,
  estimateTokens,
  SUGGEST_WORKOUT_SYSTEM_PROMPT,
} from './system-prompt'
