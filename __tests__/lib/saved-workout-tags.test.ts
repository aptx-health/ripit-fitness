/**
 * lib/saved-workouts/tags.ts (work 226): tidying and matching saved-workout
 * tags. Contract: __tests__/features/workout-library/tags-search.steps.ts.
 */
import { describe, expect, it } from 'vitest'

type TagsLib = {
  STARTER_TAGS: readonly string[]
  TAG_MAX_LENGTH: number
  MAX_TAGS_PER_WORKOUT: number
  MAX_TAGS_PER_USER: number
  normaliseTag: (raw: string, known: readonly string[]) => string | null
  normaliseTags: (raw: readonly string[], known: readonly string[]) => string[]
}
const load = (spec: string) => import(/* @vite-ignore */ spec)
const lib = async () => (await load('@/lib/saved-workouts/tags')) as TagsLib

describe('saved workout tags', () => {
  it('starter tags and limits', async () => {
    const t = await lib()
    expect([...t.STARTER_TAGS]).toEqual(['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full body', 'Core', 'Cardio', 'Quick'])
    expect([t.TAG_MAX_LENGTH, t.MAX_TAGS_PER_WORKOUT, t.MAX_TAGS_PER_USER]).toEqual([24, 8, 50])
  })

  it('trims, makes every run of whitespace one space, and matches a starter without case', async () => {
    const { normaliseTag, STARTER_TAGS } = await lib()
    expect(normaliseTag(' full  BODY ', STARTER_TAGS)).toBe('Full body')
    expect(normaliseTag('\tFULL\n body', STARTER_TAGS)).toBe('Full body')
    expect(normaliseTag('cardio', STARTER_TAGS)).toBe('Cardio')
  })

  it("matches the user's own tag, spelled as they have it, before a starter", async () => {
    const { normaliseTag, STARTER_TAGS } = await lib()
    const known = ['Hill sprints', 'Deadlift Day', ...STARTER_TAGS]
    expect(normaliseTag('HILL   sprints', known)).toBe('Hill sprints')
    expect(normaliseTag('deadlift day', known)).toBe('Deadlift Day')
    // A spelling the user made first wins over the starter's.
    expect(normaliseTag('PUSH', ['push', ...STARTER_TAGS])).toBe('push')
  })

  it('a new tag keeps the case typed; nothing left is null', async () => {
    const { normaliseTag, STARTER_TAGS } = await lib()
    expect(normaliseTag('  Box JUMPS ', STARTER_TAGS)).toBe('Box JUMPS')
    expect(normaliseTag('mobility', STARTER_TAGS)).toBe('mobility')
    expect(normaliseTag('Pushups', STARTER_TAGS)).toBe('Pushups') // not "Push"
    expect(normaliseTag('   ', STARTER_TAGS)).toBeNull()
    expect(normaliseTag('', STARTER_TAGS)).toBeNull()
  })

  it('normaliseTags drops empties and repeats, keeping the first and the order', async () => {
    const { normaliseTags, STARTER_TAGS } = await lib()
    expect(normaliseTags(['legs', 'Sled Push', ' ', 'LEGS', 'sled  push', 'Core'], STARTER_TAGS)).toEqual([
      'Legs',
      'Sled Push',
      'Core',
    ])
    expect(normaliseTags(['Tempo', 'tempo'], STARTER_TAGS)).toEqual(['Tempo'])
    expect(normaliseTags([], STARTER_TAGS)).toEqual([])
  })

  it('applies no limits itself', async () => {
    const { normaliseTag, normaliseTags, STARTER_TAGS } = await lib()
    const long = 'A'.repeat(30)
    expect(normaliseTag(long, STARTER_TAGS)).toBe(long)
    expect(normaliseTags(Array.from({ length: 10 }, (_, i) => `T${i}`), STARTER_TAGS)).toHaveLength(10)
  })
})
