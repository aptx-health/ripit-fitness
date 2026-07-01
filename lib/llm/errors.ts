/**
 * Typed errors thrown by the LLM client wrapper. Consumers can branch on
 * `instanceof` to distinguish provider failures from validation failures
 * from timeouts.
 */

export class LLMProviderError extends Error {
  readonly cause?: unknown
  readonly status?: number

  constructor(message: string, options?: { cause?: unknown; status?: number }) {
    super(message)
    this.name = 'LLMProviderError'
    this.cause = options?.cause
    this.status = options?.status
  }
}

export class LLMValidationError extends Error {
  readonly issues: unknown
  readonly rawResponse: string

  constructor(message: string, rawResponse: string, issues: unknown) {
    super(message)
    this.name = 'LLMValidationError'
    this.rawResponse = rawResponse
    this.issues = issues
  }
}

export class LLMTimeoutError extends Error {
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`LLM call exceeded ${timeoutMs}ms timeout`)
    this.name = 'LLMTimeoutError'
    this.timeoutMs = timeoutMs
  }
}
