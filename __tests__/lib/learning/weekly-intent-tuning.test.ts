import { describe, expect, it } from 'vitest'
import {
  type EvaluatedSession,
  evaluateWeeklyIntent,
  type MovementEwmaMap,
  type WeeklyIntent,
} from '@/lib/learning/weekly-intent'

/**
 * #937: the tunable heaviness thresholds must actually change a weekly-intent
 * verdict. A "heavy legs" intent over one squat session whose top set sits at
 * ~93% of the movement EWMA flips satisfied → unsatisfied as heavyE1rmFraction
 * crosses that ratio, with RPE unlogged so the effort branch can't mask it.
 */
describe('heavy thresholds flip a weekly-intent verdict', () => {
  const intent: WeeklyIntent = { type: 'heavy_session', muscle_group: 'legs', min_per_week: 1 }

  // Squat top set: e1RM = 200 * (1 + 5/30) = 233.3; EWMA 250 → ratio ≈ 0.933.
  const sessions: EvaluatedSession[] = [
    {
      daysAgo: 1,
      movements: [
        {
          movementPattern: 'squat',
          faus: ['quads'],
          sets: [{ weightLbs: 200, reps: 5, rpe: null, rir: null }],
        },
      ],
    },
  ]
  const ewmaMap: MovementEwmaMap = { squat: { ewmaE1RMLbs: 250, observationCount: 5 } }

  it('is satisfied when the fraction is below the top-set ratio', () => {
    const verdict = evaluateWeeklyIntent(intent, sessions, ewmaMap, {
      heavyE1rmFraction: 0.85,
      heavyEffortCutoff: 8,
    })
    expect(verdict.satisfiedLast7d).toBe(true)
  })

  it('is NOT satisfied when the fraction is above the top-set ratio', () => {
    const verdict = evaluateWeeklyIntent(intent, sessions, ewmaMap, {
      heavyE1rmFraction: 0.95,
      heavyEffortCutoff: 8,
    })
    expect(verdict.satisfiedLast7d).toBe(false)
  })

  it('effort cutoff overrides the load branch when RPE is logged', () => {
    const rpeSessions: EvaluatedSession[] = [
      {
        daysAgo: 1,
        movements: [
          {
            movementPattern: 'squat',
            faus: ['quads'],
            sets: [{ weightLbs: 200, reps: 5, rpe: 8, rir: null }],
          },
        ],
      },
    ]
    // High e1RM fraction would say "not heavy", but RPE 8 ≥ cutoff 8 fires first.
    const heavy = evaluateWeeklyIntent(intent, rpeSessions, ewmaMap, {
      heavyE1rmFraction: 0.99,
      heavyEffortCutoff: 8,
    })
    expect(heavy.satisfiedLast7d).toBe(true)
    // Raise the effort cutoff above the logged RPE and the load branch decides
    // again — 0.933 < 0.99 → not heavy.
    const notHeavy = evaluateWeeklyIntent(intent, rpeSessions, ewmaMap, {
      heavyE1rmFraction: 0.99,
      heavyEffortCutoff: 9,
    })
    expect(notHeavy.satisfiedLast7d).toBe(false)
  })
})
