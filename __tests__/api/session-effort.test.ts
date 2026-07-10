import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  EFFORT_OPTIONS,
  EFFORT_PROMPT_COOLDOWN_MS,
  isValidSessionRpe,
  shouldShowEffortPrompt,
} from '@/lib/effort-prompt'
import { getTestDatabase } from '@/lib/test/database'
import { createCompleteTestScenario, createTestUser } from '@/lib/test/factories'

/**
 * Mirrors the scoped update the PATCH endpoint performs. Keeping the query
 * shape identical to the route lets us verify authorization + persistence
 * without an HTTP layer (auth is enforced separately in the route handler).
 */
async function simulateSetEffort(
  prisma: PrismaClient,
  completionId: string,
  userId: string,
  sessionRpe: number
): Promise<number> {
  const result = await prisma.workoutCompletion.updateMany({
    where: { id: completionId, userId },
    data: { sessionRpe },
  })
  return result.count
}

describe('isValidSessionRpe', () => {
  it('accepts integers 6 through 10', () => {
    for (const rpe of [6, 7, 8, 9, 10]) {
      expect(isValidSessionRpe(rpe)).toBe(true)
    }
  })

  it('rejects out-of-range, non-integer, and non-number values', () => {
    for (const value of [5, 11, 0, 7.5, '8', null, undefined, NaN]) {
      expect(isValidSessionRpe(value)).toBe(false)
    }
  })

  it('maps word labels to the expected RPE scale', () => {
    expect(EFFORT_OPTIONS.map((o) => o.rpe)).toEqual([6, 7, 8, 9, 10])
    expect(EFFORT_OPTIONS.find((o) => o.label === 'Hard')?.rpe).toBe(8)
  })
})

describe('shouldShowEffortPrompt (throttle)', () => {
  const now = Date.now()

  it('hides until settings load', () => {
    expect(shouldShowEffortPrompt(null, now)).toBe(false)
  })

  it('shows when never prompted', () => {
    expect(shouldShowEffortPrompt({ lastPostSessionPromptAt: null }, now)).toBe(true)
  })

  it('hides within the cooldown window (cadence exhausted)', () => {
    const recent = new Date(now - EFFORT_PROMPT_COOLDOWN_MS + 60_000).toISOString()
    expect(shouldShowEffortPrompt({ lastPostSessionPromptAt: recent }, now)).toBe(false)
  })

  it('shows again once the cooldown has elapsed', () => {
    const old = new Date(now - EFFORT_PROMPT_COOLDOWN_MS - 60_000).toISOString()
    expect(shouldShowEffortPrompt({ lastPostSessionPromptAt: old }, now)).toBe(true)
  })
})

describe('session effort persistence', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()
    const user = await createTestUser()
    userId = user.id
  })

  it('stores the RPE-equivalent value on the owner completion', async () => {
    const { completion } = await createCompleteTestScenario(prisma, userId, {
      status: 'completed',
    })

    const count = await simulateSetEffort(prisma, completion.id, userId, 8)
    expect(count).toBe(1)

    const updated = await prisma.workoutCompletion.findUnique({
      where: { id: completion.id },
      select: { sessionRpe: true },
    })
    expect(updated?.sessionRpe).toBe(8)
  })

  it('leaves sessionRpe null when never rated', async () => {
    const { completion } = await createCompleteTestScenario(prisma, userId, {
      status: 'completed',
    })
    const fresh = await prisma.workoutCompletion.findUnique({
      where: { id: completion.id },
      select: { sessionRpe: true },
    })
    expect(fresh?.sessionRpe).toBeNull()
  })

  it('does not update a completion owned by another user', async () => {
    const { completion } = await createCompleteTestScenario(prisma, userId, {
      status: 'completed',
    })
    const other = await createTestUser()

    const count = await simulateSetEffort(prisma, completion.id, other.id, 9)
    expect(count).toBe(0)

    const unchanged = await prisma.workoutCompletion.findUnique({
      where: { id: completion.id },
      select: { sessionRpe: true },
    })
    expect(unchanged?.sessionRpe).toBeNull()
  })
})
