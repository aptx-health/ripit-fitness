import { Prisma, type PrismaClient } from '@prisma/client'

import { prisma as defaultPrisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * Alias so tests can pass a Testcontainers-bound PrismaClient without
 * going through the `@/lib/db` singleton (which can't be rebound once
 * its module has loaded).
 */
type Db = PrismaClient

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
const ONLY_END_USERS_ON_U = Prisma.sql`AND u.role = ${END_USER_ROLE}::"UserRole"`

/** SQL fragment: WHERE clause to restrict to end users on "user" table directly */
const ONLY_END_USERS = Prisma.sql`AND role = ${END_USER_ROLE}::"UserRole"`

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

export interface SignupSourceBreakdown {
  /** 'organic' | 'qr' | 'oauth' | 'unknown' (legacy signups w/o source prop) */
  source: string
  count: number
}

export interface PerGymSignup {
  gymSlug: string
  signupCount: number
  /** Of the signups attributed to this gym, how many completed a workout */
  firstWorkoutCount: number
  /** firstWorkoutCount / signupCount as a 0–100 percent */
  firstWorkoutPct: number
}

export interface QrFunnelStep {
  step: string
  count: number
  /** Step-to-step conversion: this step vs. previous step (0 for first step) */
  conversionPct: number
}

export interface SignupAttributionMetrics {
  sourceBreakdown: SignupSourceBreakdown[]
  perGym: PerGymSignup[]
  qrFunnel: QrFunnelStep[]
  /** Number of days the breakdown covers (currently the most recent 30 days). */
  windowDays: number
}

export interface PostSessionMetrics {
  avgRatingThisWeek: number | null
  avgRatingLastWeek: number | null
  sampleSizeThisWeek: number
  sampleSizeLastWeek: number
  ratingDistribution: Record<number, number>
  topRefinements: Array<{ refinement: string; count: number }>
  fiveStarPct: number
  totalRated: number
}

export interface AnalyticsData {
  usage: UsageMetrics
  retention: RetentionMetrics
  funnel: FunnelStep[]
  feedbackVolume: FeedbackVolume[]
  signupAttribution: SignupAttributionMetrics
  postSession: PostSessionMetrics
  generatedAt: string
}

// ---- Queries ----

async function getUsageMetrics(db: Db): Promise<UsageMetrics> {
  const weekStart = startOfWeek()
  const lastWeekStart = weeksAgo(1)

  const fourWeeksAgo = weeksAgo(4)

  // Two batches to stay within PgBouncer's connection_limit=5.
  // Batch 1: user counts + this/last week completions (4 queries)
  const [totalUsers, newSignups, thisWeek, lastWeek] = await Promise.all([
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "user"
      WHERE 1=1 ${ONLY_END_USERS}
    `,
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "user"
      WHERE "createdAt" >= ${weekStart} ${ONLY_END_USERS}
    `,
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count
      FROM "WorkoutCompletion" wc
      INNER JOIN "user" u ON u.id = wc."userId"
      WHERE wc.status = 'completed' AND wc."completedAt" >= ${weekStart}
      ${ONLY_END_USERS_ON_U}
    `,
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count
      FROM "WorkoutCompletion" wc
      INNER JOIN "user" u ON u.id = wc."userId"
      WHERE wc.status = 'completed'
        AND wc."completedAt" >= ${lastWeekStart}
        AND wc."completedAt" < ${weekStart}
      ${ONLY_END_USERS_ON_U}
    `,
  ])

  // Batch 2: all-time counts + per-user recent completions (3 queries)
  const [allTime, totalStartedRows, recentRows] = await Promise.all([
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count
      FROM "WorkoutCompletion" wc
      INNER JOIN "user" u ON u.id = wc."userId"
      WHERE wc.status = 'completed'
      ${ONLY_END_USERS_ON_U}
    `,
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count
      FROM "WorkoutCompletion" wc
      INNER JOIN "user" u ON u.id = wc."userId"
      WHERE wc.status IN ('completed', 'abandoned')
      ${ONLY_END_USERS_ON_U}
    `,
    db.$queryRaw<Array<{ userId: string; cnt: bigint }>>`
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

async function getRetentionMetrics(db: Db): Promise<RetentionMetrics> {
  // DAU / WAU / MAU in parallel.
  // INNER JOIN on "user" so we only count users that still exist
  // (guards against orphaned WorkoutCompletion rows from deleted/recreated users).
  const dayStart = daysAgo(0)
  const weekStart = daysAgo(7)
  const monthStart = daysAgo(30)
  const [dauRows, wauRows, mauRows] = await Promise.all([
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT wc."userId")::bigint as count
      FROM "WorkoutCompletion" wc
      INNER JOIN "user" u ON u.id = wc."userId"
      WHERE wc.status = 'completed' AND wc."completedAt" >= ${dayStart}
      ${ONLY_END_USERS_ON_U}
    `,
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT wc."userId")::bigint as count
      FROM "WorkoutCompletion" wc
      INNER JOIN "user" u ON u.id = wc."userId"
      WHERE wc.status = 'completed' AND wc."completedAt" >= ${weekStart}
      ${ONLY_END_USERS_ON_U}
    `,
    db.$queryRaw<[{ count: bigint }]>`
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

  // 7-day retention cohorts: single query computes all 8 weeks at once.
  // Each row returns the week offset (1–8), signup count, and count of those
  // users who completed a workout in the last 7 days.
  const cohortStart = weeksAgo(8)
  const recentCutoff = daysAgo(7)
  const cohortRows = await db.$queryRaw<
    Array<{ week_offset: number; signup_count: bigint; active_count: bigint }>
  >`
    WITH week_buckets AS (
      SELECT generate_series(1, 8) AS week_offset
    ),
    cohort_signups AS (
      SELECT
        wb.week_offset,
        u.id as user_id
      FROM week_buckets wb
      INNER JOIN "user" u
        ON u."createdAt" >= (${cohortStart} + (wb.week_offset - 1) * INTERVAL '7 days')
        AND u."createdAt" < (${cohortStart} + wb.week_offset * INTERVAL '7 days')
      WHERE u.role = ${END_USER_ROLE}::"UserRole"
    )
    SELECT
      cs.week_offset,
      COUNT(DISTINCT cs.user_id)::bigint AS signup_count,
      COUNT(DISTINCT wc."userId")::bigint AS active_count
    FROM cohort_signups cs
    LEFT JOIN "WorkoutCompletion" wc
      ON wc."userId" = cs.user_id
      AND wc.status = 'completed'
      AND wc."completedAt" >= ${recentCutoff}
    GROUP BY cs.week_offset
    ORDER BY cs.week_offset ASC
  `

  // Build lookup and fill in all 8 weeks (missing rows = 0 signups)
  const cohortMap = new Map(
    cohortRows.map((r) => [r.week_offset, r])
  )
  const cohorts: RetentionCohort[] = []
  for (let w = 1; w <= 8; w++) {
    const row = cohortMap.get(w)
    const signupCount = row ? Number(row.signup_count) : 0
    const activeCount = row ? Number(row.active_count) : 0
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
  const timeToFirst = await db.$queryRaw<
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
  const dropouts = await db.$queryRaw<DropoutEntry[]>`
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

async function getFunnelMetrics(db: Db): Promise<FunnelStep[]> {
  // Funnel: signup -> program_activated -> workout_started -> workout_completed
  // Use AppEvent for funnel stages, with User.createdAt as fallback for signups

  // All downstream steps INNER JOIN "user" so we only count existing users
  // (prevents orphaned events/completions from inflating the funnel above 100%).
  const [signups, programActivated, workoutStarted, workoutCompleted] =
    await Promise.all([
      db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT id)::bigint as count FROM "user"
      WHERE 1=1 ${ONLY_END_USERS}
    `,
      db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT e."userId")::bigint as count
      FROM "AppEvent" e
      INNER JOIN "user" u ON u.id = e."userId"
      WHERE e.event = 'program_activated'
      ${ONLY_END_USERS_ON_U}
    `,
      db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT e."userId")::bigint as count
      FROM "AppEvent" e
      INNER JOIN "user" u ON u.id = e."userId"
      WHERE e.event = 'workout_started'
      ${ONLY_END_USERS_ON_U}
    `,
      // Use WorkoutCompletion as source of truth for completed
      db.$queryRaw<[{ count: bigint }]>`
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

async function getFeedbackVolume(db: Db): Promise<FeedbackVolume[]> {
  const weekStart = startOfWeek()

  // Use raw query to restrict to end-user feedback via subquery
  // (Feedback model has no user relation for Prisma-level filtering)
  const feedback = await db.$queryRaw<FeedbackVolume[]>`
    SELECT f.category, COUNT(*)::int as count
    FROM "Feedback" f
    WHERE f."createdAt" >= ${weekStart}
      AND f."userId" IN (
        SELECT id FROM "user" WHERE role = ${END_USER_ROLE}::"UserRole"
      )
    GROUP BY f.category
    ORDER BY count DESC
  `

  return feedback
}

async function getSignupAttributionMetrics(
  db: Db
): Promise<SignupAttributionMetrics> {
  const windowDays = 30
  const windowStart = daysAgo(windowDays)

  // All 5 attribution queries are independent — run in parallel.
  const [sourceRows, gymRows, landingViewed, signupStarted, signupCompleted] =
    await Promise.all([
      // 1. Source breakdown. Legacy signup_completed events pre-#490 have null
      //    properties — coalesce to 'unknown' so the breakdown still totals up.
      db.$queryRaw<Array<{ source: string; count: bigint }>>`
        SELECT
          COALESCE(NULLIF(e.properties->>'source', ''), 'unknown') as source,
          COUNT(DISTINCT e."userId")::bigint as count
        FROM "AppEvent" e
        INNER JOIN "user" u ON u.id = e."userId"
        WHERE e.event = 'signup_completed'
          AND e."createdAt" >= ${windowStart}
          ${ONLY_END_USERS_ON_U}
        GROUP BY 1
        ORDER BY count DESC
      `,
      // 2. Per-gym signups + conversion to first workout.
      db.$queryRaw<
        Array<{ gymSlug: string; signupCount: bigint; firstWorkoutCount: bigint }>
      >`
        WITH gym_signups AS (
          SELECT
            e.properties->>'gymSlug' as "gymSlug",
            e."userId" as "userId"
          FROM "AppEvent" e
          INNER JOIN "user" u ON u.id = e."userId"
          WHERE e.event = 'signup_completed'
            AND e."createdAt" >= ${windowStart}
            AND e.properties->>'gymSlug' IS NOT NULL
            AND e.properties->>'gymSlug' <> ''
            ${ONLY_END_USERS_ON_U}
        )
        SELECT
          gs."gymSlug" as "gymSlug",
          COUNT(DISTINCT gs."userId")::bigint as "signupCount",
          COUNT(DISTINCT wc."userId")::bigint as "firstWorkoutCount"
        FROM gym_signups gs
        LEFT JOIN "WorkoutCompletion" wc
          ON wc."userId" = gs."userId"
          AND wc.status = 'completed'
        GROUP BY gs."gymSlug"
        ORDER BY "signupCount" DESC, gs."gymSlug" ASC
      `,
      // 3. QR funnel: qr_landing_viewed → signup_started (source='qr') → signup_completed (source='qr')
      db.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT e."userId")::bigint as count
        FROM "AppEvent" e
        INNER JOIN "user" u ON u.id = e."userId"
        WHERE e.event = 'qr_landing_viewed'
          AND e."createdAt" >= ${windowStart}
          ${ONLY_END_USERS_ON_U}
      `,
      db.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT e."userId")::bigint as count
        FROM "AppEvent" e
        INNER JOIN "user" u ON u.id = e."userId"
        WHERE e.event = 'signup_started'
          AND e.properties->>'source' = 'qr'
          AND e."createdAt" >= ${windowStart}
          ${ONLY_END_USERS_ON_U}
      `,
      db.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT e."userId")::bigint as count
        FROM "AppEvent" e
        INNER JOIN "user" u ON u.id = e."userId"
        WHERE e.event = 'signup_completed'
          AND e.properties->>'source' = 'qr'
          AND e."createdAt" >= ${windowStart}
          ${ONLY_END_USERS_ON_U}
      `,
    ])

  const sourceBreakdown: SignupSourceBreakdown[] = sourceRows.map((r) => ({
    source: r.source,
    count: Number(r.count),
  }))

  const perGym: PerGymSignup[] = gymRows.map((r) => {
    const signupCount = Number(r.signupCount)
    const firstWorkoutCount = Number(r.firstWorkoutCount)
    return {
      gymSlug: r.gymSlug,
      signupCount,
      firstWorkoutCount,
      firstWorkoutPct:
        signupCount > 0
          ? Math.round((firstWorkoutCount / signupCount) * 100)
          : 0,
    }
  })

  const qrSteps = [
    { step: 'QR Landing Viewed', count: Number(landingViewed[0].count) },
    { step: 'Signup Started', count: Number(signupStarted[0].count) },
    { step: 'Signup Completed', count: Number(signupCompleted[0].count) },
  ]
  const qrFunnel: QrFunnelStep[] = qrSteps.map((s, i) => ({
    ...s,
    conversionPct:
      i === 0
        ? 0
        : qrSteps[i - 1].count > 0
          ? Math.round((s.count / qrSteps[i - 1].count) * 100)
          : 0,
  }))

  return { sourceBreakdown, perGym, qrFunnel, windowDays }
}

async function getPostSessionMetrics(db: Db): Promise<PostSessionMetrics> {
  const weekStart = startOfWeek()
  const lastWeekStart = weeksAgo(1)

  const [thisWeekAvg, lastWeekAvg, distribution, refinements] = await Promise.all([
    db.$queryRaw<[{ avg: number | null; count: bigint }]>`
      SELECT AVG(rating) as avg, COUNT(*)::bigint as count
      FROM "Feedback"
      WHERE category = 'post_session' AND rating IS NOT NULL
        AND "createdAt" >= ${weekStart}
    `,
    db.$queryRaw<[{ avg: number | null; count: bigint }]>`
      SELECT AVG(rating) as avg, COUNT(*)::bigint as count
      FROM "Feedback"
      WHERE category = 'post_session' AND rating IS NOT NULL
        AND "createdAt" >= ${lastWeekStart} AND "createdAt" < ${weekStart}
    `,
    db.$queryRaw<Array<{ rating: number; count: bigint }>>`
      SELECT rating, COUNT(*)::bigint as count
      FROM "Feedback"
      WHERE category = 'post_session' AND rating IS NOT NULL
      GROUP BY rating
      ORDER BY rating ASC
    `,
    db.$queryRaw<Array<{ refinement: string; count: bigint }>>`
      SELECT unnest(refinements) as refinement, COUNT(*)::bigint as count
      FROM "Feedback"
      WHERE category = 'post_session' AND array_length(refinements, 1) > 0
      GROUP BY refinement
      ORDER BY count DESC
    `,
  ])

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let totalRated = 0
  for (const row of distribution) {
    if (row.rating >= 1 && row.rating <= 5) {
      const cnt = Number(row.count)
      ratingDistribution[row.rating] = cnt
      totalRated += cnt
    }
  }

  const fiveStarCount = ratingDistribution[5]
  const fiveStarPct = totalRated > 0 ? Math.round((fiveStarCount / totalRated) * 100) : 0

  return {
    avgRatingThisWeek: thisWeekAvg[0].avg ? Math.round(Number(thisWeekAvg[0].avg) * 10) / 10 : null,
    avgRatingLastWeek: lastWeekAvg[0].avg ? Math.round(Number(lastWeekAvg[0].avg) * 10) / 10 : null,
    sampleSizeThisWeek: Number(thisWeekAvg[0].count),
    sampleSizeLastWeek: Number(lastWeekAvg[0].count),
    ratingDistribution,
    topRefinements: refinements.map((r) => ({
      refinement: r.refinement,
      count: Number(r.count),
    })),
    fiveStarPct,
    totalRated,
  }
}

// ---- Main ----

export async function getAnalyticsData(
  db: Db = defaultPrisma,
): Promise<AnalyticsData> {
  try {
    // Run sequentially to stay within PgBouncer's connection_limit=5.
    // Each function batches its queries to max 5 concurrent. Running all 6 in
    // Promise.all would create ~20 concurrent queries that exhaust the pool
    // and cause Prisma P2024 timeouts.
    const usage = await getUsageMetrics(db)
    const retention = await getRetentionMetrics(db)
    const funnel = await getFunnelMetrics(db)
    const feedbackVolume = await getFeedbackVolume(db)
    const signupAttribution = await getSignupAttributionMetrics(db)
    const postSession = await getPostSessionMetrics(db)

    return {
      usage,
      retention,
      funnel,
      feedbackVolume,
      signupAttribution,
      postSession,
      generatedAt: new Date().toISOString(),
    }
  } catch (error) {
    logger.error({ error, context: 'analytics-queries' }, 'Failed to fetch analytics data')
    throw error
  }
}
