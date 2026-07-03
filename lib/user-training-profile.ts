import type { Prisma, PrismaClient } from '@prisma/client'
import { normalizeEquipmentAvailability } from '@/lib/equipment-availability'
import { ALL_FAUS, type FAUKey } from '@/lib/fau-volume'
import {
  getDefaultMuscleBalanceTargets,
  type MuscleBalanceTargets,
  normalizeMuscleBalanceTargets,
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

/**
 * Injury body areas. Joint/region-level so the injury -> ban-list mapping can
 * key off ExerciseDefinition.movementPattern + FAU taxonomy (e.g. lower_back
 * -> hinge patterns / 'lower-back' FAU; shoulder -> vertical_push / delts).
 */
export const INJURY_AREAS = [
  'neck',
  'shoulder',
  'elbow',
  'wrist',
  'upper_back',
  'lower_back',
  'hip',
  'knee',
  'ankle',
] as const
export type InjuryArea = (typeof INJURY_AREAS)[number]

// avoid_loading: don't load this area at all; caution: allow but flag;
// recovered: historical context only.
export const INJURY_SEVERITIES = [
  'avoid_loading',
  'caution',
  'recovered',
] as const
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

export const PREFERRED_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const
export type PreferredDay = (typeof PREFERRED_DAYS)[number]

export const MAX_GOAL_SENTENCES = 10
export const MAX_GOAL_SENTENCE_LENGTH = 280
export const MAX_WEEKLY_INTENTS = 10
export const MAX_WEEKLY_INTENT_LENGTH = 280
export const MAX_BANNED_EXERCISE_IDS = 500
export const MAX_INJURY_ENTRIES = INJURY_AREAS.length
export const MAX_INJURY_NOTE_LENGTH = 500

export const MIN_IMPORTANCE = 1
export const MAX_IMPORTANCE = 5

export const MIN_BIRTH_YEAR = 1900
export const MIN_HEIGHT_CM = 50
export const MAX_HEIGHT_CM = 300
export const MIN_WEIGHT_KG = 10
export const MAX_WEIGHT_KG = 500
export const MIN_SESSIONS_PER_WEEK = 1
export const MAX_SESSIONS_PER_WEEK = 14
export const MIN_MINUTES_PER_SESSION = 5
export const MAX_MINUTES_PER_SESSION = 480
export const MAX_ACTIVITY_CADENCE_LENGTH = 120

export type InjuryEntry = {
  area: InjuryArea
  severity: InjurySeverity
  notes?: string
  /** ISO 8601 timestamp of when the user reported the injury. */
  reportedAt?: string
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

export type FauImportance = Partial<Record<FAUKey, number>>

export type UserTrainingProfileDTO = {
  goalSentences: string[]
  weeklyIntent: string[]
  equipmentAvailable: string[]
  bannedExerciseIds: string[]
  ratioTargets: MuscleBalanceTargets
  defaultIntensityPreference: IntensityPreference | null
  // Demographics
  birthYear: number | null
  biologicalSex: BiologicalSex | null
  heightCm: number | null
  weightKg: number | null
  // Injuries
  injuryAreas: InjuryEntry[]
  // Importance ratings
  goalCategories: GoalCategoryEntry[]
  otherActivities: OtherActivityEntry[]
  fauImportance: FauImportance
  // Training rhythm
  targetSessionsPerWeek: number | null
  targetMinutesPerSession: number | null
  patternPreference: PatternPreference | null
  preferredDays: PreferredDay[]
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

function clampInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const rounded = Math.round(value)
  if (rounded < min || rounded > max) return null
  return rounded
}

function clampFloat(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value < min || value > max) return null
  return value
}

export function normalizeBirthYear(value: unknown): number | null {
  return clampInt(value, MIN_BIRTH_YEAR, new Date().getUTCFullYear())
}

/** Clamp an importance rating into the 1-5 scale; null if not a number. */
export function normalizeImportance(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const rounded = Math.round(value)
  return Math.min(MAX_IMPORTANCE, Math.max(MIN_IMPORTANCE, rounded))
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

export function normalizeInjuryAreas(value: unknown): InjuryEntry[] {
  if (!Array.isArray(value)) return []
  const result: InjuryEntry[] = []
  const seenAreas = new Set<InjuryArea>()
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const record = raw as Record<string, unknown>
    const area = normalizeEnum(record.area, INJURY_AREAS)
    const severity = normalizeEnum(record.severity, INJURY_SEVERITIES)
    if (!area || !severity) continue
    if (seenAreas.has(area)) continue
    seenAreas.add(area)
    const entry: InjuryEntry = { area, severity }
    if (typeof record.notes === 'string') {
      const notes = record.notes.trim().slice(0, MAX_INJURY_NOTE_LENGTH)
      if (notes) entry.notes = notes
    }
    if (typeof record.reportedAt === 'string') {
      const parsed = Date.parse(record.reportedAt)
      if (!Number.isNaN(parsed)) {
        entry.reportedAt = new Date(parsed).toISOString()
      }
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
    const record = raw as Record<string, unknown>
    const category = normalizeEnum(record.category, GOAL_CATEGORIES)
    const importance = normalizeImportance(record.importance)
    if (!category || importance == null) continue
    if (seen.has(category)) continue
    seen.add(category)
    result.push({ category, importance })
  }
  return result
}

export function normalizeOtherActivities(value: unknown): OtherActivityEntry[] {
  if (!Array.isArray(value)) return []
  const result: OtherActivityEntry[] = []
  const seen = new Set<OtherActivity>()
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const record = raw as Record<string, unknown>
    const activity = normalizeEnum(record.activity, OTHER_ACTIVITIES)
    const importance = normalizeImportance(record.importance)
    if (!activity || importance == null) continue
    if (seen.has(activity)) continue
    seen.add(activity)
    const entry: OtherActivityEntry = { activity, importance }
    if (typeof record.cadence === 'string') {
      const cadence = record.cadence.trim().slice(0, MAX_ACTIVITY_CADENCE_LENGTH)
      if (cadence) entry.cadence = cadence
    }
    result.push(entry)
  }
  return result
}

export function normalizeFauImportance(value: unknown): FauImportance {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const record = value as Record<string, unknown>
  const result: FauImportance = {}
  for (const fau of ALL_FAUS) {
    const importance = normalizeImportance(record[fau])
    if (importance != null) result[fau] = importance
  }
  return result
}

export function normalizePreferredDays(value: unknown): PreferredDay[] {
  if (!Array.isArray(value)) return []
  const result: PreferredDay[] = []
  for (const day of PREFERRED_DAYS) {
    if (value.includes(day)) result.push(day)
  }
  return result
}

type ProfileLike = {
  goalSentences: string[]
  weeklyIntent: string[]
  equipmentAvailable: string[]
  bannedExerciseIds: string[]
  ratioTargets: Prisma.JsonValue
  defaultIntensityPreference: string | null
  birthYear?: number | null
  biologicalSex?: string | null
  heightCm?: number | null
  weightKg?: number | null
  injuryAreas?: Prisma.JsonValue
  goalCategories?: Prisma.JsonValue
  otherActivities?: Prisma.JsonValue
  fauImportance?: Prisma.JsonValue
  targetSessionsPerWeek?: number | null
  targetMinutesPerSession?: number | null
  patternPreference?: string | null
  preferredDays?: string[]
}

export function normalizeUserTrainingProfile(
  profile: ProfileLike | null | undefined
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
    equipmentAvailable: normalizeEquipmentAvailability(
      profile?.equipmentAvailable
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
    birthYear: normalizeBirthYear(profile?.birthYear ?? null),
    biologicalSex: normalizeBiologicalSex(profile?.biologicalSex ?? null),
    heightCm: clampFloat(
      profile?.heightCm ?? null,
      MIN_HEIGHT_CM,
      MAX_HEIGHT_CM
    ),
    weightKg: clampFloat(
      profile?.weightKg ?? null,
      MIN_WEIGHT_KG,
      MAX_WEIGHT_KG
    ),
    injuryAreas: normalizeInjuryAreas(profile?.injuryAreas),
    goalCategories: normalizeGoalCategories(profile?.goalCategories),
    otherActivities: normalizeOtherActivities(profile?.otherActivities),
    fauImportance: normalizeFauImportance(profile?.fauImportance),
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
    preferredDays: normalizePreferredDays(profile?.preferredDays),
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

/**
 * Fields writable via {@link updateUserTrainingProfile}. Every field is
 * optional — omitted fields are left untouched. Values are normalized before
 * persisting; invalid values normalize to null/empty rather than throwing.
 */
export type UserTrainingProfileUpdate = Partial<
  Omit<UserTrainingProfileDTO, 'ratioTargets'> & {
    ratioTargets: Prisma.JsonValue
  }
>

/**
 * Update the user's training profile (creating it first if needed) and return
 * the normalized result. Only the provided fields are written, so `updatedAt`
 * reflects the most recent user-driven change (the payload's
 * `profile_age_days` freshness signal reads from it).
 */
export async function updateUserTrainingProfile(
  prisma: PrismaClient,
  userId: string,
  update: UserTrainingProfileUpdate
): Promise<UserTrainingProfileDTO> {
  // Ensure the row exists (also seeds ratioTargets on first touch).
  await getOrCreateUserTrainingProfile(prisma, userId)

  const data: Prisma.UserTrainingProfileUpdateInput = {}

  if ('goalSentences' in update) {
    data.goalSentences = normalizeStringList(
      update.goalSentences,
      MAX_GOAL_SENTENCES,
      MAX_GOAL_SENTENCE_LENGTH
    )
  }
  if ('weeklyIntent' in update) {
    data.weeklyIntent = normalizeStringList(
      update.weeklyIntent,
      MAX_WEEKLY_INTENTS,
      MAX_WEEKLY_INTENT_LENGTH
    )
  }
  if ('equipmentAvailable' in update) {
    // Filtered to canonical ExerciseDefinition.equipment values; an empty
    // list means "no equipment record" (builder assumes full commercial gym).
    data.equipmentAvailable = normalizeEquipmentAvailability(
      update.equipmentAvailable
    )
  }
  if ('bannedExerciseIds' in update) {
    data.bannedExerciseIds = normalizeStringList(
      update.bannedExerciseIds,
      MAX_BANNED_EXERCISE_IDS,
      64
    )
  }
  if ('ratioTargets' in update) {
    data.ratioTargets = normalizeMuscleBalanceTargets(update.ratioTargets)
  }
  if ('defaultIntensityPreference' in update) {
    data.defaultIntensityPreference = normalizeIntensityPreference(
      update.defaultIntensityPreference
    )
  }
  if ('birthYear' in update) {
    data.birthYear = normalizeBirthYear(update.birthYear)
  }
  if ('biologicalSex' in update) {
    data.biologicalSex = normalizeBiologicalSex(update.biologicalSex)
  }
  if ('heightCm' in update) {
    data.heightCm = clampFloat(update.heightCm, MIN_HEIGHT_CM, MAX_HEIGHT_CM)
  }
  if ('weightKg' in update) {
    data.weightKg = clampFloat(update.weightKg, MIN_WEIGHT_KG, MAX_WEIGHT_KG)
  }
  if ('injuryAreas' in update) {
    data.injuryAreas = normalizeInjuryAreas(update.injuryAreas)
  }
  if ('goalCategories' in update) {
    data.goalCategories = normalizeGoalCategories(update.goalCategories)
  }
  if ('otherActivities' in update) {
    data.otherActivities = normalizeOtherActivities(update.otherActivities)
  }
  if ('fauImportance' in update) {
    data.fauImportance = normalizeFauImportance(update.fauImportance)
  }
  if ('targetSessionsPerWeek' in update) {
    data.targetSessionsPerWeek = clampInt(
      update.targetSessionsPerWeek,
      MIN_SESSIONS_PER_WEEK,
      MAX_SESSIONS_PER_WEEK
    )
  }
  if ('targetMinutesPerSession' in update) {
    data.targetMinutesPerSession = clampInt(
      update.targetMinutesPerSession,
      MIN_MINUTES_PER_SESSION,
      MAX_MINUTES_PER_SESSION
    )
  }
  if ('patternPreference' in update) {
    data.patternPreference = normalizePatternPreference(
      update.patternPreference
    )
  }
  if ('preferredDays' in update) {
    data.preferredDays = normalizePreferredDays(update.preferredDays)
  }

  const updated = await prisma.userTrainingProfile.update({
    where: { userId },
    data,
  })

  return normalizeUserTrainingProfile(updated)
}
