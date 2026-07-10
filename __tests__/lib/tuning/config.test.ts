import { describe, expect, it } from 'vitest'
import { DEFAULT_AGGREGATES_OPTIONS } from '@/lib/aggregates/compute'
import { DEFAULT_EWMA_ALPHA, DEFAULT_TYPICAL_GAP_DAYS, WEEKLY_DECAY_FACTOR } from '@/lib/learning/math'
import { HEAVY_E1RM_FRACTION, HEAVY_EFFORT_RPE } from '@/lib/learning/weekly-intent'
import {
  DEFAULT_TUNING_CONFIG,
  parseTuningConfig,
  TUNING_KNOBS,
  toAggregatesOptions,
  toHeavyOptions,
} from '@/lib/tuning/config'
import { validateTuningConfigWrite } from '@/lib/tuning/schema'

describe('TuningConfig defaults', () => {
  it('sources every default from the constant it shadows', () => {
    expect(DEFAULT_TUNING_CONFIG).toEqual({
      heavyE1rmFraction: HEAVY_E1RM_FRACTION,
      heavyEffortCutoff: HEAVY_EFFORT_RPE,
      betaWeeklyDecay: WEEKLY_DECAY_FACTOR,
      ewmaAlpha: DEFAULT_EWMA_ALPHA,
      ewmaTypicalGapDays: DEFAULT_TYPICAL_GAP_DAYS,
      lowDataMinSessions: DEFAULT_AGGREGATES_OPTIONS.lowDataMinSessions,
      lowDataMinSets: DEFAULT_AGGREGATES_OPTIONS.lowDataMinSets,
      detrainingGapDays: DEFAULT_AGGREGATES_OPTIONS.detrainingMinDays,
    })
  })

  it('has a knob-metadata entry for every config field, all in-range', () => {
    const keys = Object.keys(DEFAULT_TUNING_CONFIG).sort()
    const metaKeys = TUNING_KNOBS.map((k) => k.key).sort()
    expect(metaKeys).toEqual(keys)
    for (const knob of TUNING_KNOBS) {
      const def = DEFAULT_TUNING_CONFIG[knob.key]
      expect(def).toBeGreaterThanOrEqual(knob.min)
      expect(def).toBeLessThanOrEqual(knob.max)
      if (knob.integer) expect(Number.isInteger(def)).toBe(true)
    }
  })
})

describe('parseTuningConfig — read-path fallback', () => {
  it('returns code defaults for null / non-object / array', () => {
    expect(parseTuningConfig(null)).toEqual(DEFAULT_TUNING_CONFIG)
    expect(parseTuningConfig(undefined)).toEqual(DEFAULT_TUNING_CONFIG)
    expect(parseTuningConfig(42)).toEqual(DEFAULT_TUNING_CONFIG)
    expect(parseTuningConfig('nope')).toEqual(DEFAULT_TUNING_CONFIG)
    expect(parseTuningConfig([])).toEqual(DEFAULT_TUNING_CONFIG)
    expect(parseTuningConfig({})).toEqual(DEFAULT_TUNING_CONFIG)
  })

  it('keeps valid overrides and falls back per-field for the rest', () => {
    const result = parseTuningConfig({
      heavyE1rmFraction: 0.7, // valid
      ewmaAlpha: 0.5, // valid
      lowDataMinSessions: 5, // valid
    })
    expect(result.heavyE1rmFraction).toBe(0.7)
    expect(result.ewmaAlpha).toBe(0.5)
    expect(result.lowDataMinSessions).toBe(5)
    // Untouched fields keep defaults.
    expect(result.betaWeeklyDecay).toBe(DEFAULT_TUNING_CONFIG.betaWeeklyDecay)
    expect(result.detrainingGapDays).toBe(DEFAULT_TUNING_CONFIG.detrainingGapDays)
  })

  it('falls back for out-of-range, wrong-type, non-finite, and non-integer values', () => {
    const result = parseTuningConfig({
      heavyE1rmFraction: 2.0, // > max 1.0
      heavyEffortCutoff: 'eight', // wrong type
      ewmaAlpha: Number.NaN, // non-finite
      ewmaTypicalGapDays: 7.5, // non-integer for an integer knob
      lowDataMinSessions: -1, // < min
    })
    expect(result).toEqual(DEFAULT_TUNING_CONFIG)
  })
})

describe('mappers', () => {
  it('toAggregatesOptions maps the aggregates-relevant subset', () => {
    const cfg = { ...DEFAULT_TUNING_CONFIG, detrainingGapDays: 14, lowDataMinSets: 25 }
    expect(toAggregatesOptions(cfg)).toEqual({
      lowDataMinSessions: cfg.lowDataMinSessions,
      lowDataMinSets: 25,
      detrainingMinDays: 14, // renamed
      ewmaAlpha: cfg.ewmaAlpha,
      ewmaTypicalGapDays: cfg.ewmaTypicalGapDays,
      heavyE1rmFraction: cfg.heavyE1rmFraction,
      heavyEffortCutoff: cfg.heavyEffortCutoff,
    })
  })

  it('toHeavyOptions maps just the heaviness knobs', () => {
    const cfg = { ...DEFAULT_TUNING_CONFIG, heavyE1rmFraction: 0.6, heavyEffortCutoff: 9 }
    expect(toHeavyOptions(cfg)).toEqual({ heavyE1rmFraction: 0.6, heavyEffortCutoff: 9 })
  })
})

describe('validateTuningConfigWrite — write-path range enforcement', () => {
  it('accepts a full in-range config', () => {
    const result = validateTuningConfigWrite(DEFAULT_TUNING_CONFIG)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.config).toEqual(DEFAULT_TUNING_CONFIG)
  })

  it('rejects an out-of-range value', () => {
    const result = validateTuningConfigWrite({ ...DEFAULT_TUNING_CONFIG, heavyE1rmFraction: 5 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/heavyE1rmFraction/i)
  })

  it('rejects a non-integer value for an integer knob', () => {
    const result = validateTuningConfigWrite({ ...DEFAULT_TUNING_CONFIG, detrainingGapDays: 10.5 })
    expect(result.ok).toBe(false)
  })

  it('rejects a missing knob', () => {
    const { heavyEffortCutoff, ...partial } = DEFAULT_TUNING_CONFIG
    void heavyEffortCutoff
    expect(validateTuningConfigWrite(partial).ok).toBe(false)
  })

  it('rejects unknown keys (strict)', () => {
    const result = validateTuningConfigWrite({ ...DEFAULT_TUNING_CONFIG, sneakyKnob: 1 })
    expect(result.ok).toBe(false)
  })
})
