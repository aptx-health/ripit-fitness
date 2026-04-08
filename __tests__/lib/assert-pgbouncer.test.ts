import { describe, it, expect, vi } from 'vitest'
import {
  assertPgBouncerConfig,
  isPgBouncerConfigured,
  PgBouncerConfigError,
} from '@/lib/db/assert-pgbouncer'

function makeLogger() {
  return { warn: vi.fn() }
}

describe('assertPgBouncerConfig', () => {
  describe('production', () => {
    const env = (overrides: Record<string, string | undefined>) => ({
      NODE_ENV: 'production',
      ...overrides,
    })

    it('throws when DATABASE_URL is missing', () => {
      expect(() => assertPgBouncerConfig(env({ DATABASE_URL: undefined }))).toThrow(
        PgBouncerConfigError
      )
    })

    it('throws when DATABASE_URL points at :6432 without pgbouncer=true', () => {
      expect(() =>
        assertPgBouncerConfig(
          env({ DATABASE_URL: 'postgresql://u:p@host:6432/db?connection_limit=5' })
        )
      ).toThrow(/pgbouncer=true/)
    })

    it('passes when DATABASE_URL on :6432 has pgbouncer=true', () => {
      expect(() =>
        assertPgBouncerConfig(
          env({
            DATABASE_URL: 'postgresql://u:p@host:6432/db?pgbouncer=true&connection_limit=5',
          })
        )
      ).not.toThrow()
    })

    it('passes when DATABASE_URL points at :5432 (direct postgres, no flag needed)', () => {
      expect(() =>
        assertPgBouncerConfig(env({ DATABASE_URL: 'postgresql://u:p@host:5432/db' }))
      ).not.toThrow()
    })

    it('throws when DIRECT_URL points at :6432 (footgun guard)', () => {
      expect(() =>
        assertPgBouncerConfig(
          env({
            DATABASE_URL: 'postgresql://u:p@host:6432/db?pgbouncer=true',
            DIRECT_URL: 'postgresql://u:p@host:6432/db',
          })
        )
      ).toThrow(/DIRECT_URL points at PgBouncer/)
    })

    it('passes when DIRECT_URL points at :5432', () => {
      expect(() =>
        assertPgBouncerConfig(
          env({
            DATABASE_URL: 'postgresql://u:p@host:6432/db?pgbouncer=true',
            DIRECT_URL: 'postgresql://u:p@host:5432/db',
          })
        )
      ).not.toThrow()
    })

    it('throws when DATABASE_URL is malformed', () => {
      expect(() =>
        assertPgBouncerConfig(env({ DATABASE_URL: 'not-a-url' }))
      ).toThrow(PgBouncerConfigError)
    })
  })

  describe('development', () => {
    it('warns instead of throwing when misconfigured', () => {
      const logger = makeLogger()
      expect(() =>
        assertPgBouncerConfig(
          { NODE_ENV: 'development', DATABASE_URL: 'postgresql://u:p@host:6432/db' },
          { logger }
        )
      ).not.toThrow()
      expect(logger.warn).toHaveBeenCalledOnce()
    })

    it('does not warn when config is fine', () => {
      const logger = makeLogger()
      assertPgBouncerConfig(
        { NODE_ENV: 'development', DATABASE_URL: 'postgresql://u:p@host:5432/db' },
        { logger }
      )
      expect(logger.warn).not.toHaveBeenCalled()
    })
  })

  describe('test env', () => {
    it('does not throw with no DATABASE_URL', () => {
      expect(() =>
        assertPgBouncerConfig({ NODE_ENV: 'test', DATABASE_URL: undefined })
      ).not.toThrow()
    })
  })
})

describe('isPgBouncerConfigured', () => {
  it('returns true when :6432 with pgbouncer=true', () => {
    expect(
      isPgBouncerConfigured({ DATABASE_URL: 'postgresql://u:p@host:6432/db?pgbouncer=true' })
    ).toBe(true)
  })

  it('returns false when :6432 without flag', () => {
    expect(
      isPgBouncerConfigured({ DATABASE_URL: 'postgresql://u:p@host:6432/db' })
    ).toBe(false)
  })

  it('returns true for direct postgres on :5432', () => {
    expect(
      isPgBouncerConfigured({ DATABASE_URL: 'postgresql://u:p@host:5432/db' })
    ).toBe(true)
  })

  it('returns false when DATABASE_URL is missing', () => {
    expect(isPgBouncerConfigured({})).toBe(false)
  })
})
