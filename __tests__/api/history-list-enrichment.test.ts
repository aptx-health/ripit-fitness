import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import {
  createCompleteTestScenario,
  createTestUser,
} from '@/lib/test/factories'
import {
  computeFauRollup,
  countWorkingSets,
  MAX_FAU_CHIPS,
  resolveDurationSeconds,
} from '@/lib/workout-history'

/**
 * The loggedSets shape the history route selects for FAU rollup. Kept in sync
 * with `app/api/workouts/history/route.ts` so the enrichment test exercises the
 * same data the endpoint feeds into the shared helpers.
 */
const HISTORY_LOGGED_SET_SELECT = {
  id: true,
  setNumber: true,
  reps: true,
  weight: true,
  weightUnit: true,
  isWarmup: true,
  exercise: {
    select: {
      name: true,
      exerciseGroup: true,
      order: true,
      exerciseDefinition: { select: { primaryFAUs: true } },
    },
  },
} as const

function makeSet(primaryFAUs: string[], isWarmup = false) {
  return { isWarmup, exercise: { exerciseDefinition: { primaryFAUs } } }
}

describe('computeFauRollup', () => {
  it('returns no chips for an empty set list', () => {
    expect(computeFauRollup([])).toEqual({ chips: [], overflow: 0 })
  })

  it('excludes warmup sets from the rollup', () => {
    const rollup = computeFauRollup([
      makeSet(['chest'], true),
      makeSet(['chest'], false),
      makeSet(['triceps'], false),
    ])
    const chest = rollup.chips.find((c) => c.fau === 'chest')
    expect(chest?.count).toBe(1)
    expect(rollup.chips.map((c) => c.fau).sort()).toEqual(['chest', 'triceps'])
  })

  it('maps known FAU tokens to display labels', () => {
    const rollup = computeFauRollup([makeSet(['mid-back'])])
    expect(rollup.chips[0]).toMatchObject({ fau: 'mid-back', label: 'Mid Back' })
  })

  it('caps chips at the top-N by set count and reports overflow', () => {
    const sets = [
      ...Array.from({ length: 5 }, () => makeSet(['chest'])),
      ...Array.from({ length: 4 }, () => makeSet(['triceps'])),
      ...Array.from({ length: 3 }, () => makeSet(['front-delts'])),
      ...Array.from({ length: 2 }, () => makeSet(['quads'])),
      makeSet(['calves']),
    ]
    const rollup = computeFauRollup(sets)
    expect(rollup.chips).toHaveLength(MAX_FAU_CHIPS)
    expect(rollup.chips.map((c) => c.fau)).toEqual([
      'chest',
      'triceps',
      'front-delts',
      'quads',
    ])
    expect(rollup.overflow).toBe(1)
  })

  it('breaks count ties deterministically by FAU token', () => {
    const rollup = computeFauRollup([makeSet(['triceps']), makeSet(['biceps'])])
    expect(rollup.chips.map((c) => c.fau)).toEqual(['biceps', 'triceps'])
  })
})

describe('resolveDurationSeconds', () => {
  const completedAt = new Date('2026-07-09T18:30:00Z')

  it('prefers the stored duration', () => {
    expect(resolveDurationSeconds(2700, null, completedAt)).toBe(2700)
  })

  it('falls back to completedAt - startedAt when duration is null', () => {
    const startedAt = new Date('2026-07-09T18:00:00Z')
    expect(resolveDurationSeconds(null, startedAt, completedAt)).toBe(1800)
  })

  it('returns null when neither duration nor a usable start exists', () => {
    expect(resolveDurationSeconds(null, null, completedAt)).toBeNull()
    expect(resolveDurationSeconds(0, null, completedAt)).toBeNull()
  })
})

describe('workout history enrichment (DB-backed)', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()
    const user = await createTestUser()
    userId = user.id
  })

  it('enriches a populated completion with duration, effort, sets, and FAU chips', async () => {
    const { completion } = await createCompleteTestScenario(prisma, userId, {
      status: 'completed',
      loggedSetCount: 3,
    })
    await prisma.workoutCompletion.update({
      where: { id: completion.id },
      data: { durationSeconds: 2700, sessionRpe: 8 },
    })

    const row = await prisma.workoutCompletion.findUniqueOrThrow({
      where: { id: completion.id },
      select: {
        completedAt: true,
        startedAt: true,
        durationSeconds: true,
        sessionRpe: true,
        loggedSets: { select: HISTORY_LOGGED_SET_SELECT },
      },
    })

    const duration = resolveDurationSeconds(
      row.durationSeconds,
      row.startedAt,
      row.completedAt
    )
    const workingSets = countWorkingSets(row.loggedSets)
    const { chips, overflow } = computeFauRollup(row.loggedSets)

    expect(duration).toBe(2700)
    expect(row.sessionRpe).toBe(8)
    expect(workingSets).toBe(3)
    // Default test exercise is tagged chest + triceps, one primary each per set.
    expect(chips.map((c) => c.fau).sort()).toEqual(['chest', 'triceps'])
    expect(chips.every((c) => c.count === 3)).toBe(true)
    expect(overflow).toBe(0)
  })

  it('degrades gracefully when duration, effort, and sets are absent', async () => {
    const completion = await prisma.workoutCompletion.create({
      data: {
        userId,
        status: 'completed',
        isAdHoc: true,
        name: 'Freestyle',
        completedAt: new Date(),
      },
      select: {
        completedAt: true,
        startedAt: true,
        durationSeconds: true,
        sessionRpe: true,
        loggedSets: { select: HISTORY_LOGGED_SET_SELECT },
      },
    })

    const duration = resolveDurationSeconds(
      completion.durationSeconds,
      completion.startedAt,
      completion.completedAt
    )
    const workingSets = countWorkingSets(completion.loggedSets)
    const { chips, overflow } = computeFauRollup(completion.loggedSets)

    expect(duration).toBeNull()
    expect(completion.sessionRpe).toBeNull()
    expect(workingSets).toBe(0)
    expect(chips).toEqual([])
    expect(overflow).toBe(0)
  })
})
