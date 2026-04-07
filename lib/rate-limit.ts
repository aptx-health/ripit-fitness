import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible'
import { NextResponse } from 'next/server'
import Redis from 'ioredis'
import { logger } from '@/lib/logger'

// Lazy singleton Redis connection for rate limiting
let redisClient: Redis | null = null

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient

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

// Redis limiter factory with in-memory fallback
function createLimiter(
  keyPrefix: string,
  points: number,
  duration: number
): RateLimiterRedis | RateLimiterMemory {
  const redis = getRedisClient()
  if (!redis) {
    return createMemoryLimiter(points, duration)
  }

  return new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: `rl:${keyPrefix}`,
    points,
    duration,
    inMemoryBlockOnConsumed: points + 1,
    inMemoryBlockDuration: duration,
    insuranceLimiter: createMemoryLimiter(points, duration),
  })
}

/**
 * Set logging (draft sync, per-set upsert, set delete)
 * High frequency during workouts: 60 req / 10s per user
 */
export const setLoggingLimiter = createLimiter('sets', 60, 10)

/**
 * Workout actions (complete, skip, clear)
 * Lower frequency actions: 10 req / 10s per user
 */
export const workoutActionLimiter = createLimiter('workout-actions', 10, 10)

/**
 * Program management (create, duplicate, activate, archive, etc.)
 * Moderate editing pace: 20 req / 60s per user
 */
export const programManagementLimiter = createLimiter('program-mgmt', 20, 60)

/**
 * Destructive operations (delete week/workout/exercise)
 * Prevent accidental mass deletion: 10 req / 60s per user
 */
export const destructiveOpLimiter = createLimiter('destructive', 10, 60)

/**
 * Community clone (enqueues BullMQ jobs)
 * Protect the queue: 3 req / 60s per user
 */
export const communityCloneLimiter = createLimiter('clone', 3, 60)

/**
 * Admin endpoints: 30 req / 60s per user
 */
export const adminLimiter = createLimiter('admin', 30, 60)

/**
 * Check rate limit for a given limiter and key.
 * Returns a 429 NextResponse if rate limited, or null if allowed.
 */
export async function checkRateLimit(
  limiter: RateLimiterRedis | RateLimiterMemory,
  key: string
): Promise<NextResponse | null> {
  try {
    await limiter.consume(key)
    return null
  } catch (rlRes: unknown) {
    // RateLimiterRes is thrown when rate limit is exceeded
    if (
      rlRes &&
      typeof rlRes === 'object' &&
      'msBeforeNext' in rlRes &&
      typeof (rlRes as { msBeforeNext: number }).msBeforeNext === 'number'
    ) {
      const retryAfter = Math.ceil(
        (rlRes as { msBeforeNext: number }).msBeforeNext / 1000
      )
      logger.warn({ key, retryAfter }, 'Rate limit exceeded')
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      )
    }

    // Unexpected error from rate limiter — allow the request through
    // rather than blocking legitimate users
    logger.error({ error: rlRes, key }, 'Rate limiter error, allowing request')
    return null
  }
}
