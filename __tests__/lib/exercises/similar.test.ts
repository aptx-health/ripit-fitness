/**
 * Ranking for the swap picker's "Similar" list (work 211, quick swap).
 * Behaviour: features/workout-logging/quick-swap.feature ("Similar is ranked by muscles, then equipment").
 *
 * PINNED (new)
 *   lib/exercises/similar.ts
 *     rankSimilar<T extends Candidate>(current: Candidate, candidates: T[]): T[]
 *       Candidate = { id: string; primaryFAUs: string[]; equipment: string[]; movementPattern?: string | null }
 *       Pure. Returns candidate objects (not copies of a different shape), at most 8, best first:
 *         1. more primary muscles shared with `current` (a count, not a fraction)
 *         2. then sharing at least one of `current`'s equipment
 *         3. then the same movementPattern, only when both are tagged (null/undefined never match)
 *         4. full ties keep the candidates' input order (stable), so the caller decides (e.g. by name)
 *       Drops `current` itself (by id) and any candidate sharing no primary muscle (secondary
 *       muscles and equipment never qualify one). An untagged `current` gives []. Does not
 *       reorder or change the input array.
 */

import { describe, expect, it } from 'vitest'

type Candidate = { id: string; primaryFAUs: string[]; equipment: string[]; movementPattern?: string | null }
type Lib = { rankSimilar: <T extends Candidate>(current: Candidate, candidates: T[]) => T[] }
const load = (spec: string) => import(/* @vite-ignore */ spec)
const lib = async () => (await load('@/lib/exercises/similar')) as Lib
const rank = async (current: Candidate, candidates: Candidate[]) => (await lib()).rankSimilar(current, candidates).map((c) => c.id)

const def = (id: string, primaryFAUs: string[], equipment: string[] = [], movementPattern: string | null = null, extra = {}) => ({
  id,
  primaryFAUs,
  equipment,
  movementPattern,
  ...extra,
})
// Dumbbell Goblet Squat: quads and glutes, dumbbell.
const goblet = def('goblet', ['quads', 'glutes'], ['dumbbell'], 'squat')

describe('rule: more shared primary muscles rank higher', () => {
  it('two shared beats one shared, whatever the input order', async () => {
    const two = def('two', ['quads', 'glutes'], ['barbell'])
    const one = def('one', ['quads'], ['barbell'])
    expect(await rank(goblet, [one, two])).toEqual(['two', 'one'])
    expect(await rank(goblet, [two, one])).toEqual(['two', 'one'])
  })

  it('muscles outrank equipment and pattern: two shared on a barbell beats one shared with dumbbell and squat', async () => {
    const twoBarbell = def('two-barbell', ['quads', 'glutes'], ['barbell'], 'lunge')
    const oneDumbbell = def('one-dumbbell', ['glutes'], ['dumbbell'], 'squat')
    expect(await rank(goblet, [oneDumbbell, twoBarbell])).toEqual(['two-barbell', 'one-dumbbell'])
  })

  it('it is a count, not a fraction: 2 of 4 shared beats 1 of 1', async () => {
    const current = def('cur', ['quads', 'glutes', 'hamstrings'], ['dumbbell'])
    const broad = def('broad', ['quads', 'glutes', 'calves', 'abs'], ['barbell'])
    const narrow = def('narrow', ['quads'], ['dumbbell'])
    expect(await rank(current, [narrow, broad])).toEqual(['broad', 'narrow'])
  })
})

describe('rule: among equal muscle matches, shared equipment ranks higher', () => {
  it('the dumbbell one comes first, whatever the input order', async () => {
    const db = def('db', ['quads', 'glutes'], ['dumbbell'])
    const bb = def('bb', ['quads', 'glutes'], ['barbell'])
    expect(await rank(goblet, [bb, db])).toEqual(['db', 'bb'])
    expect(await rank(goblet, [db, bb])).toEqual(['db', 'bb'])
  })

  it('any one shared item counts when either side lists several', async () => {
    const current = def('cur', ['chest'], ['dumbbell', 'bench'])
    const multi = def('multi', ['chest'], ['cable', 'bench'])
    const none = def('none', ['chest'], ['machine'])
    expect(await rank(current, [none, multi])).toEqual(['multi', 'none'])
  })

  it('equipment outranks pattern: shared equipment untagged beats other equipment with the same pattern', async () => {
    const eq = def('eq', ['quads'], ['dumbbell'], null)
    const pat = def('pat', ['quads'], ['barbell'], 'squat')
    expect(await rank(goblet, [pat, eq])).toEqual(['eq', 'pat'])
  })
})

describe('rule: then the same movement pattern, only when both are tagged', () => {
  it('same pattern ranks higher among equal muscles and equipment', async () => {
    const lunge = def('lunge', ['quads', 'glutes'], ['dumbbell'], 'lunge')
    const squat = def('squat', ['quads', 'glutes'], ['dumbbell'], 'squat')
    expect(await rank(goblet, [lunge, squat])).toEqual(['squat', 'lunge'])
  })

  it('an untagged current matches nothing by pattern: untagged candidates do not jump ahead', async () => {
    const current = def('cur', ['quads'], ['dumbbell'], null)
    const tagged = def('tagged', ['quads'], ['dumbbell'], 'squat')
    const untagged = def('untagged', ['quads'], ['dumbbell'], null)
    expect(await rank(current, [tagged, untagged])).toEqual(['tagged', 'untagged'])
  })

  it('an untagged candidate is not a pattern match for a tagged current (undefined too)', async () => {
    const other = def('other', ['quads', 'glutes'], ['dumbbell'], 'lunge')
    const missing = { id: 'missing', primaryFAUs: ['quads', 'glutes'], equipment: ['dumbbell'] }
    const squat = def('squat', ['quads', 'glutes'], ['dumbbell'], 'squat')
    expect(await rank(goblet, [other, missing, squat])).toEqual(['squat', 'other', 'missing'])
  })
})

describe('rule: who is left out', () => {
  it('the current exercise is never in the list', async () => {
    const lunge = def('lunge', ['quads', 'glutes'], ['dumbbell'], 'lunge')
    expect(await rank(goblet, [goblet, lunge])).toEqual(['lunge'])
  })

  it('no shared primary muscle means out, even sharing equipment, pattern or a secondary muscle', async () => {
    const curl = def('curl', ['biceps'], ['dumbbell'], 'squat')
    const secondaryOnly = def('secondary-only', ['hamstrings'], ['dumbbell'], 'squat', { secondaryFAUs: ['quads', 'glutes'] })
    const lunge = def('lunge', ['glutes'], [])
    expect(await rank(goblet, [curl, secondaryOnly, lunge])).toEqual(['lunge'])
  })

  it('an untagged current gives an empty list', async () => {
    const untagged = def('cur', [], ['dumbbell'], 'squat')
    expect(await rank(untagged, [def('a', ['quads'], ['dumbbell'], 'squat'), def('b', [], ['dumbbell'])])).toEqual([])
  })
})

describe('rule: up to 8', () => {
  it('twelve matches give the best eight', async () => {
    const strong = Array.from({ length: 6 }, (_, i) => def(`strong${i}`, ['quads', 'glutes'], ['dumbbell']))
    const mid = Array.from({ length: 2 }, (_, i) => def(`mid${i}`, ['quads', 'glutes'], ['barbell']))
    const weak = Array.from({ length: 4 }, (_, i) => def(`weak${i}`, ['quads'], ['barbell']))
    const ids = await rank(goblet, [...weak, ...mid, ...strong])
    expect(ids).toEqual([...strong.map((d) => d.id), ...mid.map((d) => d.id)])
  })

  it('three matches give three, nothing padded in', async () => {
    const list = [def('a', ['quads']), def('b', ['glutes']), def('c', ['quads', 'glutes']), def('x', ['chest']), def('y', [])]
    expect(await rank(goblet, list)).toEqual(['c', 'a', 'b'])
  })
})

describe('rule: pure', () => {
  it('returns the candidate objects and leaves the input array as it was', async () => {
    const a = def('a', ['quads'], [], null, { name: 'A' })
    const b = def('b', ['quads', 'glutes'], [], null, { name: 'B' })
    const input = [a, b]
    const out = (await lib()).rankSimilar(goblet, input)
    expect(out[0]).toBe(b)
    expect(out[0]).toHaveProperty('name', 'B')
    expect(input.map((c) => c.id)).toEqual(['a', 'b'])
  })
})
