import { describe, expect, it } from 'vitest'
import type { TargetMovements } from '@/lib/exercises/anchor-patterns'
import {
  type AnchorStalenessRow,
  computeAnchorStaleness,
} from '@/lib/recommendations/anchor-staleness'

// Fixed reference instant so day math is deterministic.
const NOW = new Date('2026-07-10T12:00:00.000Z')

/** A Date `days` whole days before NOW. */
function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000)
}

function order(rows: AnchorStalenessRow[]): string[] {
  return rows.map((r) => r.pattern)
}

describe('computeAnchorStaleness', () => {
  it('considers only configured patterns with a non-empty id list', () => {
    const target: TargetMovements = {
      hinge: ['ex_dl'],
      squat: [], // empty -> skipped
    }
    const rows = computeAnchorStaleness(target, new Map(), NOW)
    expect(order(rows)).toEqual(['hinge'])
  })

  it('uses the freshest (min days-since) pick to score a movement', () => {
    const target: TargetMovements = { hinge: ['ex_dl', 'ex_rdl'] }
    const logged = new Map<string, Date>([
      ['ex_dl', daysAgo(20)],
      ['ex_rdl', daysAgo(3)], // freshest resets the movement
    ])
    const [row] = computeAnchorStaleness(target, logged, NOW)
    expect(row.lastLoggedDaysAgo).toBe(3)
  })

  it('marks a movement with no logged picks as never logged (null)', () => {
    const target: TargetMovements = { squat: ['ex_squat'] }
    const [row] = computeAnchorStaleness(target, new Map(), NOW)
    expect(row.lastLoggedDaysAgo).toBeNull()
  })

  it('sorts never-logged first, then by days-since descending', () => {
    const target: TargetMovements = {
      hinge: ['ex_dl'], // 2d
      squat: ['ex_sq'], // 15d
      horizontal_push: ['ex_bench'], // never
    }
    const logged = new Map<string, Date>([
      ['ex_dl', daysAgo(2)],
      ['ex_sq', daysAgo(15)],
    ])
    const rows = computeAnchorStaleness(target, logged, NOW)
    expect(order(rows)).toEqual(['horizontal_push', 'squat', 'hinge'])
  })

  it('breaks ties on the fixed taxonomy order (hinge before squat)', () => {
    const target: TargetMovements = {
      squat: ['ex_sq'],
      hinge: ['ex_dl'],
    }
    // Both logged the same number of days ago -> taxonomy order wins.
    const logged = new Map<string, Date>([
      ['ex_sq', daysAgo(5)],
      ['ex_dl', daysAgo(5)],
    ])
    expect(order(computeAnchorStaleness(target, logged, NOW))).toEqual(['hinge', 'squat'])
  })

  it('breaks never-logged ties on taxonomy order too', () => {
    const target: TargetMovements = {
      vertical_pull: ['ex_pullup'],
      horizontal_pull: ['ex_row'],
    }
    // Neither logged; horizontal_pull precedes vertical_pull in ANCHOR_PATTERNS.
    expect(order(computeAnchorStaleness(target, new Map(), NOW))).toEqual([
      'horizontal_pull',
      'vertical_pull',
    ])
  })

  it('clamps a future last-logged date to 0 (today) rather than going negative', () => {
    const target: TargetMovements = { hinge: ['ex_dl'] }
    const logged = new Map<string, Date>([['ex_dl', daysAgo(-3)]]) // 3 days in the future
    const [row] = computeAnchorStaleness(target, logged, NOW)
    expect(row.lastLoggedDaysAgo).toBe(0)
  })

  it('carries the curated ids and display name through onto each row', () => {
    const target: TargetMovements = { hinge: ['ex_dl', 'ex_rdl'] }
    const [row] = computeAnchorStaleness(target, new Map(), NOW)
    expect(row.exerciseIds).toEqual(['ex_dl', 'ex_rdl'])
    expect(row.displayName).toBe('Hinge')
  })
})
