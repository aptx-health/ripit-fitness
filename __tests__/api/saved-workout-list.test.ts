import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'

// Mirrors GET /api/workouts/saved. The route layer owns auth; this exercises
// the count + ordering + per-user scoping that drives the QuickActionSheet
// "My saved workouts" entrypoint visibility.

async function simulateListSavedWorkouts(prisma: PrismaClient, userId: string) {
  const savedWorkouts = await prisma.savedWorkout.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      exerciseCount: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: [{ lastUsedAt: 'desc' }, { createdAt: 'desc' }],
  })
  return { count: savedWorkouts.length, savedWorkouts }
}

describe('GET /api/workouts/saved', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()
    const user = await createTestUser()
    userId = user.id
  })

  it('returns count 0 for users with no saved workouts', async () => {
    const result = await simulateListSavedWorkouts(prisma, userId)
    expect(result.count).toBe(0)
    expect(result.savedWorkouts).toEqual([])
  })

  it('returns count and listing after a workout is saved', async () => {
    await prisma.savedWorkout.create({
      data: {
        userId,
        name: 'Push Day',
        sourceCompletionId: 'completion-1',
        workoutData: [] as unknown as object,
        exerciseCount: 4,
        lastUsedAt: new Date('2026-05-10T12:00:00Z'),
      },
    })

    const result = await simulateListSavedWorkouts(prisma, userId)
    expect(result.count).toBe(1)
    expect(result.savedWorkouts[0]?.name).toBe('Push Day')
    expect(result.savedWorkouts[0]?.exerciseCount).toBe(4)
  })

  it('scopes to the current user only', async () => {
    const otherUser = await createTestUser()
    await prisma.savedWorkout.create({
      data: {
        userId: otherUser.id,
        name: 'Not Mine',
        sourceCompletionId: 'completion-other',
        workoutData: [] as unknown as object,
        exerciseCount: 2,
        lastUsedAt: new Date('2026-05-10T12:00:00Z'),
      },
    })

    const result = await simulateListSavedWorkouts(prisma, userId)
    expect(result.count).toBe(0)
  })

  it('orders by lastUsedAt desc so most recent surfaces first', async () => {
    await prisma.savedWorkout.create({
      data: {
        userId,
        name: 'Older',
        sourceCompletionId: 'completion-old',
        workoutData: [] as unknown as object,
        exerciseCount: 3,
        lastUsedAt: new Date('2026-04-01T12:00:00Z'),
      },
    })
    await prisma.savedWorkout.create({
      data: {
        userId,
        name: 'Newer',
        sourceCompletionId: 'completion-new',
        workoutData: [] as unknown as object,
        exerciseCount: 5,
        lastUsedAt: new Date('2026-05-15T12:00:00Z'),
      },
    })

    const result = await simulateListSavedWorkouts(prisma, userId)
    expect(result.count).toBe(2)
    expect(result.savedWorkouts.map((w) => w.name)).toEqual(['Newer', 'Older'])
  })
})
