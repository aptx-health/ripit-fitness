import type { ExerciseCountRange } from './schemas'

/**
 * Worker-level retry prompt for the Suggest Workout call.
 *
 * Two retry layers exist:
 * 1. LLMClient's internal retry (lib/llm/client.ts) re-sends the FULL
 *    original prompt plus the zod issues. The refinement messages in
 *    buildSuggestionResponseSchema are written as repair instructions,
 *    so that layer usually recovers on its own.
 * 2. If the client still throws LLMValidationError, the worker makes
 *    ONE more call with THIS prompt (#880: "one retry on validation
 *    failure"). It is a focused repair request — no profile, no
 *    training state — just the error, the rules, the valid ids, and
 *    the previous output. Roughly 1/4 the tokens of a full re-ask, and
 *    more reliable because the only task left is "fix the JSON".
 */

const MAX_PREVIOUS_OUTPUT_CHARS = 4000

export interface SuggestRetryContext {
  /** Human/model-readable summary of what failed validation. */
  errorSummary: string
  /** The raw text of the failed response. */
  previousOutput: string
  /** Full candidate id list for the request. */
  candidateIds: readonly string[]
  countRange: ExerciseCountRange
}

/**
 * Flatten zod issues (or a parse error) into short, deduplicated,
 * actionable lines. LLMValidationError exposes `issues: unknown`; this
 * accepts anything and degrades to JSON.stringify.
 */
export function summarizeValidationError(issues: unknown): string {
  if (typeof issues === 'string') return issues
  if (Array.isArray(issues)) {
    const lines = new Set<string>()
    for (const issue of issues) {
      if (issue && typeof issue === 'object' && 'message' in issue) {
        const path = Array.isArray(
          (issue as { path?: unknown[] }).path,
        )
          ? (issue as { path: unknown[] }).path.join('.')
          : ''
        const message = String((issue as { message: unknown }).message)
        lines.add(path ? `${path}: ${message}` : message)
      }
    }
    if (lines.size > 0) return [...lines].join('\n')
  }
  if (issues && typeof issues === 'object' && 'parseError' in issues) {
    return `The response was not valid JSON: ${String((issues as { parseError: unknown }).parseError)}`
  }
  return JSON.stringify(issues)
}

export function buildSuggestRetryPrompt(ctx: SuggestRetryContext): string {
  const truncated =
    ctx.previousOutput.length > MAX_PREVIOUS_OUTPUT_CHARS
      ? `${ctx.previousOutput.slice(0, MAX_PREVIOUS_OUTPUT_CHARS)}\n...(truncated)`
      : ctx.previousOutput

  return [
    'Your previous workout suggestion failed validation.',
    '',
    'Errors:',
    ctx.errorSummary,
    '',
    'Produce a corrected version of your previous response. Keep every part that was already valid — change only what the errors above require. Reply with the JSON object alone: no explanation, no markdown fences.',
    '',
    'Requirements:',
    `- Exactly 3 options with "id" values "user_preference", "data_driven", "wild_card", in that order.`,
    `- Between ${ctx.countRange.min} and ${ctx.countRange.max} exercises per option; no exercise twice in one option.`,
    '- Every exercise "id" must be one of the VALID IDS below, copied exactly.',
    '- Each option has "id", "name", "description", "summary", "exercises" (each exercise: "id", "name", "rationale").',
    '- Top level has "options" and "warnings" (use [] when there are no warnings).',
    '',
    'VALID IDS:',
    ctx.candidateIds.join(', '),
    '',
    'Your previous response:',
    truncated,
  ].join('\n')
}
