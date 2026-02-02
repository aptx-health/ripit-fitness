import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'
import { recordStrengthPerformance, recordCardioPerformance } from '@/lib/stats/exercise-performance'

describe('Brag Strip Stats', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  /**
   * Helper to create a workout completion with logged sets
   */
  async function createWorkoutWithSets(
    completedAt: Date,
    sets: Array<{ weight: number; reps: number }>
  ) {
    const exerciseDef = await prisma.exerciseDefinition.create({
      data: {
        name: 'Test Exercise',
        normalizedName: `test_exercise_${Date.now()}`,
        aliases: [],
        isSystem: true,
        userId,
      },
    })

    const program = await prisma.program.create({
      data: { name: 'Test Program', userId, isActive: true },
    })

    const week = await prisma.week.create({
      data: { weekNumber: 1, programId: program.id, userId },
    })

    const workout = await prisma.workout.create({
      data: { name: 'Test Workout', dayNumber: 1, weekId: week.id, userId },
    })

    const exercise = await prisma.exercise.create({
      data: {
        name: 'Test Exercise',
        exerciseDefinitionId: exerciseDef.id,
        workoutId: workout.id,
        order: 1,
        userId,
      },
    })

    const completion = await prisma.workoutCompletion.create({
      data: {
        workoutId: workout.id,
        userId,
        status: 'completed',
        completedAt,
      },
    })

    await prisma.loggedSet.createMany({
      data: sets.map((set, idx) => ({
        exerciseId: exercise.id,
        completionId: completion.id,
        userId,
        setNumber: idx + 1,
        reps: set.reps,
        weight: set.weight,
        weightUnit: 'lbs',
      })),
    })

    await recordStrengthPerformance(prisma, completion.id, userId)

    return completion
  }

  /**
   * Helper to create a cardio session
   */
  async function createCardioSession(
    completedAt: Date,
    equipment: string,
    distance: number | null
  ) {
    const session = await prisma.loggedCardioSession.create({
      data: {
        userId,
        name: `${equipment} session`,
        equipment,
        duration: 1800,
        distance,
        status: 'completed',
        completedAt,
      },
    })

    await recordCardioPerformance(prisma, session.id, userId)

    return session
  }

  it('should return zeros for user with no workouts', async () => {
    const volumeData = await prisma.exercisePerformanceLog.aggregate({
      where: { userId, type: 'strength' },
      _sum: { totalVolumeLbs: true },
    })

    const workoutCount = await prisma.workoutCompletion.count({
      where: { userId, status: 'completed' },
    })

    expect(volumeData._sum.totalVolumeLbs).toBeNull()
    expect(workoutCount).toBe(0)
  })

  it('should correctly count workouts by time period', async () => {
    // Use a fixed reference date (Wednesday, January 15, 2025 at noon)
    // This avoids edge cases with month/week boundaries
    const referenceDate = new Date('2025-01-15T12:00:00Z')

    // Week starts on Monday Jan 13, 2025
    const startOfWeek = new Date('2025-01-13T00:00:00Z')

    // Month starts on Wednesday Jan 1, 2025
    const startOfMonth = new Date('2025-01-01T00:00:00Z')

    // Create 2 workouts this week (after startOfWeek)
    await createWorkoutWithSets(
      new Date('2025-01-14T10:00:00Z'), // Tuesday Jan 14
      [{ weight: 100, reps: 5 }]
    )
    await createWorkoutWithSets(
      new Date('2025-01-15T10:00:00Z'), // Wednesday Jan 15
      [{ weight: 100, reps: 5 }]
    )

    // Create 3 workouts this month but not this week (after startOfMonth, before startOfWeek)
    await createWorkoutWithSets(
      new Date('2025-01-02T10:00:00Z'), // Thursday Jan 2
      [{ weight: 100, reps: 5 }]
    )
    await createWorkoutWithSets(
      new Date('2025-01-05T10:00:00Z'), // Sunday Jan 5
      [{ weight: 100, reps: 5 }]
    )
    await createWorkoutWithSets(
      new Date('2025-01-10T10:00:00Z'), // Friday Jan 10
      [{ weight: 100, reps: 5 }]
    )

    // Create 5 workouts from previous months (before startOfMonth)
    await createWorkoutWithSets(
      new Date('2024-12-15T10:00:00Z'),
      [{ weight: 100, reps: 5 }]
    )
    await createWorkoutWithSets(
      new Date('2024-11-20T10:00:00Z'),
      [{ weight: 100, reps: 5 }]
    )
    await createWorkoutWithSets(
      new Date('2024-10-10T10:00:00Z'),
      [{ weight: 100, reps: 5 }]
    )
    await createWorkoutWithSets(
      new Date('2024-09-05T10:00:00Z'),
      [{ weight: 100, reps: 5 }]
    )
    await createWorkoutWithSets(
      new Date('2024-08-01T10:00:00Z'),
      [{ weight: 100, reps: 5 }]
    )

    // Query counts using the fixed boundaries
    const thisWeekCount = await prisma.workoutCompletion.count({
      where: {
        userId,
        status: 'completed',
        completedAt: { gte: startOfWeek },
      },
    })

    const thisMonthCount = await prisma.workoutCompletion.count({
      where: {
        userId,
        status: 'completed',
        completedAt: { gte: startOfMonth },
      },
    })

    const allTimeCount = await prisma.workoutCompletion.count({
      where: { userId, status: 'completed' },
    })

    expect(thisWeekCount).toBe(2) // Jan 14 & Jan 15
    expect(thisMonthCount).toBe(5) // 2 this week + 3 earlier in Jan
    expect(allTimeCount).toBe(10) // 5 in Jan + 5 from previous months
  })

  it('should correctly calculate total volume', async () => {
    // Create 3 workouts with known volume
    // Workout 1: 3x5 @ 100 lbs = 1500 lbs
    await createWorkoutWithSets(new Date(), [
      { weight: 100, reps: 5 },
      { weight: 100, reps: 5 },
      { weight: 100, reps: 5 },
    ])

    // Workout 2: 3x8 @ 135 lbs = 3240 lbs
    await createWorkoutWithSets(new Date(), [
      { weight: 135, reps: 8 },
      { weight: 135, reps: 8 },
      { weight: 135, reps: 8 },
    ])

    // Workout 3: 3x3 @ 225 lbs = 2025 lbs
    await createWorkoutWithSets(new Date(), [
      { weight: 225, reps: 3 },
      { weight: 225, reps: 3 },
      { weight: 225, reps: 3 },
    ])

    // Total: 1500 + 3240 + 2025 = 6765 lbs

    const volumeData = await prisma.exercisePerformanceLog.aggregate({
      where: { userId, type: 'strength' },
      _sum: { totalVolumeLbs: true },
    })

    expect(volumeData._sum.totalVolumeLbs).toBe(6765)
  })

  it('should only count running equipment for running distance', async () => {
    const now = new Date()

    // Create cardio sessions with different equipment
    await createCardioSession(now, 'treadmill', 3.0) // Should count
    await createCardioSession(now, 'outdoor_running', 5.0) // Should count
    await createCardioSession(now, 'bike', 15.0) // Should NOT count
    await createCardioSession(now, 'rowing_machine', null) // Should NOT count

    // Query running distance only
    const runningData = await prisma.exercisePerformanceLog.aggregate({
      where: {
        userId,
        type: 'cardio',
        equipment: { in: ['treadmill', 'outdoor_running'] },
      },
      _sum: { distance: true },
    })

    expect(runningData._sum.distance).toBe(8.0) // 3.0 + 5.0
  })

  it('should combine strength and cardio workout counts', async () => {
    const now = new Date()

    // Create 2 strength workouts
    await createWorkoutWithSets(now, [{ weight: 100, reps: 5 }])
    await createWorkoutWithSets(now, [{ weight: 100, reps: 5 }])

    // Create 3 cardio sessions
    await createCardioSession(now, 'treadmill', 3.0)
    await createCardioSession(now, 'bike', 10.0)
    await createCardioSession(now, 'rowing_machine', null)

    const strengthCount = await prisma.workoutCompletion.count({
      where: { userId, status: 'completed' },
    })

    const cardioCount = await prisma.loggedCardioSession.count({
      where: { userId, status: 'completed' },
    })

    expect(strengthCount).toBe(2)
    expect(cardioCount).toBe(3)
    expect(strengthCount + cardioCount).toBe(5) // Total workouts
  })

  it('should find earliest workout date across strength and cardio', async () => {
    const oldest = new Date('2024-01-15')
    const middle = new Date('2024-06-01')
    const newest = new Date('2024-12-01')

    // Create workouts at different dates
    await createWorkoutWithSets(middle, [{ weight: 100, reps: 5 }])
    await createCardioSession(oldest, 'treadmill', 3.0) // Oldest
    await createWorkoutWithSets(newest, [{ weight: 100, reps: 5 }])

    // Query earliest date
    const result = await prisma.$queryRaw<Array<{ earliest: Date | null }>>`
      SELECT MIN("completedAt") as earliest
      FROM (
        SELECT "completedAt" FROM "WorkoutCompletion"
        WHERE "userId" = ${userId} AND status = 'completed'
        UNION ALL
        SELECT "completedAt" FROM "LoggedCardioSession"
        WHERE "userId" = ${userId} AND status = 'completed'
      ) AS all_workouts
    `

    expect(result[0].earliest).toEqual(oldest)
  })

  it('should handle user with only strength data (no cardio)', async () => {
    await createWorkoutWithSets(new Date(), [{ weight: 100, reps: 5 }])

    const volumeData = await prisma.exercisePerformanceLog.aggregate({
      where: { userId, type: 'strength' },
      _sum: { totalVolumeLbs: true },
    })

    const runningData = await prisma.exercisePerformanceLog.aggregate({
      where: {
        userId,
        type: 'cardio',
        equipment: { in: ['treadmill', 'outdoor_running'] },
      },
      _sum: { distance: true },
    })

    expect(volumeData._sum.totalVolumeLbs).toBe(500) // 100 * 5
    expect(runningData._sum.distance).toBeNull() // No cardio
  })

  it('should handle user with only cardio data (no strength)', async () => {
    await createCardioSession(new Date(), 'treadmill', 5.0)
    await createCardioSession(new Date(), 'outdoor_running', 3.0)

    const volumeData = await prisma.exercisePerformanceLog.aggregate({
      where: { userId, type: 'strength' },
      _sum: { totalVolumeLbs: true },
    })

    const runningData = await prisma.exercisePerformanceLog.aggregate({
      where: {
        userId,
        type: 'cardio',
        equipment: { in: ['treadmill', 'outdoor_running'] },
      },
      _sum: { distance: true },
    })

    expect(volumeData._sum.totalVolumeLbs).toBeNull() // No strength
    expect(runningData._sum.distance).toBe(8.0) // 5.0 + 3.0
  })
})
