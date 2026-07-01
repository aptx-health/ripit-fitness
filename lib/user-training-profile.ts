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

export const BIOLOGICAL_SEXES = ['female', 'male', 'prefer_not_to_say'] as const
export type BiologicalSex = (typeof BIOLOGICAL_SEXES)[number]

export const PATTERN_PREFERENCES = [
  'no_preference',
  'full_body',
  'upper_lower',
  'push_pull_legs',
  'body_part_split',
  'custom',
] as const
export type PatternPreference = (typeof PATTERN_PREFERENCES)[number]

export const INJURY_AREAS = [
  'lower_back',
  'shoulder',
  'knee',
  'wrist',
  'elbow',
  'hip',
] as const
export type InjuryArea = (typeof INJURY_AREAS)[number]

export const INJURY_SEVERITIES = ['past', 'mindful', 'active'] as const
export type InjurySeverity = (typeof INJURY_SEVERITIES)[number]

export const GOAL_CATEGORIES = [
  'build_muscle',
  'get_stronger',
  'lose_fat',
  'general_fitness',
  'sport_performance',
  'rehabilitation',
  'aesthetic_specific',
  'other',
] as const
export type GoalCategory = (typeof GOAL_CATEGORIES)[number]

export const OTHER_ACTIVITIES = [
  'cycling',
  'running',
  'hiking',
  'climbing',
  'yoga',
  'team_sports',
  'manual_labor',
  'other',
] as const
export type OtherActivity = (typeof OTHER_ACTIVITIES)[number]

export const MAX_GOAL_SENTENCES = 10
export const MAX_GOAL_SENTENCE_LENGTH = 280
export const MAX_WEEKLY_INTENTS = 10
export const MAX_WEEKLY_INTENT_LENGTH = 280
export const MAX_EQUIPMENT_ITEMS = 32
export const MAX_BANNED_EXERCISE_IDS = 500
export const MAX_INJURY_ENTRIES = 20
export const MAX_INJURY_NOTES_LENGTH = 500
export const MAX_INJURY_FREE_NOTES_LENGTH = 2000
export const MAX_GOAL_CATEGORY_ENTRIES = GOAL_CATEGORIES.length
export const MAX_OTHER_ACTIVITY_ENTRIES = OTHER_ACTIVITIES.length
export const MAX_ACTIVITY_CADENCE_LENGTH = 120

export const MIN_IMPORTANCE = 1
export const MAX_IMPORTANCE = 5

export const MIN_AGE = 5
export const MAX_AGE = 120
export const MIN_HEIGHT_CM = 50
export const MAX_HEIGHT_CM = 300
export const MIN_WEIGHT_KG = 10
export const MAX_WEIGHT_KG = 500
export const MIN_SESSIONS_PER_WEEK = 1
export const MAX_SESSIONS_PER_WEEK = 14
export const MIN_MINUTES_PER_SESSION = 5
export const MAX_MINUTES_PER_SESSION = 480

export type WeeklyIntentEntry = { type: 'free_text'; text: string }

export type InjuryAreaEntry = {
  area: InjuryArea
  severity: InjurySeverity
  notes?: string
}

export type GoalCategoryEntry = {
  category: GoalCategory
  importance: number
}

export type OtherActivityEntry = {
  activity: OtherActivity
  importance: number
  cadence?: string
}

export type UserTrainingProfileDTO = {
  goalSentences: string[]
  weeklyIntent: WeeklyIntentEntry[]
  equipmentAvailable: string[]
  bannedExerciseIds: string[]
  ratioTargets: MuscleBalanceTargets
  defaultIntensityPreference: IntensityPreference | null
  age: number | null
  biologicalSex: BiologicalSex | null
  heightCm: number | null
  weightKg: number | null
  injuryAreas: InjuryAreaEntry[]
  injuryFreeNotes: string | null
  goalCategories: GoalCategoryEntry[]
  otherActivities: OtherActivityEntry[]
  targetSessionsPerWeek: number | null
  targetMinutesPerSession: number | null
  patternPreference: PatternPreference | null
}

function normalizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | null {
  if (typeof value !== 'string') return null
  return (allowed as readonly string[]).includes(value) ? (value as T) : null
}

export function normalizeIntensityPreference(
  value: unknown
): IntensityPreference | null {
  return normalizeEnum(value, INTENSITY_PREFERENCES)
}

export function normalizeBiologicalSex(value: unknown): BiologicalSex | null {
  return normalizeEnum(value, BIOLOGICAL_SEXES)
}

export function normalizePatternPreference(
  value: unknown
): PatternPreference | null {
  return normalizeEnum(value, PATTERN_PREFERENCES)
}

function clampInt(
  value: unknown,
  min: number,
  max: number
): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const rounded = Math.round(value)
  if (rounded < min || rounded > max) return null
  return rounded
}

function clampFloat(
  value: unknown,
  min: number,
  max: number
): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value < min || value > max) return null
  return value
}

export function normalizeImportance(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const rounded = Math.round(value)
  if (rounded < MIN_IMPORTANCE) return MIN_IMPORTANCE
  if (rounded > MAX_IMPORTANCE) return MAX_IMPORTANCE
  return rounded
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

/**
 * Normalize weeklyIntent from either legacy String[] or the new
 * discriminated-union Json form. Legacy strings become
 * `{ type: 'free_text', text }`.
 */
export function normalizeWeeklyIntent(value: unknown): WeeklyIntentEntry[] {
  if (!Array.isArray(value)) return []
  const result: WeeklyIntentEntry[] = []
  const seen = new Set<string>()
  for (const raw of value) {
    let text: string | null = null
    if (typeof raw === 'string') {
      text = raw
    } else if (
      raw &&
      typeof raw === 'object' &&
      (raw as { type?: unknown }).type === 'free_text' &&
      typeof (raw as { text?: unknown }).text === 'string'
    ) {
      text = (raw as { text: string }).text
    }
    if (!text) continue
    const trimmed = text.trim()
    if (!trimmed) continue
    const truncated = trimmed.slice(0, MAX_WEEKLY_INTENT_LENGTH)
    if (seen.has(truncated)) continue
    seen.add(truncated)
    result.push({ type: 'free_text', text: truncated })
    if (result.length >= MAX_WEEKLY_INTENTS) break
  }
  return result
}

export function normalizeInjuryAreas(value: unknown): InjuryAreaEntry[] {
  if (!Array.isArray(value)) return []
  const result: InjuryAreaEntry[] = []
  const seenAreas = new Set<InjuryArea>()
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const area = normalizeEnum(
      (raw as { area?: unknown }).area,
      INJURY_AREAS
    )
    const severity = normalizeEnum(
      (raw as { severity?: unknown }).severity,
      INJURY_SEVERITIES
    )
    if (!area || !severity) continue
    if (seenAreas.has(area)) continue
    seenAreas.add(area)
    const entry: InjuryAreaEntry = { area, severity }
    const notesRaw = (raw as { notes?: unknown }).notes
    if (typeof notesRaw === 'string') {
      const notes = notesRaw.trim().slice(0, MAX_INJURY_NOTES_LENGTH)
      if (notes) entry.notes = notes
    }
    result.push(entry)
    if (result.length >= MAX_INJURY_ENTRIES) break
  }
  return result
}

export function normalizeGoalCategories(value: unknown): GoalCategoryEntry[] {
  if (!Array.isArray(value)) return []
  const result: GoalCategoryEntry[] = []
  const seen = new Set<GoalCategory>()
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const category = normalizeEnum(
      (raw as { category?: unknown }).category,
      GOAL_CATEGORIES
    )
    const importance = normalizeImportance(
      (raw as { importance?: unknown }).importance
    )
    if (!category || importance == null) continue
    if (seen.has(category)) continue
    seen.add(category)
    result.push({ category, importance })
    if (result.length >= MAX_GOAL_CATEGORY_ENTRIES) break
  }
  return result
}

export function normalizeOtherActivities(
  value: unknown
): OtherActivityEntry[] {
  if (!Array.isArray(value)) return []
  const result: OtherActivityEntry[] = []
  const seen = new Set<OtherActivity>()
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const activity = normalizeEnum(
      (raw as { activity?: unknown }).activity,
      OTHER_ACTIVITIES
    )
    const importance = normalizeImportance(
      (raw as { importance?: unknown }).importance
    )
    if (!activity || importance == null) continue
    if (seen.has(activity)) continue
    seen.add(activity)
    const entry: OtherActivityEntry = { activity, importance }
    const cadenceRaw = (raw as { cadence?: unknown }).cadence
    if (typeof cadenceRaw === 'string') {
      const cadence = cadenceRaw.trim().slice(0, MAX_ACTIVITY_CADENCE_LENGTH)
      if (cadence) entry.cadence = cadence
    }
    result.push(entry)
    if (result.length >= MAX_OTHER_ACTIVITY_ENTRIES) break
  }
  return result
}

type ProfileLike = {
  goalSentences: string[]
  weeklyIntent: Prisma.JsonValue | string[]
  equipmentAvailable: string[]
  bannedExerciseIds: string[]
  ratioTargets: Prisma.JsonValue
  defaultIntensityPreference: string | null
  age?: number | null
  biologicalSex?: string | null
  heightCm?: number | null
  weightKg?: number | null
  injuryAreas?: Prisma.JsonValue | null
  injuryFreeNotes?: string | null
  goalCategories?: Prisma.JsonValue | null
  otherActivities?: Prisma.JsonValue | null
  targetSessionsPerWeek?: number | null
  targetMinutesPerSession?: number | null
  patternPreference?: string | null
}

export function normalizeUserTrainingProfile(
  profile: ProfileLike | null | undefined
): UserTrainingProfileDTO {
  const injuryFreeNotesRaw = profile?.injuryFreeNotes ?? null
  const injuryFreeNotes =
    typeof injuryFreeNotesRaw === 'string'
      ? injuryFreeNotesRaw.trim().slice(0, MAX_INJURY_FREE_NOTES_LENGTH) || null
      : null

  return {
    goalSentences: normalizeStringList(
      profile?.goalSentences,
      MAX_GOAL_SENTENCES,
      MAX_GOAL_SENTENCE_LENGTH
    ),
    weeklyIntent: normalizeWeeklyIntent(profile?.weeklyIntent),
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
    age: clampInt(profile?.age ?? null, MIN_AGE, MAX_AGE),
    biologicalSex: normalizeBiologicalSex(profile?.biologicalSex ?? null),
    heightCm: clampFloat(profile?.heightCm ?? null, MIN_HEIGHT_CM, MAX_HEIGHT_CM),
    weightKg: clampFloat(profile?.weightKg ?? null, MIN_WEIGHT_KG, MAX_WEIGHT_KG),
    injuryAreas: normalizeInjuryAreas(profile?.injuryAreas),
    injuryFreeNotes,
    goalCategories: normalizeGoalCategories(profile?.goalCategories),
    otherActivities: normalizeOtherActivities(profile?.otherActivities),
    targetSessionsPerWeek: clampInt(
      profile?.targetSessionsPerWeek ?? null,
      MIN_SESSIONS_PER_WEEK,
      MAX_SESSIONS_PER_WEEK
    ),
    targetMinutesPerSession: clampInt(
      profile?.targetMinutesPerSession ?? null,
      MIN_MINUTES_PER_SESSION,
      MAX_MINUTES_PER_SESSION
    ),
    patternPreference: normalizePatternPreference(
      profile?.patternPreference ?? null
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
