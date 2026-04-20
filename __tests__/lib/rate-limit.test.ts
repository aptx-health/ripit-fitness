import { NextResponse } from 'next/server'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { afterEach, beforeEach, describe, expect, it, } from 'vitest'
import {
  checkRateLimit,
  checkRateLimitWithHeaders,
  getClientIp,
  withRateLimitHeaders,
} from '@/lib/rate-limit'

/**
 * Tests for lib/rate-limit.
 *
 * By default NODE_ENV=test short-circuits checkRateLimit to allow all
 * requests (so API integration tests aren't rate-limited). To actually
 * exercise the limiter behavior we temporarily flip NODE_ENV inside each
 * test that needs it.
 */

function makeLimiter(points: number, duration = 60) {
  const instance = new RateLimiterMemory({ points, duration })
  return () => instance
}

describe('rate-limit', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    // @ts-expect-error — test env override
    process.env.NODE_ENV = originalEnv
  })

  describe('test env bypass', () => {
    it('returns no-op result when NODE_ENV=test regardless of limiter state', async () => {
      // @ts-expect-error — test env override
      process.env.NODE_ENV = 'test'
      const limiter = makeLimiter(1)
      // Consume the single point first
      await limiter().consume('user-1')
      // Still allowed because we short-circuit in test
      const result = await checkRateLimitWithHeaders(limiter, 'user-1')
      expect(result.response).toBeNull()
      expect(result.headers).toEqual({})
    })
  })

  describe('checkRateLimitWithHeaders', () => {
    beforeEach(() => {
      // @ts-expect-error — deliberately flip out of test mode to exercise logic
      process.env.NODE_ENV = 'development'
    })

    it('allows requests under the limit and emits X-RateLimit headers', async () => {
      const limiter = makeLimiter(3)
      const res = await checkRateLimitWithHeaders(limiter, 'user-1')
      expect(res.response).toBeNull()
      expect(res.headers['X-RateLimit-Limit']).toBe('3')
      expect(res.headers['X-RateLimit-Remaining']).toBe('2')
      expect(res.headers['X-RateLimit-Reset']).toMatch(/^\d+$/)
    })

    it('returns 429 with Retry-After when the limit is exceeded', async () => {
      const limiter = makeLimiter(2)
      await checkRateLimitWithHeaders(limiter, 'user-1')
      await checkRateLimitWithHeaders(limiter, 'user-1')
      const res = await checkRateLimitWithHeaders(limiter, 'user-1')
      expect(res.response).not.toBeNull()
      expect(res.response?.status).toBe(429)
      expect(res.headers['Retry-After']).toMatch(/^\d+$/)
      expect(res.headers['X-RateLimit-Remaining']).toBe('0')
    })

    it('keys are isolated — user-1 exhaustion does not affect user-2', async () => {
      const limiter = makeLimiter(1)
      const first = await checkRateLimitWithHeaders(limiter, 'user-1')
      const secondSameUser = await checkRateLimitWithHeaders(limiter, 'user-1')
      const otherUser = await checkRateLimitWithHeaders(limiter, 'user-2')
      expect(first.response).toBeNull()
      expect(secondSameUser.response?.status).toBe(429)
      expect(otherUser.response).toBeNull()
    })

    it('fails open on empty key rather than rate-limiting globally', async () => {
      const limiter = makeLimiter(1)
      const res = await checkRateLimitWithHeaders(limiter, '')
      expect(res.response).toBeNull()
      expect(res.headers).toEqual({})
    })
  })

  describe('checkRateLimit (backwards-compatible wrapper)', () => {
    beforeEach(() => {
      // @ts-expect-error
      process.env.NODE_ENV = 'development'
    })

    it('returns null when allowed', async () => {
      const limiter = makeLimiter(1)
      expect(await checkRateLimit(limiter, 'user-1')).toBeNull()
    })

    it('returns a 429 NextResponse when exceeded', async () => {
      const limiter = makeLimiter(1)
      await checkRateLimit(limiter, 'user-1')
      const res = await checkRateLimit(limiter, 'user-1')
      expect(res?.status).toBe(429)
    })
  })

  describe('withRateLimitHeaders', () => {
    it('merges rate-limit headers onto a NextResponse', () => {
      const response = NextResponse.json({ ok: true })
      const merged = withRateLimitHeaders(response, {
        response: null,
        headers: { 'X-RateLimit-Limit': '10', 'X-RateLimit-Remaining': '7' },
      })
      expect(merged.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(merged.headers.get('X-RateLimit-Remaining')).toBe('7')
    })

    it('is a no-op when the result has no headers', () => {
      const response = NextResponse.json({ ok: true })
      const merged = withRateLimitHeaders(response, { response: null, headers: {} })
      expect(merged.headers.get('X-RateLimit-Limit')).toBeNull()
    })
  })

  describe('getClientIp', () => {
    it('reads the first entry from x-forwarded-for', () => {
      const req = new Request('http://x', {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      })
      expect(getClientIp(req)).toBe('1.2.3.4')
    })

    it('falls back to x-real-ip', () => {
      const req = new Request('http://x', { headers: { 'x-real-ip': '9.9.9.9' } })
      expect(getClientIp(req)).toBe('9.9.9.9')
    })

    it('returns "unknown" when no IP headers are present', () => {
      const req = new Request('http://x')
      expect(getClientIp(req)).toBe('unknown')
    })
  })
})
