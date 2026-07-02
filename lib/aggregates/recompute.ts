/**
 * Orchestrator for the UserTrainingAggregates layer (issue #919).
 *
 * Two seams:
 *   - computeUserAggregates: fetches a user's qualifying history and runs the
 *     pure compute core, returning the aggregates WITHOUT persisting. This is
 *     the dry-run path #937 (TuningConfig + payload preview) needs.
 *   - recomputeUserAggregates: the thin persisting wrapper — calls the above
 *     and upserts the single per-user row. Full recompute every run (no
 *     incremental bookkeeping); idempotent for a fixed `now`.
 *
 * Called from the BullMQ aggregates worker on workout completion; safe to call
 * directly (integration tests do).
 */

import type { Prisma, PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'
import { computeAggregates, resolveAggregatesOptions } from './compute'
import type { AggregateSessionInput, AggregatesOptions, TrainingAggregates } from './types'

const QUALIFYING_STATUSES = ['completed', 'abandoned']

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue
}

/**
 * Trailing detail-fetch window (days). Must cover the rolling (7/14/28d) and
 * baseline (N complete Mon-Sun weeks) computations with margin for the current
 * partial week; all-time first/last/count are fetched separately and reach
 * beyond it. Derived from the resolved baseline width so a config override that
 * widens the baseline also widens the fetch.
 */
function detailWindowDays(opts: AggregatesOptions): number {
  return Math.max(35, opts.baselineWeeks * 7 + 14, opts.calibrationWindowDays + 7)
}

/**
 * Fetch a user's qualifying history and compute their aggregates in-memory.
 * Does NOT persist — see recomputeUserAggregates for the writing wrapper.
 */
export async function computeUserAggregates(
  prisma: PrismaClient,
  userId: string,
  now: Date = new Date(),
  options?: Partial<AggregatesOptions>
): Promise<TrainingAggregates> {
  const opts = resolveAggregatesOptions(options)
  const detailWindowStart = new Date(now.getTime() - detailWindowDays(opts) * 24 * 60 * 60 * 1000)

  // Detailed sessions in the trailing window: full set data + exercise tags.
  const detailCompletions = await prisma.workoutCompletion.findMany({
    where: {
      userId,
      isArchived: false,
      status: { in: QUALIFYING_STATUSES },
      completedAt: { gte: detailWindowStart, lte: now },
    },
    select: {
      completedAt: true,
      status: true,
      loggedSets: {
        select: {
          weight: true,
          weightUnit: true,
          reps: true,
          rpe: true,
          rir: true,
          isWarmup: true,
          exercise: {
            select: {
              exerciseDefinition: {
                select: { movementPattern: true, isBodyweight: true, primaryFAUs: true },
              },
            },
          },
        },
      },
    },
  })

  const detailSessions: AggregateSessionInput[] = detailCompletions
    .map((c) => ({
      completedAt: c.completedAt,
      status: c.status,
      sets: c.loggedSets.map((s) => ({
        weight: s.weight,
        weightUnit: s.weightUnit,
        reps: s.reps,
        rpe: s.rpe,
        rir: s.rir,
        isWarmup: s.isWarmup,
        movementPattern: s.exercise.exerciseDefinition.movementPattern,
        isBodyweight: s.exercise.exerciseDefinition.isBodyweight,
        primaryFAUs: s.exercise.exerciseDefinition.primaryFAUs,
      })),
    }))
    // Qualifying session = >= 1 non-warmup ("effective") set.
    .filter((s) => s.sets.some((set) => !set.isWarmup))

  // All-time qualifying-session summary (freshness + data maturity may reach
  // well beyond the detail window). Lightweight: one probe set per completion.
  const allTimeCompletions = await prisma.workoutCompletion.findMany({
    where: {
      userId,
      isArchived: false,
      status: { in: QUALIFYING_STATUSES },
      completedAt: { lte: now },
    },
    select: {
      completedAt: true,
      loggedSets: { where: { isWarmup: false }, select: { id: true }, take: 1 },
    },
  })
  const qualifyingTimes = allTimeCompletions
    .filter((c) => c.loggedSets.length > 0)
    .map((c) => c.completedAt.getTime())

  const firstSessionAt = qualifyingTimes.length ? new Date(Math.min(...qualifyingTimes)) : null
  const lastSessionAt = qualifyingTimes.length ? new Date(Math.max(...qualifyingTimes)) : null

  return computeAggregates(
    {
      now,
      detailSessions,
      allTime: {
        firstSessionAt,
        lastSessionAt,
        qualifyingSessionsTotal: qualifyingTimes.length,
      },
    },
    opts
  )
}

/**
 * Recompute and persist the aggregates row for a single user (the BullMQ
 * processor's thin wrapper). Returns the computed aggregates.
 */
export async function recomputeUserAggregates(
  prisma: PrismaClient,
  userId: string,
  now: Date = new Date(),
  options?: Partial<AggregatesOptions>
): Promise<TrainingAggregates> {
  const aggregates = await computeUserAggregates(prisma, userId, now, options)

  const row = {
    computedAt: aggregates.computedAt,
    sessionsLast7d: aggregates.sessionsLast7d,
    daysSinceAnySession: aggregates.daysSinceAnySession,
    lastSessionAt: aggregates.lastSessionAt,
    firstSessionAt: aggregates.firstSessionAt,
    qualifyingSessionsTotal: aggregates.qualifyingSessionsTotal,
    totalWeeklySetsBaseline: aggregates.totalWeeklySetsBaseline,
    acuteChronicRatio: aggregates.acuteChronicRatio,
    detrainingGapDays: aggregates.detrainingGapDays,
    dataMaturity: aggregates.dataMaturity,
    perFau: toJson(aggregates.perFau),
    perMovementCalibration: toJson(aggregates.perMovementCalibration),
  }

  await prisma.userTrainingAggregates.upsert({
    where: { userId },
    create: { userId, ...row },
    update: row,
  })

  logger.info(
    {
      userId,
      qualifyingSessions: aggregates.qualifyingSessionsTotal,
      dataMaturity: aggregates.dataMaturity,
      faus: aggregates.perFau.length,
      patterns: aggregates.perMovementCalibration.length,
    },
    'Recomputed user training aggregates'
  )

  return aggregates
}
