import { describe, expect, it } from 'vitest'
import { pluralize } from '@/lib/format/pluralize'

describe('pluralize', () => {
  describe('regular nouns', () => {
    it('returns plural form for 0', () => {
      expect(pluralize(0, 'set')).toBe('0 sets')
    })

    it('returns singular form for 1', () => {
      expect(pluralize(1, 'set')).toBe('1 set')
    })

    it('returns plural form for 2', () => {
      expect(pluralize(2, 'set')).toBe('2 sets')
    })

    it('returns plural form for large counts', () => {
      expect(pluralize(42, 'exercise')).toBe('42 exercises')
    })

    it('handles longer noun stems', () => {
      expect(pluralize(1, 'workout')).toBe('1 workout')
      expect(pluralize(3, 'workout')).toBe('3 workouts')
    })
  })

  describe('irregular plurals', () => {
    it('uses the supplied plural for counts != 1', () => {
      expect(pluralize(2, 'man', 'men')).toBe('2 men')
    })

    it('still uses singular for count === 1 even when plural is supplied', () => {
      expect(pluralize(1, 'man', 'men')).toBe('1 man')
    })

    it('uses supplied plural for 0', () => {
      expect(pluralize(0, 'person', 'people')).toBe('0 people')
    })
  })

  describe('edge cases', () => {
    it('treats negative numbers as plural', () => {
      // We don't have negative counts in this app, but the helper should
      // still produce a sensible string.
      expect(pluralize(-1, 'set')).toBe('-1 sets')
      expect(pluralize(-2, 'set')).toBe('-2 sets')
    })
  })
})
