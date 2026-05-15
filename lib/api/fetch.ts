/**
 * Shared client fetch helper with exponential-backoff retries.
 *
 * Retries on network errors, 5xx, 408, and 429. Does NOT retry on other 4xx —
 * those represent caller bugs (validation, auth, conflict) where retrying
 * would just produce the same response.
 *
 * Callers can pass `onRetry` to surface "retrying…" UI to the user, and the
 * thrown error carries `.status` (when an HTTP response was received) plus
 * `.attempts` (how many tries were spent).
 */

const DEFAULT_MAX_RETRIES = 3
const DEFAULT_BASE_DELAY_MS = 1000

export type FetchWithRetryOptions = {
  retries?: number
  baseDelayMs?: number
  /** Called before each retry (i.e. not on the final terminal failure). */
  onRetry?: (info: { attempt: number; nextDelayMs: number; error: Error }) => void
  /** Skip retries entirely — useful for non-idempotent flows. */
  noRetry?: boolean
}

export class FetchError extends Error {
  status?: number
  attempts: number
  body?: unknown

  constructor(message: string, opts: { status?: number; attempts: number; body?: unknown }) {
    super(message)
    this.name = 'FetchError'
    this.status = opts.status
    this.attempts = opts.attempts
    this.body = opts.body
  }
}

function shouldRetryStatus(status: number): boolean {
  if (status >= 500) return true
  if (status === 408 || status === 429) return true
  return false
}

export async function fetchJsonWithRetry<T>(
  url: string,
  init: RequestInit = {},
  options: FetchWithRetryOptions = {}
): Promise<T> {
  const retries = options.noRetry ? 1 : options.retries ?? DEFAULT_MAX_RETRIES
  const baseDelay = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS
  let lastError: FetchError | null = null

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, init)

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const message =
          (body && typeof body === 'object' && 'error' in body
            ? String((body as { error: unknown }).error)
            : null) || `HTTP ${response.status}`
        const err = new FetchError(message, {
          status: response.status,
          attempts: attempt + 1,
          body,
        })

        if (!shouldRetryStatus(response.status)) throw err
        lastError = err
      } else {
        return (await response.json()) as T
      }
    } catch (caught) {
      if (caught instanceof FetchError) {
        lastError = caught
        // status-based non-retryable bail
        if (caught.status && !shouldRetryStatus(caught.status)) throw caught
      } else {
        // Network error / abort / parse error — retry.
        lastError = new FetchError(
          caught instanceof Error ? caught.message : 'Network error',
          { attempts: attempt + 1 }
        )
      }
    }

    if (attempt < retries - 1) {
      const nextDelayMs = baseDelay * 2 ** attempt
      options.onRetry?.({ attempt: attempt + 1, nextDelayMs, error: lastError })
      await new Promise((resolve) => setTimeout(resolve, nextDelayMs))
    }
  }

  // exhausted retries
  throw (
    lastError ??
    new FetchError('Request failed', { attempts: retries })
  )
}
