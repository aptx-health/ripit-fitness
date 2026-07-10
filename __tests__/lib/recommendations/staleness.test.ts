import { describe, expect, it } from 'vitest'
import { daysSinceLabel, stalenessScore } from '@/lib/recommendations/staleness'

describe('daysSinceLabel', () => {
  it('labels a never-trained value', () => {
    expect(daysSinceLabel(null)).toBe('New — never logged')
  })

  it('labels today', () => {
    expect(daysSinceLabel(0)).toBe('Today')
  })

  it('treats negative (future clock skew) as today', () => {
    expect(daysSinceLabel(-1)).toBe('Today')
  })

  it('labels a day count', () => {
    expect(daysSinceLabel(1)).toBe('1d since')
    expect(daysSinceLabel(12)).toBe('12d since')
  })
})

describe('stalenessScore', () => {
  it('is maximal for never-trained', () => {
    expect(stalenessScore(null, 14)).toBe(1)
  })

  it('is 0 for trained today', () => {
    expect(stalenessScore(0, 14)).toBe(0)
  })

  it('scales linearly within the horizon', () => {
    expect(stalenessScore(7, 14)).toBeCloseTo(0.5)
  })

  it('clamps at 1 beyond the horizon', () => {
    expect(stalenessScore(30, 14)).toBe(1)
  })

  it('degrades to 0 for a non-positive horizon rather than dividing by zero', () => {
    expect(stalenessScore(10, 0)).toBe(0)
  })
})
