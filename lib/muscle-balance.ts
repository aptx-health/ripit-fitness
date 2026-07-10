import type { Prisma, PrismaClient } from '@prisma/client'
import { ALL_FAUS, FAU_DISPLAY_NAMES, type FAUKey } from '@/lib/fau-volume'

export const DEFAULT_LOOKBACK_WORKOUTS = 8
export const DEFAULT_LOOKBACK_DAYS = 14
export const MIN_LOOKBACK_DAYS = 1
export const MAX_LOOKBACK_DAYS = 365
export const DEFAULT_SECONDARY_WEIGHT = 0.5
export const MIN_TARGET_WEIGHT = 0
export const MAX_TARGET_WEIGHT = 2
export const TARGET_STEP = 0.05

const DAY_MS = 24 * 60 * 60 * 1000

// Weight of the recency signal when blending it into the neglected ordering.
// Kept small so it only reorders FAUs with near-equal deficits ("similar
// deficits, staler ranks first") rather than overriding real deficit gaps.
const RECENCY_BLEND_WEIGHT = 0.01

export type MuscleBalanceTargets = Record<FAUKey, number>

export type MuscleBalanceSettingsDTO = {
  targets: MuscleBalanceTargets
  lookbackWorkouts: number
  lookbackDays: number
  includeSecondary: boolean
  secondaryWeight: number
  excludeWarmups: boolean
}

export type MuscleBalanceItem = {
  fau: FAUKey
  label: string
  targetWeight: number
  targetShare: number
  actualSets: number
  actualShare: number
  deficitShare: number
  fulfillment: number
  status: 'neglected' | 'balanced' | 'over'
  // v2 additive fields (backward compatible). Null when the FAU has no
  // effective sets inside the lookback window (never trained / long staleness).
  lastTrainedDaysAgo: number | null
  // 0 = trained today, 1 = at/beyond the window edge (maximally stale).
  recencyScore: number
}

export type MuscleBalanceSnapshot = {
  settings: MuscleBalanceSettingsDTO
  lookback: {
    requestedWorkouts: number
    completedWorkouts: number
    totalEffectiveSets: number
    // v2 additive field: the days-based window actually applied.
    windowDays: number
  }
  items: MuscleBalanceItem[]
  neglected: MuscleBalanceItem[]
}

export type CompletionForBalance = {
  // Optional for read-compat with callers that don't provide it; when omitted
  // the completion is treated as in-window but contributes no recency signal.
  completedAt?: Date | null
  loggedSets: Array<{
    isWarmup: boolean
    exercise: {
      exerciseDefinition: {
        primaryFAUs: string[]
        secondaryFAUs: string[]
      }
    }
  }>
}

type FauRecency = {
  lastTrainedDaysAgo: number | null
  recencyScore: number
}

export function getDefaultMuscleBalanceTargets(): MuscleBalanceTargets {
  return ALL_FAUS.reduce((targets, fau) => {
    targets[fau] = 1
    return targets
  }, {} as MuscleBalanceTargets)
}

export function normalizeMuscleBalanceTargets(value: unknown): MuscleBalanceTargets {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  const defaults = getDefaultMuscleBalanceTargets()

  return ALL_FAUS.reduce((targets, fau) => {
    const raw = source[fau]
    const numeric = typeof raw === 'number' ? raw : Number(raw)
    targets[fau] = Number.isFinite(numeric)
      ? clamp(roundToStep(numeric), MIN_TARGET_WEIGHT, MAX_TARGET_WEIGHT)
      : defaults[fau]
    return targets
  }, {} as MuscleBalanceTargets)
}

export function normalizeMuscleBalanceSettings(
  settings:
    | {
        targets: Prisma.JsonValue
        lookbackWorkouts: number
        lookbackDays?: number | null
        includeSecondary: boolean
        secondaryWeight: number
        excludeWarmups: boolean
      }
    | null
    | undefined
): MuscleBalanceSettingsDTO {
  return {
    targets: normalizeMuscleBalanceTargets(settings?.targets),
    lookbackWorkouts: normalizeInteger(
      settings?.lookbackWorkouts,
      DEFAULT_LOOKBACK_WORKOUTS,
      1,
      52
    ),
    lookbackDays: normalizeInteger(
      settings?.lookbackDays,
      DEFAULT_LOOKBACK_DAYS,
      MIN_LOOKBACK_DAYS,
      MAX_LOOKBACK_DAYS
    ),
    includeSecondary: settings?.includeSecondary ?? true,
    secondaryWeight: normalizeNumber(
      settings?.secondaryWeight,
      DEFAULT_SECONDARY_WEIGHT,
      0,
      1
    ),
    excludeWarmups: settings?.excludeWarmups ?? true,
  }
}

export async function getOrCreateMuscleBalanceSettings(
  prisma: PrismaClient,
  userId: string
): Promise<MuscleBalanceSettingsDTO> {
  const defaults = getDefaultMuscleBalanceTargets()
  const settings = await prisma.userMuscleBalanceSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      targets: defaults,
      lookbackWorkouts: DEFAULT_LOOKBACK_WORKOUTS,
      lookbackDays: DEFAULT_LOOKBACK_DAYS,
      includeSecondary: true,
      secondaryWeight: DEFAULT_SECONDARY_WEIGHT,
      excludeWarmups: true,
    },
  })

  return normalizeMuscleBalanceSettings(settings)
}

export async function updateMuscleBalanceSettings(
  prisma: PrismaClient,
  userId: string,
  input: Partial<MuscleBalanceSettingsDTO>
): Promise<MuscleBalanceSettingsDTO> {
  const current = await getOrCreateMuscleBalanceSettings(prisma, userId)
  const next: MuscleBalanceSettingsDTO = {
    targets:
      input.targets !== undefined
        ? normalizeMuscleBalanceTargets(input.targets)
        : current.targets,
    lookbackWorkouts:
      input.lookbackWorkouts !== undefined
        ? normalizeInteger(input.lookbackWorkouts, current.lookbackWorkouts, 1, 52)
        : current.lookbackWorkouts,
    lookbackDays:
      input.lookbackDays !== undefined
        ? normalizeInteger(
            input.lookbackDays,
            current.lookbackDays,
            MIN_LOOKBACK_DAYS,
            MAX_LOOKBACK_DAYS
          )
        : current.lookbackDays,
    includeSecondary: input.includeSecondary ?? current.includeSecondary,
    secondaryWeight:
      input.secondaryWeight !== undefined
        ? normalizeNumber(input.secondaryWeight, current.secondaryWeight, 0, 1)
        : current.secondaryWeight,
    excludeWarmups: input.excludeWarmups ?? current.excludeWarmups,
  }

  const settings = await prisma.userMuscleBalanceSettings.upsert({
    where: { userId },
    update: {
      targets: next.targets,
      lookbackWorkouts: next.lookbackWorkouts,
      lookbackDays: next.lookbackDays,
      includeSecondary: next.includeSecondary,
      secondaryWeight: next.secondaryWeight,
      excludeWarmups: next.excludeWarmups,
    },
    create: {
      userId,
      targets: next.targets,
      lookbackWorkouts: next.lookbackWorkouts,
      lookbackDays: next.lookbackDays,
      includeSecondary: next.includeSecondary,
      secondaryWeight: next.secondaryWeight,
      excludeWarmups: next.excludeWarmups,
    },
  })

  return normalizeMuscleBalanceSettings(settings)
}

export async function getMuscleBalanceSnapshot(
  prisma: PrismaClient,
  userId: string
): Promise<MuscleBalanceSnapshot> {
  const settings = await getOrCreateMuscleBalanceSettings(prisma, userId)
  const now = new Date()
  const windowStart = new Date(now.getTime() - settings.lookbackDays * DAY_MS)
  const completions = await prisma.workoutCompletion.findMany({
    where: {
      userId,
      status: 'completed',
      isArchived: false,
      completedAt: { gte: windowStart },
    },
    orderBy: { completedAt: 'desc' },
    select: {
      completedAt: true,
      loggedSets: {
        select: {
          isWarmup: true,
          exercise: {
            select: {
              exerciseDefinition: {
                select: {
                  primaryFAUs: true,
                  secondaryFAUs: true,
                },
              },
            },
          },
        },
      },
    },
  })

  return calculateMuscleBalanceSnapshot(settings, completions, now)
}

export function calculateMuscleBalanceSnapshot(
  settings: MuscleBalanceSettingsDTO,
  completions: CompletionForBalance[],
  now: Date = new Date()
): MuscleBalanceSnapshot {
  const cutoffMs = now.getTime() - settings.lookbackDays * DAY_MS
  // Keep completions inside the days-based window. Completions without a
  // completedAt (legacy/synthetic callers) are treated as in-window.
  const inWindow = completions.filter(
    (completion) => !completion.completedAt || completion.completedAt.getTime() >= cutoffMs
  )

  const volume = ALL_FAUS.reduce((acc, fau) => {
    acc[fau] = 0
    return acc
  }, {} as MuscleBalanceTargets)
  const lastTrainedByFau: Partial<Record<FAUKey, number>> = {}

  for (const completion of inWindow) {
    const touched = new Set<FAUKey>()
    for (const set of completion.loggedSets) {
      if (settings.excludeWarmups && set.isWarmup) continue
      const definition = set.exercise.exerciseDefinition
      for (const fau of definition.primaryFAUs) {
        if (isFAUKey(fau)) {
          volume[fau] += 1
          touched.add(fau)
        }
      }
      if (settings.includeSecondary) {
        for (const fau of definition.secondaryFAUs) {
          if (isFAUKey(fau)) {
            volume[fau] += settings.secondaryWeight
            touched.add(fau)
          }
        }
      }
    }

    const completedAtMs = completion.completedAt?.getTime()
    if (completedAtMs !== undefined) {
      for (const fau of touched) {
        const prev = lastTrainedByFau[fau]
        if (prev === undefined || completedAtMs > prev) {
          lastTrainedByFau[fau] = completedAtMs
        }
      }
    }
  }

  const recencyByFau = ALL_FAUS.reduce((acc, fau) => {
    acc[fau] = computeRecency(lastTrainedByFau[fau], now, settings.lookbackDays)
    return acc
  }, {} as Record<FAUKey, FauRecency>)

  const totalEffectiveSets = ALL_FAUS.reduce((sum, fau) => sum + volume[fau], 0)
  const items = buildBalanceItems(settings, volume, recencyByFau, totalEffectiveSets)

  return {
    settings,
    lookback: {
      requestedWorkouts: settings.lookbackWorkouts,
      completedWorkouts: inWindow.length,
      totalEffectiveSets,
      windowDays: settings.lookbackDays,
    },
    items,
    neglected: items.filter((item) => item.status === 'neglected').slice(0, 5),
  }
}

function computeRecency(
  lastTrainedMs: number | undefined,
  now: Date,
  lookbackDays: number
): FauRecency {
  if (lastTrainedMs === undefined) {
    // Never trained inside the window: maximally stale.
    return { lastTrainedDaysAgo: null, recencyScore: 1 }
  }
  const daysAgo = Math.max(0, Math.floor((now.getTime() - lastTrainedMs) / DAY_MS))
  const recencyScore = lookbackDays > 0 ? clamp(daysAgo / lookbackDays, 0, 1) : 0
  return { lastTrainedDaysAgo: daysAgo, recencyScore }
}

// Builds the per-FAU items and applies the deficit-first, recency-blended
// ordering. A small recency weight only reorders FAUs with near-equal deficits
// (staler ranks first); a FAU with zero in-window sets carries both the largest
// deficit and maximal staleness, so it sorts to the top.
function buildBalanceItems(
  settings: MuscleBalanceSettingsDTO,
  volumeByFau: MuscleBalanceTargets,
  recencyByFau: Record<FAUKey, FauRecency>,
  totalEffectiveSets: number
): MuscleBalanceItem[] {
  const targetTotal = ALL_FAUS.reduce(
    (sum, fau) => sum + Math.max(0, settings.targets[fau]),
    0
  )
  const safeTargetTotal = targetTotal > 0 ? targetTotal : ALL_FAUS.length
  const defaults = getDefaultMuscleBalanceTargets()

  return ALL_FAUS.map((fau) => {
    const targetWeight = targetTotal > 0 ? settings.targets[fau] : defaults[fau]
    const targetShare = Math.max(0, targetWeight) / safeTargetTotal
    const actualSets = volumeByFau[fau] ?? 0
    const actualShare = totalEffectiveSets > 0 ? actualSets / totalEffectiveSets : 0
    const deficitShare = targetShare - actualShare
    const fulfillment =
      targetShare > 0 ? Math.min(actualShare / targetShare, 9.99) : actualSets > 0 ? 9.99 : 1
    const status =
      targetShare === 0 || Math.abs(deficitShare) <= 0.02
        ? 'balanced'
        : deficitShare > 0
          ? 'neglected'
          : 'over'
    const recency = recencyByFau[fau] ?? { lastTrainedDaysAgo: null, recencyScore: 1 }

    return {
      fau,
      label: FAU_DISPLAY_NAMES[fau],
      targetWeight,
      targetShare,
      actualSets,
      actualShare,
      deficitShare,
      fulfillment,
      status,
      lastTrainedDaysAgo: recency.lastTrainedDaysAgo,
      recencyScore: recency.recencyScore,
    } satisfies MuscleBalanceItem
  }).sort((a, b) => {
    const scoreDiff = neglectSortScore(b) - neglectSortScore(a)
    if (scoreDiff !== 0) return scoreDiff
    // Deterministic final tiebreak.
    return a.fau.localeCompare(b.fau)
  })
}

// Blended sort key: deficit dominates, recency breaks near-ties.
function neglectSortScore(item: MuscleBalanceItem): number {
  return item.deficitShare + RECENCY_BLEND_WEIGHT * item.recencyScore
}

export function updateMuscleBalanceSnapshotSettings(
  snapshot: MuscleBalanceSnapshot,
  settings: MuscleBalanceSettingsDTO
): MuscleBalanceSnapshot {
  const totalEffectiveSets = snapshot.lookback.totalEffectiveSets
  const volumeByFau = snapshot.items.reduce((acc, item) => {
    acc[item.fau] = item.actualSets
    return acc
  }, {} as MuscleBalanceTargets)
  // Recency is derived from logged-set dates, which this client-side recompute
  // can't re-window; carry the previously computed values forward.
  const recencyByFau = ALL_FAUS.reduce((acc, fau) => {
    const item = snapshot.items.find((entry) => entry.fau === fau)
    acc[fau] = {
      lastTrainedDaysAgo: item?.lastTrainedDaysAgo ?? null,
      recencyScore: item?.recencyScore ?? 1,
    }
    return acc
  }, {} as Record<FAUKey, FauRecency>)

  const items = buildBalanceItems(settings, volumeByFau, recencyByFau, totalEffectiveSets)

  return {
    settings,
    lookback: {
      ...snapshot.lookback,
      requestedWorkouts: settings.lookbackWorkouts,
      completedWorkouts: snapshot.lookback.completedWorkouts,
      windowDays: settings.lookbackDays,
    },
    items,
    neglected: items.filter((item) => item.status === 'neglected').slice(0, 5),
  }
}

export function isFAUKey(value: string): value is FAUKey {
  return (ALL_FAUS as readonly string[]).includes(value)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundToStep(value: number): number {
  return Math.round(value / TARGET_STEP) * TARGET_STEP
}

function normalizeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? clamp(numeric, min, max) : fallback
}

function normalizeInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(numeric) ? clamp(numeric, min, max) : fallback
}
