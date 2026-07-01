import type { Prisma, PrismaClient } from '@prisma/client'
import {
  getDefaultMuscleBalanceTargets,
  normalizeMuscleBalanceTargets,
  type MuscleBalanceTargets,
} from '@/lib/muscle-balance'

export const INTENSITY_PREFERENCES = [
  'hypertrophy',
  'strength',
  'balanced',
] as const
export type IntensityPreference = (typeof INTENSITY_PREFERENCES)[number]

export const MAX_GOAL_SENTENCES = 10
export const MAX_GOAL_SENTENCE_LENGTH = 280
export const MAX_WEEKLY_INTENTS = 10
export const MAX_WEEKLY_INTENT_LENGTH = 280
export const MAX_EQUIPMENT_ITEMS = 32
export const MAX_BANNED_EXERCISE_IDS = 500

export type UserTrainingProfileDTO = {
  goalSentences: string[]
  weeklyIntent: string[]
  equipmentAvailable: string[]
  bannedExerciseIds: string[]
  ratioTargets: MuscleBalanceTargets
  defaultIntensityPreference: IntensityPreference | null
}

export function normalizeIntensityPreference(
  value: unknown
): IntensityPreference | null {
  if (typeof value !== 'string') return null
  return (INTENSITY_PREFERENCES as readonly string[]).includes(value)
    ? (value as IntensityPreference)
    : null
}

function normalizeStringList(
  value: unknown,
  maxItems: number,
  maxLength: number
): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of value) {
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim()
    if (!trimmed) continue
    const truncated = trimmed.slice(0, maxLength)
    if (seen.has(truncated)) continue
    seen.add(truncated)
    result.push(truncated)
    if (result.length >= maxItems) break
  }
  return result
}

export function normalizeUserTrainingProfile(
  profile:
    | {
        goalSentences: string[]
        weeklyIntent: string[]
        equipmentAvailable: string[]
        bannedExerciseIds: string[]
        ratioTargets: Prisma.JsonValue
        defaultIntensityPreference: string | null
      }
    | null
    | undefined
): UserTrainingProfileDTO {
  return {
    goalSentences: normalizeStringList(
      profile?.goalSentences,
      MAX_GOAL_SENTENCES,
      MAX_GOAL_SENTENCE_LENGTH
    ),
    weeklyIntent: normalizeStringList(
      profile?.weeklyIntent,
      MAX_WEEKLY_INTENTS,
      MAX_WEEKLY_INTENT_LENGTH
    ),
    equipmentAvailable: normalizeStringList(
      profile?.equipmentAvailable,
      MAX_EQUIPMENT_ITEMS,
      64
    ),
    bannedExerciseIds: normalizeStringList(
      profile?.bannedExerciseIds,
      MAX_BANNED_EXERCISE_IDS,
      64
    ),
    ratioTargets: normalizeMuscleBalanceTargets(profile?.ratioTargets),
    defaultIntensityPreference: normalizeIntensityPreference(
      profile?.defaultIntensityPreference ?? null
    ),
  }
}

/**
 * Get the user's training profile, creating defaults if it doesn't exist.
 *
 * On first creation, seeds `ratioTargets` from `UserMuscleBalanceSettings.targets`
 * if the user already has muscle balance settings; otherwise uses defaults.
 */
export async function getOrCreateUserTrainingProfile(
  prisma: PrismaClient,
  userId: string
): Promise<UserTrainingProfileDTO> {
  const existing = await prisma.userTrainingProfile.findUnique({
    where: { userId },
  })
  if (existing) {
    return normalizeUserTrainingProfile(existing)
  }

  const muscleBalance = await prisma.userMuscleBalanceSettings.findUnique({
    where: { userId },
    select: { targets: true },
  })
  const ratioTargets = muscleBalance
    ? normalizeMuscleBalanceTargets(muscleBalance.targets)
    : getDefaultMuscleBalanceTargets()

  const created = await prisma.userTrainingProfile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      goalSentences: [],
      weeklyIntent: [],
      equipmentAvailable: [],
      bannedExerciseIds: [],
      ratioTargets,
      defaultIntensityPreference: null,
    },
  })

  return normalizeUserTrainingProfile(created)
}
