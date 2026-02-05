import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { getTestDatabase } from '@/lib/test/database'
import {
  createTestUser,
  createTestCardioProgram,
  createTestLoggedCardioSession,
} from '@/lib/test/factories'
import {
  getCardioProgramCompletionStatus,
  getCardioProgramCompletionStats,
} from '@/lib/db/program-completion'

describe('Cardio Program Completion Detection', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  describe('getCardioProgramCompletionStatus', () => {
    it('should return not complete for new program with no logged sessions', async () => {
      // Arrange
      const program = await createTestCardioProgram(prisma, userId, {
        sessionsPerWeek: 3,
      })

      // Act
      const status = await getCardioProgramCompletionStatus(
        prisma,
        program.id,
        userId
      )

      // Assert
      expect(status.isComplete).toBe(false)
      expect(status.totalWorkouts).toBe(3)
      expect(status.completedWorkouts).toBe(0)
      expect(status.skippedWorkouts).toBe(0)
      expect(status.remainingWorkouts).toBe(3)
      expect(status.completionPercentage).toBe(0)
    })

    it('should return not complete for partially completed program', async () => {
      // Arrange
      const program = await createTestCardioProgram(prisma, userId, {
        weeks: 1,
        sessionsPerWeek: 3,
      })

      const firstSession = program.weeks[0].sessions[0]

      // Complete first session
      await createTestLoggedCardioSession(
        prisma,
        firstSession.id,
        userId,
        'completed'
      )

      // Act
      const status = await getCardioProgramCompletionStatus(
        prisma,
        program.id,
        userId
      )

      // Assert
      expect(status.isComplete).toBe(false)
      expect(status.totalWorkouts).toBe(3)
      expect(status.completedWorkouts).toBe(1)
      expect(status.skippedWorkouts).toBe(0)
      expect(status.remainingWorkouts).toBe(2)
      expect(status.completionPercentage).toBe(33)
    })

    it('should return complete when all sessions are completed', async () => {
      // Arrange
      const program = await createTestCardioProgram(prisma, userId, {
        weeks: 1,
        sessionsPerWeek: 3,
      })

      const sessions = program.weeks[0].sessions

      // Complete all sessions
      for (const session of sessions) {
        await createTestLoggedCardioSession(
          prisma,
          session.id,
          userId,
          'completed'
        )
      }

      // Act
      const status = await getCardioProgramCompletionStatus(
        prisma,
        program.id,
        userId
      )

      // Assert
      expect(status.isComplete).toBe(true)
      expect(status.totalWorkouts).toBe(3)
      expect(status.completedWorkouts).toBe(3)
      expect(status.skippedWorkouts).toBe(0)
      expect(status.remainingWorkouts).toBe(0)
      expect(status.completionPercentage).toBe(100)
    })

    it('should return complete when all sessions are skipped', async () => {
      // Arrange
      const program = await createTestCardioProgram(prisma, userId, {
        weeks: 1,
        sessionsPerWeek: 3,
      })

      const sessions = program.weeks[0].sessions

      // Skip all sessions
      for (const session of sessions) {
        await createTestLoggedCardioSession(
          prisma,
          session.id,
          userId,
          'skipped'
        )
      }

      // Act
      const status = await getCardioProgramCompletionStatus(
        prisma,
        program.id,
        userId
      )

      // Assert
      expect(status.isComplete).toBe(true)
      expect(status.totalWorkouts).toBe(3)
      expect(status.completedWorkouts).toBe(0)
      expect(status.skippedWorkouts).toBe(3)
      expect(status.remainingWorkouts).toBe(0)
      expect(status.completionPercentage).toBe(100)
    })

    it('should return complete with mix of completed and skipped', async () => {
      // Arrange
      const program = await createTestCardioProgram(prisma, userId, {
        weeks: 1,
        sessionsPerWeek: 3,
      })

      const sessions = program.weeks[0].sessions

      // Complete first two, skip last one
      await createTestLoggedCardioSession(
        prisma,
        sessions[0].id,
        userId,
        'completed'
      )
      await createTestLoggedCardioSession(
        prisma,
        sessions[1].id,
        userId,
        'completed'
      )
      await createTestLoggedCardioSession(
        prisma,
        sessions[2].id,
        userId,
        'skipped'
      )

      // Act
      const status = await getCardioProgramCompletionStatus(
        prisma,
        program.id,
        userId
      )

      // Assert
      expect(status.isComplete).toBe(true)
      expect(status.totalWorkouts).toBe(3)
      expect(status.completedWorkouts).toBe(2)
      expect(status.skippedWorkouts).toBe(1)
      expect(status.remainingWorkouts).toBe(0)
      expect(status.completionPercentage).toBe(100)
    })

    it('should handle multi-week programs', async () => {
      // Arrange - Create 2 weeks with 2 sessions each
      const program = await createTestCardioProgram(prisma, userId, {
        weeks: 2,
        sessionsPerWeek: 2,
      })

      // Complete first 3 sessions
      const week1Sessions = program.weeks[0].sessions
      const week2Sessions = program.weeks[1].sessions

      await createTestLoggedCardioSession(
        prisma,
        week1Sessions[0].id,
        userId,
        'completed'
      )
      await createTestLoggedCardioSession(
        prisma,
        week1Sessions[1].id,
        userId,
        'completed'
      )
      await createTestLoggedCardioSession(
        prisma,
        week2Sessions[0].id,
        userId,
        'completed'
      )

      // Act
      const status = await getCardioProgramCompletionStatus(
        prisma,
        program.id,
        userId
      )

      // Assert
      expect(status.isComplete).toBe(false)
      expect(status.totalWorkouts).toBe(4)
      expect(status.completedWorkouts).toBe(3)
      expect(status.remainingWorkouts).toBe(1)
      expect(status.completionPercentage).toBe(75)
    })

    it('should return not complete for program with no sessions', async () => {
      // Arrange - Create program with 0 sessions per week
      const program = await createTestCardioProgram(prisma, userId, {
        weeks: 1,
        sessionsPerWeek: 0,
      })

      // Act
      const status = await getCardioProgramCompletionStatus(
        prisma,
        program.id,
        userId
      )

      // Assert
      expect(status.isComplete).toBe(false)
      expect(status.totalWorkouts).toBe(0)
      expect(status.remainingWorkouts).toBe(0)
    })
  })

  describe('getCardioProgramCompletionStats', () => {
    it('should return detailed stats for completed program', async () => {
      // Arrange
      const program = await createTestCardioProgram(prisma, userId, {
        weeks: 1,
        sessionsPerWeek: 2,
      })

      const sessions = program.weeks[0].sessions

      // Complete all sessions with varying stats
      await createTestLoggedCardioSession(
        prisma,
        sessions[0].id,
        userId,
        'completed',
        {
          duration: 30,
          distance: 3.1,
          avgHR: 140,
          calories: 300,
        }
      )
      await createTestLoggedCardioSession(
        prisma,
        sessions[1].id,
        userId,
        'completed',
        {
          duration: 45,
          distance: 5.0,
          avgHR: 150,
          calories: 450,
        }
      )

      // Act
      const stats = await getCardioProgramCompletionStats(
        prisma,
        program.id,
        userId
      )

      // Assert
      expect(stats.programName).toBe(program.name)
      expect(stats.totalWorkouts).toBe(2)
      expect(stats.completedWorkouts).toBe(2)
      expect(stats.skippedWorkouts).toBe(0)
      expect(stats.totalDuration).toBe(75) // 30 + 45
      expect(stats.totalDistance).toBe(8.1) // 3.1 + 5.0
      expect(stats.totalSessions).toBe(2)
      expect(stats.durationDays).toBeGreaterThanOrEqual(0)
      expect(stats.startDate).toBeInstanceOf(Date)
      expect(stats.endDate).toBeInstanceOf(Date)
    })

    it('should only count stats from completed sessions, not skipped', async () => {
      // Arrange
      const program = await createTestCardioProgram(prisma, userId, {
        weeks: 1,
        sessionsPerWeek: 2,
      })

      const sessions = program.weeks[0].sessions

      // Complete first session
      await createTestLoggedCardioSession(
        prisma,
        sessions[0].id,
        userId,
        'completed',
        {
          duration: 30,
          distance: 3.1,
        }
      )

      // Skip second session
      await createTestLoggedCardioSession(
        prisma,
        sessions[1].id,
        userId,
        'skipped'
      )

      // Act
      const stats = await getCardioProgramCompletionStats(
        prisma,
        program.id,
        userId
      )

      // Assert
      expect(stats.completedWorkouts).toBe(1)
      expect(stats.skippedWorkouts).toBe(1)
      expect(stats.totalDuration).toBe(30) // Only from completed session
      expect(stats.totalDistance).toBeCloseTo(3.1) // Only from completed session
      expect(stats.totalSessions).toBe(1) // Only completed sessions
    })

    it('should handle sessions without distance data', async () => {
      // Arrange
      const program = await createTestCardioProgram(prisma, userId, {
        weeks: 1,
        sessionsPerWeek: 2,
      })

      const sessions = program.weeks[0].sessions

      // Complete sessions without distance
      await createTestLoggedCardioSession(
        prisma,
        sessions[0].id,
        userId,
        'completed',
        {
          duration: 30,
          distance: 0, // No distance
        }
      )
      await createTestLoggedCardioSession(
        prisma,
        sessions[1].id,
        userId,
        'completed',
        {
          duration: 45,
          distance: 0, // No distance
        }
      )

      // Act
      const stats = await getCardioProgramCompletionStats(
        prisma,
        program.id,
        userId
      )

      // Assert
      expect(stats.totalDuration).toBe(75)
      expect(stats.totalDistance).toBe(0) // No distance accumulated
      expect(stats.completedWorkouts).toBe(2)
    })

    it('should calculate duration in days correctly', async () => {
      // Arrange
      const program = await createTestCardioProgram(prisma, userId, {
        weeks: 1,
        sessionsPerWeek: 2,
      })

      const sessions = program.weeks[0].sessions

      // Create sessions with different timestamps
      const now = new Date()
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

      // Complete first session 3 days ago
      const session1 = await prisma.loggedCardioSession.create({
        data: {
          prescribedSessionId: sessions[0].id,
          userId,
          status: 'completed',
          completedAt: threeDaysAgo,
          name: 'Test Session',
          equipment: 'treadmill',
          duration: 30,
        },
      })

      // Complete second session now
      const session2 = await prisma.loggedCardioSession.create({
        data: {
          prescribedSessionId: sessions[1].id,
          userId,
          status: 'completed',
          completedAt: now,
          name: 'Test Session',
          equipment: 'treadmill',
          duration: 30,
        },
      })

      // Act
      const stats = await getCardioProgramCompletionStats(
        prisma,
        program.id,
        userId
      )

      // Assert
      expect(stats.durationDays).toBe(3)
      expect(stats.startDate).toEqual(threeDaysAgo)
      expect(stats.endDate).toEqual(now)
    })
  })
})
