import { Prisma } from '@prisma/client'

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

// ---- Internal account filtering ----
// Exclude staff accounts (admin/editor/author) from analytics to prevent
// skewed metrics from dev, seed, and content-team accounts. Only role='user'
// represents real end users.
//
// Note: The BetterAuth "user" table is not modeled in schema.prisma, so we
// can't filter via Prisma ORM relations. All analytics queries therefore use
// raw SQL with an INNER JOIN on "user" (or a subquery for tables with no
// direct user relation) to apply the role filter.

const END_USER_ROLE = 'user'

/** SQL fragment: WHERE clause to restrict to end users on "user" aliased as u */
const ONLY_END_USERS_ON_U = Prisma.sql`AND u.role = ${END_USER_ROLE}`

/** SQL fragment: WHERE clause to restrict to end users on "user" table directly */
const ONLY_END_USERS = Prisma.sql`AND role = ${END_USER_ROLE}`

/** Only consider users who signed up within the last N days for time-to-first-workout */
const SIGNUP_LOOKBACK_DAYS = 90

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
  timeToFirstWorkout: {
    median: number
    p25: number
    p75: number
    sampleSize: number
  } | null
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
  /** Step-to-step conversion: this step vs. previous step */
  conversionPct: number
  /** End-to-end conversion: this step vs. total signups (first step) */
  overallPct: number
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

  const fourWeeksAgo = weeksAgo(4)

  // Parallel: user counts + workout counts (end users only; staff excluded).
  // WorkoutCompletion queries use INNER JOIN on "user" to filter by role.
  const [
    totalUsers,
    newSignups,
    thisWeek,
    lastWeek,
    allTime,
    totalStartedRows,
    recentRows,
  ] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "user"
      WHERE 1=1 ${ONLY_END_USERS}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "user"
      WHERE "createdAt" >= ${weekStart} ${ONLY_END_USERS}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count
      FROM "WorkoutCompletion" wc
      INNER JOIN "user" u ON u.id = wc."userId"
      WHERE wc.status = 'completed' AND wc."completedAt" >= ${weekStart}
      ${ONLY_END_USERS_ON_U}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count
      FROM "WorkoutCompletion" wc
      INNER JOIN "user" u ON u.id = wc."userId"
      WHERE wc.status = 'completed'
        AND wc."completedAt" >= ${lastWeekStart}
        AND wc."completedAt" < ${weekStart}
      ${ONLY_END_USERS_ON_U}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count
      FROM "WorkoutCompletion" wc
      INNER JOIN "user" u ON u.id = wc."userId"
      WHERE wc.status = 'completed'
      ${ONLY_END_USERS_ON_U}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count
      FROM "WorkoutCompletion" wc
      INNER JOIN "user" u ON u.id = wc."userId"
      WHERE wc.status IN ('completed', 'abandoned')
      ${ONLY_END_USERS_ON_U}
    `,
    // Avg workouts per user per week (over last 4 weeks):
    // rows are per-user completion counts.
    prisma.$queryRaw<Array<{ userId: string; cnt: bigint }>>`
      SELECT wc."userId" as "userId", COUNT(*)::bigint as cnt
      FROM "WorkoutCompletion" wc
      INNER JOIN "user" u ON u.id = wc."userId"
      WHERE wc.status = 'completed' AND wc."completedAt" >= ${fourWeeksAgo}
      ${ONLY_END_USERS_ON_U}
      GROUP BY wc."userId"
    `,
  ])

  const allTimeCount = Number(allTime[0].count)
  const totalStarted = Number(totalStartedRows[0].count)
  const completionRate = totalStarted > 0 ? allTimeCount / totalStarted : 0

  const activeUserCount = recentRows.length
  const totalRecentWorkouts = recentRows.reduce(
    (sum, r) => sum + Number(r.cnt),
    0
  )
  const avgWorkoutsPerUserPerWeek =
    activeUserCount > 0 ? totalRecentWorkouts / activeUserCount / 4 : 0

  return {
    totalUsers: Number(totalUsers[0].count),
    newSignupsThisWeek: Number(newSignups[0].count),
    workoutsCompletedThisWeek: Number(thisWeek[0].count),
    workoutsCompletedLastWeek: Number(lastWeek[0].count),
    workoutsCompletedAllTime: allTimeCount,
    avgWorkoutsPerUserPerWeek: Math.round(avgWorkoutsPerUserPerWeek * 10) / 10,
    completionRate: Math.round(completionRate * 100),
  }
}

async function getRetentionMetrics(): Promise<RetentionMetrics> {
  // DAU / WAU / MAU in parallel.
  // INNER JOIN on "user" so we only count users that still exist
  // (guards against orphaned WorkoutCompletion rows from deleted/recreated users).
  const dayStart = daysAgo(0)
  const weekStart = daysAgo(7)
  const monthStart = daysAgo(30)
  const [dauRows, wauRows, mauRows] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT wc."userId")::bigint as count
      FROM "WorkoutCompletion" wc
      INNER JOIN "user" u ON u.id = wc."userId"
      WHERE wc.status = 'completed' AND wc."completedAt" >= ${dayStart}
      ${ONLY_END_USERS_ON_U}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT wc."userId")::bigint as count
      FROM "WorkoutCompletion" wc
      INNER JOIN "user" u ON u.id = wc."userId"
      WHERE wc.status = 'completed' AND wc."completedAt" >= ${weekStart}
      ${ONLY_END_USERS_ON_U}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT wc."userId")::bigint as count
      FROM "WorkoutCompletion" wc
      INNER JOIN "user" u ON u.id = wc."userId"
      WHERE wc.status = 'completed' AND wc."completedAt" >= ${monthStart}
      ${ONLY_END_USERS_ON_U}
    `,
  ])
  const dau = Number(dauRows[0].count)
  const wau = Number(wauRows[0].count)
  const mau = Number(mauRows[0].count)

  // 7-day retention cohorts: for each of the last 8 weeks, what % are still active
  const cohorts: RetentionCohort[] = []
  for (let w = 1; w <= 8; w++) {
    const cohortStart = weeksAgo(w)
    const cohortEnd = weeksAgo(w - 1)

    const signups = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "user"
      WHERE "createdAt" >= ${cohortStart} AND "createdAt" < ${cohortEnd}
      ${ONLY_END_USERS}
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
        ${ONLY_END_USERS_ON_U}
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

  // Time-to-first-workout distribution.
  // - Restrict to end-user accounts (exclude staff)
  // - Only consider users who signed up in the last SIGNUP_LOOKBACK_DAYS days
  //   (older accounts have already converted or churned)
  // - Filter out rows where first completion predates user createdAt
  //   (can happen when a user is recreated / BetterAuth migration)
  const signupCutoff = daysAgo(SIGNUP_LOOKBACK_DAYS)
  const timeToFirst = await prisma.$queryRaw<
    Array<{ hours: number }>
  >`
    SELECT EXTRACT(EPOCH FROM (
      MIN(wc."completedAt") - u."createdAt"
    )) / 3600 as hours
    FROM "user" u
    INNER JOIN "WorkoutCompletion" wc ON wc."userId" = u.id
    WHERE wc.status = 'completed'
      AND wc."completedAt" >= u."createdAt"
      AND u."createdAt" >= ${signupCutoff}
      ${ONLY_END_USERS_ON_U}
    GROUP BY u.id, u."createdAt"
    ORDER BY hours
  `

  let timeToFirstWorkout: RetentionMetrics['timeToFirstWorkout'] = null
  const sampleSize = timeToFirst.length
  if (sampleSize > 0) {
    const hours = timeToFirst.map((r) => Number(r.hours))
    const p25Idx = Math.floor(hours.length * 0.25)
    const medIdx = Math.floor(hours.length * 0.5)
    const p75Idx = Math.floor(hours.length * 0.75)
    timeToFirstWorkout = {
      p25: Math.round(hours[p25Idx] * 10) / 10,
      median: Math.round(hours[medIdx] * 10) / 10,
      p75: Math.round(hours[p75Idx] * 10) / 10,
      sampleSize,
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
      ${ONLY_END_USERS_ON_U}
    GROUP BY u.id, u.email
    HAVING MAX(wc."completedAt") < ${daysAgo(3)}
    ORDER BY MAX(wc."completedAt") ASC
    LIMIT 20
  `

  return {
    dau,
    wau,
    mau,
    retentionCohorts: cohorts,
    timeToFirstWorkout,
    dropoutWatchlist: dropouts,
  }
}

async function getFunnelMetrics(): Promise<FunnelStep[]> {
  // Funnel: signup -> program_activated -> workout_started -> workout_completed
  // Use AppEvent for funnel stages, with User.createdAt as fallback for signups

  // All downstream steps INNER JOIN "user" so we only count existing users
  // (prevents orphaned events/completions from inflating the funnel above 100%).
  const [signups, programActivated, workoutStarted, workoutCompleted] =
    await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT id)::bigint as count FROM "user"
      WHERE 1=1 ${ONLY_END_USERS}
    `,
      prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT e."userId")::bigint as count
      FROM "AppEvent" e
      INNER JOIN "user" u ON u.id = e."userId"
      WHERE e.event = 'program_activated'
      ${ONLY_END_USERS_ON_U}
    `,
      prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT e."userId")::bigint as count
      FROM "AppEvent" e
      INNER JOIN "user" u ON u.id = e."userId"
      WHERE e.event = 'workout_started'
      ${ONLY_END_USERS_ON_U}
    `,
      // Use WorkoutCompletion as source of truth for completed
      prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT wc."userId")::bigint as count
      FROM "WorkoutCompletion" wc
      INNER JOIN "user" u ON u.id = wc."userId"
      WHERE wc.status = 'completed'
      ${ONLY_END_USERS_ON_U}
    `,
    ])

  const steps = [
    { step: 'Signed Up', count: Number(signups[0].count) },
    { step: 'Activated Program', count: Number(programActivated[0].count) },
    { step: 'Started Workout', count: Number(workoutStarted[0].count) },
    { step: 'Completed Workout', count: Number(workoutCompleted[0].count) },
  ]

  const totalSignups = steps[0].count
  return steps.map((s, i) => ({
    ...s,
    conversionPct:
      i === 0
        ? 100
        : steps[i - 1].count > 0
          ? Math.round((s.count / steps[i - 1].count) * 100)
          : 0,
    overallPct:
      totalSignups > 0 ? Math.round((s.count / totalSignups) * 100) : 0,
  }))
}

async function getFeedbackVolume(): Promise<FeedbackVolume[]> {
  const weekStart = startOfWeek()

  // Use raw query to restrict to end-user feedback via subquery
  // (Feedback model has no user relation for Prisma-level filtering)
  const feedback = await prisma.$queryRaw<FeedbackVolume[]>`
    SELECT f.category, COUNT(*)::int as count
    FROM "Feedback" f
    WHERE f."createdAt" >= ${weekStart}
      AND f."userId" IN (
        SELECT id FROM "user" WHERE role = ${END_USER_ROLE}
      )
    GROUP BY f.category
    ORDER BY count DESC
  `

  return feedback
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
