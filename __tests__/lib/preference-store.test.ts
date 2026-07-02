import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { UNIFORM_PRIOR, betaMean } from '@/lib/learning/math'
import {
  elapsedWeeks,
  readPreference,
  updatePreference,
} from '@/lib/learning/preference-store'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

describe('elapsedWeeks', () => {
  it('returns whole weeks between two instants', () => {
    const from = new Date('2026-01-01T00:00:00Z')
    const to = new Date('2026-01-15T00:00:00Z') // 14 days = 2 weeks
    expect(elapsedWeeks(from, to)).toBeCloseTo(2, 10)
  })

  it('clamps negative gaps (future stamp / clock skew) to zero', () => {
    const from = new Date('2026-02-01T00:00:00Z')
    const to = new Date('2026-01-01T00:00:00Z')
    expect(elapsedWeeks(from, to)).toBe(0)
  })
})

describe('preference-store (DB-backed)', () => {
  let prisma: PrismaClient
  let userId: string
  let exerciseDefinitionId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
    const def = await createTestExerciseDefinition(prisma, { userId })
    exerciseDefinitionId = def.id
  })

  describe('readPreference', () => {
    it('returns the uniform prior when no row exists', async () => {
      const result = await readPreference(prisma.userExercisePreference, userId, exerciseDefinitionId)
      expect(result.exists).toBe(false)
      expect(result.alpha).toBe(UNIFORM_PRIOR.alpha)
      expect(result.beta).toBe(UNIFORM_PRIOR.beta)
      expect(result.decayedWeeks).toBe(0)
    })

    it('applies decay based on elapsed weeks since lastUpdatedAt', async () => {
      const writtenAt = new Date('2026-01-01T00:00:00Z')
      // Strong preference evidence stamped in the past.
      await updatePreference(prisma.userExercisePreference, userId, exerciseDefinitionId, 20, 0, writtenAt)

      const stored = await readPreference(
        prisma.userExercisePreference,
        userId,
        exerciseDefinitionId,
        writtenAt // read at the same instant: no decay
      )
      expect(stored.decayedWeeks).toBe(0)
      expect(stored.alpha).toBeCloseTo(21, 6)

      // Read ~46 weeks later (roughly the decay half-life).
      const halfLifeLater = new Date(writtenAt.getTime() + 46 * 7 * 24 * 60 * 60 * 1000)
      const decayed = await readPreference(
        prisma.userExercisePreference,
        userId,
        exerciseDefinitionId,
        halfLifeLater
      )
      expect(decayed.decayedWeeks).toBeCloseTo(46, 6)
      // Evidence above the prior should be roughly halved, and the mean pulled
      // back toward the uniform prior (0.5).
      expect(decayed.alpha).toBeLessThan(stored.alpha)
      expect(decayed.alpha - UNIFORM_PRIOR.alpha).toBeCloseTo((stored.alpha - UNIFORM_PRIOR.alpha) / 2, 1)
      expect(betaMean(decayed)).toBeLessThan(betaMean(stored))
      expect(betaMean(decayed)).toBeGreaterThan(0.5)
    })
  })

  describe('updatePreference', () => {
    it('creates a row on first write and stamps lastUpdatedAt', async () => {
      const now = new Date('2026-03-01T00:00:00Z')
      const result = await updatePreference(
        prisma.userExercisePreference,
        userId,
        exerciseDefinitionId,
        3,
        1,
        now
      )
      expect(result.alpha).toBeCloseTo(4, 6) // prior 1 + 3 accepts
      expect(result.beta).toBeCloseTo(2, 6) // prior 1 + 1 reject

      const row = await prisma.userExercisePreference.findUniqueOrThrow({
        where: { userId_exerciseDefinitionId: { userId, exerciseDefinitionId } },
      })
      expect(row.alpha).toBeCloseTo(4, 6)
      expect(row.beta).toBeCloseTo(2, 6)
      expect(row.lastUpdatedAt.getTime()).toBe(now.getTime())
    })

    it('is idempotent in structure: repeated writes update one row, never duplicate', async () => {
      const t0 = new Date('2026-04-01T00:00:00Z')
      await updatePreference(prisma.userExercisePreference, userId, exerciseDefinitionId, 2, 0, t0)
      const t1 = new Date('2026-04-08T00:00:00Z') // one week later
      await updatePreference(prisma.userExercisePreference, userId, exerciseDefinitionId, 2, 0, t1)

      const rows = await prisma.userExercisePreference.findMany({
        where: { userId, exerciseDefinitionId },
      })
      expect(rows).toHaveLength(1)
      // Second write decays the first week's evidence before adding new accepts,
      // so alpha is below the naive 1 + 2 + 2 = 5.
      expect(rows[0].alpha).toBeGreaterThan(4)
      expect(rows[0].alpha).toBeLessThan(5)
      expect(rows[0].lastUpdatedAt.getTime()).toBe(t1.getTime())
    })

    it('with zero evidence only decays and re-stamps, inventing no signal', async () => {
      const t0 = new Date('2026-05-01T00:00:00Z')
      await updatePreference(prisma.userExercisePreference, userId, exerciseDefinitionId, 10, 0, t0)
      const t1 = new Date(t0.getTime() + 10 * 7 * 24 * 60 * 60 * 1000)
      const result = await updatePreference(
        prisma.userExercisePreference,
        userId,
        exerciseDefinitionId,
        0,
        0,
        t1
      )
      // Alpha decayed toward the prior but stays above it.
      expect(result.alpha).toBeLessThan(11)
      expect(result.alpha).toBeGreaterThan(1)
    })
  })

  describe('unique constraint', () => {
    it('rejects a duplicate (userId, exerciseDefinitionId) row', async () => {
      await prisma.userExercisePreference.create({
        data: { userId, exerciseDefinitionId, alpha: 2, beta: 1 },
      })
      await expect(
        prisma.userExercisePreference.create({
          data: { userId, exerciseDefinitionId, alpha: 3, beta: 1 },
        })
      ).rejects.toThrow()
    })
  })
})
