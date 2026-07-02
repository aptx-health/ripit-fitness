/**
 * Weekly-intent evaluator with a **session-relative** definition of "heavy".
 *
 * Risk 4 from the Suggest Workout risk audit: the milestone conflated
 * `ExerciseDefinition.intensityClass: heavy` (a static property of the movement
 * — its typical systemic fatigue cost) with "the user actually trained heavy
 * this session." An empty-bar deadlift is `intensityClass: heavy`; a brutal 5x5
 * on a "moderate"-tagged machine is not. That mismatch produces confidently
 * wrong copy on the exact surfaces meant to build trust ("you haven't had a
 * heavy leg day this week" to someone still sore from Tuesday).
 *
 * This module fixes that by defining heaviness relative to the user's own
 * calibration (movement-pattern EWMA e1RM) and logged effort, falling back to
 * the `intensityClass` tag only during cold start (< 3 EWMA observations).
 *
 * Like `lib/learning/math.ts`, this module is intentionally free of I/O: no
 * Prisma, no fetch, no fs. Callers pre-fetch sessions and EWMA estimates and
 * hand normalized inputs in. Warmup exclusion and lbs normalization are the
 * caller's contract.
 *
 * Out of scope (see issue #908): aggregates persistence (wave 2) and the prompt
 * copy that consumes these verdicts.
 *
 * See docs/data-signal-audit.md (finding 5), docs/SUGGEST_PAYLOAD_SPEC.md
 * (`weekly_intent_status[]`, `per_fau.last_heavy_days_ago`), the risk audit
 * (Risk 4) and issue #908.
 */

import type { WeeklyIntent } from '@/lib/llm/prompts/suggest-workout/schemas'
import { epleyE1RM } from './math'

export type { WeeklyIntent }

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Rolling satisfaction window. Deliberately NOT a Mon–Sun calendar week — the
 * calendar boundary made every intent read unsatisfied on Monday mornings
 * (M16 decision 3). A session is "in the last 7 days" iff `daysAgo < 7`, i.e.
 * `daysAgo` in [0, 7); a session exactly 7 days ago falls just outside. */
export const WINDOW_DAYS = 7

/** Top working-set e1RM at or above this fraction of the movement-pattern EWMA
 * e1RM counts the session as heavy for that pattern. */
export const HEAVY_E1RM_FRACTION = 0.85

/** Normalized effort (RPE-equivalent) at or above this counts as heavy. RPE 8
 * ⇔ RIR 2 on the `effort = rpe ?? (10 − rir)` scale. */
export const HEAVY_EFFORT_RPE = 8

/** Minimum EWMA observations before the EWMA branch is trusted; below this we
 * fall back to the static `intensityClass` tag (cold start only). */
export const MIN_EWMA_OBSERVATIONS = 3

/** muscle_group → movement patterns that count toward a "heavy X day". Movement
 * patterns follow ExerciseDefinition.movementPattern (see schema.prisma). */
export const MUSCLE_GROUP_PATTERNS: Record<string, string[]> = {
  legs: ['squat', 'hinge', 'lunge'],
  push: ['horizontal_push', 'vertical_push'],
  pull: ['horizontal_pull', 'vertical_pull'],
  upper: ['horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull'],
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/** A single logged working set. Warmups are excluded by the caller; a stray
 * warmup is guarded against below. Weight is lbs (caller-normalized). */
export interface IntentLoggedSet {
  weightLbs: number
  reps: number
  /** RPE, if the user logs RPE. Takes precedence over `rir` when both present. */
  rpe?: number | null
  /** RIR, if the user logs RIR (the default per UserSettings.defaultIntensityRating). */
  rir?: number | null
  /** Guard only — warmups must be excluded by the caller. */
  isWarmup?: boolean
}

/** One movement pattern's work within a single session. */
export interface SessionMovement {
  /** ExerciseDefinition.movementPattern, or null when untagged. */
  movementPattern: string | null
  /** ExerciseDefinition.intensityClass tag ('heavy' | 'moderate' | 'light').
   * Used only as the cold-start fallback. */
  intensityClass?: string | null
  /** FAUs this movement contributes to (for volume_tilt attribution). */
  faus?: string[]
  /** Working sets logged for this movement in this session. */
  sets: IntentLoggedSet[]
}

/** A completed training session, at whole-day granularity. */
export interface EvaluatedSession {
  /** Whole days before `now`. 0 = today. Must be a finite non-negative number. */
  daysAgo: number
  movements: SessionMovement[]
}

/** Gap-decayed EWMA estimate for one movement pattern (from lib/learning/math). */
export interface MovementEwma {
  /** EWMA of top-set e1RM (lbs). Null when no usable observations. */
  ewmaE1RMLbs: number | null
  /** Observation count that fed the EWMA — drives the cold-start fallback. */
  observationCount: number
}

/** movement pattern → its EWMA estimate. */
export type MovementEwmaMap = Record<string, MovementEwma | undefined>

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface WeeklyIntentVerdict {
  intent: WeeklyIntent
  /** Satisfied over the rolling 7-day window ending at `now`. */
  satisfiedLast7d: boolean
  /**
   * Days-ago of the most recent rolling-7d window in which this intent was
   * satisfied (0 = satisfied now). `null` when never satisfied within the
   * provided history, or when the intent is not evaluable (`free_text`).
   *
   * Populated **regardless** of `satisfiedLast7d` — downstream deload detection
   * needs the value even while the intent is currently satisfied. The payload
   * builder is responsible for only emitting it when unsatisfied.
   */
  lastSatisfiedDaysAgo: number | null
  /** Human-readable evidence; present only when `satisfiedLast7d` is true. */
  evidence?: string
  /** False for intents this module cannot evaluate (`free_text`). */
  evaluable: boolean
}

// ---------------------------------------------------------------------------
// Effort normalization
// ---------------------------------------------------------------------------

/**
 * Normalize logged effort to the RPE-equivalent scale: `effort = rpe ?? (10 −
 * rir)`. RPE 8 ⇔ RIR 2. Returns null when neither is logged (intensity logging
 * is opt-in). RPE takes precedence when both are present.
 */
export function normalizedEffort(set: IntentLoggedSet): number | null {
  if (set.rpe != null && Number.isFinite(set.rpe)) return set.rpe
  if (set.rir != null && Number.isFinite(set.rir)) return 10 - set.rir
  return null
}

// ---------------------------------------------------------------------------
// Session-relative "heavy" determination
// ---------------------------------------------------------------------------

export interface HeavyDetermination {
  isHeavy: boolean
  /** Which signal fired: 'ewma' | 'effort' | 'tag' | 'none'. */
  reason: 'ewma' | 'effort' | 'tag' | 'none'
  /** Top working-set e1RM observed for the pattern in this session, or null. */
  topSetE1RM: number | null
  /** Peak normalized effort observed, or null when no effort was logged. */
  peakEffort: number | null
}

function workingSets(movement: SessionMovement): IntentLoggedSet[] {
  return movement.sets.filter((s) => s.isWarmup !== true)
}

function peakEffortOf(sets: IntentLoggedSet[]): number | null {
  let peak: number | null = null
  for (const set of sets) {
    const e = normalizedEffort(set)
    if (e != null && (peak == null || e > peak)) peak = e
  }
  return peak
}

function topSetE1RMOf(sets: IntentLoggedSet[]): number | null {
  let top: number | null = null
  for (const set of sets) {
    if (!Number.isFinite(set.weightLbs) || set.weightLbs <= 0) continue
    if (!Number.isFinite(set.reps) || set.reps <= 0) continue
    const e1rm = epleyE1RM(set.weightLbs, set.reps)
    if (top == null || e1rm > top) top = e1rm
  }
  return top
}

/**
 * Decide whether a session's work in a single movement pattern counts as heavy.
 *
 * Session-relative rule (issue #908 / Risk 4):
 * - **EWMA branch** (≥ 3 observations): heavy iff the top working-set e1RM is
 *   ≥ 85% of the movement-pattern EWMA e1RM, OR any working set logged effort
 *   ≥ RPE-8-equivalent.
 * - **Effort** is always a valid signal — a measured RPE ≥ 8 means the user
 *   trained heavy regardless of calibration data.
 * - **Fallback branch** (< 3 observations, cold start): heavy iff effort fired,
 *   OR the movement's static `intensityClass` tag is 'heavy'.
 */
export function determineMovementHeavy(
  movement: SessionMovement,
  ewma: MovementEwma | undefined
): HeavyDetermination {
  const sets = workingSets(movement)
  const peakEffort = peakEffortOf(sets)
  const topSetE1RM = topSetE1RMOf(sets)

  // Effort is a direct, calibration-free signal; check it first.
  if (peakEffort != null && peakEffort >= HEAVY_EFFORT_RPE) {
    return { isHeavy: true, reason: 'effort', topSetE1RM, peakEffort }
  }

  const hasEwma =
    ewma != null &&
    ewma.ewmaE1RMLbs != null &&
    ewma.ewmaE1RMLbs > 0 &&
    ewma.observationCount >= MIN_EWMA_OBSERVATIONS

  if (hasEwma) {
    // EWMA branch: compare measured load against the user's own estimate.
    if (
      topSetE1RM != null &&
      topSetE1RM >= HEAVY_E1RM_FRACTION * (ewma!.ewmaE1RMLbs as number)
    ) {
      return { isHeavy: true, reason: 'ewma', topSetE1RM, peakEffort }
    }
    return { isHeavy: false, reason: 'none', topSetE1RM, peakEffort }
  }

  // Cold-start fallback: static intensityClass tag.
  if (movement.intensityClass === 'heavy') {
    return { isHeavy: true, reason: 'tag', topSetE1RM, peakEffort }
  }

  return { isHeavy: false, reason: 'none', topSetE1RM, peakEffort }
}

/**
 * Whether a session counts as heavy for ANY of the given movement patterns.
 * Untagged movements (null pattern) can never match a pattern filter.
 */
export function isSessionHeavyForPatterns(
  session: EvaluatedSession,
  patterns: string[],
  ewmaMap: MovementEwmaMap
): boolean {
  const wanted = new Set(patterns)
  for (const movement of session.movements) {
    if (movement.movementPattern == null || !wanted.has(movement.movementPattern)) {
      continue
    }
    if (determineMovementHeavy(movement, ewmaMap[movement.movementPattern]).isHeavy) {
      return true
    }
  }
  return false
}

/** Whether a session contains any working set for one of the given patterns. */
function sessionHasPattern(session: EvaluatedSession, patterns: string[]): boolean {
  const wanted = new Set(patterns)
  return session.movements.some(
    (m) =>
      m.movementPattern != null &&
      wanted.has(m.movementPattern) &&
      workingSets(m).length > 0
  )
}

// ---------------------------------------------------------------------------
// Rolling-window satisfaction
// ---------------------------------------------------------------------------

/** Sessions whose `daysAgo` falls in the 7-day window ending `endDaysAgo` days
 * ago, i.e. `daysAgo` in [endDaysAgo, endDaysAgo + WINDOW_DAYS). */
function sessionsInWindow(
  sessions: EvaluatedSession[],
  endDaysAgo: number
): EvaluatedSession[] {
  return sessions.filter(
    (s) => s.daysAgo >= endDaysAgo && s.daysAgo < endDaysAgo + WINDOW_DAYS
  )
}

/**
 * Find the most-recent (smallest) window-end offset at which `predicate` holds,
 * scanning windows ending 0..maxDaysAgo days ago. Returns null if none.
 */
function findLastSatisfiedDaysAgo(
  sessions: EvaluatedSession[],
  predicate: (windowSessions: EvaluatedSession[]) => boolean
): number | null {
  const maxDaysAgo = sessions.reduce((m, s) => Math.max(m, s.daysAgo), 0)
  for (let d = 0; d <= maxDaysAgo; d++) {
    if (predicate(sessionsInWindow(sessions, d))) return d
  }
  return null
}

// ---------------------------------------------------------------------------
// Intent evaluation
// ---------------------------------------------------------------------------

function evaluateHeavySession(
  intent: Extract<WeeklyIntent, { type: 'heavy_session' }>,
  sessions: EvaluatedSession[],
  ewmaMap: MovementEwmaMap
): WeeklyIntentVerdict {
  const patterns = MUSCLE_GROUP_PATTERNS[intent.muscle_group] ?? []
  const predicate = (windowSessions: EvaluatedSession[]) =>
    windowSessions.filter((s) => isSessionHeavyForPatterns(s, patterns, ewmaMap))
      .length >= intent.min_per_week

  const current = sessionsInWindow(sessions, 0)
  const heavyNow = current.filter((s) =>
    isSessionHeavyForPatterns(s, patterns, ewmaMap)
  ).length
  const satisfiedLast7d = heavyNow >= intent.min_per_week

  return {
    intent,
    satisfiedLast7d,
    lastSatisfiedDaysAgo: findLastSatisfiedDaysAgo(sessions, predicate),
    evidence: satisfiedLast7d
      ? `${heavyNow} heavy ${intent.muscle_group} session${heavyNow === 1 ? '' : 's'} in the last ${WINDOW_DAYS} days (target ${intent.min_per_week})`
      : undefined,
    evaluable: true,
  }
}

function evaluateMovementFrequency(
  intent: Extract<WeeklyIntent, { type: 'movement_frequency' }>,
  sessions: EvaluatedSession[]
): WeeklyIntentVerdict {
  const patterns = [intent.movement_pattern]
  const predicate = (windowSessions: EvaluatedSession[]) =>
    windowSessions.filter((s) => sessionHasPattern(s, patterns)).length >=
    intent.min_per_week

  const current = sessionsInWindow(sessions, 0)
  const countNow = current.filter((s) => sessionHasPattern(s, patterns)).length
  const satisfiedLast7d = countNow >= intent.min_per_week

  return {
    intent,
    satisfiedLast7d,
    lastSatisfiedDaysAgo: findLastSatisfiedDaysAgo(sessions, predicate),
    evidence: satisfiedLast7d
      ? `${countNow} ${intent.movement_pattern} session${countNow === 1 ? '' : 's'} in the last ${WINDOW_DAYS} days (target ${intent.min_per_week})`
      : undefined,
    evaluable: true,
  }
}

/** Count working sets in a window attributed to any of the given FAUs. */
function fauSetVolume(windowSessions: EvaluatedSession[], faus: string[]): number {
  const wanted = new Set(faus)
  let total = 0
  for (const session of windowSessions) {
    for (const movement of session.movements) {
      if (!movement.faus || !movement.faus.some((f) => wanted.has(f))) continue
      total += workingSets(movement).length
    }
  }
  return total
}

function evaluateVolumeTilt(
  intent: Extract<WeeklyIntent, { type: 'volume_tilt' }>,
  sessions: EvaluatedSession[]
): WeeklyIntentVerdict {
  const predicate = (windowSessions: EvaluatedSession[]) => {
    const toward = fauSetVolume(windowSessions, intent.toward)
    const away = fauSetVolume(windowSessions, intent.away_from)
    if (toward === 0) return false
    // away === 0 with toward > 0 is an unbounded tilt toward — satisfied.
    return away === 0 || toward / away >= intent.ratio
  }

  const current = sessionsInWindow(sessions, 0)
  const satisfiedLast7d = predicate(current)
  const towardNow = fauSetVolume(current, intent.toward)
  const awayNow = fauSetVolume(current, intent.away_from)

  return {
    intent,
    satisfiedLast7d,
    lastSatisfiedDaysAgo: findLastSatisfiedDaysAgo(sessions, predicate),
    evidence: satisfiedLast7d
      ? `${towardNow} set(s) toward vs ${awayNow} away in the last ${WINDOW_DAYS} days (target ratio ${intent.ratio})`
      : undefined,
    evaluable: true,
  }
}

/**
 * Evaluate a single weekly intent against a user's recent sessions.
 *
 * @param intent   The structured intent (see WeeklyIntent union).
 * @param sessions Completed sessions with whole-day `daysAgo` and per-movement
 *                 working sets. Warmups should be pre-excluded by the caller.
 * @param ewmaMap  movement pattern → gap-decayed EWMA e1RM estimate.
 */
export function evaluateWeeklyIntent(
  intent: WeeklyIntent,
  sessions: EvaluatedSession[],
  ewmaMap: MovementEwmaMap = {}
): WeeklyIntentVerdict {
  switch (intent.type) {
    case 'heavy_session':
      return evaluateHeavySession(intent, sessions, ewmaMap)
    case 'movement_frequency':
      return evaluateMovementFrequency(intent, sessions)
    case 'volume_tilt':
      return evaluateVolumeTilt(intent, sessions)
    case 'free_text':
      // Free text is not machine-evaluable; the LLM reads it verbatim.
      return {
        intent,
        satisfiedLast7d: false,
        lastSatisfiedDaysAgo: null,
        evaluable: false,
      }
  }
}

/** Evaluate every intent in a user's profile. */
export function evaluateWeeklyIntents(
  intents: WeeklyIntent[],
  sessions: EvaluatedSession[],
  ewmaMap: MovementEwmaMap = {}
): WeeklyIntentVerdict[] {
  return intents.map((intent) => evaluateWeeklyIntent(intent, sessions, ewmaMap))
}
