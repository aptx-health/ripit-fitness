import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createMultiWeekProgram, createTestUser } from '@/lib/test/factories'

/**
 * Simulation function for week deletion with renumbering
 * Replicates the API logic from app/api/weeks/[weekId]/route.ts
 */
async function simulateDeleteWeek(
  prisma: PrismaClient,
  weekId: string,
  userId: string
) {
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: {
      workouts: {
        include: {
          exercises: {
            include: {
              prescribedSets: true,
              loggedSets: true,
            },
            orderBy: { order: 'asc' },
          },
        },
      },
      program: true,
    },
  })

  if (!week) throw new Error('Week not found')
  if (week.program.userId !== userId) throw new Error('Unauthorized')

  const workoutIds = week.workouts.map((w) => w.id)
  const exerciseIds = week.workouts.flatMap((w) => w.exercises.map((e) => e.id))

  const renumberedWeeks = await prisma.$transaction(async (tx) => {
    if (exerciseIds.length > 0) {
      await tx.loggedSet.deleteMany({ where: { exerciseId: { in: exerciseIds } } })
      await tx.prescribedSet.deleteMany({ where: { exerciseId: { in: exerciseIds } } })
    }
    if (workoutIds.length > 0) {
      await tx.exercise.deleteMany({ where: { workoutId: { in: workoutIds } } })
      await tx.workoutCompletion.deleteMany({ where: { workoutId: { in: workoutIds } } })
      await tx.workout.deleteMany({ where: { id: { in: workoutIds } } })
    }
    await tx.week.delete({ where: { id: weekId } })

    const remainingWeeks = await tx.week.findMany({
      where: { programId: week.programId },
      orderBy: { weekNumber: 'asc' },
      select: { id: true, weekNumber: true },
    })

    for (let i = 0; i < remainingWeeks.length; i++) {
      const expectedNumber = i + 1
      if (remainingWeeks[i].weekNumber !== expectedNumber) {
        await tx.week.update({
          where: { id: remainingWeeks[i].id },
          data: { weekNumber: expectedNumber },
        })
      }
    }

    return remainingWeeks.map((w, i) => ({ id: w.id, weekNumber: i + 1 }))
  })

  return { success: true, renumberedWeeks }
}

describe('Week Renumbering After Deletion', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  it('should renumber weeks sequentially after deleting a middle week', async () => {
    const { weeks } = await createMultiWeekProgram(prisma, userId, { weekCount: 4 })

    // Delete week 2 (index 1)
    const week2 = weeks.find((w) => w.weekNumber === 2)!
    const result = await simulateDeleteWeek(prisma, week2.id, userId)

    expect(result.success).toBe(true)
    expect(result.renumberedWeeks).toHaveLength(3)
    expect(result.renumberedWeeks.map((w) => w.weekNumber)).toEqual([1, 2, 3])

    // Verify in database
    const dbWeeks = await prisma.week.findMany({
      where: { programId: weeks[0].programId },
      orderBy: { weekNumber: 'asc' },
    })
    expect(dbWeeks.map((w) => w.weekNumber)).toEqual([1, 2, 3])
  })

  it('should renumber weeks after deleting the first week', async () => {
    const { weeks } = await createMultiWeekProgram(prisma, userId, { weekCount: 3 })

    const week1 = weeks.find((w) => w.weekNumber === 1)!
    const result = await simulateDeleteWeek(prisma, week1.id, userId)

    expect(result.renumberedWeeks).toHaveLength(2)
    expect(result.renumberedWeeks.map((w) => w.weekNumber)).toEqual([1, 2])
  })

  it('should handle deleting the last week (no renumbering needed)', async () => {
    const { weeks } = await createMultiWeekProgram(prisma, userId, { weekCount: 3 })

    const week3 = weeks.find((w) => w.weekNumber === 3)!
    const result = await simulateDeleteWeek(prisma, week3.id, userId)

    expect(result.renumberedWeeks).toHaveLength(2)
    expect(result.renumberedWeeks.map((w) => w.weekNumber)).toEqual([1, 2])
  })

  it('should return empty array when deleting the only week', async () => {
    const { weeks } = await createMultiWeekProgram(prisma, userId, { weekCount: 1 })

    const result = await simulateDeleteWeek(prisma, weeks[0].id, userId)

    expect(result.renumberedWeeks).toHaveLength(0)
  })

  it('should preserve week identity (IDs match) after renumbering', async () => {
    const { weeks } = await createMultiWeekProgram(prisma, userId, { weekCount: 4 })

    const week2 = weeks.find((w) => w.weekNumber === 2)!
    const originalWeek3 = weeks.find((w) => w.weekNumber === 3)!
    const originalWeek4 = weeks.find((w) => w.weekNumber === 4)!

    const result = await simulateDeleteWeek(prisma, week2.id, userId)

    // Week 3 should now be week 2, week 4 should now be week 3
    const renumbered3 = result.renumberedWeeks.find((w) => w.id === originalWeek3.id)
    const renumbered4 = result.renumberedWeeks.find((w) => w.id === originalWeek4.id)

    expect(renumbered3?.weekNumber).toBe(2)
    expect(renumbered4?.weekNumber).toBe(3)
  })
})
