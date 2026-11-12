/**
 * Ranking for the swap picker's "Similar" list (work 211, quick swap; load type and name words, work 217).
 * Behaviour: features/workout-logging/quick-swap.feature ("Similar is ranked by muscles, then equipment",
 * "A weighted exercise gets weighted swaps first").
 *
 * PINNED (re-locked in work 217: rules 3 and 5 are new, so some old full ties now break)
 *   lib/exercises/similar.ts
 *     rankSimilar<T extends Candidate>(current: Candidate, candidates: T[]): T[]
 *       Candidate = { id: string; name?: string | null; primaryFAUs: string[]; equipment: string[];
 *                     movementPattern?: string | null; isBodyweight?: boolean | null }
 *       Pure. Returns candidate objects (not copies of a different shape), at most 8, best first:
 *         1. more primary muscles shared with `current` (a count, not a fraction)
 *         2. then sharing at least one of `current`'s equipment
 *         3. then the same load type (loadType: isBodyweight -> bodyweight; else weighted equipment
 *            such as barbell, dumbbell, kettlebell, machine, cable, plate -> weighted; else a band ->
 *            band; else "bodyweight" equipment -> bodyweight; else unknown, which never matches)
 *         4. then the same movementPattern, only when both are tagged (null/undefined never match)
 *         5. then sharing a movement word in the name (MOVEMENT_WORDS: squat, lunge, press, row, curl,
 *            deadlift, ...; plurals count)
 *         6. full ties keep the candidates' input order (stable), so the caller decides (e.g. by name)
 *       Drops `current` itself (by id) and any candidate sharing no primary muscle (secondary
 *       muscles and equipment never qualify one). An untagged `current` gives []. Does not
 *       reorder or change the input array.
 */

import { describe, expect, it } from 'vitest'

type Candidate = {
  id: string
  name?: string | null
  primaryFAUs: string[]
  equipment: string[]
  movementPattern?: string | null
  isBodyweight?: boolean | null
}
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

describe('rule: then the same load type (weighted vs bodyweight vs band)', () => {
  const backSquat = def('back-squat', ['quads', 'glutes'], ['barbell'], null, { name: 'Barbell Back Squat' })

  it('a weighted current puts weighted candidates before band and bodyweight ones, whatever the input order', async () => {
    const band = def('band', ['quads', 'glutes'], ['band'])
    const bodyweight = def('bodyweight', ['quads', 'glutes'], ['bodyweight'], null, { isBodyweight: true })
    const dumbbell = def('dumbbell', ['quads', 'glutes'], ['dumbbell'])
    expect((await rank(backSquat, [band, bodyweight, dumbbell]))[0]).toBe('dumbbell')
    expect((await rank(backSquat, [dumbbell, bodyweight, band]))[0]).toBe('dumbbell')
  })

  it('kettlebell, machine, cable and plate all count as weighted', async () => {
    const band = def('band', ['quads'], ['resistance band'])
    for (const eq of ['kettlebell', 'machine', 'cable', 'plate', 'smith-machine']) {
      expect(await rank(backSquat, [band, def(eq, ['quads'], [eq])])).toEqual([eq, 'band'])
    }
  })

  it('a bodyweight current puts bodyweight first; isBodyweight counts even with weighted equipment listed', async () => {
    const current = def('cur', ['quads'], ['bodyweight'], null, { isBodyweight: true })
    const weighted = def('weighted', ['quads'], ['dumbbell'])
    const weightedVest = def('vest', ['quads'], ['dumbbell'], null, { isBodyweight: true })
    expect(await rank(current, [weighted, weightedVest])).toEqual(['vest', 'weighted'])
  })

  it('"bodyweight" in the equipment counts as bodyweight when the flag is not set', async () => {
    const current = def('cur', ['quads'], ['pull-up-bar', 'bodyweight'])
    const band = def('band', ['quads'], ['band'])
    const bodyweight = def('bodyweight', ['quads'], ['bodyweight'])
    expect(await rank(current, [band, bodyweight])).toEqual(['bodyweight', 'band'])
  })

  it('a band current puts band first', async () => {
    const current = def('cur', ['quads'], ['band'])
    const weighted = def('weighted', ['quads'], ['dumbbell'])
    const band = def('band', ['quads'], ['resistance-band'])
    expect(await rank(current, [weighted, band])).toEqual(['band', 'weighted'])
  })

  it('an unknown load type matches nothing: no equipment on either side keeps input order', async () => {
    const current = def('cur', ['quads'], [])
    const a = def('a', ['quads'], [])
    const b = def('b', ['quads'], [])
    expect(await rank(current, [a, b])).toEqual(['a', 'b'])
    expect(await rank(current, [b, a])).toEqual(['b', 'a'])
  })

  it('equipment outranks load type: a shared barbell beats a weighted dumbbell even when flagged bodyweight', async () => {
    const current = def('cur', ['quads'], ['barbell'])
    const bandBarbell = def('band-barbell', ['quads'], ['band', 'barbell'], null, { isBodyweight: true })
    const dumbbell = def('dumbbell', ['quads'], ['dumbbell'])
    expect(await rank(current, [dumbbell, bandBarbell])).toEqual(['band-barbell', 'dumbbell'])
  })

  it('load type outranks pattern', async () => {
    const current = def('cur', ['quads'], ['barbell'], 'squat')
    const bandSquat = def('band-squat', ['quads'], ['band'], 'squat')
    const dumbbellLunge = def('db-lunge', ['quads'], ['dumbbell'], 'lunge')
    expect(await rank(current, [bandSquat, dumbbellLunge])).toEqual(['db-lunge', 'band-squat'])
  })
})

describe('rule: then a shared movement word in the name', () => {
  const backSquat = def('back-squat', ['quads', 'glutes'], ['barbell'], null, { name: 'Barbell Back Squat' })

  it('a squat beats a lunge among otherwise equal candidates, whatever the input order', async () => {
    const lunge = def('lunge', ['quads', 'glutes'], ['dumbbell'], null, { name: 'Dumbbell Lunge' })
    const goblet = def('goblet', ['quads', 'glutes'], ['dumbbell'], null, { name: 'Dumbbell Goblet Squat' })
    expect(await rank(backSquat, [lunge, goblet])).toEqual(['goblet', 'lunge'])
    expect(await rank(backSquat, [goblet, lunge])).toEqual(['goblet', 'lunge'])
  })

  it('plurals and case count ("Squats", "PRESSES")', async () => {
    const press = def('press', ['chest'], ['dumbbell'], null, { name: 'Dumbbell Bench Press' })
    const fly = def('fly', ['chest'], ['dumbbell'], null, { name: 'Dumbbell Fly' })
    const presses = def('presses', ['chest'], ['dumbbell'], null, { name: 'Floor PRESSES' })
    expect(await rank(press, [fly, presses])).toEqual(['presses', 'fly'])
    const squats = def('squats', ['quads', 'glutes'], ['dumbbell'], null, { name: 'Jump Squats' })
    const step = def('step', ['quads', 'glutes'], ['dumbbell'], null, { name: 'Step Up' })
    expect(await rank(backSquat, [step, squats])).toEqual(['squats', 'step'])
  })

  it('only listed movement words count: sharing "Barbell" or "Back" does not', async () => {
    const current = def('cur', ['back'], ['barbell'], null, { name: 'Barbell Back Extension' })
    const barbellBack = def('barbell-back', ['back'], ['barbell'], null, { name: 'Barbell Back Thing' })
    const extension = def('extension', ['back'], ['barbell'], null, { name: 'Hip Extension' })
    expect(await rank(current, [barbellBack, extension])).toEqual(['extension', 'barbell-back'])
  })

  it('a word inside another word does not count ("Rower" is not "row")', async () => {
    const current = def('cur', ['lats'], ['cable'], null, { name: 'Cable Row' })
    const rower = def('rower', ['lats'], ['cable'], null, { name: 'Rower Sprint' })
    const row = def('row', ['lats'], ['cable'], null, { name: 'Seated Row' })
    expect(await rank(current, [rower, row])).toEqual(['row', 'rower'])
  })

  it('pattern outranks the name word', async () => {
    const current = def('cur', ['quads', 'glutes'], ['barbell'], 'squat', { name: 'Barbell Back Squat' })
    const splitSquat = def('split', ['quads', 'glutes'], ['dumbbell'], 'lunge', { name: 'Split Squat' })
    const tagged = def('tagged', ['quads', 'glutes'], ['dumbbell'], 'squat', { name: 'Box Thing' })
    expect(await rank(current, [splitSquat, tagged])).toEqual(['tagged', 'split'])
  })

  it('a current with no name, or no movement word, matches nothing by name', async () => {
    const a = def('a', ['quads'], ['dumbbell'], null, { name: 'Alpha' })
    const b = def('b', ['quads'], ['dumbbell'], null, { name: 'Goblet Squat' })
    expect(await rank(def('cur', ['quads'], ['dumbbell']), [a, b])).toEqual(['a', 'b'])
    expect(await rank(def('cur', ['quads'], ['dumbbell'], null, { name: 'Leg Thing' }), [a, b])).toEqual(['a', 'b'])
  })
})

describe('scenario: Barbell Back Squat gets weighted squats first', () => {
  it('weighted squats, then other weighted, then band and bodyweight ones (input in name order)', async () => {
    const backSquat = def('Barbell Back Squat', ['quads', 'glutes'], ['barbell'], null, { name: 'Barbell Back Squat' })
    const named = (name: string, equipment: string[], extra = {}) => def(name, ['quads', 'glutes'], equipment, null, { name, ...extra })
    const byName = [
      named('Band Leg Press', ['band']),
      named('Band Squat', ['band']),
      named('Bodyweight Squat', ['bodyweight'], { isBodyweight: true }),
      named('Dumbbell Goblet Squat', ['dumbbell']),
      named('Dumbbell Lunge', ['dumbbell']),
      named('Kettlebell Front Squat', ['kettlebell']),
      named('Leg Press', ['machine']),
    ]
    expect(await rank(backSquat, byName)).toEqual([
      'Dumbbell Goblet Squat',
      'Kettlebell Front Squat',
      'Dumbbell Lunge',
      'Leg Press',
      'Band Squat',
      'Bodyweight Squat',
      'Band Leg Press',
    ])
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
