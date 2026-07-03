import { describe, expect, it } from 'vitest'
import { ALL_FAUS } from '@/lib/fau-volume'
import {
  applyRatioPreset,
  detectAppliedPreset,
  getRatioPreset,
  RATIO_PRESET_IDS,
  RATIO_PRESETS,
  validatePresetRatings,
} from '@/lib/learning/ratio-presets'
import { MAX_IMPORTANCE, MIN_IMPORTANCE } from '@/lib/user-training-profile'

describe('ratio preset definitions', () => {
  it('exposes one preset per declared id', () => {
    expect(RATIO_PRESETS.map((p) => p.id).sort()).toEqual(
      [...RATIO_PRESET_IDS].sort()
    )
  })

  for (const preset of RATIO_PRESETS) {
    describe(`${preset.id} preset`, () => {
      it('covers every FAU with an integer on the 1-5 scale', () => {
        expect(validatePresetRatings(preset.ratings)).toBe(true)
        for (const fau of ALL_FAUS) {
          const value = preset.ratings[fau]
          expect(Number.isInteger(value)).toBe(true)
          expect(value).toBeGreaterThanOrEqual(MIN_IMPORTANCE)
          expect(value).toBeLessThanOrEqual(MAX_IMPORTANCE)
        }
      })

      it('has no accidental all-zero table and lists every FAU exactly once', () => {
        const keys = Object.keys(preset.ratings)
        expect(keys.sort()).toEqual([...ALL_FAUS].sort())
        const sum = ALL_FAUS.reduce((acc, fau) => acc + preset.ratings[fau], 0)
        expect(sum).toBeGreaterThan(0)
      })

      it('carries a non-empty label and description', () => {
        expect(preset.label.length).toBeGreaterThan(0)
        expect(preset.description.length).toBeGreaterThan(0)
      })
    })
  }

  it('presets are pairwise distinct (no two identical rating tables)', () => {
    for (let i = 0; i < RATIO_PRESETS.length; i++) {
      for (let j = i + 1; j < RATIO_PRESETS.length; j++) {
        const identical = ALL_FAUS.every(
          (fau) =>
            RATIO_PRESETS[i].ratings[fau] === RATIO_PRESETS[j].ratings[fau]
        )
        expect(identical).toBe(false)
      }
    }
  })

  it('cyclist preset spares legs, tilts upper, and prioritizes bench', () => {
    const cyclist = getRatioPreset('cyclist')
    expect(cyclist).not.toBeNull()
    const r = cyclist!.ratings
    // Bench prioritized.
    expect(r.chest).toBeGreaterThanOrEqual(4)
    // Legs deliberately spared vs. chest.
    expect(r.quads).toBeLessThanOrEqual(2)
    expect(r.hamstrings).toBeLessThanOrEqual(2)
    expect(r.chest).toBeGreaterThan(r.quads)
    // Upper-body tilt: mean upper importance exceeds mean lower.
    const upper = ['chest', 'mid-back', 'lats', 'triceps', 'rear-delts'] as const
    const lower = ['quads', 'hamstrings', 'glutes', 'calves', 'adductors'] as const
    const mean = (keys: readonly string[]) =>
      keys.reduce((acc, k) => acc + r[k as keyof typeof r], 0) / keys.length
    expect(mean(upper)).toBeGreaterThan(mean(lower))
  })
})

describe('getRatioPreset', () => {
  it('returns the matching preset', () => {
    expect(getRatioPreset('powerlifter')?.id).toBe('powerlifter')
  })

  it('returns null for an unknown id', () => {
    expect(getRatioPreset('not-a-preset')).toBeNull()
  })
})

describe('applyRatioPreset', () => {
  it('returns the full importance map for a preset', () => {
    const applied = applyRatioPreset('bodybuilder')
    expect(applied).not.toBeNull()
    for (const fau of ALL_FAUS) {
      expect(applied![fau]).toBe(getRatioPreset('bodybuilder')!.ratings[fau])
    }
  })

  it('returns an independent copy (mutation does not leak into the preset)', () => {
    const applied = applyRatioPreset('general')!
    applied.chest = 1
    expect(getRatioPreset('general')!.ratings.chest).toBe(3)
  })

  it('returns null for an unknown id', () => {
    expect(applyRatioPreset('bogus')).toBeNull()
  })
})

describe('detectAppliedPreset', () => {
  it('round-trips every preset through apply -> detect', () => {
    for (const id of RATIO_PRESET_IDS) {
      expect(detectAppliedPreset(applyRatioPreset(id)!)).toBe(id)
    }
  })

  it('returns null for custom/edited ratings', () => {
    const edited = applyRatioPreset('powerlifter')!
    edited.chest = edited.chest === 5 ? 4 : 5
    expect(detectAppliedPreset(edited)).toBeNull()
  })

  it('returns null for empty/incomplete ratings', () => {
    expect(detectAppliedPreset({})).toBeNull()
    expect(detectAppliedPreset({ chest: 3 })).toBeNull()
  })
})

describe('apply -> edit -> reapply flow', () => {
  it('reapplying a preset resets edits back to the preset ratings', () => {
    // Apply.
    let ratings = applyRatioPreset('powerlifter')!
    expect(detectAppliedPreset(ratings)).toBe('powerlifter')

    // Edit an individual rating — no longer matches the preset.
    ratings = { ...ratings, biceps: 5 }
    expect(detectAppliedPreset(ratings)).toBeNull()
    expect(ratings.biceps).toBe(5)

    // Reapply (simulates confirming the overwrite) — edits are discarded.
    ratings = applyRatioPreset('powerlifter')!
    expect(detectAppliedPreset(ratings)).toBe('powerlifter')
    expect(ratings.biceps).toBe(getRatioPreset('powerlifter')!.ratings.biceps)
  })

  it('switching presets fully overwrites the previous preset ratings', () => {
    const powerlifter = applyRatioPreset('powerlifter')!
    const cyclist = applyRatioPreset('cyclist')!
    expect(detectAppliedPreset(powerlifter)).toBe('powerlifter')
    expect(detectAppliedPreset(cyclist)).toBe('cyclist')
    // The two share no accidental identity.
    expect(detectAppliedPreset(cyclist)).not.toBe('powerlifter')
  })
})
