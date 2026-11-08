/**
 * Workout library slice 1 (work 142): the grouping behind Library → Workouts.
 * Spec: features/workout-library/order-older.feature ("Groups in order",
 * "Pinned first", "Recent", "Older fold").
 */

import { describe, expect, it } from 'vitest'
import { groupSavedWorkouts } from '@/lib/saved-workouts/groups'

const NOW = new Date('2026-11-06T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

type Item = { id: string; lastUsedAt: string | null; createdAt: string; pinnedAt?: string | null }
const item = (id: string, over: Partial<Item> = {}): Item => ({
  id,
  lastUsedAt: null,
  createdAt: daysAgo(100),
  pinnedAt: null,
  ...over,
})
const ids = (xs: { id: string }[]) => xs.map((x) => x.id)

describe('groupSavedWorkouts', () => {
  it('puts a pinned workout under Pinned even when it was last used 60 days ago', () => {
    const g = groupSavedWorkouts([item('upper-a', { pinnedAt: daysAgo(1), lastUsedAt: daysAgo(60) })], NOW)
    expect(ids(g.pinned)).toEqual(['upper-a'])
    expect(g.recent).toEqual([])
    expect(g.older).toEqual([])
  })

  it('orders Pinned newest pin first, as Training does', () => {
    const g = groupSavedWorkouts(
      [item('a', { pinnedAt: daysAgo(5) }), item('b', { pinnedAt: daysAgo(1) }), item('c', { pinnedAt: daysAgo(3) })],
      NOW,
    )
    expect(ids(g.pinned)).toEqual(['b', 'c', 'a'])
  })

  it('Recent holds unpinned workouts used in the last 30 days, last used first', () => {
    const g = groupSavedWorkouts(
      [item('a', { lastUsedAt: daysAgo(10) }), item('b', { lastUsedAt: daysAgo(2) }), item('c', { lastUsedAt: daysAgo(29) })],
      NOW,
    )
    expect(ids(g.recent)).toEqual(['b', 'a', 'c'])
    expect(g.older).toEqual([])
  })

  it('a never-started workout counts from when it was saved, so a just-approved one tops Recent', () => {
    const g = groupSavedWorkouts(
      [item('used-yesterday', { lastUsedAt: daysAgo(1) }), item('just-approved', { createdAt: daysAgo(0) })],
      NOW,
    )
    expect(ids(g.recent)).toEqual(['just-approved', 'used-yesterday'])
  })

  it('a never-started workout saved more than 30 days ago is Older', () => {
    const g = groupSavedWorkouts([item('old-ai', { createdAt: daysAgo(31) })], NOW)
    expect(ids(g.older)).toEqual(['old-ai'])
  })

  it('uses lastUsedAt over createdAt: created long ago but used last week is Recent', () => {
    const g = groupSavedWorkouts([item('a', { createdAt: daysAgo(200), lastUsedAt: daysAgo(7) })], NOW)
    expect(ids(g.recent)).toEqual(['a'])
  })

  it('Older holds the rest, last used first, and keeps every workout (nothing dropped)', () => {
    const older = Array.from({ length: 12 }, (_, i) => item(`o${i}`, { lastUsedAt: daysAgo(31 + i * 3) }))
    const shuffled = [...older].reverse()
    const g = groupSavedWorkouts([...shuffled, item('r', { lastUsedAt: daysAgo(3) })], NOW)
    expect(ids(g.older)).toEqual(ids(older))
    expect(g.pinned.length + g.recent.length + g.older.length).toBe(13)
  })

  it('the 30-day line: exactly 30 days is Recent, a minute more is Older', () => {
    const g = groupSavedWorkouts(
      [
        item('edge', { lastUsedAt: daysAgo(30) }),
        item('past', { lastUsedAt: new Date(NOW.getTime() - 30 * 86_400_000 - 60_000).toISOString() }),
      ],
      NOW,
    )
    expect(ids(g.recent)).toEqual(['edge'])
    expect(ids(g.older)).toEqual(['past'])
  })
})
