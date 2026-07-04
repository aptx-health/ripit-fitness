import { describe, expect, it } from 'vitest'

import type { WeeklyIntentVerdict } from '@/lib/learning/weekly-intent'
import type { WeeklyIntent } from '@/lib/llm/prompts/suggest-workout/types'
import {
  summarizeWeeklyIntent,
  toWeeklyIntentStatus,
} from '@/lib/suggest/weekly-intent-status'

function verdict(o: Partial<WeeklyIntentVerdict> & { intent: WeeklyIntent }): WeeklyIntentVerdict {
  return {
    satisfiedLast7d: false,
    lastSatisfiedDaysAgo: null,
    evaluable: true,
    ...o,
  }
}

const heavyLegs: WeeklyIntent = { type: 'heavy_session', muscle_group: 'legs', min_per_week: 1 }

describe('summarizeWeeklyIntent', () => {
  it('renders each structured intent type', () => {
    expect(summarizeWeeklyIntent(heavyLegs)).toBe(
      'At least 1 heavy legs session per week',
    )
    expect(
      summarizeWeeklyIntent({ type: 'heavy_session', muscle_group: 'push', min_per_week: 2 }),
    ).toBe('At least 2 heavy push sessions per week')
    expect(
      summarizeWeeklyIntent({ type: 'movement_frequency', movement_pattern: 'hinge', min_per_week: 2 }),
    ).toBe('hinge at least 2x per week')
    expect(
      summarizeWeeklyIntent({ type: 'volume_tilt', toward: ['chest'], away_from: ['quads'], ratio: 2 }),
    ).toBe('Tilt volume toward chest over quads (>=2x)')
    expect(summarizeWeeklyIntent({ type: 'free_text', text: 'Have fun' })).toBe('Have fun')
  })
})

describe('toWeeklyIntentStatus (emit-only-when-unsatisfied, rules 3-5)', () => {
  it('emits evidence and NOT last_satisfied_days_ago when satisfied', () => {
    const status = toWeeklyIntentStatus(
      verdict({
        intent: heavyLegs,
        satisfiedLast7d: true,
        lastSatisfiedDaysAgo: 0,
        evidence: '1 heavy legs session in the last 7 days (target 1)',
      }),
    )
    expect(status).toEqual({
      intent_summary: 'At least 1 heavy legs session per week',
      satisfied_last_7d: true,
      evidence: '1 heavy legs session in the last 7 days (target 1)',
    })
    expect('last_satisfied_days_ago' in status).toBe(false)
  })

  it('emits last_satisfied_days_ago and NOT evidence when unsatisfied', () => {
    const status = toWeeklyIntentStatus(
      verdict({ intent: heavyLegs, satisfiedLast7d: false, lastSatisfiedDaysAgo: 8 }),
    )
    expect(status).toEqual({
      intent_summary: 'At least 1 heavy legs session per week',
      satisfied_last_7d: false,
      last_satisfied_days_ago: 8,
    })
    expect('evidence' in status).toBe(false)
  })

  it('keeps a null last_satisfied_days_ago (never satisfied in history)', () => {
    const status = toWeeklyIntentStatus(
      verdict({ intent: heavyLegs, satisfiedLast7d: false, lastSatisfiedDaysAgo: null }),
    )
    expect(status.last_satisfied_days_ago).toBeNull()
    expect('last_satisfied_days_ago' in status).toBe(true)
  })

  it('gives free_text intents neither evidence nor last_satisfied_days_ago', () => {
    const status = toWeeklyIntentStatus(
      verdict({
        intent: { type: 'free_text', text: 'Stay consistent' },
        satisfiedLast7d: false,
        lastSatisfiedDaysAgo: null,
        evaluable: false,
      }),
    )
    expect(status).toEqual({
      intent_summary: 'Stay consistent',
      satisfied_last_7d: false,
    })
    expect('evidence' in status).toBe(false)
    expect('last_satisfied_days_ago' in status).toBe(false)
  })
})
