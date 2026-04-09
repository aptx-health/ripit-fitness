import {
  RateLimiterRedis,
  RateLimiterMemory,
  type RateLimiterRes,
} from 'rate-limiter-flexible'
import { NextResponse } from 'next/server'
import Redis from 'ioredis'
import { logger } from '@/lib/logger'

// Lazy singleton Redis connection for rate limiting
let redisClient: Redis | null = null
let redisInitAttempted = false

function getRedisClient(): Redis | null {
  if (redisInitAttempted) return redisClient
  redisInitAttempted = true

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    logger.warn('REDIS_URL not set, falling back to in-memory rate limiting')
    return null
  }

  try {
    redisClient = new Redis(redisUrl, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    })

    redisClient.on('error', (err) => {
      logger.error({ error: err }, 'Rate limiter Redis connection error')
    })

    return redisClient
  } catch {
    logger.warn('Failed to create Redis client for rate limiting, using in-memory fallback')
    return null
  }
}

// --- Pre-configured limiters ---

// In-memory fallback limiter factory (used when Redis is unavailable)
function createMemoryLimiter(points: number, duration: number) {
  return new RateLimiterMemory({ points, duration })
}

type LimiterConfig = { keyPrefix: string; points: number; duration: number }

// Lazy limiter factory: defers Redis client construction until first use
// so module import (during build, edge analysis, etc.) doesn't lock us
// into the in-memory fallback before REDIS_URL is available at runtime.
function lazyLimiter(
  config: LimiterConfig
): () => RateLimiterRedis | RateLimiterMemory {
  let instance: RateLimiterRedis | RateLimiterMemory | null = null
  return () => {
    if (instance) return instance
    const redis = getRedisClient()
    if (!redis) {
      logger.warn(
        { keyPrefix: config.keyPrefix },
        'Rate limiter using in-memory fallback (no Redis)'
      )
      instance = createMemoryLimiter(config.points, config.duration)
      return instance
    }
    instance = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `rl:${config.keyPrefix}`,
      points: config.points,
      duration: config.duration,
      inMemoryBlockOnConsumed: config.points + 1,
      inMemoryBlockDuration: config.duration,
      insuranceLimiter: createMemoryLimiter(config.points, config.duration),
    })
    return instance
  }
}

/**
 * Set logging (draft sync, per-set upsert, set delete)
 * High frequency during workouts: 60 req / 10s per user
 */
export const setLoggingLimiter = lazyLimiter({ keyPrefix: 'sets', points: 60, duration: 10 })

/**
 * Workout actions (complete, skip, clear)
 * Lower frequency actions: 10 req / 10s per user
 */
export const workoutActionLimiter = lazyLimiter({ keyPrefix: 'workout-actions', points: 10, duration: 10 })

/**
 * Program management (create, duplicate, activate, archive, etc.)
 * Moderate editing pace: 20 req / 60s per user
 */
export const programManagementLimiter = lazyLimiter({ keyPrefix: 'program-mgmt', points: 20, duration: 60 })

/**
 * Destructive operations (delete week/workout/exercise)
 * Prevent accidental mass deletion: 10 req / 60s per user
 */
export const destructiveOpLimiter = lazyLimiter({ keyPrefix: 'destructive', points: 10, duration: 60 })

/**
 * Community clone (enqueues BullMQ jobs)
 * Protect the queue: 3 req / 60s per user
 */
export const communityCloneLimiter = lazyLimiter({ keyPrefix: 'clone', points: 3, duration: 60 })

/**
 * Admin endpoints: 30 req / 60s per user
 */
export const adminLimiter = lazyLimiter({ keyPrefix: 'admin', points: 30, duration: 60 })

/**
 * Sensitive auth endpoints that bypass BetterAuth's built-in limiter
 * (e.g. /api/auth/complete-profile). IP-keyed to protect against
 * credential-stuffing-style abuse on account linking.
 * Tight budget: 5 req / 60s per IP.
 */
export const authSensitiveLimiter = lazyLimiter({
  keyPrefix: 'auth-sensitive',
  points: 5,
  duration: 60,
})

/**
 * Feedback submissions.
 * Replaces a DB-count-based check that hit Postgres on every POST.
 * 5 req / 3600s (hour) per user — matches the prior limit.
 */
export const feedbackSubmissionLimiter = lazyLimiter({
  keyPrefix: 'feedback',
  points: 5,
  duration: 3600,
})

/**
 * Analytics event ingestion.
 * Batched from the client: 30 req / 60s per user.
 */
export const eventIngestionLimiter = lazyLimiter({
  keyPrefix: 'events',
  points: 30,
  duration: 60,
})

export type LimiterGetter = () => RateLimiterRedis | RateLimiterMemory

/**
 * Parse a limiter's config out of its instance. Used to expose
 * X-RateLimit-Limit without duplicating config in call sites.
 */
function getLimiterPoints(limiter: RateLimiterRedis | RateLimiterMemory): number {
  // Both classes expose `points` on the instance.
  return (limiter as { points: number }).points
}

function buildRateLimitHeaders(
  limit: number,
  remaining: number,
  msBeforeNext: number
): Record<string, string> {
  const resetEpoch = Math.ceil((Date.now() + msBeforeNext) / 1000)
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    'X-RateLimit-Reset': String(resetEpoch),
  }
}

export interface RateLimitResult {
  /** A 429 response to return to the client, or null if the request may proceed. */
  response: NextResponse | null
  /** Headers to attach to the final response (whether 200 or 429). */
  headers: Record<string, string>
}

/**
 * Check rate limit for a given limiter and key.
 *
 * Preferred modern shape — returns both the (possibly null) 429 response
 * AND a header map that the caller should merge onto their successful
 * response so clients can self-throttle.
 *
 * Short-circuits in NODE_ENV=test so integration tests don't flake.
 */
export async function checkRateLimitWithHeaders(
  getLimiter: LimiterGetter,
  key: string,
  ctx: { endpoint?: string } = {}
): Promise<RateLimitResult> {
  // Test bypass — tests run against testcontainers and shouldn't be subject
  // to rate limits. Explicit bypass is cleaner than relying on Redis being
  // absent.
  if (process.env.NODE_ENV === 'test') {
    return { response: null, headers: {} }
  }

  // Guard against empty key — would otherwise rate-limit globally
  if (!key) {
    logger.error({ endpoint: ctx.endpoint }, 'checkRateLimit called with empty key, allowing request')
    return { response: null, headers: {} }
  }

  const limiter = getLimiter()
  const limit = getLimiterPoints(limiter)

  try {
    const res = await limiter.consume(key)
    return {
      response: null,
      headers: buildRateLimitHeaders(limit, res.remainingPoints, res.msBeforeNext),
    }
  } catch (rlRes: unknown) {
    // RateLimiterRes is thrown when rate limit is exceeded
    if (rlRes instanceof Error === false && rlRes && typeof rlRes === 'object' && 'msBeforeNext' in rlRes) {
      const res = rlRes as RateLimiterRes
      const retryAfter = Math.ceil(res.msBeforeNext / 1000)
      const headers = {
        ...buildRateLimitHeaders(limit, 0, res.msBeforeNext),
        'Retry-After': String(retryAfter),
      }
      // Info level (not warn) — hitting a rate limit is expected and is
      // useful telemetry for tuning, not an alertable event.
      logger.info(
        { key, retryAfter, endpoint: ctx.endpoint, limit },
        'rate limit hit'
      )
      return {
        response: NextResponse.json({ error: 'Too many requests' }, { status: 429, headers }),
        headers,
      }
    }

    // Unexpected error from rate limiter — fail open rather than blocking
    // legitimate users.
    logger.error({ error: rlRes, key, endpoint: ctx.endpoint }, 'Rate limiter error, allowing request')
    return { response: null, headers: {} }
  }
}

/**
 * Backwards-compatible wrapper returning just the 429 response (if any).
 * Existing call sites can continue to use this; new call sites should
 * prefer `checkRateLimitWithHeaders` so clients get X-RateLimit-* headers
 * on successful responses.
 */
export async function checkRateLimit(
  getLimiter: LimiterGetter,
  key: string
): Promise<NextResponse | null> {
  const { response } = await checkRateLimitWithHeaders(getLimiter, key)
  return response
}

/**
 * Merges X-RateLimit-* headers from a RateLimitResult onto a successful
 * NextResponse. No-op if the result has no headers (test bypass, fail-open).
 *
 * Usage:
 * ```ts
 * const rl = await checkRateLimitWithHeaders(limiter, user.id, { endpoint: '...' })
 * if (rl.response) return rl.response
 * // ... do work ...
 * return withRateLimitHeaders(NextResponse.json(data), rl)
 * ```
 */
export function withRateLimitHeaders(
  response: NextResponse,
  rl: RateLimitResult
): NextResponse {
  for (const [k, v] of Object.entries(rl.headers)) {
    response.headers.set(k, v)
  }
  return response
}

/**
 * Extracts a stable IP address from a NextRequest for IP-keyed rate limits.
 * Falls back to a synthetic key so we never rate-limit globally on empty.
 */
export function getClientIp(request: Request): string {
  const headers = request.headers
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}
