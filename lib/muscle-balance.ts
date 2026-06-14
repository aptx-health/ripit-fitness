import type { Prisma, PrismaClient } from '@prisma/client'
import { ALL_FAUS, FAU_DISPLAY_NAMES, type FAUKey } from '@/lib/fau-volume'

export const DEFAULT_LOOKBACK_WORKOUTS = 8
export const DEFAULT_SECONDARY_WEIGHT = 0.5
export const MIN_TARGET_WEIGHT = 0
export const MAX_TARGET_WEIGHT = 2
export const TARGET_STEP = 0.05

export type MuscleBalanceTargets = Record<FAUKey, number>

export type MuscleBalanceSettingsDTO = {
  targets: MuscleBalanceTargets
  lookbackWorkouts: number
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
}

export type MuscleBalanceSnapshot = {
  settings: MuscleBalanceSettingsDTO
  lookback: {
    requestedWorkouts: number
    completedWorkouts: number
    totalEffectiveSets: number
  }
  items: MuscleBalanceItem[]
  neglected: MuscleBalanceItem[]
}

type CompletionForBalance = {
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
      includeSecondary: next.includeSecondary,
      secondaryWeight: next.secondaryWeight,
      excludeWarmups: next.excludeWarmups,
    },
    create: {
      userId,
      targets: next.targets,
      lookbackWorkouts: next.lookbackWorkouts,
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
  const completions = await prisma.workoutCompletion.findMany({
    where: {
      userId,
      status: 'completed',
      isArchived: false,
    },
    orderBy: { completedAt: 'desc' },
    take: settings.lookbackWorkouts,
    select: {
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

  return calculateMuscleBalanceSnapshot(settings, completions)
}

export function calculateMuscleBalanceSnapshot(
  settings: MuscleBalanceSettingsDTO,
  completions: CompletionForBalance[]
): MuscleBalanceSnapshot {
  const volume = ALL_FAUS.reduce((acc, fau) => {
    acc[fau] = 0
    return acc
  }, {} as MuscleBalanceTargets)

  for (const completion of completions) {
    for (const set of completion.loggedSets) {
      if (settings.excludeWarmups && set.isWarmup) continue
      const definition = set.exercise.exerciseDefinition
      for (const fau of definition.primaryFAUs) {
        if (isFAUKey(fau)) volume[fau] += 1
      }
      if (settings.includeSecondary) {
        for (const fau of definition.secondaryFAUs) {
          if (isFAUKey(fau)) volume[fau] += settings.secondaryWeight
        }
      }
    }
  }

  const targetTotal = ALL_FAUS.reduce(
    (sum, fau) => sum + Math.max(0, settings.targets[fau]),
    0
  )
  const safeTargetTotal = targetTotal > 0 ? targetTotal : ALL_FAUS.length
  const totalEffectiveSets = ALL_FAUS.reduce((sum, fau) => sum + volume[fau], 0)

  const items = ALL_FAUS.map((fau) => {
    const targetWeight =
      targetTotal > 0 ? settings.targets[fau] : getDefaultMuscleBalanceTargets()[fau]
    const targetShare = Math.max(0, targetWeight) / safeTargetTotal
    const actualSets = volume[fau]
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
    } satisfies MuscleBalanceItem
  }).sort((a, b) => b.deficitShare - a.deficitShare)

  return {
    settings,
    lookback: {
      requestedWorkouts: settings.lookbackWorkouts,
      completedWorkouts: completions.length,
      totalEffectiveSets,
    },
    items,
    neglected: items.filter((item) => item.status === 'neglected').slice(0, 5),
  }
}

export function updateMuscleBalanceSnapshotSettings(
  snapshot: MuscleBalanceSnapshot,
  settings: MuscleBalanceSettingsDTO
): MuscleBalanceSnapshot {
  const totalEffectiveSets = snapshot.lookback.totalEffectiveSets
  const targetTotal = ALL_FAUS.reduce(
    (sum, fau) => sum + Math.max(0, settings.targets[fau]),
    0
  )
  const safeTargetTotal = targetTotal > 0 ? targetTotal : ALL_FAUS.length
  const volumeByFau = snapshot.items.reduce((acc, item) => {
    acc[item.fau] = item.actualSets
    return acc
  }, {} as MuscleBalanceTargets)

  const items = ALL_FAUS.map((fau) => {
    const targetWeight =
      targetTotal > 0 ? settings.targets[fau] : getDefaultMuscleBalanceTargets()[fau]
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
    } satisfies MuscleBalanceItem
  }).sort((a, b) => b.deficitShare - a.deficitShare)

  return {
    settings,
    lookback: {
      ...snapshot.lookback,
      requestedWorkouts: settings.lookbackWorkouts,
      completedWorkouts: Math.min(
        snapshot.lookback.completedWorkouts,
        settings.lookbackWorkouts
      ),
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
