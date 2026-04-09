import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

// ---- Helpers ----

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(): Date {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function weeksAgo(n: number): Date {
  const d = startOfWeek()
  d.setDate(d.getDate() - n * 7)
  return d
}

// ---- Types ----

export interface UsageMetrics {
  totalUsers: number
  newSignupsThisWeek: number
  workoutsCompletedThisWeek: number
  workoutsCompletedLastWeek: number
  workoutsCompletedAllTime: number
  avgWorkoutsPerUserPerWeek: number
  completionRate: number // completed / (completed + abandoned)
}

export interface RetentionMetrics {
  dau: number
  wau: number
  mau: number
  retentionCohorts: RetentionCohort[]
  timeToFirstWorkout: { median: number; p25: number; p75: number } | null
  dropoutWatchlist: DropoutEntry[]
}

export interface RetentionCohort {
  weekLabel: string
  signupCount: number
  activeCount: number
  retentionPct: number
}

export interface DropoutEntry {
  userId: string
  email: string
  daysSinceLastWorkout: number
  totalWorkouts: number
}

export interface FunnelStep {
  step: string
  count: number
  conversionPct: number
}

export interface FeedbackVolume {
  category: string
  count: number
}

export interface AnalyticsData {
  usage: UsageMetrics
  retention: RetentionMetrics
  funnel: FunnelStep[]
  feedbackVolume: FeedbackVolume[]
  generatedAt: string
}

// ---- Queries ----

async function getUsageMetrics(): Promise<UsageMetrics> {
  const weekStart = startOfWeek()
  const lastWeekStart = weeksAgo(1)

  // Total users
  const totalUsers = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint as count FROM "user"
  `

  // New signups this week
  const newSignups = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint as count FROM "user"
    WHERE "createdAt" >= ${weekStart}
  `

  // Workouts completed by period
  const [thisWeek, lastWeek, allTime] = await Promise.all([
    prisma.workoutCompletion.count({
      where: { status: 'completed', completedAt: { gte: weekStart } },
    }),
    prisma.workoutCompletion.count({
      where: {
        status: 'completed',
        completedAt: { gte: lastWeekStart, lt: weekStart },
      },
    }),
    prisma.workoutCompletion.count({
      where: { status: 'completed' },
    }),
  ])

  // Completion rate: completed / (completed + abandoned)
  const totalStarted = await prisma.workoutCompletion.count({
    where: { status: { in: ['completed', 'abandoned'] } },
  })
  const totalCompleted = await prisma.workoutCompletion.count({
    where: { status: 'completed' },
  })
  const completionRate = totalStarted > 0 ? totalCompleted / totalStarted : 0

  // Avg workouts per user per week (over last 4 weeks)
  const fourWeeksAgo = weeksAgo(4)
  const recentCompletions = await prisma.workoutCompletion.groupBy({
    by: ['userId'],
    where: { status: 'completed', completedAt: { gte: fourWeeksAgo } },
    _count: true,
  })
  const activeUserCount = recentCompletions.length
  const totalRecentWorkouts = recentCompletions.reduce(
    (sum, r) => sum + r._count,
    0
  )
  const avgWorkoutsPerUserPerWeek =
    activeUserCount > 0 ? totalRecentWorkouts / activeUserCount / 4 : 0

  return {
    totalUsers: Number(totalUsers[0].count),
    newSignupsThisWeek: Number(newSignups[0].count),
    workoutsCompletedThisWeek: thisWeek,
    workoutsCompletedLastWeek: lastWeek,
    workoutsCompletedAllTime: allTime,
    avgWorkoutsPerUserPerWeek: Math.round(avgWorkoutsPerUserPerWeek * 10) / 10,
    completionRate: Math.round(completionRate * 100),
  }
}

async function getRetentionMetrics(): Promise<RetentionMetrics> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // DAU - users who completed a workout today
  const dau = await prisma.workoutCompletion.groupBy({
    by: ['userId'],
    where: { status: 'completed', completedAt: { gte: daysAgo(0) } },
  })

  // WAU - users who completed a workout this week
  const wau = await prisma.workoutCompletion.groupBy({
    by: ['userId'],
    where: { status: 'completed', completedAt: { gte: daysAgo(7) } },
  })

  // MAU - users who completed a workout last 30 days
  const mau = await prisma.workoutCompletion.groupBy({
    by: ['userId'],
    where: { status: 'completed', completedAt: { gte: daysAgo(30) } },
  })

  // 7-day retention cohorts: for each of the last 8 weeks, what % are still active
  const cohorts: RetentionCohort[] = []
  for (let w = 1; w <= 8; w++) {
    const cohortStart = weeksAgo(w)
    const cohortEnd = weeksAgo(w - 1)

    const signups = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "user"
      WHERE "createdAt" >= ${cohortStart} AND "createdAt" < ${cohortEnd}
    `
    const signupCount = Number(signups[0].count)
    if (signupCount === 0) {
      cohorts.push({
        weekLabel: `${w}w ago`,
        signupCount: 0,
        activeCount: 0,
        retentionPct: 0,
      })
      continue
    }

    // Users from that cohort who completed a workout in the last 7 days
    const activeFromCohort = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT wc."userId")::bigint as count
      FROM "WorkoutCompletion" wc
      INNER JOIN "user" u ON u.id = wc."userId"
      WHERE u."createdAt" >= ${cohortStart}
        AND u."createdAt" < ${cohortEnd}
        AND wc.status = 'completed'
        AND wc."completedAt" >= ${daysAgo(7)}
    `
    const activeCount = Number(activeFromCohort[0].count)

    cohorts.push({
      weekLabel: `${w}w ago`,
      signupCount,
      activeCount,
      retentionPct:
        signupCount > 0 ? Math.round((activeCount / signupCount) * 100) : 0,
    })
  }

  // Time-to-first-workout distribution
  const timeToFirst = await prisma.$queryRaw<
    Array<{ hours: number }>
  >`
    SELECT EXTRACT(EPOCH FROM (
      MIN(wc."completedAt") - u."createdAt"
    )) / 3600 as hours
    FROM "user" u
    INNER JOIN "WorkoutCompletion" wc ON wc."userId" = u.id
    WHERE wc.status = 'completed'
    GROUP BY u.id, u."createdAt"
    ORDER BY hours
  `

  let timeToFirstWorkout: RetentionMetrics['timeToFirstWorkout'] = null
  if (timeToFirst.length > 0) {
    const hours = timeToFirst.map((r) => Number(r.hours))
    const p25Idx = Math.floor(hours.length * 0.25)
    const medIdx = Math.floor(hours.length * 0.5)
    const p75Idx = Math.floor(hours.length * 0.75)
    timeToFirstWorkout = {
      p25: Math.round(hours[p25Idx] * 10) / 10,
      median: Math.round(hours[medIdx] * 10) / 10,
      p75: Math.round(hours[p75Idx] * 10) / 10,
    }
  }

  // Dropout watchlist: users sorted by days since last workout (desc)
  const dropouts = await prisma.$queryRaw<DropoutEntry[]>`
    SELECT
      u.id as "userId",
      u.email,
      EXTRACT(DAY FROM NOW() - MAX(wc."completedAt"))::int as "daysSinceLastWorkout",
      COUNT(wc.id)::int as "totalWorkouts"
    FROM "user" u
    INNER JOIN "WorkoutCompletion" wc ON wc."userId" = u.id
    WHERE wc.status = 'completed'
    GROUP BY u.id, u.email
    HAVING MAX(wc."completedAt") < ${daysAgo(3)}
    ORDER BY MAX(wc."completedAt") ASC
    LIMIT 20
  `

  return {
    dau: dau.length,
    wau: wau.length,
    mau: mau.length,
    retentionCohorts: cohorts,
    timeToFirstWorkout,
    dropoutWatchlist: dropouts,
  }
}

async function getFunnelMetrics(): Promise<FunnelStep[]> {
  // Funnel: signup -> program_activated -> workout_started -> workout_completed
  // Use AppEvent for funnel stages, with User.createdAt as fallback for signups

  const [signups, programActivated, workoutStarted, workoutCompleted] =
    await Promise.all([
      // Signups: count from user table (more reliable than AppEvent)
      prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT id)::bigint as count FROM "user"
    `,
      prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT "userId")::bigint as count
      FROM "AppEvent" WHERE event = 'program_activated'
    `,
      prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT "userId")::bigint as count
      FROM "AppEvent" WHERE event = 'workout_started'
    `,
      // Use WorkoutCompletion as source of truth for completed
      prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT "userId")::bigint as count
      FROM "WorkoutCompletion" WHERE status = 'completed'
    `,
    ])

  const steps = [
    { step: 'Signed Up', count: Number(signups[0].count) },
    { step: 'Activated Program', count: Number(programActivated[0].count) },
    { step: 'Started Workout', count: Number(workoutStarted[0].count) },
    { step: 'Completed Workout', count: Number(workoutCompleted[0].count) },
  ]

  return steps.map((s, i) => ({
    ...s,
    conversionPct:
      i === 0
        ? 100
        : steps[i - 1].count > 0
          ? Math.round((s.count / steps[i - 1].count) * 100)
          : 0,
  }))
}

async function getFeedbackVolume(): Promise<FeedbackVolume[]> {
  const weekStart = startOfWeek()

  const feedback = await prisma.feedback.groupBy({
    by: ['category'],
    where: { createdAt: { gte: weekStart } },
    _count: true,
    orderBy: { _count: { category: 'desc' } },
  })

  return feedback.map((f) => ({
    category: f.category,
    count: f._count,
  }))
}

// ---- Main ----

export async function getAnalyticsData(): Promise<AnalyticsData> {
  try {
    const [usage, retention, funnel, feedbackVolume] = await Promise.all([
      getUsageMetrics(),
      getRetentionMetrics(),
      getFunnelMetrics(),
      getFeedbackVolume(),
    ])

    return {
      usage,
      retention,
      funnel,
      feedbackVolume,
      generatedAt: new Date().toISOString(),
    }
  } catch (error) {
    logger.error({ error, context: 'analytics-queries' }, 'Failed to fetch analytics data')
    throw error
  }
}
