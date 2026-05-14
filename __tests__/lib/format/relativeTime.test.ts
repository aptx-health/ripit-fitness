import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatRelativeTime } from '@/lib/format/relativeTime'

/**
 * Tests for formatRelativeTime. We freeze the clock so bucket boundaries
 * are deterministic regardless of CI timing.
 */
describe('formatRelativeTime', () => {
  // Fixed reference: 2026-05-14T12:00:00Z (noon UTC, mid-day).
  const NOW = new Date('2026-05-14T12:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Helper: build a date N days before NOW.
  function daysAgo(days: number): Date {
    return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000)
  }

  it('returns "Today" for the current moment', () => {
    expect(formatRelativeTime(NOW)).toBe('Today')
  })

  it('returns "Today" for a same-day timestamp earlier in the day', () => {
    const earlier = new Date(NOW.getTime() - 1000 * 60 * 60 * 3) // 3 hours ago
    expect(formatRelativeTime(earlier)).toBe('Today')
  })

  it('returns "yesterday" for 1 day ago', () => {
    expect(formatRelativeTime(daysAgo(1))).toBe('yesterday')
  })

  it('returns "5 days ago" for 5 days ago', () => {
    expect(formatRelativeTime(daysAgo(5))).toBe('5 days ago')
  })

  it('returns "1 week ago" for 7 days ago', () => {
    expect(formatRelativeTime(daysAgo(7))).toBe('1 week ago')
  })

  it('returns "2 weeks ago" for 14 days ago', () => {
    expect(formatRelativeTime(daysAgo(14))).toBe('2 weeks ago')
  })

  it('returns "1 month ago" for 30 days ago', () => {
    expect(formatRelativeTime(daysAgo(30))).toBe('1 month ago')
  })

  it('returns "2 months ago" for 60 days ago', () => {
    expect(formatRelativeTime(daysAgo(60))).toBe('2 months ago')
  })

  it('returns "1 year ago" for 365 days ago', () => {
    expect(formatRelativeTime(daysAgo(365))).toBe('1 year ago')
  })

  it('returns "2 years ago" for ~2 years ago', () => {
    expect(formatRelativeTime(daysAgo(365 * 2))).toBe('2 years ago')
  })

  it('accepts ISO string input', () => {
    const isoFiveDaysAgo = daysAgo(5).toISOString()
    expect(formatRelativeTime(isoFiveDaysAgo)).toBe('5 days ago')
  })

  describe('future dates', () => {
    it('returns "tomorrow" for 1 day in the future', () => {
      const tomorrow = new Date(NOW.getTime() + 24 * 60 * 60 * 1000)
      expect(formatRelativeTime(tomorrow)).toBe('tomorrow')
    })

    it('returns "in N days" for a few days in the future', () => {
      const inFive = new Date(NOW.getTime() + 5 * 24 * 60 * 60 * 1000)
      expect(formatRelativeTime(inFive)).toBe('in 5 days')
    })
  })
})
