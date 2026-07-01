import type { AssembledSuggestPrompt } from './system-prompt'

/**
 * Provider-specific request builders for the Suggest Workout call.
 *
 * The shipped LLMClient (lib/llm/client.ts) speaks one dialect: chat
 * completions + response_format json_object + cleanup + zod. That is
 * the JSON-mode variant below and works on DeepInfra, Groq, Together,
 * and OpenAI. The other builders exist so #880's worker can upgrade a
 * provider to its strongest structured-output mechanism without
 * touching the prompt content — every variant wraps the SAME assembled
 * prompt.
 *
 * Reliability ladder (strongest first):
 *   1. Anthropic tool-use (forced tool call — schema enforced server-side)
 *   2. OpenAI structured outputs (json_schema strict)
 *   3. JSON mode (json_object) — current LLMClient behavior
 *   4. No schema support — prompt-only, lean on cleanup + retry
 * Regardless of variant, ALWAYS run zod validation: provider-side
 * schemas cannot check candidate-id membership, counts, or option
 * distinctness.
 */

/**
 * Hand-written (not zod-derived) so it stays inside the keyword subset
 * that BOTH Anthropic tool schemas and OpenAI strict mode accept:
 * type / properties / required / additionalProperties / enum / items /
 * description. No min/max constraints here — zod owns fine validation.
 */
export const SUGGESTION_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['options', 'warnings'],
  properties: {
    options: {
      type: 'array',
      description:
        'Exactly three options in order: user_preference, data_driven, wild_card',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'name', 'description', 'summary', 'exercises'],
        properties: {
          id: {
            type: 'string',
            enum: ['user_preference', 'data_driven', 'wild_card'],
          },
          name: { type: 'string' },
          description: {
            type: 'string',
            description: 'One sentence on what makes this option this option',
          },
          summary: {
            type: 'string',
            description: 'N exercises, ~M min, plus one line of character',
          },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'name', 'rationale'],
              properties: {
                id: {
                  type: 'string',
                  description:
                    'Copied exactly from the CANDIDATE EXERCISES list',
                },
                name: { type: 'string' },
                rationale: {
                  type: 'string',
                  description: 'One sentence grounded in the input data',
                },
              },
            },
          },
        },
      },
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
      description: 'Empty array when there is nothing to warn about',
    },
  },
} as const

export const SUGGEST_TOOL_NAME = 'submit_workout_options'

// ---------------------------------------------------------------------------
// 1. Anthropic tool-use mode (native Messages API shape)
// ---------------------------------------------------------------------------

export interface AnthropicToolRequest {
  model: string
  max_tokens: number
  system: string
  messages: Array<{ role: 'user'; content: string }>
  tools: Array<{
    name: string
    description: string
    input_schema: typeof SUGGESTION_RESPONSE_JSON_SCHEMA
  }>
  tool_choice: { type: 'tool'; name: string }
  temperature: number
}

export function buildAnthropicToolRequest(
  prompt: AssembledSuggestPrompt,
  opts: { model: string; maxTokens?: number; temperature?: number },
): AnthropicToolRequest {
  return {
    model: opts.model,
    max_tokens: opts.maxTokens ?? 3000,
    system: prompt.system,
    messages: [{ role: 'user', content: prompt.user }],
    tools: [
      {
        name: SUGGEST_TOOL_NAME,
        description:
          'Submit exactly three workout options built from the candidate exercises.',
        input_schema: SUGGESTION_RESPONSE_JSON_SCHEMA,
      },
    ],
    // Forcing the tool means the model CANNOT reply with prose — the
    // strongest schema-adherence mechanism available anywhere.
    tool_choice: { type: 'tool', name: SUGGEST_TOOL_NAME },
    temperature: opts.temperature ?? 0.2,
  }
}

/** Pull the tool input out of an Anthropic Messages response. */
export function extractAnthropicToolInput(response: unknown): unknown {
  const content = (response as { content?: unknown })?.content
  if (!Array.isArray(content)) return null
  const block = content.find(
    (b: unknown) =>
      !!b &&
      typeof b === 'object' &&
      (b as { type?: string }).type === 'tool_use' &&
      (b as { name?: string }).name === SUGGEST_TOOL_NAME,
  )
  return block ? (block as { input: unknown }).input : null
}

// ---------------------------------------------------------------------------
// 2. OpenAI structured outputs (json_schema strict)
// ---------------------------------------------------------------------------

export interface OpenAIStructuredRequest {
  model: string
  messages: Array<{ role: 'system' | 'user'; content: string }>
  response_format: {
    type: 'json_schema'
    json_schema: {
      name: string
      strict: true
      schema: typeof SUGGESTION_RESPONSE_JSON_SCHEMA
    }
  }
  temperature: number
  max_tokens?: number
}

export function buildOpenAIStructuredRequest(
  prompt: AssembledSuggestPrompt,
  opts: { model: string; maxTokens?: number; temperature?: number },
): OpenAIStructuredRequest {
  return {
    model: opts.model,
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'workout_options',
        strict: true,
        schema: SUGGESTION_RESPONSE_JSON_SCHEMA,
      },
    },
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens,
  }
}

// ---------------------------------------------------------------------------
// 3. JSON mode (json_object) — what LLMClient does today
// ---------------------------------------------------------------------------

export interface JsonModeRequest {
  system: string
  user: string
}

/**
 * The system prompt already contains the output skeleton, so JSON mode
 * needs no extra scaffolding. Provided for symmetry; calling
 * `llmClient.callWithStructuredOutput(prompt.user, schema, { system:
 * prompt.system })` is equivalent.
 */
export function buildJsonModeRequest(
  prompt: AssembledSuggestPrompt,
): JsonModeRequest {
  return { system: prompt.system, user: prompt.user }
}

// ---------------------------------------------------------------------------
// 4. No schema support at all — prompt-only fallback
// ---------------------------------------------------------------------------

export function buildNoSchemaRequest(
  prompt: AssembledSuggestPrompt,
): JsonModeRequest {
  return {
    system: prompt.system,
    user: `${prompt.user}\n\nYour entire reply must be the JSON object: the first character "{" and the last character "}".`,
  }
}

// ---------------------------------------------------------------------------
// 5. Thinking-model variant (DeepSeek-R1 class, o-series)
// ---------------------------------------------------------------------------

export interface ThinkingModelRequest extends JsonModeRequest {
  /** Reasoning models are slow — the default 60s client timeout is too tight. */
  recommendedTimeoutMs: number
}

/**
 * Reasoning models emit deliberation before the answer, which breaks
 * two assumptions of the standard path: response_format is often
 * rejected, and cleanLLMOutput extracts the FIRST balanced JSON object
 * — which may sit inside the visible reasoning. The added instruction
 * keeps braces out of the reasoning so first-object extraction stays
 * correct. Retry semantics change too: a validation failure on a
 * thinking model is usually an extraction problem, not a comprehension
 * problem, so the focused retry prompt (retry-prompt.ts) is the right
 * second call — do not re-send the full payload.
 */
export function buildThinkingModelRequest(
  prompt: AssembledSuggestPrompt,
): ThinkingModelRequest {
  return {
    system: prompt.system,
    user: `${prompt.user}\n\nThink through the selection first if you need to, but keep the reasoning free of braces or JSON fragments. End your reply with the final JSON object and nothing after it.`,
    recommendedTimeoutMs: 180_000,
  }
}
