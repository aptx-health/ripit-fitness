import { describe, expect, it } from 'vitest'
import { formatPrescribedSummary } from '@/lib/format/prescribed-summary'

describe('formatPrescribedSummary', () => {
  describe('reps + weight + intensity', () => {
    it('formats reps, weight, and RIR', () => {
      expect(
        formatPrescribedSummary({
          reps: '5',
          weight: '135 lb',
          rpe: null,
          rir: 2,
        })
      ).toBe('5 reps @ 135 lb, RIR 2')
    })

    it('formats reps, weight, and RPE', () => {
      expect(
        formatPrescribedSummary({
          reps: '5',
          weight: '135 lb',
          rpe: 8,
          rir: null,
        })
      ).toBe('5 reps @ 135 lb, RPE 8')
    })

    it('prefers RIR over RPE when both are set', () => {
      expect(
        formatPrescribedSummary({
          reps: '5',
          weight: '135 lb',
          rpe: 8,
          rir: 2,
        })
      ).toBe('5 reps @ 135 lb, RIR 2')
    })
  })

  describe('reps only', () => {
    it('omits both weight and intensity when neither is set', () => {
      expect(
        formatPrescribedSummary({
          reps: '5',
          weight: null,
          rpe: null,
          rir: null,
        })
      ).toBe('5 reps')
    })

    it('uses singular "rep" for count of 1', () => {
      expect(
        formatPrescribedSummary({
          reps: '1',
          weight: null,
          rpe: null,
          rir: null,
        })
      ).toBe('1 rep')
    })
  })

  describe('reps + intensity, no weight', () => {
    it('joins reps and RIR with @ when weight is absent', () => {
      expect(
        formatPrescribedSummary({
          reps: '5',
          weight: null,
          rpe: null,
          rir: 2,
        })
      ).toBe('5 reps @ RIR 2')
    })

    it('joins reps and RPE with @ when weight is absent', () => {
      expect(
        formatPrescribedSummary({
          reps: '8',
          weight: null,
          rpe: 8,
          rir: null,
        })
      ).toBe('8 reps @ RPE 8')
    })
  })

  describe('freeform weight strings', () => {
    it('renders percentage verbatim', () => {
      expect(
        formatPrescribedSummary({
          reps: '5',
          weight: '65%',
          rpe: null,
          rir: null,
        })
      ).toBe('5 reps @ 65%')
    })

    it('renders RPE-formatted weight verbatim', () => {
      expect(
        formatPrescribedSummary({
          reps: '5',
          weight: 'RPE 8',
          rpe: null,
          rir: null,
        })
      ).toBe('5 reps @ RPE 8')
    })

    it('trims surrounding whitespace from weight', () => {
      expect(
        formatPrescribedSummary({
          reps: '5',
          weight: '  135 lb  ',
          rpe: null,
          rir: null,
        })
      ).toBe('5 reps @ 135 lb')
    })

    it('treats an all-whitespace weight as missing', () => {
      expect(
        formatPrescribedSummary({
          reps: '5',
          weight: '   ',
          rpe: null,
          rir: null,
        })
      ).toBe('5 reps')
    })
  })

  describe('rep ranges and special values', () => {
    it('keeps a range as-is and pluralizes', () => {
      expect(
        formatPrescribedSummary({
          reps: '8-12',
          weight: '135 lb',
          rpe: null,
          rir: null,
        })
      ).toBe('8-12 reps @ 135 lb')
    })

    it('keeps "15+" as-is and pluralizes', () => {
      expect(
        formatPrescribedSummary({
          reps: '15+',
          weight: null,
          rpe: null,
          rir: null,
        })
      ).toBe('15+ reps')
    })

    it('renders AMRAP verbatim without trailing "reps"', () => {
      expect(
        formatPrescribedSummary({
          reps: 'AMRAP',
          weight: '135 lb',
          rpe: null,
          rir: 1,
        })
      ).toBe('AMRAP @ 135 lb, RIR 1')
    })

    it('is case-insensitive for AMRAP', () => {
      expect(
        formatPrescribedSummary({
          reps: 'amrap',
          weight: null,
          rpe: null,
          rir: null,
        })
      ).toBe('AMRAP')
    })
  })

  describe('showIntensity option', () => {
    it('omits intensity when showIntensity is false', () => {
      expect(
        formatPrescribedSummary(
          { reps: '5', weight: '135 lb', rpe: null, rir: 2 },
          { showIntensity: false }
        )
      ).toBe('5 reps @ 135 lb')
    })

    it('omits intensity when showIntensity is false and there is no weight', () => {
      expect(
        formatPrescribedSummary(
          { reps: '5', weight: null, rpe: null, rir: 2 },
          { showIntensity: false }
        )
      ).toBe('5 reps')
    })

    it('includes intensity by default', () => {
      expect(
        formatPrescribedSummary({
          reps: '5',
          weight: null,
          rpe: null,
          rir: 2,
        })
      ).toBe('5 reps @ RIR 2')
    })
  })

  describe('empty input', () => {
    it('returns an empty string when reps is empty', () => {
      expect(
        formatPrescribedSummary({
          reps: '',
          weight: '135 lb',
          rpe: null,
          rir: 2,
        })
      ).toBe('')
    })

    it('returns an empty string when reps is whitespace only', () => {
      expect(
        formatPrescribedSummary({
          reps: '   ',
          weight: null,
          rpe: null,
          rir: null,
        })
      ).toBe('')
    })
  })
})
