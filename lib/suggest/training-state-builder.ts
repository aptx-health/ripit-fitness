/**
 * Training-state builder — assembles the complete Suggest LLM payload defined
 * by docs/SUGGEST_PAYLOAD_SPEC.md (v2) from its producers (issue #920).
 *
 * This is the single choke-point where cold-start behavior is decided. It is a
 * PURE ASSEMBLER: no LLM calls. It reads the producers, converts stored
 * timestamps to `days_ago` at request `now`, synthesizes goal sentences when
 * the interview is absent, runs the deterministic candidate filter, derives
 * `data_maturity`, and validates the result against the payload zod schema
 * before returning.
 *
 * Design decisions (recorded on issue #920):
 *
 * 1. **Aggregates are computed live** via `computeUserAggregates(now)` — the
 *    #937 dry-run seam — rather than reading the persisted nightly row. The
 *    persisted JSON blobs store `days_ago` relative to their own `computedAt`,
 *    which would be stale at request time; computing live makes every
 *    `days_ago` exact at `now` and makes the payload a pure function of
 *    (DB state, now). That determinism is what lets the golden archetype
 *    snapshots assert byte-for-byte. A future optimization can swap to the
 *    persisted row + a timestamp shift if request-path cost matters.
 *
 * 2. **`recent_sessions` is builder-owned** (product decision 2026-07-02):
 *    queried directly from the last <= 10 qualifying `WorkoutCompletion`s.
 *    Assembly, not aggregation.
 *
 * 3. **`recent_feedback` is deferred to a documented empty block for ALL
 *    maturity levels** (product decision 2026-07-02): there is no swap-history
 *    model until #922's implicit-feedback hooks have production data. A post-v1
 *    follow-up wires it.
 *
 * 4. **Weekly intents surface as `free_text`.** `UserTrainingProfile.weeklyIntent`
 *    is a `String[]` of free text; no natural-language → structured-intent
 *    parser exists yet, so each string becomes a `free_text` intent. The
 *    evaluator treats those as non-evaluable (spec rule 5). The verdict →
 *    status mapping (including the emit-only-when-unsatisfied rule for the
 *    evaluable branch) lives in ./weekly-intent-status and is unit-tested there.
 *
 * 5. **`per_fau` is NOT diffed against `ALL_FAUS`.** Never-trained muscle
 *    groups are absent from `per_fau` by the aggregates producer's contract
 *    (all-zero rows are noise, and `target_share` is normalized over the
 *    emitted FAUs). Surfacing a fully-skipped group as `neglected` would
 *    require the aggregates job to emit zero-rows for all 18 FAUs — a producer
 *    change plus a payload-copy decision, both out of scope for this thin
 *    builder. Flagged on issue #920 for a future producer/copy pass.
 *
 * 6. **Injury caution soft-flags are computed but not emitted.** The v2 payload
 *    has no field for cautioned patterns/FAUs/notes; only hard bans have a
 *    home (`durable_profile.banned_exercise_ids`). Secondary-FAU matches are
 *    cautioned (down-weight), never hard-banned (decision 2026-07-02), but with
 *    no schema slot they are dropped in v1 rather than invented into an
 *    unrendered field. A future spec revision can add a `cautioned_*` block.
 */

import type { PrismaClient } from '@prisma/client'

import { computeUserAggregates } from '@/lib/aggregates/recompute'
import type { MovementCalibration } from '@/lib/aggregates/types'
import {
  computeInjuryBanList,
  type InjuryBanExercise,
} from '@/lib/learning/injury-ban-list'
import {
  type EvaluatedSession,
  evaluateWeeklyIntents,
  type MovementEwmaMap,
} from '@/lib/learning/weekly-intent'
import {
  type SuggestWorkoutPayload,
  suggestWorkoutPayloadSchema,
} from '@/lib/llm/prompts/suggest-workout/schemas'
import type { WeeklyIntent } from '@/lib/llm/prompts/suggest-workout/types'
import { normalizeWeightToLbs } from '@/lib/stats/exercise-performance'
import {
  type TuningConfig,
  toAggregatesOptions,
  toHeavyOptions,
} from '@/lib/tuning/config'
import { loadTuningConfig } from '@/lib/tuning/store'
import {
  normalizeUserTrainingProfile,
  type UserTrainingProfileDTO,
} from '@/lib/user-training-profile'
import {
  buildCandidateExercises,
  buildPreferencesSummary,
  type CatalogExercise,
  decayPreferences,
  resolveAvailableEquipment,
} from './candidates'
import { synthesizeGoalSentences } from './goal-sentences'
import { toWeeklyIntentStatuses } from './weekly-intent-status'

const DAY_MS = 24 * 60 * 60 * 1000
const QUALIFYING_STATUSES = ['completed', 'abandoned']

/** Newest-first fetch cap for session-derived blocks. Well above the 10 used
 * for recent_sessions and any realistic rolling-window scan. */
const SESSION_FETCH_LIMIT = 200
const MAX_RECENT_SESSIONS = 10
const MAX_SESSION_NOTES = 5
const NOTE_MAX_CHARS = 120

const DOW = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const

/** The ephemeral request modal fields (producer: request). */
export interface SuggestRequestInput {
  time_budget_minutes: number
  intensity_vibe?: 'easy' | 'solid' | 'heavy' | null
  deprioritize_freetext?: string | null
  prioritize_freetext?: string | null
  /** null = use the durable equipment list. */
  equipment_override?: string[] | null
}

/** recent_feedback is deferred to a documented empty block (decision #3 above). */
const EMPTY_RECENT_FEEDBACK = {
  suggestions_last_30d: 0,
  swap_rate: 0,
  common_swaps: [] as { from: string; to: string; count: number }[],
  common_additions_fau: [] as string[],
  common_deletions_fau: [] as string[],
}

function daysAgoOf(now: Date, when: Date): number {
  return Math.floor((now.getTime() - when.getTime()) / DAY_MS)
}

interface SessionRow {
  completedAt: Date
  startedAt: Date | null
  status: string
  exercises: {
    name: string
    notes: string | null
    exerciseDefinition: {
      movementPattern: string | null
      intensityClass: string | null
      isBodyweight: boolean
      primaryFAUs: string[]
    }
    loggedSets: {
      weight: number
      weightUnit: string
      reps: number
      rpe: number | null
      rir: number | null
      isWarmup: boolean
    }[]
  }[]
}

/** A completion qualifies iff it holds >= 1 effective (non-warmup) logged set. */
function isQualifying(session: SessionRow): boolean {
  return session.exercises.some((ex) => ex.loggedSets.some((s) => !s.isWarmup))
}

/** Shape a completion into the evaluator's per-movement session view. */
function toEvaluatedSession(now: Date, session: SessionRow): EvaluatedSession {
  return {
    daysAgo: daysAgoOf(now, session.completedAt),
    movements: session.exercises.map((ex) => ({
      movementPattern: ex.exerciseDefinition.movementPattern,
      intensityClass: ex.exerciseDefinition.intensityClass,
      faus: ex.exerciseDefinition.primaryFAUs,
      sets: ex.loggedSets.map((s) => ({
        // Global rule 3: bodyweight-exercise weights are excluded from e1RM.
        weightLbs: ex.exerciseDefinition.isBodyweight
          ? 0
          : normalizeWeightToLbs(s.weight, s.weightUnit),
        reps: s.reps,
        rpe: s.rpe,
        rir: s.rir,
        isWarmup: s.isWarmup,
      })),
    })),
  }
}

/** Build the newest-first recent_sessions block from qualifying completions. */
function toRecentSessions(now: Date, qualifying: SessionRow[]) {
  return qualifying.slice(0, MAX_RECENT_SESSIONS).map((session) => {
    const totalSets = session.exercises.reduce(
      (sum, ex) => sum + ex.loggedSets.filter((s) => !s.isWarmup).length,
      0,
    )
    const notes = session.exercises
      .filter((ex) => ex.notes != null && ex.notes.trim().length > 0)
      .slice(0, MAX_SESSION_NOTES)
      .map((ex) => ({
        exercise: ex.name,
        text: (ex.notes as string).trim().slice(0, NOTE_MAX_CHARS),
      }))

    return {
      days_ago: daysAgoOf(now, session.completedAt),
      // duration_min is null when the workout has no recorded start time.
      duration_min: session.startedAt
        ? Math.round((session.completedAt.getTime() - session.startedAt.getTime()) / 60000)
        : null,
      total_sets: totalSets,
      abandoned: session.status === 'abandoned',
      // session_rpe is OMITTED (no sessionRpe column exists yet).
      notes,
    }
  })
}

/**
 * Adapt aggregates' per-movement calibration into the evaluator's EWMA map
 * (integration note #1: aggregates emit `ewma_e1rm_lbs`; the evaluator wants
 * `ewmaE1RMLbs`). Only patterns with >= 3 observations appear here, so the
 * evaluator uses the EWMA branch for them and falls back to the intensityClass
 * tag for everything else (spec rule 1).
 */
function toEwmaMap(calibration: readonly MovementCalibration[]): MovementEwmaMap {
  const map: MovementEwmaMap = {}
  for (const c of calibration) {
    map[c.movement_pattern] = {
      ewmaE1RMLbs: c.ewma_e1rm_lbs,
      observationCount: c.observation_count,
    }
  }
  return map
}

/** Map aggregates calibration → payload movement-calibration shape. */
function toCalibrationPayload(c: MovementCalibration) {
  return {
    movement_pattern: c.movement_pattern,
    current_ewma_top_weight_lbs: c.ewma_e1rm_lbs,
    estimate_staleness_days: c.estimate_staleness_days,
    recent_observations: c.recent_observations,
    typical_rep_range: c.typical_rep_range,
    typical_rpe: c.avg_effort_rpe_equiv,
    last_session_days_ago: c.last_session_days_ago,
  }
}

/**
 * The builder's return: the validated payload plus the effective knob values it
 * was built with. #921 embeds `configStamp` into `Suggestion.requestPayload` so
 * every persisted suggestion is self-describing regardless of later config edits.
 */
export interface TrainingStateBuildResult {
  payload: SuggestWorkoutPayload
  configStamp: TuningConfig
}

/**
 * Build and validate the complete Suggest payload for a user at request time.
 *
 * @param prisma   Prisma client (or transaction handle).
 * @param userId   The requesting user.
 * @param request  Ephemeral request-modal fields.
 * @param now      Request time. Injectable for deterministic tests/snapshots.
 * @param tuning   Effective tuning knobs (#937). Omit to load the saved config
 *                 (code defaults when no row exists); pass an ephemeral config
 *                 for the admin preview's unsaved overrides.
 * @returns The validated payload and the effective config stamp.
 * @throws ZodError if the assembled payload violates the payload contract.
 */
export async function buildTrainingStatePayload(
  prisma: PrismaClient,
  userId: string,
  request: SuggestRequestInput,
  now: Date = new Date(),
  tuning?: TuningConfig,
): Promise<TrainingStateBuildResult> {
  const config = tuning ?? (await loadTuningConfig(prisma))
  const [profileRow, settings, aggregates, sessionRows, catalogRows, prefRows] =
    await Promise.all([
      prisma.userTrainingProfile.findUnique({ where: { userId } }),
      prisma.userSettings.findUnique({
        where: { userId },
        select: { signupIntent: true },
      }),
      computeUserAggregates(prisma, userId, now, toAggregatesOptions(config)),
      prisma.workoutCompletion.findMany({
        where: {
          userId,
          isArchived: false,
          status: { in: QUALIFYING_STATUSES },
          completedAt: { lte: now },
        },
        orderBy: { completedAt: 'desc' },
        take: SESSION_FETCH_LIMIT,
        select: {
          completedAt: true,
          startedAt: true,
          status: true,
          exercises: {
            select: {
              name: true,
              notes: true,
              exerciseDefinition: {
                select: {
                  movementPattern: true,
                  intensityClass: true,
                  isBodyweight: true,
                  primaryFAUs: true,
                },
              },
              loggedSets: {
                select: {
                  weight: true,
                  weightUnit: true,
                  reps: true,
                  rpe: true,
                  rir: true,
                  isWarmup: true,
                },
              },
            },
          },
        },
      }),
      prisma.exerciseDefinition.findMany({
        where: { OR: [{ isSystem: true }, { userId }] },
        select: {
          id: true,
          name: true,
          equipment: true,
          primaryFAUs: true,
          secondaryFAUs: true,
          movementPattern: true,
          intensityClass: true,
        },
      }),
      prisma.userExercisePreference.findMany({
        where: { userId },
        select: { exerciseDefinitionId: true, alpha: true, beta: true, lastUpdatedAt: true },
      }),
    ])

  const profile: UserTrainingProfileDTO = normalizeUserTrainingProfile(profileRow)
  const signupIntent = settings?.signupIntent ?? null

  // --- session-derived blocks (recent_sessions + weekly-intent evaluation) ---
  const qualifying = (sessionRows as SessionRow[]).filter(isQualifying)
  const evaluatedSessions = qualifying.map((s) => toEvaluatedSession(now, s))
  const recentSessions = toRecentSessions(now, qualifying)

  // Profile free-text intents surface as free_text (decision #4 above).
  const weeklyIntents: WeeklyIntent[] = profile.weeklyIntent.map((text) => ({
    type: 'free_text',
    text,
  }))
  const verdicts = evaluateWeeklyIntents(
    weeklyIntents,
    evaluatedSessions,
    toEwmaMap(aggregates.perMovementCalibration),
    toHeavyOptions(config),
  )
  const weeklyIntentStatus = toWeeklyIntentStatuses(verdicts)

  // --- injury bans + candidate filter ---
  const banExercises: InjuryBanExercise[] = catalogRows.map((r) => ({
    id: r.id,
    movementPattern: r.movementPattern,
    primaryFAUs: r.primaryFAUs,
    secondaryFAUs: r.secondaryFAUs,
  }))
  const banResult = computeInjuryBanList(profile.injuryAreas, banExercises)
  const bannedIds = new Set<string>([...profile.bannedExerciseIds, ...banResult.bannedExerciseIds])

  const catalog: CatalogExercise[] = catalogRows
  const { available, unconstrained } = resolveAvailableEquipment(
    request.equipment_override ?? profile.equipmentAvailable,
  )
  const preferences = decayPreferences(prefRows, now, config.betaWeeklyDecay)
  const candidateExercises = buildCandidateExercises(catalog, {
    available,
    unconstrained,
    bannedIds,
    preferences,
  })

  const nameById = new Map(catalogRows.map((r) => [r.id, r.name]))
  const preferencesSummary = buildPreferencesSummary(preferences, nameById)

  // --- goal sentences: pass through when the interview ran, else synthesize ---
  const goalSentences =
    profile.goalSentences.length > 0
      ? profile.goalSentences
      : synthesizeGoalSentences(profile, signupIntent)

  const payload: SuggestWorkoutPayload = {
    data_maturity: aggregates.dataMaturity,
    durable_profile: {
      goal_sentences: goalSentences,
      weekly_intent: weeklyIntents,
      equipment_available: profile.equipmentAvailable,
      banned_exercise_ids: [...bannedIds].sort(),
      default_intensity_preference: profile.defaultIntensityPreference,
      ratio_targets: profile.ratioTargets,
    },
    ephemeral_context: {
      time_budget_minutes: request.time_budget_minutes,
      intensity_vibe: request.intensity_vibe ?? null,
      deprioritize_freetext: request.deprioritize_freetext ?? null,
      prioritize_freetext: request.prioritize_freetext ?? null,
      equipment_override: request.equipment_override ?? null,
    },
    training_state: {
      now: now.toISOString(),
      today_dow: DOW[now.getUTCDay()] ?? 'sunday',
      sessions_last_7d: aggregates.sessionsLast7d,
      days_since_any_session: aggregates.daysSinceAnySession,
      total_weekly_sets_baseline: aggregates.totalWeeklySetsBaseline,
      acute_chronic_ratio: aggregates.acuteChronicRatio,
      detraining_gap:
        aggregates.detrainingGapDays != null
          ? { days: aggregates.detrainingGapDays }
          : null,
      per_fau: aggregates.perFau,
      per_movement_calibration: aggregates.perMovementCalibration.map(toCalibrationPayload),
      weekly_intent_status: weeklyIntentStatus,
      goal_progress: aggregates.goalProgress,
      recent_sessions: recentSessions,
      recent_feedback: EMPTY_RECENT_FEEDBACK,
      preferences_summary: preferencesSummary,
    },
    candidate_exercises: candidateExercises,
  }

  // Validate against the payload contract BEFORE it reaches the prompt layer.
  // A failure here is a builder bug, not a user error — surface it loudly.
  return {
    payload: suggestWorkoutPayloadSchema.parse(payload),
    configStamp: config,
  }
}
