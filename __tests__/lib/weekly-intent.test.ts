import { describe, expect, it } from 'vitest'
import {
  determineMovementHeavy,
  type EvaluatedSession,
  evaluateWeeklyIntent,
  evaluateWeeklyIntents,
  HEAVY_EFFORT_RPE,
  isSessionHeavyForPatterns,
  MIN_EWMA_OBSERVATIONS,
  type MovementEwmaMap,
  normalizedEffort,
  type SessionMovement,
  WINDOW_DAYS,
} from '@/lib/learning/weekly-intent'
import type { WeeklyIntent } from '@/lib/llm/prompts/suggest-workout/schemas'

// ---------------------------------------------------------------------------
// Fixtures / helpers
// ---------------------------------------------------------------------------

/** A squat EWMA that is well-calibrated (enough observations to trust). */
const CALIBRATED_SQUAT_EWMA: MovementEwmaMap = {
  squat: { ewmaE1RMLbs: 400, observationCount: 6 },
}

function squatSession(
  daysAgo: number,
  sets: SessionMovement['sets'],
  extra: Partial<SessionMovement> = {}
): EvaluatedSession {
  return {
    daysAgo,
    movements: [{ movementPattern: 'squat', sets, ...extra }],
  }
}

// ---------------------------------------------------------------------------
// Effort normalization
// ---------------------------------------------------------------------------

describe('normalizedEffort', () => {
  it('uses RPE directly when present', () => {
    expect(normalizedEffort({ weightLbs: 100, reps: 5, rpe: 8 })).toBe(8)
  })

  it('normalizes RIR to the RPE scale (RIR 2 => RPE 8)', () => {
    expect(normalizedEffort({ weightLbs: 100, reps: 5, rir: 2 })).toBe(8)
    expect(normalizedEffort({ weightLbs: 100, reps: 5, rir: 0 })).toBe(10)
  })

  it('prefers RPE over RIR when both are present', () => {
    expect(normalizedEffort({ weightLbs: 100, reps: 5, rpe: 9, rir: 4 })).toBe(9)
  })

  it('returns null when neither is logged', () => {
    expect(normalizedEffort({ weightLbs: 100, reps: 5 })).toBeNull()
    expect(
      normalizedEffort({ weightLbs: 100, reps: 5, rpe: null, rir: null })
    ).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Session-relative heavy determination — EWMA branch
// ---------------------------------------------------------------------------

describe('determineMovementHeavy — EWMA branch', () => {
  it('is heavy when the top-set e1RM is >= 85% of the EWMA e1RM', () => {
    // 350x1 = 350 e1RM = 87.5% of 400 -> heavy
    const result = determineMovementHeavy(
      { movementPattern: 'squat', sets: [{ weightLbs: 350, reps: 1 }] },
      CALIBRATED_SQUAT_EWMA.squat
    )
    expect(result.isHeavy).toBe(true)
    expect(result.reason).toBe('ewma')
  })

  it('is NOT heavy when the top-set e1RM is below 85% and effort is unlogged', () => {
    // 300x1 = 300 e1RM = 75% of 400 -> not heavy
    const result = determineMovementHeavy(
      { movementPattern: 'squat', sets: [{ weightLbs: 300, reps: 1 }] },
      CALIBRATED_SQUAT_EWMA.squat
    )
    expect(result.isHeavy).toBe(false)
    expect(result.reason).toBe('none')
  })

  it('is heavy via effort even when load is light (RPE >= 8)', () => {
    const result = determineMovementHeavy(
      {
        movementPattern: 'squat',
        sets: [{ weightLbs: 135, reps: 5, rpe: HEAVY_EFFORT_RPE }],
      },
      CALIBRATED_SQUAT_EWMA.squat
    )
    expect(result.isHeavy).toBe(true)
    expect(result.reason).toBe('effort')
  })

  it('ignores the intensityClass tag when the EWMA branch is active', () => {
    // Tagged heavy, but light load and no effort logged -> not heavy.
    const result = determineMovementHeavy(
      {
        movementPattern: 'squat',
        intensityClass: 'heavy',
        sets: [{ weightLbs: 135, reps: 5 }],
      },
      CALIBRATED_SQUAT_EWMA.squat
    )
    expect(result.isHeavy).toBe(false)
  })

  it('excludes warmup sets from the top-set computation', () => {
    const result = determineMovementHeavy(
      {
        movementPattern: 'squat',
        sets: [
          { weightLbs: 400, reps: 1, isWarmup: true },
          { weightLbs: 200, reps: 1 },
        ],
      },
      CALIBRATED_SQUAT_EWMA.squat
    )
    // Only the 200x1 working set counts -> 50% of EWMA -> not heavy.
    expect(result.isHeavy).toBe(false)
    expect(result.topSetE1RM).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Session-relative heavy determination — intensityClass fallback branch
// ---------------------------------------------------------------------------

describe('determineMovementHeavy — intensityClass fallback', () => {
  it('falls back to the heavy tag when there are < 3 EWMA observations', () => {
    const coldStart = { ewmaE1RMLbs: 400, observationCount: MIN_EWMA_OBSERVATIONS - 1 }
    const result = determineMovementHeavy(
      {
        movementPattern: 'squat',
        intensityClass: 'heavy',
        sets: [{ weightLbs: 135, reps: 5 }],
      },
      coldStart
    )
    expect(result.isHeavy).toBe(true)
    expect(result.reason).toBe('tag')
  })

  it('falls back when there is no EWMA entry at all', () => {
    const result = determineMovementHeavy(
      {
        movementPattern: 'squat',
        intensityClass: 'heavy',
        sets: [{ weightLbs: 135, reps: 5 }],
      },
      undefined
    )
    expect(result.isHeavy).toBe(true)
    expect(result.reason).toBe('tag')
  })

  it('is NOT heavy in the fallback branch for a non-heavy tag', () => {
    const result = determineMovementHeavy(
      {
        movementPattern: 'squat',
        intensityClass: 'moderate',
        sets: [{ weightLbs: 135, reps: 5 }],
      },
      undefined
    )
    expect(result.isHeavy).toBe(false)
  })

  it('still honors logged effort during cold start (effort beats the tag)', () => {
    const result = determineMovementHeavy(
      {
        movementPattern: 'squat',
        intensityClass: 'moderate',
        sets: [{ weightLbs: 200, reps: 5, rir: 1 }], // RIR 1 => RPE 9
      },
      undefined
    )
    expect(result.isHeavy).toBe(true)
    expect(result.reason).toBe('effort')
  })
})

// ---------------------------------------------------------------------------
// Golden fixtures — old (tag-based) vs new (session-relative) disagree
// ---------------------------------------------------------------------------

describe('golden fixtures: tag-based vs session-relative definitions disagree', () => {
  it('empty-bar heavy-tagged movement: old=heavy, NEW=not heavy', () => {
    // Deadlift tagged intensityClass:heavy but trained near-empty, well
    // calibrated -> the static tag says heavy, session-relative says no.
    const ewma: MovementEwmaMap = {
      hinge: { ewmaE1RMLbs: 500, observationCount: 8 },
    }
    const movement: SessionMovement = {
      movementPattern: 'hinge',
      intensityClass: 'heavy',
      sets: [{ weightLbs: 135, reps: 5 }], // ~157 e1RM = 31% of 500
    }
    const oldTagBased = movement.intensityClass === 'heavy'
    const newSessionRelative = determineMovementHeavy(movement, ewma.hinge).isHeavy

    expect(oldTagBased).toBe(true)
    expect(newSessionRelative).toBe(false)
  })

  it('brutal 5x5 on a moderate-tagged machine: old=not heavy, NEW=heavy', () => {
    const ewma: MovementEwmaMap = {
      horizontal_push: { ewmaE1RMLbs: 250, observationCount: 8 },
    }
    const movement: SessionMovement = {
      movementPattern: 'horizontal_push',
      intensityClass: 'moderate',
      sets: [{ weightLbs: 240, reps: 5, rpe: 9 }], // effort + ~280 e1RM
    }
    const oldTagBased = movement.intensityClass === 'heavy'
    const newSessionRelative = determineMovementHeavy(
      movement,
      ewma.horizontal_push
    ).isHeavy

    expect(oldTagBased).toBe(false)
    expect(newSessionRelative).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// isSessionHeavyForPatterns — muscle-group mapping
// ---------------------------------------------------------------------------

describe('isSessionHeavyForPatterns', () => {
  it('matches any pattern in the muscle group', () => {
    const session: EvaluatedSession = {
      daysAgo: 0,
      movements: [
        { movementPattern: 'lunge', sets: [{ weightLbs: 100, reps: 8, rpe: 9 }] },
      ],
    }
    expect(isSessionHeavyForPatterns(session, ['squat', 'hinge', 'lunge'], {})).toBe(
      true
    )
  })

  it('ignores untagged movements and patterns outside the group', () => {
    const session: EvaluatedSession = {
      daysAgo: 0,
      movements: [
        { movementPattern: null, sets: [{ weightLbs: 100, reps: 5, rpe: 10 }] },
        {
          movementPattern: 'horizontal_push',
          sets: [{ weightLbs: 100, reps: 5, rpe: 10 }],
        },
      ],
    }
    expect(isSessionHeavyForPatterns(session, ['squat', 'hinge', 'lunge'], {})).toBe(
      false
    )
  })
})

// ---------------------------------------------------------------------------
// heavy_session intent — rolling window + last_satisfied_days_ago
// ---------------------------------------------------------------------------

const HEAVY_LEGS: WeeklyIntent = {
  type: 'heavy_session',
  muscle_group: 'legs',
  min_per_week: 1,
}

describe('evaluateWeeklyIntent — heavy_session rolling window', () => {
  it('is satisfied when a heavy leg session is within the last 7 days', () => {
    const sessions = [squatSession(2, [{ weightLbs: 360, reps: 1 }])]
    const verdict = evaluateWeeklyIntent(HEAVY_LEGS, sessions, CALIBRATED_SQUAT_EWMA)
    expect(verdict.satisfiedLast7d).toBe(true)
    expect(verdict.lastSatisfiedDaysAgo).toBe(0)
    expect(verdict.evidence).toContain('heavy legs')
  })

  it('populates last_satisfied_days_ago while satisfied (state-agnostic)', () => {
    const sessions = [squatSession(3, [{ weightLbs: 360, reps: 1 }])]
    const verdict = evaluateWeeklyIntent(HEAVY_LEGS, sessions, CALIBRATED_SQUAT_EWMA)
    expect(verdict.satisfiedLast7d).toBe(true)
    // satisfied now => 0
    expect(verdict.lastSatisfiedDaysAgo).toBe(0)
  })

  it('reports last_satisfied_days_ago when currently unsatisfied', () => {
    // Heavy session 9 days ago: outside the current window, inside the window
    // ending 3 days ago ([3, 10)).
    const sessions = [squatSession(9, [{ weightLbs: 360, reps: 1 }])]
    const verdict = evaluateWeeklyIntent(HEAVY_LEGS, sessions, CALIBRATED_SQUAT_EWMA)
    expect(verdict.satisfiedLast7d).toBe(false)
    expect(verdict.lastSatisfiedDaysAgo).toBe(3)
  })

  it('returns null last_satisfied_days_ago when never satisfied', () => {
    // Only light sessions ever logged.
    const sessions = [
      squatSession(2, [{ weightLbs: 135, reps: 5 }]),
      squatSession(20, [{ weightLbs: 135, reps: 5 }]),
    ]
    const verdict = evaluateWeeklyIntent(HEAVY_LEGS, sessions, CALIBRATED_SQUAT_EWMA)
    expect(verdict.satisfiedLast7d).toBe(false)
    expect(verdict.lastSatisfiedDaysAgo).toBeNull()
    expect(verdict.evidence).toBeUndefined()
  })

  it('honors min_per_week > 1', () => {
    const intent: WeeklyIntent = {
      type: 'heavy_session',
      muscle_group: 'legs',
      min_per_week: 2,
    }
    const oneHeavy = evaluateWeeklyIntent(
      intent,
      [squatSession(1, [{ weightLbs: 360, reps: 1 }])],
      CALIBRATED_SQUAT_EWMA
    )
    expect(oneHeavy.satisfiedLast7d).toBe(false)

    const twoHeavy = evaluateWeeklyIntent(
      intent,
      [
        squatSession(1, [{ weightLbs: 360, reps: 1 }]),
        squatSession(4, [{ weightLbs: 360, reps: 1 }]),
      ],
      CALIBRATED_SQUAT_EWMA
    )
    expect(twoHeavy.satisfiedLast7d).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Rolling-window edge cases
// ---------------------------------------------------------------------------

describe('rolling-window edge cases', () => {
  it('a session exactly 7 days ago is OUTSIDE the current window', () => {
    const sessions = [squatSession(WINDOW_DAYS, [{ weightLbs: 360, reps: 1 }])]
    const verdict = evaluateWeeklyIntent(HEAVY_LEGS, sessions, CALIBRATED_SQUAT_EWMA)
    expect(verdict.satisfiedLast7d).toBe(false)
    // It IS inside the window ending 1 day ago ([1, 8)).
    expect(verdict.lastSatisfiedDaysAgo).toBe(1)
  })

  it('a session 6 days ago is INSIDE the current window', () => {
    const sessions = [squatSession(WINDOW_DAYS - 1, [{ weightLbs: 360, reps: 1 }])]
    const verdict = evaluateWeeklyIntent(HEAVY_LEGS, sessions, CALIBRATED_SQUAT_EWMA)
    expect(verdict.satisfiedLast7d).toBe(true)
    expect(verdict.lastSatisfiedDaysAgo).toBe(0)
  })

  it('an empty session history is unsatisfied with null last_satisfied', () => {
    const verdict = evaluateWeeklyIntent(HEAVY_LEGS, [], CALIBRATED_SQUAT_EWMA)
    expect(verdict.satisfiedLast7d).toBe(false)
    expect(verdict.lastSatisfiedDaysAgo).toBeNull()
    expect(verdict.evidence).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// movement_frequency, volume_tilt, free_text
// ---------------------------------------------------------------------------

describe('evaluateWeeklyIntent — movement_frequency', () => {
  const intent: WeeklyIntent = {
    type: 'movement_frequency',
    movement_pattern: 'horizontal_pull',
    min_per_week: 2,
  }

  it('counts sessions containing the pattern regardless of heaviness', () => {
    const row = (daysAgo: number): EvaluatedSession => ({
      daysAgo,
      movements: [
        { movementPattern: 'horizontal_pull', sets: [{ weightLbs: 100, reps: 10 }] },
      ],
    })
    const verdict = evaluateWeeklyIntent(intent, [row(1), row(4)])
    expect(verdict.satisfiedLast7d).toBe(true)
    expect(verdict.lastSatisfiedDaysAgo).toBe(0)
  })

  it('is unsatisfied below the frequency target', () => {
    const verdict = evaluateWeeklyIntent(intent, [
      {
        daysAgo: 1,
        movements: [
          { movementPattern: 'horizontal_pull', sets: [{ weightLbs: 100, reps: 10 }] },
        ],
      },
    ])
    expect(verdict.satisfiedLast7d).toBe(false)
  })
})

describe('evaluateWeeklyIntent — volume_tilt', () => {
  const intent: WeeklyIntent = {
    type: 'volume_tilt',
    toward: ['back'],
    away_from: ['chest'],
    ratio: 2,
  }

  it('is satisfied when toward/away set ratio meets the target', () => {
    const session: EvaluatedSession = {
      daysAgo: 1,
      movements: [
        {
          movementPattern: 'horizontal_pull',
          faus: ['back'],
          sets: [
            { weightLbs: 100, reps: 10 },
            { weightLbs: 100, reps: 10 },
            { weightLbs: 100, reps: 10 },
            { weightLbs: 100, reps: 10 },
          ],
        },
        {
          movementPattern: 'horizontal_push',
          faus: ['chest'],
          sets: [{ weightLbs: 100, reps: 10 }, { weightLbs: 100, reps: 10 }],
        },
      ],
    }
    const verdict = evaluateWeeklyIntent(intent, [session])
    // 4 back / 2 chest = 2.0 >= 2 -> satisfied
    expect(verdict.satisfiedLast7d).toBe(true)
  })

  it('is unsatisfied when the ratio is not met', () => {
    const session: EvaluatedSession = {
      daysAgo: 1,
      movements: [
        { movementPattern: 'horizontal_pull', faus: ['back'], sets: [{ weightLbs: 100, reps: 10 }] },
        { movementPattern: 'horizontal_push', faus: ['chest'], sets: [{ weightLbs: 100, reps: 10 }] },
      ],
    }
    const verdict = evaluateWeeklyIntent(intent, [session])
    expect(verdict.satisfiedLast7d).toBe(false)
  })
})

describe('evaluateWeeklyIntent — free_text', () => {
  it('is not evaluable and carries neither evidence nor last_satisfied', () => {
    const intent: WeeklyIntent = { type: 'free_text', text: 'feel athletic' }
    const verdict = evaluateWeeklyIntent(intent, [
      squatSession(1, [{ weightLbs: 360, reps: 1 }]),
    ])
    expect(verdict.evaluable).toBe(false)
    expect(verdict.satisfiedLast7d).toBe(false)
    expect(verdict.lastSatisfiedDaysAgo).toBeNull()
    expect(verdict.evidence).toBeUndefined()
  })
})

describe('evaluateWeeklyIntents', () => {
  it('evaluates a mixed profile of intents', () => {
    const intents: WeeklyIntent[] = [
      HEAVY_LEGS,
      { type: 'free_text', text: 'stay consistent' },
    ]
    const verdicts = evaluateWeeklyIntents(
      intents,
      [squatSession(1, [{ weightLbs: 360, reps: 1 }])],
      CALIBRATED_SQUAT_EWMA
    )
    expect(verdicts).toHaveLength(2)
    expect(verdicts[0].satisfiedLast7d).toBe(true)
    expect(verdicts[1].evaluable).toBe(false)
  })
})
