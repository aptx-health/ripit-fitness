import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getLastExercisePerformance,
  getRecentExercisePerformances,
} from '@/lib/queries/exercise-history'
import { getTestDatabase } from '@/lib/test/database'
import { createTestProgram, createTestUser } from '@/lib/test/factories'

type SeedSet = {
  setNumber: number
  reps: number
  weight: number
  weightUnit?: string
  rpe?: number | null
  rir?: number | null
  isWarmup?: boolean
}

describe('getRecentExercisePerformances', () => {
  let prisma: PrismaClient
  let userId: string
  let exerciseId: string
  let exerciseDefinitionId: string
  let workoutId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id

    const program = await createTestProgram(prisma, userId)
    const exercise = program.weeks[0].workouts[0].exercises[0]
    exerciseId = exercise.id
    exerciseDefinitionId = exercise.exerciseDefinitionId
    workoutId = program.weeks[0].workouts[0].id
  })

  /** Seed a completed session on a specific date with the given sets. */
  async function seedSession(completedAt: Date, sets: SeedSet[], name?: string) {
    const completion = await prisma.workoutCompletion.create({
      data: {
        workoutId,
        userId,
        status: 'completed',
        completedAt,
        name: name ?? null,
      },
    })

    for (const set of sets) {
      await prisma.loggedSet.create({
        data: {
          completionId: completion.id,
          exerciseId,
          userId,
          setNumber: set.setNumber,
          reps: set.reps,
          weight: set.weight,
          weightUnit: set.weightUnit ?? 'lbs',
          rpe: set.rpe ?? null,
          rir: set.rir ?? null,
          isWarmup: set.isWarmup ?? false,
        },
      })
    }

    return completion
  }

  it('returns up to 4 sessions, most recent first', async () => {
    // Seed 5 sessions on ascending dates; only the newest 4 should return.
    for (let i = 1; i <= 5; i++) {
      await seedSession(new Date(`2026-01-0${i}T12:00:00Z`), [
        { setNumber: 1, reps: 5, weight: 100 + i * 10 },
      ])
    }

    const sessions = await getRecentExercisePerformances(exerciseDefinitionId, userId, 4)

    expect(sessions).toHaveLength(4)
    // Newest first: Jan 5, 4, 3, 2 (Jan 1 dropped by the limit).
    const dates = sessions.map(s => s.completedAt.toISOString())
    expect(dates).toEqual([
      '2026-01-05T12:00:00.000Z',
      '2026-01-04T12:00:00.000Z',
      '2026-01-03T12:00:00.000Z',
      '2026-01-02T12:00:00.000Z',
    ])
  })

  it('preserves set fields including warmup flags, ordered by set number', async () => {
    await seedSession(new Date('2026-02-01T12:00:00Z'), [
      { setNumber: 2, reps: 5, weight: 135, rpe: 8, rir: 2, isWarmup: false },
      { setNumber: 1, reps: 10, weight: 45, isWarmup: true },
      { setNumber: 3, reps: 3, weight: 185, rpe: undefined, rir: 1, isWarmup: false },
    ])

    const [session] = await getRecentExercisePerformances(exerciseDefinitionId, userId, 4)

    expect(session.sets.map(s => s.setNumber)).toEqual([1, 2, 3])
    expect(session.sets[0].isWarmup).toBe(true)
    expect(session.sets[1].isWarmup).toBe(false)
    expect(session.sets[1].rpe).toBe(8)
    expect(session.sets[1].rir).toBe(2)
    expect(session.sets[2].weight).toBe(185)
  })

  it('scopes results to the exercise definition and excludes other exercises', async () => {
    // Another exercise definition's sets in the same completion must not leak in.
    const other = await prisma.exerciseDefinition.create({
      data: {
        name: 'Unrelated Movement',
        normalizedName: 'unrelated movement',
        aliases: [],
        equipment: ['barbell'],
        primaryFAUs: ['back'],
        secondaryFAUs: [],
        isSystem: true,
        userId: '00000000-0000-0000-0000-000000000000',
      },
    })
    const otherExercise = await prisma.exercise.create({
      data: { name: 'Unrelated Movement', exerciseDefinitionId: other.id, order: 2, userId, workoutId },
    })

    const completion = await seedSession(new Date('2026-03-01T12:00:00Z'), [
      { setNumber: 1, reps: 5, weight: 200 },
    ])
    await prisma.loggedSet.create({
      data: {
        completionId: completion.id,
        exerciseId: otherExercise.id,
        userId,
        setNumber: 1,
        reps: 8,
        weight: 99,
        weightUnit: 'lbs',
      },
    })

    const [session] = await getRecentExercisePerformances(exerciseDefinitionId, userId, 4)
    expect(session.sets).toHaveLength(1)
    expect(session.sets[0].weight).toBe(200)
  })

  it('returns an empty array when there is no history', async () => {
    const sessions = await getRecentExercisePerformances(exerciseDefinitionId, userId, 4)
    expect(sessions).toEqual([])
  })

  it('sessions[0] matches the legacy single-session shape', async () => {
    await seedSession(new Date('2026-04-01T12:00:00Z'), [
      { setNumber: 1, reps: 8, weight: 95, rpe: 7 },
    ])
    await seedSession(new Date('2026-04-08T12:00:00Z'), [
      { setNumber: 1, reps: 5, weight: 135, rir: 2 },
    ])

    const sessions = await getRecentExercisePerformances(exerciseDefinitionId, userId, 4)
    const legacy = await getLastExercisePerformance(exerciseDefinitionId, userId)

    expect(legacy).not.toBeNull()
    expect(sessions[0]).toEqual(legacy)
  })

  it('honors the beforeDate cutoff', async () => {
    await seedSession(new Date('2026-05-01T12:00:00Z'), [{ setNumber: 1, reps: 5, weight: 100 }])
    await seedSession(new Date('2026-05-10T12:00:00Z'), [{ setNumber: 1, reps: 5, weight: 110 }])

    const sessions = await getRecentExercisePerformances(
      exerciseDefinitionId,
      userId,
      4,
      new Date('2026-05-05T00:00:00Z')
    )

    expect(sessions).toHaveLength(1)
    expect(sessions[0].completedAt.toISOString()).toBe('2026-05-01T12:00:00.000Z')
  })
})
