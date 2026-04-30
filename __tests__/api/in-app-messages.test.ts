import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'

/**
 * Simulates the GET /api/messages resolution logic.
 * Mirrors the precedence rules from app/api/messages/route.ts
 * without requiring HTTP or auth middleware.
 */
async function resolveMessages(
  prisma: PrismaClient,
  userId: string,
  params: {
    placement: string
    workoutCount: number
    programId?: string
  }
) {
  const { placement, workoutCount, programId } = params

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: {
      experienceLevel: true,
      dismissedMessageIds: true,
      seenMessageIds: true,
    },
  })

  const experienceLevel = settings?.experienceLevel || 'beginner'
  const dismissedIds: string[] = safeParseJsonArray(settings?.dismissedMessageIds)
  const seenIds: string[] = safeParseJsonArray(settings?.seenMessageIds)

  let sourceCommunityProgramId: string | null = null
  if (programId) {
    const program = await prisma.program.findUnique({
      where: { id: programId },
      select: { sourceCommunityProgramId: true },
    })
    sourceCommunityProgramId = program?.sourceCommunityProgramId ?? null
  }

  const candidates = await prisma.inAppMessage.findMany({
    where: {
      active: true,
      placement,
      userType: { in: [experienceLevel, 'all'] },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })

  const qualifying = candidates.filter((msg) => {
    if (msg.minWorkouts !== null && workoutCount < msg.minWorkouts) return false
    if (msg.maxWorkouts !== null && workoutCount > msg.maxWorkouts) return false

    if (msg.programTargeting) {
      const targetPrograms: string[] = safeParseJsonArray(msg.programTargeting)
      if (targetPrograms.length > 0) {
        if (!sourceCommunityProgramId) return false
        if (!targetPrograms.includes(sourceCommunityProgramId)) return false
      }
    }

    if (msg.lifecycle === 'show_once' && seenIds.includes(msg.id)) return false
    if (msg.lifecycle === 'show_until_dismissed' && dismissedIds.includes(msg.id)) return false

    return true
  })

  return placement === 'training_tab'
    ? qualifying.slice(0, 1)
    : qualifying
}

function safeParseJsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Helper to create a message in the DB
async function createMessage(
  prisma: PrismaClient,
  overrides: Partial<{
    id: string
    content: string
    placement: string
    userType: string
    icon: string
    lifecycle: string
    minWorkouts: number | null
    maxWorkouts: number | null
    programTargeting: string | null
    priority: number
    active: boolean
  }> = {}
) {
  return prisma.inAppMessage.create({
    data: {
      content: overrides.content ?? 'Test message',
      placement: overrides.placement ?? 'training_tab',
      userType: overrides.userType ?? 'all',
      icon: overrides.icon ?? 'Lightbulb',
      lifecycle: overrides.lifecycle ?? 'show_always',
      minWorkouts: overrides.minWorkouts ?? null,
      maxWorkouts: overrides.maxWorkouts ?? null,
      programTargeting: overrides.programTargeting ?? null,
      priority: overrides.priority ?? 0,
      active: overrides.active ?? true,
      ...(overrides.id ? { id: overrides.id } : {}),
    },
  })
}

describe('In-App Messages - Resolution Logic', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id

    // Create user settings (beginner by default)
    await prisma.userSettings.create({
      data: { userId, experienceLevel: 'beginner' },
    })
  })

  describe('Basic filtering', () => {
    it('returns active messages matching placement', async () => {
      await createMessage(prisma, { placement: 'training_tab', content: 'Training msg' })
      await createMessage(prisma, { placement: 'exercise_logger', content: 'Logger msg' })

      const training = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
      })
      expect(training).toHaveLength(1)
      expect(training[0].content).toBe('Training msg')

      const logger = await resolveMessages(prisma, userId, {
        placement: 'exercise_logger',
        workoutCount: 0,
      })
      expect(logger).toHaveLength(1)
      expect(logger[0].content).toBe('Logger msg')
    })

    it('excludes inactive messages', async () => {
      await createMessage(prisma, { active: false, content: 'Inactive' })

      const result = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
      })
      expect(result).toHaveLength(0)
    })
  })

  describe('User type filtering', () => {
    it('shows beginner-only messages to beginners', async () => {
      await createMessage(prisma, { userType: 'beginner', content: 'Beginner msg' })
      await createMessage(prisma, { userType: 'experienced', content: 'Experienced msg' })

      const result = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
      })
      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('Beginner msg')
    })

    it('shows experienced-only messages to experienced users', async () => {
      await prisma.userSettings.update({
        where: { userId },
        data: { experienceLevel: 'experienced' },
      })

      await createMessage(prisma, { userType: 'beginner', content: 'Beginner msg' })
      await createMessage(prisma, { userType: 'experienced', content: 'Experienced msg' })

      const result = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
      })
      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('Experienced msg')
    })

    it('shows "all" messages to both user types', async () => {
      await createMessage(prisma, { userType: 'all', content: 'Universal msg', priority: 10 })

      const beginnerResult = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
      })
      expect(beginnerResult).toHaveLength(1)

      await prisma.userSettings.update({
        where: { userId },
        data: { experienceLevel: 'experienced' },
      })

      const expResult = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
      })
      expect(expResult).toHaveLength(1)
    })
  })

  describe('Workout count range', () => {
    it('filters by minWorkouts', async () => {
      await createMessage(prisma, { minWorkouts: 3, content: 'After 3 workouts' })

      const before = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 2,
      })
      expect(before).toHaveLength(0)

      const atMin = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 3,
      })
      expect(atMin).toHaveLength(1)
    })

    it('filters by maxWorkouts', async () => {
      await createMessage(prisma, { maxWorkouts: 3, content: 'First 3 only' })

      const atMax = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 3,
      })
      expect(atMax).toHaveLength(1)

      const after = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 4,
      })
      expect(after).toHaveLength(0)
    })

    it('filters by both min and max (range)', async () => {
      await createMessage(prisma, { minWorkouts: 3, maxWorkouts: 8, content: 'Mid-range' })

      const below = await resolveMessages(prisma, userId, { placement: 'training_tab', workoutCount: 2 })
      expect(below).toHaveLength(0)

      const within = await resolveMessages(prisma, userId, { placement: 'training_tab', workoutCount: 5 })
      expect(within).toHaveLength(1)

      const above = await resolveMessages(prisma, userId, { placement: 'training_tab', workoutCount: 9 })
      expect(above).toHaveLength(0)
    })

    it('null min/max means no constraint', async () => {
      await createMessage(prisma, { minWorkouts: null, maxWorkouts: null, content: 'Always' })

      const result = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 999,
      })
      expect(result).toHaveLength(1)
    })
  })

  describe('Lifecycle filtering', () => {
    it('show_once: excluded after being seen', async () => {
      await createMessage(prisma, {
        id: 'msg_once',
        lifecycle: 'show_once',
        content: 'See me once',
      })

      // Before seen
      const before = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
      })
      expect(before).toHaveLength(1)

      // Mark as seen
      await prisma.userSettings.update({
        where: { userId },
        data: { seenMessageIds: JSON.stringify(['msg_once']) },
      })

      const after = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
      })
      expect(after).toHaveLength(0)
    })

    it('show_until_dismissed: excluded after dismissal', async () => {
      await createMessage(prisma, {
        id: 'msg_dismiss',
        lifecycle: 'show_until_dismissed',
        content: 'Dismiss me',
      })

      // Before dismissed
      const before = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
      })
      expect(before).toHaveLength(1)

      // Dismiss
      await prisma.userSettings.update({
        where: { userId },
        data: { dismissedMessageIds: JSON.stringify(['msg_dismiss']) },
      })

      const after = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
      })
      expect(after).toHaveLength(0)
    })

    it('show_always: always shown regardless of seen/dismissed', async () => {
      await createMessage(prisma, {
        id: 'msg_always',
        lifecycle: 'show_always',
        content: 'Always here',
      })

      // Even with both arrays populated
      await prisma.userSettings.update({
        where: { userId },
        data: {
          seenMessageIds: JSON.stringify(['msg_always']),
          dismissedMessageIds: JSON.stringify(['msg_always']),
        },
      })

      const result = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
      })
      expect(result).toHaveLength(1)
    })
  })

  describe('Priority and precedence', () => {
    it('training_tab returns only the highest priority message', async () => {
      await createMessage(prisma, { priority: 10, content: 'Low priority' })
      await createMessage(prisma, { priority: 50, content: 'High priority' })
      await createMessage(prisma, { priority: 30, content: 'Mid priority' })

      const result = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
      })
      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('High priority')
    })

    it('exercise_logger returns all qualifying messages ordered by priority', async () => {
      await createMessage(prisma, { placement: 'exercise_logger', priority: 10, content: 'Low' })
      await createMessage(prisma, { placement: 'exercise_logger', priority: 50, content: 'High' })
      await createMessage(prisma, { placement: 'exercise_logger', priority: 30, content: 'Mid' })

      const result = await resolveMessages(prisma, userId, {
        placement: 'exercise_logger',
        workoutCount: 0,
      })
      expect(result).toHaveLength(3)
      expect(result[0].content).toBe('High')
      expect(result[1].content).toBe('Mid')
      expect(result[2].content).toBe('Low')
    })

    it('when top message is dismissed, next priority wins on training_tab', async () => {
      await createMessage(prisma, {
        id: 'msg_top',
        priority: 50,
        lifecycle: 'show_until_dismissed',
        content: 'Top',
      })
      await createMessage(prisma, { priority: 10, content: 'Runner-up' })

      // Dismiss top
      await prisma.userSettings.update({
        where: { userId },
        data: { dismissedMessageIds: JSON.stringify(['msg_top']) },
      })

      const result = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
      })
      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('Runner-up')
    })
  })

  describe('Program targeting', () => {
    it('program-agnostic messages show for any program', async () => {
      await createMessage(prisma, { programTargeting: null, content: 'For everyone' })

      const program = await prisma.program.create({
        data: { name: 'Test', userId, sourceCommunityProgramId: 'cp_123' },
      })

      const result = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
        programId: program.id,
      })
      expect(result).toHaveLength(1)
    })

    it('targeted message shows when program source matches', async () => {
      await createMessage(prisma, {
        programTargeting: JSON.stringify(['cp_machine_starter']),
        content: 'Machine starter tip',
      })

      const program = await prisma.program.create({
        data: { name: 'Machine Starter', userId, sourceCommunityProgramId: 'cp_machine_starter' },
      })

      const result = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
        programId: program.id,
      })
      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('Machine starter tip')
    })

    it('targeted message hidden when program source does not match', async () => {
      await createMessage(prisma, {
        programTargeting: JSON.stringify(['cp_machine_starter']),
        content: 'Machine starter only',
      })

      const program = await prisma.program.create({
        data: { name: 'Other Program', userId, sourceCommunityProgramId: 'cp_other' },
      })

      const result = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
        programId: program.id,
      })
      expect(result).toHaveLength(0)
    })

    it('targeted message hidden for programs with no source (user-created or old clones)', async () => {
      await createMessage(prisma, {
        programTargeting: JSON.stringify(['cp_machine_starter']),
        content: 'Targeted',
      })

      const program = await prisma.program.create({
        data: { name: 'User Created', userId, sourceCommunityProgramId: null },
      })

      const result = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
        programId: program.id,
      })
      expect(result).toHaveLength(0)
    })

    it('targeted message hidden when no programId provided', async () => {
      await createMessage(prisma, {
        programTargeting: JSON.stringify(['cp_machine_starter']),
        content: 'Targeted',
      })

      const result = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
      })
      expect(result).toHaveLength(0)
    })
  })

  describe('Combined filters', () => {
    it('respects all filters simultaneously', async () => {
      // Message for beginners, workouts 0-3, show_once, targeted to a program
      await createMessage(prisma, {
        id: 'msg_specific',
        userType: 'beginner',
        minWorkouts: 0,
        maxWorkouts: 3,
        lifecycle: 'show_once',
        programTargeting: JSON.stringify(['cp_starter']),
        priority: 100,
        content: 'Specific tip',
      })

      const program = await prisma.program.create({
        data: { name: 'Starter', userId, sourceCommunityProgramId: 'cp_starter' },
      })

      // All conditions met
      const match = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 1,
        programId: program.id,
      })
      expect(match).toHaveLength(1)

      // Wrong workout count
      const tooMany = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 5,
        programId: program.id,
      })
      expect(tooMany).toHaveLength(0)

      // Mark as seen
      await prisma.userSettings.update({
        where: { userId },
        data: { seenMessageIds: JSON.stringify(['msg_specific']) },
      })

      const afterSeen = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 1,
        programId: program.id,
      })
      expect(afterSeen).toHaveLength(0)
    })

    it('empty state: no messages returns empty array', async () => {
      const result = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
      })
      expect(result).toHaveLength(0)
    })
  })

  describe('Version tracking', () => {
    it('version starts at 1 for new messages', async () => {
      const msg = await createMessage(prisma, { content: 'Version test' })
      expect(msg.version).toBe(1)
    })

    it('version is included in resolved messages', async () => {
      await createMessage(prisma, { content: 'Version check' })

      const result = await resolveMessages(prisma, userId, {
        placement: 'training_tab',
        workoutCount: 0,
      })
      expect(result[0].version).toBe(1)
    })
  })
})
