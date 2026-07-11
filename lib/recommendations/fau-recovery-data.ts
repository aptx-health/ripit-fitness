/**
 * Server-side assembler for the recovery-aware FAU ranking (#963).
 *
 * Bridges three data sources into the pure `scoreFaus` scorer and returns a
 * serializable ranking the picker consumes for its "Recovery-aware" sort:
 *   - the #962 muscle-balance snapshot  -> deficitShare + lastTrainedDaysAgo
 *   - UserTrainingAggregates.perFau     -> lastHeavyDaysAgo + detraining gap
 *   - recent completions' sessionRpe    -> which FAUs were just hammered (live)
 *
 * Everything degrades gracefully: a missing/cold-start aggregates row simply
 * drops the heavy-staleness and comeback signals; the recovery penalty is driven
 * by live completions so it works regardless of aggregates freshness. The picker
 * still gets a full ranking (which collapses to the plain deficit+staleness sort
 * when nothing else is available). This never throws — on any read failure it
 * logs and returns the deficit-only ranking.
 */

import type { PrismaClient } from '@prisma/client'
import type { PerFauAggregate } from '@/lib/aggregates/types'
import type { FAUKey } from '@/lib/fau-volume'
import { logger } from '@/lib/logger'
import { isFAUKey, type MuscleBalanceSnapshot } from '@/lib/muscle-balance'
import { loadTuningConfig } from '@/lib/tuning/store'
import {
  DEFAULT_FAU_STALENESS_WEIGHT,
  type FauNeed,
  type FauScoreInput,
  type FauScoreWeights,
  scoreFaus,
} from './fau-score'

const HOUR_MS = 60 * 60 * 1000

/** Serializable per-FAU recovery ranking passed to the picker (sorted, need desc). */
export type FauRecoveryRanking = FauNeed[]

/**
 * Build the recovery-aware ranking for a user from an already-computed
 * muscle-balance snapshot. Returns null only when the snapshot has no items
 * (nothing to rank).
 */
export async function getFauRecoveryRanking(
  prisma: PrismaClient,
  userId: string,
  snapshot: MuscleBalanceSnapshot
): Promise<FauRecoveryRanking | null> {
  if (snapshot.items.length === 0) return null

  const deficitOnly = (): FauRecoveryRanking =>
    scoreFaus(
      snapshot.items.map((item) => ({
        fau: item.fau,
        deficitShare: item.deficitShare,
        lastTrainedDaysAgo: item.lastTrainedDaysAgo,
      })),
      { weights: DEFICIT_ONLY_WEIGHTS }
    )

  try {
    const config = await loadTuningConfig(prisma)
    const weights: FauScoreWeights = {
      stalenessWeight: config.fauStalenessWeight,
      heavyStalenessWeight: config.fauHeavyStalenessWeight,
      recoveryPenaltyWeight: config.fauRecoveryPenaltyWeight,
    }

    const [aggregates, hammered] = await Promise.all([
      prisma.userTrainingAggregates.findUnique({
        where: { userId },
        select: { perFau: true, detrainingGapDays: true, dataMaturity: true },
      }),
      config.fauRecoveryPenaltyWeight > 0
        ? getRecentlyHammeredFaus(
            prisma,
            userId,
            config.fauRecoveryWindowHours,
            config.fauRecoveryRpeCutoff
          )
        : Promise.resolve(new Set<FAUKey>()),
    ])

    // Aggregates power the heavy-staleness + comeback signals; suppress at cold
    // start where they carry little confidence.
    const useAggregates = aggregates != null && aggregates.dataMaturity !== 'cold_start'
    const heavyByFau = useAggregates
      ? indexHeavyStaleness(aggregates.perFau)
      : null
    const comebackMode = useAggregates && aggregates.detrainingGapDays != null

    const inputs: FauScoreInput[] = snapshot.items.map((item) => ({
      fau: item.fau,
      deficitShare: item.deficitShare,
      lastTrainedDaysAgo: item.lastTrainedDaysAgo,
      // undefined keeps the heavy term off entirely; null = present-but-never-heavy.
      lastHeavyDaysAgo: heavyByFau ? (heavyByFau.get(item.fau) ?? null) : undefined,
      recentlyHammered: hammered.has(item.fau),
    }))

    return scoreFaus(inputs, { weights, comebackMode })
  } catch (error) {
    logger.warn({ error, userId }, 'Recovery-aware FAU ranking failed; using deficit-only sort')
    return deficitOnly()
  }
}

// Fallback weights when config load fails: keep staleness (so ties break like
// the neglected sort) but zero the aggregates-only terms we couldn't source.
const DEFICIT_ONLY_WEIGHTS: FauScoreWeights = {
  stalenessWeight: DEFAULT_FAU_STALENESS_WEIGHT,
  heavyStalenessWeight: 0,
  recoveryPenaltyWeight: 0,
}

/** Map FAU -> last_heavy_days_ago from the persisted perFau JSON blob. */
function indexHeavyStaleness(perFauJson: unknown): Map<FAUKey, number | null> {
  const map = new Map<FAUKey, number | null>()
  if (!Array.isArray(perFauJson)) return map
  for (const entry of perFauJson as PerFauAggregate[]) {
    if (entry && typeof entry.fau === 'string' && isFAUKey(entry.fau)) {
      map.set(entry.fau, entry.last_heavy_days_ago ?? null)
    }
  }
  return map
}

/**
 * FAUs trained inside the recovery window in a session logged at/above the RPE
 * cutoff. Attribution uses primary + secondary FAUs of non-warmup sets.
 */
async function getRecentlyHammeredFaus(
  prisma: PrismaClient,
  userId: string,
  windowHours: number,
  rpeCutoff: number
): Promise<Set<FAUKey>> {
  const hammered = new Set<FAUKey>()
  if (windowHours <= 0) return hammered

  const cutoff = new Date(Date.now() - windowHours * HOUR_MS)
  const completions = await prisma.workoutCompletion.findMany({
    where: {
      userId,
      status: 'completed',
      isArchived: false,
      completedAt: { gte: cutoff },
      sessionRpe: { gte: rpeCutoff },
    },
    select: {
      loggedSets: {
        select: {
          isWarmup: true,
          exercise: {
            select: {
              exerciseDefinition: {
                select: { primaryFAUs: true, secondaryFAUs: true },
              },
            },
          },
        },
      },
    },
  })

  for (const completion of completions) {
    for (const set of completion.loggedSets) {
      if (set.isWarmup) continue
      const def = set.exercise.exerciseDefinition
      for (const fau of [...def.primaryFAUs, ...def.secondaryFAUs]) {
        if (isFAUKey(fau)) hammered.add(fau)
      }
    }
  }

  return hammered
}
