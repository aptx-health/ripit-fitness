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

export type LimiterGetter = () => RateLimiterRedis | RateLimiterMemory

/**
 * Check rate limit for a given limiter and key.
 * Returns a 429 NextResponse if rate limited, or null if allowed.
 */
export async function checkRateLimit(
  getLimiter: LimiterGetter,
  key: string
): Promise<NextResponse | null> {
  // Guard against empty key — would otherwise rate-limit globally
  if (!key) {
    logger.error('checkRateLimit called with empty key, allowing request')
    return null
  }

  try {
    await getLimiter().consume(key)
    return null
  } catch (rlRes: unknown) {
    // RateLimiterRes is thrown when rate limit is exceeded
    if (rlRes instanceof Error === false && rlRes && typeof rlRes === 'object' && 'msBeforeNext' in rlRes) {
      const res = rlRes as RateLimiterRes
      const retryAfter = Math.ceil(res.msBeforeNext / 1000)
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
