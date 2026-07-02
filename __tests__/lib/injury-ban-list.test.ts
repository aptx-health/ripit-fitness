import { describe, expect, it } from 'vitest'
import { MOVEMENT_PATTERNS } from '@/lib/exercises/auto-tag'
import { ALL_FAUS } from '@/lib/fau-volume'
import {
  computeInjuryBanList,
  INJURY_AREA_LOAD_MAP,
  type InjuryBanExercise,
} from '@/lib/learning/injury-ban-list'
import { INJURY_AREAS, type InjuryEntry } from '@/lib/user-training-profile'

/**
 * Deterministic injury -> ban-list mapping (issue #918).
 *
 * Suggest must never recommend loading an area the user flagged `avoid_loading`.
 * These tests pin the mapping table (every profile area maps to a sensible,
 * non-empty pattern set), the hard-ban vs caution split, the recovered no-op,
 * and graceful degradation for unknown / free-text injuries.
 */

// A small, tagged catalog spanning every movement pattern plus a couple of
// isolation exercises with distinct primary FAUs, and one untagged exercise.
const CATALOG: InjuryBanExercise[] = [
  { id: 'bench', movementPattern: 'horizontal_push', primaryFAUs: ['chest'] },
  { id: 'ohp', movementPattern: 'vertical_push', primaryFAUs: ['front-delts'] },
  { id: 'row', movementPattern: 'horizontal_pull', primaryFAUs: ['mid-back'] },
  { id: 'pullup', movementPattern: 'vertical_pull', primaryFAUs: ['lats'] },
  { id: 'squat', movementPattern: 'squat', primaryFAUs: ['quads'] },
  { id: 'deadlift', movementPattern: 'hinge', primaryFAUs: ['hamstrings'] },
  { id: 'lunge', movementPattern: 'lunge', primaryFAUs: ['quads'] },
  { id: 'carry', movementPattern: 'carry', primaryFAUs: ['forearms'] },
  { id: 'curl', movementPattern: 'isolation', primaryFAUs: ['biceps'] },
  { id: 'pushdown', movementPattern: 'isolation', primaryFAUs: ['triceps'] },
  { id: 'shrug', movementPattern: 'isolation', primaryFAUs: ['traps'] },
  { id: 'calf-raise', movementPattern: 'accessory', primaryFAUs: ['calves'] },
  // Untagged: must never be banned by pattern.
  { id: 'untagged', movementPattern: null, primaryFAUs: [] },
]

function injury(overrides: Partial<InjuryEntry>): InjuryEntry {
  return { area: 'knee', severity: 'avoid_loading', ...overrides } as InjuryEntry
}

describe('INJURY_AREA_LOAD_MAP', () => {
  it('maps every profile injury area to a non-empty pattern set', () => {
    for (const area of INJURY_AREAS) {
      const load = INJURY_AREA_LOAD_MAP[area]
      expect(load, `missing mapping for ${area}`).toBeDefined()
      expect(load.patterns.length, `${area} has no patterns`).toBeGreaterThan(0)
      expect(load.faus.length, `${area} has no FAUs`).toBeGreaterThan(0)
    }
  })

  it('only references valid movement patterns and FAUs', () => {
    for (const area of INJURY_AREAS) {
      const load = INJURY_AREA_LOAD_MAP[area]
      for (const pattern of load.patterns) {
        expect(MOVEMENT_PATTERNS).toContain(pattern)
      }
      for (const fau of load.faus) {
        expect(ALL_FAUS).toContain(fau)
      }
    }
  })
})

describe('computeInjuryBanList — hard bans (avoid_loading)', () => {
  it('bans exactly the exercises that load a knee injury', () => {
    const result = computeInjuryBanList(
      [injury({ area: 'knee', severity: 'avoid_loading' })],
      CATALOG
    )
    // knee -> patterns [squat, lunge], faus [quads, hamstrings]
    expect(result.bannedExerciseIds).toEqual(
      ['deadlift', 'lunge', 'squat'].sort()
    )
    expect(result.cautionedMovementPatterns).toEqual([])
    expect(result.cautionedFAUs).toEqual([])
    expect(result.notes).toEqual([])
  })

  it('bans by primary FAU even when the pattern does not match', () => {
    // shoulder faus include front-delts; ohp already matches by pattern, but a
    // pure-isolation delt raise should be caught by FAU alone.
    const catalog: InjuryBanExercise[] = [
      { id: 'lat-raise', movementPattern: 'isolation', primaryFAUs: ['side-delts'] },
    ]
    const result = computeInjuryBanList(
      [injury({ area: 'shoulder', severity: 'avoid_loading' })],
      catalog
    )
    expect(result.bannedExerciseIds).toEqual(['lat-raise'])
  })

  it('never bans untagged exercises', () => {
    const result = computeInjuryBanList(
      INJURY_AREAS.map((area) => injury({ area, severity: 'avoid_loading' })),
      CATALOG
    )
    expect(result.bannedExerciseIds).not.toContain('untagged')
  })

  it('de-duplicates and sorts across multiple injuries', () => {
    const result = computeInjuryBanList(
      [
        injury({ area: 'knee', severity: 'avoid_loading' }),
        injury({ area: 'hip', severity: 'avoid_loading' }),
      ],
      CATALOG
    )
    const sorted = [...result.bannedExerciseIds].sort()
    expect(result.bannedExerciseIds).toEqual(sorted)
    expect(new Set(result.bannedExerciseIds).size).toBe(
      result.bannedExerciseIds.length
    )
  })
})

describe('computeInjuryBanList — caution (soft flags)', () => {
  it('emits cautioned patterns/FAUs without banning any exercise', () => {
    const result = computeInjuryBanList(
      [injury({ area: 'shoulder', severity: 'caution' })],
      CATALOG
    )
    expect(result.bannedExerciseIds).toEqual([])
    expect(result.cautionedMovementPatterns).toEqual(
      [...INJURY_AREA_LOAD_MAP.shoulder.patterns].sort()
    )
    expect(result.cautionedFAUs).toEqual(
      [...INJURY_AREA_LOAD_MAP.shoulder.faus].sort()
    )
  })

  it('keeps hard bans and cautions separate when both are present', () => {
    const result = computeInjuryBanList(
      [
        injury({ area: 'knee', severity: 'avoid_loading' }),
        injury({ area: 'shoulder', severity: 'caution' }),
      ],
      CATALOG
    )
    // Hard ban from knee only.
    expect(result.bannedExerciseIds).toEqual(['deadlift', 'lunge', 'squat'].sort())
    // Caution from shoulder only — no bench/ohp id in bans.
    expect(result.bannedExerciseIds).not.toContain('ohp')
    expect(result.cautionedMovementPatterns).toContain('vertical_push')
    expect(result.cautionedFAUs).toContain('front-delts')
  })
})

describe('computeInjuryBanList — secondary loading (product decision #918)', () => {
  // Reviewer's example: a barbell row loads the lower back isometrically as a
  // secondary mover, but its primary pattern/FAU is elsewhere. For a
  // `lower_back` avoid_loading injury it must NOT be hard-banned — it is
  // down-weighted via the cautioned soft-flag fields instead.
  const rowLoadingLowBack: InjuryBanExercise = {
    id: 'barbell-row',
    movementPattern: 'horizontal_pull',
    primaryFAUs: ['mid-back'],
    secondaryFAUs: ['lower-back'],
  }

  it('routes a secondary-only loader to caution, not the hard ban', () => {
    const result = computeInjuryBanList(
      [injury({ area: 'lower_back', severity: 'avoid_loading' })],
      [rowLoadingLowBack]
    )
    // lower_back -> patterns [hinge, squat, carry], faus [lower-back, glutes,
    // hamstrings]. The row matches none of those as a PRIMARY loader.
    expect(result.bannedExerciseIds).not.toContain('barbell-row')
    expect(result.bannedExerciseIds).toEqual([])
    // ...but its secondary lower-back load is flagged for down-weighting.
    expect(result.cautionedFAUs).toContain('lower-back')
  })

  it('prefers the hard ban when an exercise loads the area both ways', () => {
    // A deadlift primarily hinges (hard ban for lower_back) and also lists
    // lower-back as a secondary FAU — it must land in the ban, not just caution.
    const deadlift: InjuryBanExercise = {
      id: 'deadlift',
      movementPattern: 'hinge',
      primaryFAUs: ['hamstrings'],
      secondaryFAUs: ['lower-back'],
    }
    const result = computeInjuryBanList(
      [injury({ area: 'lower_back', severity: 'avoid_loading' })],
      [deadlift]
    )
    expect(result.bannedExerciseIds).toEqual(['deadlift'])
    // No double-counting into caution for an already-banned exercise.
    expect(result.cautionedFAUs).toEqual([])
  })

  it('ignores secondary FAUs that do not load the injured area', () => {
    const benchWithTricepSecondary: InjuryBanExercise = {
      id: 'bench',
      movementPattern: 'horizontal_push',
      primaryFAUs: ['chest'],
      secondaryFAUs: ['triceps'],
    }
    const result = computeInjuryBanList(
      [injury({ area: 'knee', severity: 'avoid_loading' })],
      [benchWithTricepSecondary]
    )
    expect(result.bannedExerciseIds).toEqual([])
    expect(result.cautionedFAUs).toEqual([])
  })
})

describe('computeInjuryBanList — recovered & degradation', () => {
  it('produces zero entries for a recovered injury', () => {
    const result = computeInjuryBanList(
      [injury({ area: 'knee', severity: 'recovered' })],
      CATALOG
    )
    expect(result.bannedExerciseIds).toEqual([])
    expect(result.cautionedMovementPatterns).toEqual([])
    expect(result.cautionedFAUs).toEqual([])
    expect(result.notes).toEqual([])
  })

  it('degrades unknown/free-text area to a note, never a crash or ban', () => {
    const result = computeInjuryBanList(
      [
        { area: 'toe', severity: 'avoid_loading' },
        { area: undefined, severity: 'caution' },
      ] as unknown as InjuryEntry[],
      CATALOG
    )
    expect(result.bannedExerciseIds).toEqual([])
    expect(result.cautionedMovementPatterns).toEqual([])
    expect(result.notes.length).toBe(2)
  })

  it('handles empty / nullish inputs without throwing', () => {
    expect(computeInjuryBanList([], CATALOG).bannedExerciseIds).toEqual([])
    expect(
      computeInjuryBanList(
        [injury({ area: 'knee', severity: 'avoid_loading' })],
        []
      ).bannedExerciseIds
    ).toEqual([])
  })

  it('is deterministic for identical input', () => {
    const injuries = [
      injury({ area: 'hip', severity: 'avoid_loading' }),
      injury({ area: 'shoulder', severity: 'caution' }),
    ]
    const a = computeInjuryBanList(injuries, CATALOG)
    const b = computeInjuryBanList(injuries, CATALOG)
    expect(a).toEqual(b)
  })
})
