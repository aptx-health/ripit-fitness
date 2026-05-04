/**
 * Dev Analytics Seed — seeds a fake end-user with realistic analytics data
 * (AppEvent, Feedback, WorkoutCompletion) so CSV export can be tested locally.
 * Idempotent: skips if the test end-user already exists.
 * Usage: DATABASE_URL="..." npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seeds/seed-analytics-data.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const END_USER_ID = 'test-end-user-id'
const END_USER_EMAIL = 'enduser@test.com'
const ADMIN_USER_ID = 'test-user-id'

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0)
  return d
}

async function ensureEndUser() {
  // Insert end user directly into BetterAuth user table (not Prisma-managed)
  await prisma.$executeRaw`
    INSERT INTO "user" (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
    VALUES (${END_USER_ID}, 'Test EndUser', ${END_USER_EMAIL}, true, 'user', ${daysAgo(60)}, CURRENT_TIMESTAMP)
    ON CONFLICT (email) DO UPDATE SET role = 'user'
  `
}

async function seedEvents() {
  const existing = await prisma.appEvent.count({ where: { userId: END_USER_ID } })
  if (existing > 0) return

  const events = [
    // Signup flow
    { event: 'signup_completed', properties: { source: 'organic' }, pageUrl: '/signup', daysAgo: 60 },
    { event: 'onboarding_experience_selected', properties: { level: 'intermediate' }, pageUrl: '/onboarding', daysAgo: 60 },
    { event: 'program_browsed', properties: {}, pageUrl: '/programs/browse', daysAgo: 59 },
    { event: 'program_activated', properties: { programName: 'Starting Strength' }, pageUrl: '/programs', daysAgo: 59 },
    // Regular usage over time
    ...Array.from({ length: 30 }, (_, i) => ({
      event: 'workout_started',
      properties: { workoutName: `Day ${(i % 3) + 1}` },
      pageUrl: '/workouts/active',
      daysAgo: 55 - i * 2,
    })),
    ...Array.from({ length: 25 }, (_, i) => ({
      event: 'workout_completed',
      properties: { workoutName: `Day ${(i % 3) + 1}`, duration: 45 + Math.floor(Math.random() * 30) },
      pageUrl: '/workouts/active',
      daysAgo: 55 - i * 2,
    })),
    // Page views
    ...Array.from({ length: 15 }, (_, i) => ({
      event: 'page_view',
      properties: {},
      pageUrl: ['/dashboard', '/programs', '/workouts', '/learn', '/settings'][i % 5],
      daysAgo: Math.floor(Math.random() * 60),
    })),
  ]

  await prisma.appEvent.createMany({
    data: events.map((e) => ({
      userId: END_USER_ID,
      event: e.event,
      properties: e.properties,
      pageUrl: e.pageUrl,
      sessionId: `session-${Math.floor(e.daysAgo / 3)}`,
      createdAt: daysAgo(e.daysAgo),
    })),
  })
}

async function seedFeedback() {
  const existing = await prisma.feedback.count({ where: { userId: END_USER_ID } })
  if (existing > 0) return

  const feedbackItems = [
    { category: 'post_session', message: '', rating: 5, refinements: [], pageUrl: '/workouts/active', daysAgo: 50 },
    { category: 'post_session', message: 'Great workout flow', rating: 4, refinements: ['smooth_experience'], pageUrl: '/workouts/active', daysAgo: 40 },
    { category: 'post_session', message: '', rating: 5, refinements: [], pageUrl: '/workouts/active', daysAgo: 30 },
    { category: 'post_session', message: 'Rest timer was a bit short', rating: 3, refinements: ['confusing'], pageUrl: '/workouts/active', daysAgo: 20 },
    { category: 'feature', message: 'Would love CSV export for my training data', pageUrl: '/settings', daysAgo: 15 },
    { category: 'post_session', message: '', rating: 5, refinements: [], pageUrl: '/workouts/active', daysAgo: 10 },
    { category: 'general', message: 'Really enjoying the app so far', pageUrl: '/dashboard', daysAgo: 5 },
    { category: 'post_session', message: 'New PR today!', rating: 5, refinements: ['smooth_experience'], pageUrl: '/workouts/active', daysAgo: 2 },
  ]

  await prisma.feedback.createMany({
    data: feedbackItems.map((f) => ({
      userId: END_USER_ID,
      category: f.category,
      message: f.message ?? '',
      rating: f.rating ?? null,
      refinements: f.refinements ?? [],
      pageUrl: f.pageUrl,
      createdAt: daysAgo(f.daysAgo),
    })),
  })
}

async function seedCompletions() {
  const existing = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "WorkoutCompletion" WHERE "userId" = ${END_USER_ID}
  `
  if (Number(existing[0].count) > 0) return

  // Get workouts from the admin user's program to reference
  const workouts = await prisma.workout.findMany({
    where: { week: { program: { userId: ADMIN_USER_ID } } },
    take: 3,
    orderBy: { dayNumber: 'asc' },
  })

  if (workouts.length === 0) {
    console.log('  No workouts found to create completions — skipping')
    return
  }

  const completions = Array.from({ length: 20 }, (_, i) => {
    const workout = workouts[i % workouts.length]
    const ago = 55 - i * 3
    const isAbandoned = i === 7 || i === 14 // A couple abandoned
    return {
      workoutId: workout.id,
      userId: END_USER_ID,
      status: isAbandoned ? 'abandoned' : 'completed',
      completedAt: daysAgo(ago),
      notes: i === 3 ? 'Felt strong today' : i === 12 ? 'Low energy, pushed through' : null,
    }
  })

  for (const c of completions) {
    await prisma.workoutCompletion.create({ data: c })
  }
}

async function main() {
  await ensureEndUser()
  await seedEvents()
  await seedFeedback()
  await seedCompletions()
}

main()
  .then(() => {
    console.log('Analytics test data seeded')
  })
  .catch((e) => {
    console.error('Failed to seed analytics data:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
