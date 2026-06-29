import OpenAI from 'openai'
import type { z } from 'zod'

import { logger } from '@/lib/logger'

import { cleanLLMOutput } from './clean-output'
import { LLMProviderError, LLMTimeoutError, LLMValidationError } from './errors'

/**
 * Provider-agnostic LLM client wrapper.
 *
 * Uses the `openai` SDK pointed at any OpenAI-compatible endpoint (DeepInfra,
 * Together, Groq, Ollama, Anthropic-via-proxy). Provider selection is via
 * environment variables — there is no multi-provider fallback. One provider
 * per env.
 *
 * Env vars (Doppler):
 *   - LLM_PROVIDER_URL  (e.g. https://api.deepinfra.com/v1/openai)
 *   - LLM_API_KEY
 *   - LLM_MODEL         (e.g. meta-llama/Meta-Llama-3.1-70B-Instruct)
 *   - LLM_DEBUG=true    (logs full prompts/responses at debug level)
 */

export interface LLMClientConfig {
  apiKey?: string
  baseURL?: string
  model?: string
  debug?: boolean
}

export interface StructuredOutputOptions {
  /** Schema description handed to the provider for JSON-schema mode. */
  schemaName?: string
  /** System prompt prepended before the user prompt. */
  system?: string
  /** Generation temperature; defaults to 0.2 for structured output. */
  temperature?: number
  /** Max output tokens. Provider-dependent default. */
  maxTokens?: number
  /** Overall call timeout in ms. Defaults to 60_000. */
  timeoutMs?: number
  /** Override the configured model for this call. */
  model?: string
}

export interface StructuredOutputResult<T> {
  data: T
  model: string
  latencyMs: number
  retries: number
  validationFailures: number
}

const DEFAULT_TIMEOUT_MS = 60_000

function readEnv(name: string): string | undefined {
  const v = process.env[name]
  return v && v.length > 0 ? v : undefined
}

export class LLMClient {
  private readonly openai: OpenAI
  private readonly model: string
  private readonly debug: boolean

  constructor(config: LLMClientConfig = {}) {
    const apiKey = config.apiKey ?? readEnv('LLM_API_KEY')
    const baseURL = config.baseURL ?? readEnv('LLM_PROVIDER_URL')
    const model = config.model ?? readEnv('LLM_MODEL')

    if (!apiKey) {
      throw new LLMProviderError(
        'LLM_API_KEY is not configured (pass apiKey or set env var)',
      )
    }
    if (!model) {
      throw new LLMProviderError(
        'LLM_MODEL is not configured (pass model or set env var)',
      )
    }

    // dangerouslyAllowBrowser: this client is server-side only (workers,
    // API routes) but the openai SDK's browser sniff trips under vitest's
    // jsdom environment. We never bundle this for the browser.
    this.openai = new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true })
    this.model = model
    this.debug = config.debug ?? readEnv('LLM_DEBUG') === 'true'
  }

  /**
   * Issue a chat completion expecting JSON output, then validate against a
   * Zod schema. On validation failure, retries ONCE with the zod error
   * message appended to the user prompt.
   *
   * Response is run through `cleanLLMOutput` before parsing to handle the
   * common cheap-model failure modes (markdown fences, prose preambles,
   * trailing commas, single quotes).
   */
  async callWithStructuredOutput<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options: StructuredOutputOptions = {},
  ): Promise<StructuredOutputResult<T>> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const model = options.model ?? this.model
    const temperature = options.temperature ?? 0.2
    const maxTokens = options.maxTokens
    const system = options.system

    const start = Date.now()
    let retries = 0
    let validationFailures = 0
    let lastRaw = ''
    let lastIssues: unknown

    // Up to 2 attempts: original + 1 validation retry
    for (let attempt = 0; attempt < 2; attempt++) {
      const userPrompt =
        attempt === 0
          ? prompt
          : buildRetryPrompt(prompt, lastRaw, lastIssues)

      if (this.debug) {
        logger.debug(
          { model, attempt, system, userPrompt },
          '[llm] sending request',
        )
      }

      let raw: string
      try {
        raw = await this.callChatJSON({
          model,
          system,
          userPrompt,
          temperature,
          maxTokens,
          timeoutMs,
        })
      } catch (err) {
        if (err instanceof LLMTimeoutError) throw err
        throw new LLMProviderError(
          err instanceof Error ? err.message : 'LLM provider error',
          { cause: err },
        )
      }

      lastRaw = raw

      if (this.debug) {
        logger.debug({ model, attempt, raw }, '[llm] received response')
      }

      // Clean + parse + validate
      const cleaned = cleanLLMOutput(raw)
      let parsed: unknown
      try {
        parsed = JSON.parse(cleaned)
      } catch (err) {
        validationFailures++
        lastIssues = {
          parseError: err instanceof Error ? err.message : String(err),
        }
        if (attempt === 0) {
          retries++
          continue
        }
        throw new LLMValidationError(
          'LLM response is not valid JSON after cleanup',
          raw,
          lastIssues,
        )
      }

      const result = schema.safeParse(parsed)
      if (result.success) {
        return {
          data: result.data,
          model,
          latencyMs: Date.now() - start,
          retries,
          validationFailures,
        }
      }

      validationFailures++
      lastIssues = result.error.issues
      if (attempt === 0) {
        retries++
        continue
      }

      throw new LLMValidationError(
        'LLM response failed schema validation after retry',
        raw,
        result.error.issues,
      )
    }

    // Unreachable — the loop always returns or throws.
    throw new LLMProviderError('LLM call exhausted attempts without result')
  }

  private async callChatJSON(args: {
    model: string
    system?: string
    userPrompt: string
    temperature: number
    maxTokens?: number
    timeoutMs: number
  }): Promise<string> {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = []
    if (args.system) messages.push({ role: 'system', content: args.system })
    messages.push({ role: 'user', content: args.userPrompt })

    const completionPromise = this.openai.chat.completions.create({
      model: args.model,
      messages,
      temperature: args.temperature,
      max_tokens: args.maxTokens,
      // Request JSON mode where supported. Providers that don't support it
      // typically ignore the field; the prompt + cleanup handle fallback.
      response_format: { type: 'json_object' },
    })

    const completion = await withTimeout(completionPromise, args.timeoutMs)
    const content = completion.choices?.[0]?.message?.content
    if (!content) {
      throw new LLMProviderError('LLM returned empty response')
    }
    return content
  }
}

function buildRetryPrompt(
  original: string,
  previousRaw: string,
  issues: unknown,
): string {
  const issueText =
    typeof issues === 'string' ? issues : JSON.stringify(issues, null, 2)
  return [
    original,
    '',
    '---',
    'Your previous response failed validation. Please respond with valid JSON that matches the requested schema.',
    'Validation errors:',
    issueText,
    '',
    'Previous response (truncated):',
    previousRaw.slice(0, 500),
  ].join('\n')
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new LLMTimeoutError(timeoutMs)), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Lazy singleton for app code that just wants "the" LLM client. Tests
 * should construct their own `LLMClient` to control configuration.
 */
let cached: LLMClient | undefined
export function getLLMClient(): LLMClient {
  if (!cached) cached = new LLMClient()
  return cached
}

export { LLMProviderError, LLMTimeoutError, LLMValidationError }
