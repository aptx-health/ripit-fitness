/**
 * Workout library slice 3 (work 144): groupSavedWorkouts gains `new` and
 * `archived`. Spec: features/workout-library/origin-new-archive.feature.
 *
 *   new       origin agent or coach, never started (lastUsedAt null), not
 *             archived, not pinned; newest saved first.
 *   archived  every archived workout, whatever its origin or pin; they are in
 *             no other group.
 * An item with only these fields (no extra flags) follows the rules above.
 */

import { describe, expect, it } from 'vitest'
import { groupSavedWorkouts } from '@/lib/saved-workouts/groups'

const NOW = new Date('2026-11-07T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

type Item = {
  id: string
  origin: string
  lastUsedAt: string | null
  createdAt: string
  pinnedAt: string | null
  archivedAt: string | null
}
const item = (id: string, over: Partial<Item> = {}): Item => ({
  id,
  origin: 'session',
  lastUsedAt: null,
  createdAt: daysAgo(3),
  pinnedAt: null,
  archivedAt: null,
  ...over,
})

type Groups = { new: Item[]; pinned: Item[]; recent: Item[]; older: Item[]; archived: Item[] }
const group = (items: Item[]) => groupSavedWorkouts(items, NOW) as unknown as Groups
const ids = (list: Item[] | undefined) => (list ?? []).map((i) => i.id)

describe('the New group', () => {
  it('holds never-started agent and coach workouts, newest saved first, and nothing else', () => {
    const g = group([
      item('agent-old', { origin: 'agent', createdAt: daysAgo(40) }),
      item('coach', { origin: 'coach', createdAt: daysAgo(1) }),
      item('agent', { origin: 'agent', createdAt: daysAgo(5) }),
      item('session-unused', { createdAt: daysAgo(0) }),
    ])
    expect(ids(g.new)).toEqual(['coach', 'agent', 'agent-old'])
    expect(ids(g.recent)).toEqual(['session-unused'])
    expect(g.older).toEqual([])
  })

  it('a started agent or coach workout is in Recent or Older by its date, not New', () => {
    const g = group([
      item('agent-used', { origin: 'agent', lastUsedAt: daysAgo(2) }),
      item('coach-used-long-ago', { origin: 'coach', lastUsedAt: daysAgo(60), createdAt: daysAgo(90) }),
    ])
    expect(g.new).toEqual([])
    expect(ids(g.recent)).toEqual(['agent-used'])
    expect(ids(g.older)).toEqual(['coach-used-long-ago'])
  })

  it('is empty when there are no unstarted agent or coach workouts', () => {
    const g = group([item('a', { lastUsedAt: daysAgo(1) }), item('b', { origin: 'agent', lastUsedAt: daysAgo(1) })])
    expect(g.new).toEqual([])
  })

  it('an unstarted agent workout the user pinned is under Pinned, not New', () => {
    const g = group([item('pinned-ai', { origin: 'agent', pinnedAt: daysAgo(1) }), item('ai', { origin: 'agent' })])
    expect(ids(g.pinned)).toEqual(['pinned-ai'])
    expect(ids(g.new)).toEqual(['ai'])
  })
})

describe('archived', () => {
  it('archived workouts are only in `archived`, whatever their origin or pin', () => {
    const g = group([
      item('live', { lastUsedAt: daysAgo(1) }),
      item('arch-session', { lastUsedAt: daysAgo(1), archivedAt: daysAgo(0) }),
      item('arch-agent', { origin: 'agent', archivedAt: daysAgo(0) }),
      item('arch-old', { lastUsedAt: daysAgo(90), createdAt: daysAgo(120), archivedAt: daysAgo(0) }),
      item('arch-pinned', { pinnedAt: daysAgo(4), archivedAt: daysAgo(0) }),
    ])
    expect(ids(g.archived).sort()).toEqual(['arch-agent', 'arch-old', 'arch-pinned', 'arch-session'])
    expect(ids(g.new)).toEqual([])
    expect(ids(g.pinned)).toEqual([])
    expect(ids(g.recent)).toEqual(['live'])
    expect(ids(g.older)).toEqual([])
  })

  it('is empty when nothing is archived', () => {
    expect(group([item('a')]).archived).toEqual([])
  })
})

describe('nothing goes missing', () => {
  it('every workout is in exactly one group, however old', () => {
    const items = [
      item('n', { origin: 'agent', createdAt: daysAgo(400) }),
      item('p', { pinnedAt: daysAgo(1), lastUsedAt: daysAgo(300) }),
      item('r', { lastUsedAt: daysAgo(3) }),
      item('o', { lastUsedAt: daysAgo(400), createdAt: daysAgo(500) }),
      item('x', { archivedAt: daysAgo(1) }),
    ]
    const g = group(items)
    const all = [...g.new, ...g.pinned, ...g.recent, ...g.older, ...g.archived].map((i) => i.id)
    expect(all.sort()).toEqual(['n', 'o', 'p', 'r', 'x'])
  })

  it('slice 1 groups still work for items without origin or archivedAt', () => {
    const g = groupSavedWorkouts(
      [
        { id: 'a', lastUsedAt: daysAgo(2), createdAt: daysAgo(9), pinnedAt: null },
        { id: 'b', lastUsedAt: null, createdAt: daysAgo(1), pinnedAt: null },
      ],
      NOW
    ) as unknown as Groups
    expect(ids(g.recent)).toEqual(['b', 'a'])
    expect(g.new).toEqual([])
    expect(g.archived).toEqual([])
  })
})
