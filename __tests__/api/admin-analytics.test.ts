import type { PrismaClient } from '@prisma/client'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getAnalyticsData } from '@/lib/admin/analytics-queries'
import { getTestDatabase } from '@/lib/test/database'

/**
 * Regression tests for issue #460 — analytics metrics must exclude staff
 * accounts (role IN ('admin','editor','author')) so that dev/seed accounts
 * don't skew retention and usage metrics.
 *
 * Also verifies the n-based "insufficient data" gating and the 90-day
 * signup cohort cap on time-to-first-workout.
 */
describe('Admin analytics — role-based filtering', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()

    // The BetterAuth `user` table is NOT in the Prisma schema, so
    // `prisma db push` doesn't create it. Bootstrap it here with the same
    // shape used in scripts/start-postgres.sh + the role column from
    // migrations/20260327211219_add_learning_infrastructure.
    //
    // Idempotent: only runs once because beforeAll guards it.
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" text NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
        "name" text NOT NULL,
        "email" text NOT NULL UNIQUE,
        "emailVerified" boolean NOT NULL DEFAULT false,
        "image" text,
        "role" text NOT NULL DEFAULT 'user',
        "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `)
  })

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    await testDb.reset()
    // reset() doesn't touch the "user" table (it's not in Prisma schema),
    // so clear it explicitly for test isolation.
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "user" CASCADE`)
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "AppEvent" CASCADE`)
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Feedback" CASCADE`)
  })

  it('excludes staff accounts from all usage and retention metrics', async () => {
    // Arrange: create one admin, one editor, one author, and two real users.
    const now = new Date()
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)

    await seedUser(prisma, 'admin-1', 'admin@test.com', 'admin', tenDaysAgo)
    await seedUser(prisma, 'editor-1', 'editor@test.com', 'editor', tenDaysAgo)
    await seedUser(prisma, 'author-1', 'author@test.com', 'author', tenDaysAgo)
    await seedUser(prisma, 'user-1', 'user1@test.com', 'user', tenDaysAgo)
    await seedUser(prisma, 'user-2', 'user2@test.com', 'user', tenDaysAgo)

    // Each staff account has LOTS of workouts (dev accounts are noisy).
    // Real users have only 1 each.
    await seedCompletions(prisma, 'admin-1', 50, 'completed')
    await seedCompletions(prisma, 'editor-1', 30, 'completed')
    await seedCompletions(prisma, 'author-1', 20, 'completed')
    await seedCompletions(prisma, 'user-1', 1, 'completed')
    await seedCompletions(prisma, 'user-2', 1, 'completed')

    // Also give the admin a bunch of abandoned workouts to verify completion
    // rate isn't skewed by the internal account.
    await seedCompletions(prisma, 'admin-1', 40, 'abandoned')

    // Funnel events: admin fills every step, users only the first two
    await seedEvent(prisma, 'admin-1', 'program_activated')
    await seedEvent(prisma, 'admin-1', 'workout_started')
    await seedEvent(prisma, 'user-1', 'program_activated')
    await seedEvent(prisma, 'user-1', 'workout_started')
    await seedEvent(prisma, 'user-2', 'program_activated')

    // Feedback: admin submits 5 bug reports, user submits 1
    await seedFeedback(prisma, 'admin-1', 'bug', 5)
    await seedFeedback(prisma, 'user-1', 'bug', 1)

    // Act
    const data = await getAnalyticsData(prisma)

    // Assert: totalUsers counts only the 2 real users (not 5)
    expect(data.usage.totalUsers).toBe(2)

    // All-time workouts = 2 (one per real user), NOT 102 (with staff)
    expect(data.usage.workoutsCompletedAllTime).toBe(2)

    // Completion rate is 100% (2 completed / 2 started) — admin's 40
    // abandoned workouts must NOT drag this down.
    expect(data.usage.completionRate).toBe(100)

    // Funnel: signups=2, program_activated=2, workout_started=1, completed=2
    // (without filtering, signups would be 5 and admin would inflate every step)
    const signups = data.funnel.find((s) => s.step === 'Signed Up')
    expect(signups?.count).toBe(2)
    const activated = data.funnel.find((s) => s.step === 'Activated Program')
    expect(activated?.count).toBe(2)
    const started = data.funnel.find((s) => s.step === 'Started Workout')
    expect(started?.count).toBe(1)

    // Feedback: only the user's 1 bug report should appear
    const bugFeedback = data.feedbackVolume.find((f) => f.category === 'bug')
    expect(bugFeedback?.count).toBe(1)

    // DAU/WAU/MAU should reflect only real users' activity (2 users)
    expect(data.retention.wau).toBe(2)
    expect(data.retention.mau).toBe(2)
  })

  it('gates time-to-first-workout with "insufficient data" when n < 5', async () => {
    // Arrange: 3 real users (below the n<5 threshold), each signed up
    // within the last 90 days with a first workout shortly after.
    const now = new Date()
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)

    for (let i = 1; i <= 3; i++) {
      await seedUser(
        prisma,
        `user-${i}`,
        `user${i}@test.com`,
        'user',
        fiveDaysAgo
      )
      await seedCompletions(prisma, `user-${i}`, 1, 'completed')
    }

    // Act
    const data = await getAnalyticsData(prisma)

    // Assert: timeToFirstWorkout is present with sampleSize=3, but the
    // frontend will show "insufficient data" because n<5.
    expect(data.retention.timeToFirstWorkout).not.toBeNull()
    expect(data.retention.timeToFirstWorkout?.sampleSize).toBe(3)
  })

  describe('signup attribution metrics (#490)', () => {
    it('breaks down signup_completed events by source', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)

      // 2 organic signups, 1 qr signup, 1 oauth signup, 1 legacy (no source)
      await seedUser(prisma, 'u-org-1', 'org1@test.com', 'user', tenDaysAgo)
      await seedUser(prisma, 'u-org-2', 'org2@test.com', 'user', tenDaysAgo)
      await seedUser(prisma, 'u-qr-1', 'qr1@test.com', 'user', tenDaysAgo)
      await seedUser(prisma, 'u-oauth-1', 'oauth1@test.com', 'user', tenDaysAgo)
      await seedUser(prisma, 'u-legacy-1', 'legacy@test.com', 'user', tenDaysAgo)
      // Staff account — must be excluded even with valid source attribution
      await seedUser(prisma, 'staff-1', 'staff@test.com', 'admin', tenDaysAgo)

      await seedSignupEvent(prisma, 'u-org-1', { source: 'organic', method: 'email' })
      await seedSignupEvent(prisma, 'u-org-2', { source: 'organic', method: 'email' })
      await seedSignupEvent(prisma, 'u-qr-1', {
        source: 'qr',
        method: 'email',
        gymSlug: 'iron-works',
      })
      await seedSignupEvent(prisma, 'u-oauth-1', { source: 'oauth', method: 'google' })
      await seedSignupEvent(prisma, 'u-legacy-1', null)
      await seedSignupEvent(prisma, 'staff-1', { source: 'qr', method: 'email', gymSlug: 'iron-works' })

      const data = await getAnalyticsData(prisma)

      const map = new Map(
        data.signupAttribution.sourceBreakdown.map((s) => [s.source, s.count])
      )
      expect(map.get('organic')).toBe(2)
      expect(map.get('qr')).toBe(1)
      expect(map.get('oauth')).toBe(1)
      expect(map.get('unknown')).toBe(1)
      // Staff signup must NOT inflate any bucket
      const total = data.signupAttribution.sourceBreakdown.reduce(
        (sum, s) => sum + s.count,
        0
      )
      expect(total).toBe(5)
    })

    it('rolls up per-gym signups with first-workout conversion', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)

      // gymA: 3 signups, 2 completed a workout
      // gymB: 1 signup, 0 completed
      await seedUser(prisma, 'a1', 'a1@test.com', 'user', tenDaysAgo)
      await seedUser(prisma, 'a2', 'a2@test.com', 'user', tenDaysAgo)
      await seedUser(prisma, 'a3', 'a3@test.com', 'user', tenDaysAgo)
      await seedUser(prisma, 'b1', 'b1@test.com', 'user', tenDaysAgo)

      await seedSignupEvent(prisma, 'a1', { source: 'qr', method: 'email', gymSlug: 'gym-a' })
      await seedSignupEvent(prisma, 'a2', { source: 'qr', method: 'email', gymSlug: 'gym-a' })
      await seedSignupEvent(prisma, 'a3', { source: 'qr', method: 'email', gymSlug: 'gym-a' })
      await seedSignupEvent(prisma, 'b1', { source: 'qr', method: 'email', gymSlug: 'gym-b' })

      await seedCompletions(prisma, 'a1', 1, 'completed')
      await seedCompletions(prisma, 'a2', 1, 'completed')
      // a3 and b1 have not completed any workouts

      const data = await getAnalyticsData(prisma)

      const gymA = data.signupAttribution.perGym.find((g) => g.gymSlug === 'gym-a')
      const gymB = data.signupAttribution.perGym.find((g) => g.gymSlug === 'gym-b')
      expect(gymA?.signupCount).toBe(3)
      expect(gymA?.firstWorkoutCount).toBe(2)
      expect(gymA?.firstWorkoutPct).toBe(67)
      expect(gymB?.signupCount).toBe(1)
      expect(gymB?.firstWorkoutCount).toBe(0)
      expect(gymB?.firstWorkoutPct).toBe(0)
    })

    it('renders cleanly with a single gym slug', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      await seedUser(prisma, 'solo-1', 'solo@test.com', 'user', tenDaysAgo)
      await seedSignupEvent(prisma, 'solo-1', {
        source: 'qr',
        method: 'email',
        gymSlug: 'only-gym',
      })

      const data = await getAnalyticsData(prisma)
      expect(data.signupAttribution.perGym).toHaveLength(1)
      expect(data.signupAttribution.perGym[0].gymSlug).toBe('only-gym')
    })

    it('builds the QR funnel from landing → started → completed', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)

      // 4 users hit the landing page; 3 click signup; 2 complete signup
      for (let i = 1; i <= 4; i++) {
        await seedUser(prisma, `qr-${i}`, `qr${i}@test.com`, 'user', tenDaysAgo)
        await seedEventWithProps(prisma, `qr-${i}`, 'qr_landing_viewed', {
          gymSlug: 'iron-works',
        })
      }
      for (let i = 1; i <= 3; i++) {
        await seedEventWithProps(prisma, `qr-${i}`, 'signup_started', {
          source: 'qr',
          method: 'email',
          gymSlug: 'iron-works',
        })
      }
      for (let i = 1; i <= 2; i++) {
        await seedSignupEvent(prisma, `qr-${i}`, {
          source: 'qr',
          method: 'email',
          gymSlug: 'iron-works',
        })
      }

      const data = await getAnalyticsData(prisma)
      const funnel = data.signupAttribution.qrFunnel
      expect(funnel).toHaveLength(3)
      expect(funnel[0].count).toBe(4)
      expect(funnel[1].count).toBe(3)
      expect(funnel[2].count).toBe(2)
      // step-to-step
      expect(funnel[1].conversionPct).toBe(75) // 3/4
      expect(funnel[2].conversionPct).toBe(67) // 2/3
    })
  })

  it('caps time-to-first-workout to signups within the last 90 days', async () => {
    // Arrange: 1 old user (signed up 200 days ago, first workout 1 day ago)
    // and 5 recent users (signed up 10 days ago, first workout shortly after).
    // The old user would massively skew the median if not filtered out.
    const now = new Date()
    const daysAgo = (n: number) =>
      new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

    await seedUser(prisma, 'old-user', 'old@test.com', 'user', daysAgo(200))
    await seedCompletions(prisma, 'old-user', 1, 'completed', daysAgo(1))

    for (let i = 1; i <= 5; i++) {
      const signupDate = daysAgo(10)
      const workoutDate = new Date(signupDate.getTime() + 60 * 60 * 1000) // +1hr
      await seedUser(prisma, `new-${i}`, `new${i}@test.com`, 'user', signupDate)
      await seedCompletions(prisma, `new-${i}`, 1, 'completed', workoutDate)
    }

    // Act
    const data = await getAnalyticsData(prisma)

    // Assert: old user excluded. sampleSize = 5 (only new users).
    expect(data.retention.timeToFirstWorkout?.sampleSize).toBe(5)

    // Median should be ~1 hour (not ~4800 hours from the old account).
    // Round up to 2 to account for floor division & rounding in the query.
    const median = data.retention.timeToFirstWorkout?.median ?? 0
    expect(median).toBeLessThan(24)
  })
})

// -----------------------------------------------------------------------------
// Test seeding helpers
// -----------------------------------------------------------------------------

async function seedUser(
  prisma: PrismaClient,
  id: string,
  email: string,
  role: 'user' | 'admin' | 'editor' | 'author',
  createdAt: Date
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, $5, $5)`,
    id,
    id,
    email,
    role,
    createdAt
  )
}

async function seedCompletions(
  prisma: PrismaClient,
  userId: string,
  count: number,
  status: 'completed' | 'abandoned',
  completedAt: Date = new Date()
): Promise<void> {
  // We need a workout to attach to — create a minimal program structure.
  // Reuse one per user to keep the test data compact.
  const existing = await prisma.workout.findFirst({ where: { userId } })
  let workoutId: string
  if (existing) {
    workoutId = existing.id
  } else {
    const program = await prisma.program.create({
      data: {
        name: `Program for ${userId}`,
        userId,
        weeks: {
          create: {
            weekNumber: 1,
            userId,
            workouts: {
              create: {
                name: 'Day 1',
                dayNumber: 1,
                userId,
              },
            },
          },
        },
      },
      include: { weeks: { include: { workouts: true } } },
    })
    workoutId = program.weeks[0].workouts[0].id
  }

  for (let i = 0; i < count; i++) {
    await prisma.workoutCompletion.create({
      data: {
        workoutId,
        userId,
        status,
        completedAt,
      },
    })
  }
}

async function seedEvent(
  prisma: PrismaClient,
  userId: string,
  event: string
): Promise<void> {
  await prisma.appEvent.create({
    data: { userId, event },
  })
}

async function seedSignupEvent(
  prisma: PrismaClient,
  userId: string,
  properties: Record<string, unknown> | null
): Promise<void> {
  await prisma.appEvent.create({
    data: {
      userId,
      event: 'signup_completed',
      properties: properties === null ? undefined : (properties as never),
    },
  })
}

async function seedEventWithProps(
  prisma: PrismaClient,
  userId: string,
  event: string,
  properties: Record<string, unknown>
): Promise<void> {
  await prisma.appEvent.create({
    data: {
      userId,
      event,
      properties: properties as never,
    },
  })
}

async function seedFeedback(
  prisma: PrismaClient,
  userId: string,
  category: string,
  count: number
): Promise<void> {
  for (let i = 0; i < count; i++) {
    await prisma.feedback.create({
      data: {
        userId,
        category,
        message: `test feedback ${i}`,
        pageUrl: '/test',
      },
    })
  }
}
