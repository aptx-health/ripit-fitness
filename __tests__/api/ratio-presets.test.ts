import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { ALL_FAUS } from '@/lib/fau-volume'
import {
  getRatioPreset,
  isRatioPresetId,
  RATIO_PRESET_IDS,
  RATIO_PRESETS,
} from '@/lib/learning/ratio-presets'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'
import {
  getOrCreateUserTrainingProfile,
  normalizeFauImportancePreset,
  updateUserTrainingProfile,
} from '@/lib/user-training-profile'

describe('ratio preset definitions', () => {
  it('exposes one preset per declared id, in order', () => {
    expect(RATIO_PRESETS.map((p) => p.id)).toEqual([...RATIO_PRESET_IDS])
  })

  it('rates every FAU with an integer 1-5 in each preset', () => {
    for (const preset of RATIO_PRESETS) {
      const keys = Object.keys(preset.ratings).sort()
      expect(keys).toEqual([...ALL_FAUS].sort())

      for (const fau of ALL_FAUS) {
        const rating = preset.ratings[fau]
        expect(Number.isInteger(rating), `${preset.id}.${fau} is an integer`).toBe(
          true
        )
        expect(rating, `${preset.id}.${fau} >= 1`).toBeGreaterThanOrEqual(1)
        expect(rating, `${preset.id}.${fau} <= 5`).toBeLessThanOrEqual(5)
      }
    }
  })

  it('has no accidentally uniform (all-identical) preset', () => {
    for (const preset of RATIO_PRESETS) {
      const values = ALL_FAUS.map((fau) => preset.ratings[fau])
      const distinct = new Set(values)
      expect(distinct.size, `${preset.id} varies its ratings`).toBeGreaterThan(1)
    }
  })

  it('gives every preset a label and non-empty description', () => {
    for (const preset of RATIO_PRESETS) {
      expect(preset.label.length).toBeGreaterThan(0)
      expect(preset.description.trim().length).toBeGreaterThan(0)
    }
  })

  it('matches the cyclist archetype: upper tilt, spared legs, bench prioritized', () => {
    const cyclist = getRatioPreset('cyclist')
    expect(cyclist).not.toBeNull()
    const r = cyclist!.ratings

    // Bench prioritized.
    expect(r.chest).toBeGreaterThanOrEqual(4)
    // Legs deliberately spared relative to the prioritized upper body.
    expect(r.quads).toBeLessThan(r.chest)
    expect(r.calves).toBeLessThanOrEqual(2)
    expect(r.adductors).toBeLessThanOrEqual(2)
    // Upper-body tilt: back/lats pulled up with the bench.
    expect(r.lats).toBeGreaterThanOrEqual(4)
    expect(r['mid-back']).toBeGreaterThanOrEqual(4)
  })
})

describe('ratio preset helpers', () => {
  it('narrows known ids and rejects everything else', () => {
    expect(isRatioPresetId('powerlifter')).toBe(true)
    expect(isRatioPresetId('cyclist')).toBe(true)
    expect(isRatioPresetId('marathoner')).toBe(false)
    expect(isRatioPresetId('')).toBe(false)
    expect(isRatioPresetId(null)).toBe(false)
    expect(isRatioPresetId(42)).toBe(false)
  })

  it('looks up a preset by id, or null for unknown', () => {
    expect(getRatioPreset('bodybuilder')?.label).toBe('Bodybuilder')
    expect(getRatioPreset('nope')).toBeNull()
    expect(getRatioPreset(undefined)).toBeNull()
  })

  it('normalizes preset ids, dropping unknowns to null', () => {
    expect(normalizeFauImportancePreset('general')).toBe('general')
    expect(normalizeFauImportancePreset('bogus')).toBeNull()
    expect(normalizeFauImportancePreset(null)).toBeNull()
    expect(normalizeFauImportancePreset(5)).toBeNull()
  })
})

describe('fauImportancePreset persistence and reapply flow', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  it('defaults fauImportancePreset to null on a fresh profile', async () => {
    const profile = await getOrCreateUserTrainingProfile(prisma, userId)
    expect(profile.fauImportancePreset).toBeNull()
  })

  it('applies a preset, keeps attribution through an edit, then reapply resets it', async () => {
    const powerlifter = getRatioPreset('powerlifter')!

    // Apply: ratings + preset id are stored together.
    const applied = await updateUserTrainingProfile(prisma, userId, {
      fauImportance: powerlifter.ratings,
      fauImportancePreset: 'powerlifter',
    })
    expect(applied.fauImportancePreset).toBe('powerlifter')
    expect(applied.fauImportance.chest).toBe(powerlifter.ratings.chest)

    // Edit one muscle — attribution is retained (a preset is a starting point).
    const edited = await updateUserTrainingProfile(prisma, userId, {
      fauImportance: { ...powerlifter.ratings, biceps: 5 },
      fauImportancePreset: 'powerlifter',
    })
    expect(edited.fauImportance.biceps).toBe(5)
    expect(edited.fauImportancePreset).toBe('powerlifter')

    // Reapply the same preset — the edit is wiped back to preset values.
    const reapplied = await updateUserTrainingProfile(prisma, userId, {
      fauImportance: powerlifter.ratings,
      fauImportancePreset: 'powerlifter',
    })
    expect(reapplied.fauImportance.biceps).toBe(powerlifter.ratings.biceps)
    expect(reapplied.fauImportancePreset).toBe('powerlifter')

    const read = await getOrCreateUserTrainingProfile(prisma, userId)
    expect(read.fauImportancePreset).toBe('powerlifter')
    expect(read.fauImportance.biceps).toBe(powerlifter.ratings.biceps)
  })

  it('drops an unknown preset id to null on write', async () => {
    const updated = await updateUserTrainingProfile(prisma, userId, {
      fauImportancePreset: 'not_a_preset' as never,
    })
    expect(updated.fauImportancePreset).toBeNull()
  })

  it('can switch presets, replacing attribution', async () => {
    await updateUserTrainingProfile(prisma, userId, {
      fauImportance: getRatioPreset('cyclist')!.ratings,
      fauImportancePreset: 'cyclist',
    })
    const switched = await updateUserTrainingProfile(prisma, userId, {
      fauImportance: getRatioPreset('bodybuilder')!.ratings,
      fauImportancePreset: 'bodybuilder',
    })
    expect(switched.fauImportancePreset).toBe('bodybuilder')
  })
})
