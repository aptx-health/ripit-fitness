/**
 * Pure compute for the UserTrainingAggregates layer (issue #919).
 *
 * I/O-free: takes fetched, pre-filtered session rows plus `now` and returns the
 * stored row shape. All measurement rules follow docs/SUGGEST_PAYLOAD_SPEC.md:
 *   - effective set = non-warmup logged set (abandoned sessions count)
 *   - weights normalized to lbs; bodyweight-exercise weights excluded from EWMAs
 *   - effort on the RPE-equivalent scale: effort = rpe ?? (10 - rir)
 *
 * The recompute orchestrator (lib/aggregates/recompute.ts) owns all DB access
 * and passes only qualifying sessions (completed|abandoned with >= 1 non-warmup
 * set) into this function.
 */

import { ALL_FAUS } from '@/lib/fau-volume'
import {
  DEFAULT_EWMA_ALPHA,
  DEFAULT_TYPICAL_GAP_DAYS,
  epleyE1RM,
  gapDecayedEwma,
} from '@/lib/learning/math'
import {
  type HeavyThresholds,
  HEAVY_E1RM_FRACTION,
  HEAVY_EFFORT_RPE,
  type MovementEwma,
  type MovementEwmaMap,
  determineMovementHeavy,
} from '@/lib/learning/weekly-intent'
import { normalizeWeightToLbs } from '@/lib/stats/exercise-performance'
import type {
  AggregateSessionInput,
  AggregateSetInput,
  AggregatesOptions,
  CalibrationObservation,
  ComputeInput,
  DataMaturity,
  FauStatus,
  GoalProgress,
  GoalTrend,
  MovementCalibration,
  PerFauAggregate,
  TrainingAggregates,
} from './types'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Production threshold defaults. These are today's values; #937 will override
 * individual fields from an admin-editable config. Change behavior here, not by
 * editing call sites.
 */
export const DEFAULT_AGGREGATES_OPTIONS: AggregatesOptions = {
  lowDataMinSessions: 3,
  lowDataMinSets: 20,
  detrainingMinDays: 10,
  detrainingMinPriorSessions: 3,
  acrMin28dSets: 20,
  baselineWeeks: 8,
  calibrationWindowDays: 30,
  calibrationMinObservations: 3,
  ewmaAlpha: DEFAULT_EWMA_ALPHA,
  ewmaTypicalGapDays: DEFAULT_TYPICAL_GAP_DAYS,
  coldStartMinSessions: 3,
  establishedMinSessions: 10,
  maturityMinSpanDays: 28,
  fauStatusDeadband: 0.03,
  goalTrendStallBand: 0.02,
  goalProgressMinWeeks: 2,
  heavyE1rmFraction: HEAVY_E1RM_FRACTION,
  heavyEffortCutoff: HEAVY_EFFORT_RPE,
}

/** Merge caller overrides over the production defaults. */
export function resolveAggregatesOptions(
  overrides?: Partial<AggregatesOptions>
): AggregatesOptions {
  return overrides ? { ...DEFAULT_AGGREGATES_OPTIONS, ...overrides } : DEFAULT_AGGREGATES_OPTIONS
}

/** Minimum non-zero weeks required before a baseline median is emitted (structural). */
const BASELINE_MIN_NONZERO_WEEKS = 2

/** Days between an earlier date and `now` (float, non-negative). */
function ageDays(now: Date, when: Date): number {
  return (now.getTime() - when.getTime()) / DAY_MS
}

/** RPE-equivalent effort for a set, or null when neither RPE nor RIR was logged. */
function setEffort(set: AggregateSetInput): number | null {
  if (set.rpe != null) return set.rpe
  if (set.rir != null) return 10 - set.rir
  return null
}

/** Non-warmup sets — the "effective sets" that count toward volume. */
function effectiveSets(session: AggregateSessionInput): AggregateSetInput[] {
  return session.sets.filter((s) => !s.isWarmup)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function round(value: number, decimals = 1): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

const round4 = (value: number): number => round(value, 4)

/**
 * Keyword -> movement pattern interpretation for goal sentences. Deterministic
 * substring match against the lowercased goal; first hit (in array order) wins.
 * Not exhaustive by design — goals with no lift-specific interpretation are
 * simply omitted from goal_progress.
 */
const GOAL_PATTERN_KEYWORDS: ReadonlyArray<[RegExp, string]> = [
  [/\bdead ?lift/, 'hinge'],
  [/\brdl\b|romanian|hip ?thrust|good ?morning|\bhinge/, 'hinge'],
  [/\bsquat/, 'squat'],
  [/\blunge|split ?squat|bulgarian/, 'lunge'],
  [/\bbench|chest ?press|\bpush ?up|horizontal ?push/, 'horizontal_push'],
  [/overhead|\bohp\b|shoulder ?press|military|vertical ?push/, 'vertical_push'],
  [/pull ?up|chin ?up|lat ?pull|vertical ?pull/, 'vertical_pull'],
  [/\brow\b|horizontal ?pull/, 'horizontal_pull'],
]

/** Map a goal sentence to a movement pattern, or null when uninterpretable. */
function interpretGoalPattern(goal: string): string | null {
  const g = goal.toLowerCase()
  for (const [re, pattern] of GOAL_PATTERN_KEYWORDS) {
    if (re.test(g)) return pattern
  }
  return null
}

/** Start (00:00:00.000 UTC) of the Monday-based week containing `d`. */
function startOfIsoWeekUtc(d: Date): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = out.getUTCDay() // 0 = Sunday .. 6 = Saturday
  const daysFromMonday = (dow + 6) % 7
  out.setUTCDate(out.getUTCDate() - daysFromMonday)
  return out
}

// ---------------------------------------------------------------------------
// Per-FAU
// ---------------------------------------------------------------------------

/** Count effective sets per FAU (primary attribution) for the given sessions. */
function tallyFauSets(sessions: AggregateSessionInput[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const session of sessions) {
    for (const set of effectiveSets(session)) {
      for (const fau of set.primaryFAUs) {
        counts.set(fau, (counts.get(fau) ?? 0) + 1)
      }
    }
  }
  return counts
}

/** Most recent (min days-ago) session with an effective set for each FAU. */
function lastSessionByFau(now: Date, sessions: AggregateSessionInput[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const session of sessions) {
    const daysAgo = Math.floor(ageDays(now, session.completedAt))
    const faus = new Set<string>()
    for (const set of effectiveSets(session)) {
      for (const fau of set.primaryFAUs) faus.add(fau)
    }
    for (const fau of faus) {
      const prev = out.get(fau)
      if (prev == null || daysAgo < prev) out.set(fau, daysAgo)
    }
  }
  return out
}

/**
 * Most recent (min days-ago) **session-relative-heavy** session for each FAU.
 * A session is heavy for a FAU when it contains a movement (grouped by pattern)
 * that `determineMovementHeavy` flags AND that movement's sets attribute to the
 * FAU. Effort (RPE >= 8) fires regardless of pattern; the EWMA branch needs a
 * calibrated pattern; the intensityClass tag is the cold-start fallback.
 */
function lastHeavyByFau(
  now: Date,
  sessions: AggregateSessionInput[],
  ewmaMap: MovementEwmaMap,
  thresholds: HeavyThresholds
): Map<string, number> {
  const out = new Map<string, number>()
  for (const session of sessions) {
    const daysAgo = Math.floor(ageDays(now, session.completedAt))

    // Group this session's sets by movement pattern (null key allowed —
    // effort-based heaviness applies even to untagged movements).
    const byPattern = new Map<string, AggregateSetInput[]>()
    for (const set of session.sets) {
      const key = set.movementPattern ?? '__NULL__'
      const list = byPattern.get(key) ?? []
      list.push(set)
      byPattern.set(key, list)
    }

    for (const [key, sets] of byPattern) {
      const pattern = key === '__NULL__' ? null : key
      const intensityClass = sets.find((s) => s.intensityClass === 'heavy')
        ? 'heavy'
        : (sets.find((s) => s.intensityClass != null)?.intensityClass ?? null)
      const verdict = determineMovementHeavy(
        {
          movementPattern: pattern,
          intensityClass,
          sets: sets.map((s) => ({
            // Bodyweight-exercise weights are excluded from e1RM (mirror
            // calibration); effort still counts.
            weightLbs: s.isBodyweight ? 0 : normalizeWeightToLbs(s.weight, s.weightUnit),
            reps: s.reps,
            rpe: s.rpe,
            rir: s.rir,
            isWarmup: s.isWarmup,
          })),
        },
        pattern != null ? ewmaMap[pattern] : undefined,
        thresholds
      )
      if (!verdict.isHeavy) continue
      const faus = new Set<string>()
      for (const set of sets) {
        if (set.isWarmup) continue
        for (const fau of set.primaryFAUs) faus.add(fau)
      }
      for (const fau of faus) {
        const prev = out.get(fau)
        if (prev == null || daysAgo < prev) out.set(fau, daysAgo)
      }
    }
  }
  return out
}

function computePerFau(
  input: ComputeInput,
  opts: AggregatesOptions,
  lowData: boolean,
  eightWeekStart: Date,
  currentWeekStart: Date,
  ewmaMap: MovementEwmaMap
): PerFauAggregate[] {
  const { now, detailSessions } = input
  const baselineWeeks = opts.baselineWeeks
  const ratioTargets = input.ratioTargets ?? null

  const within = (days: number) =>
    detailSessions.filter((s) => ageDays(now, s.completedAt) <= days)

  const sets7d = tallyFauSets(within(7))
  const sets14d = tallyFauSets(within(14))

  // Sessions in rolling 14d that trained each FAU (>= 1 effective set).
  const sessions14dByFau = new Map<string, number>()
  for (const session of within(14)) {
    const fausInSession = new Set<string>()
    for (const set of effectiveSets(session)) {
      for (const fau of set.primaryFAUs) fausInSession.add(fau)
    }
    for (const fau of fausInSession) {
      sessions14dByFau.set(fau, (sessions14dByFau.get(fau) ?? 0) + 1)
    }
  }

  // Per-FAU weekly set totals across the 8 complete Mon-Sun weeks (zero weeks
  // excluded from the baseline median).
  const weekFauCounts: Map<string, number>[] = Array.from(
    { length: baselineWeeks },
    () => new Map<string, number>()
  )
  for (const session of detailSessions) {
    const t = session.completedAt.getTime()
    if (t < eightWeekStart.getTime() || t >= currentWeekStart.getTime()) continue
    const weekIndex = Math.floor((t - eightWeekStart.getTime()) / (7 * DAY_MS))
    if (weekIndex < 0 || weekIndex >= baselineWeeks) continue
    for (const set of effectiveSets(session)) {
      for (const fau of set.primaryFAUs) {
        const wk = weekFauCounts[weekIndex]
        wk.set(fau, (wk.get(fau) ?? 0) + 1)
      }
    }
  }

  // A FAU is present if it has >= 1 effective set in the trailing 8 weeks
  // (including the current partial week — recent activity should not omit it).
  const presentFaus = new Set<string>()
  for (const session of detailSessions) {
    if (session.completedAt.getTime() < eightWeekStart.getTime()) continue
    for (const set of effectiveSets(session)) {
      for (const fau of set.primaryFAUs) presentFaus.add(fau)
    }
  }

  const lastSession = lastSessionByFau(now, within(baselineWeeks * 7 + 14))
  const lastHeavy = lastHeavyByFau(now, within(baselineWeeks * 7 + 14), ewmaMap, {
    heavyE1rmFraction: opts.heavyE1rmFraction,
    heavyEffortCutoff: opts.heavyEffortCutoff,
  })

  // Zero-sum shares: target_share (from ratioTargets, default weight 1.0) and
  // actual_14d_share are both normalized over the emitted (present) FAUs so
  // they each sum to 1 and deficit_share cancels total volume out.
  const presentList = [...presentFaus]
  const targetWeightSum = presentList.reduce(
    (sum, fau) => sum + (ratioTargets?.[fau] ?? 1.0),
    0
  )
  const total14d = presentList.reduce((sum, fau) => sum + (sets14d.get(fau) ?? 0), 0)

  const order = new Map(ALL_FAUS.map((f, i) => [f as string, i]))
  const result: PerFauAggregate[] = []
  for (const fau of presentFaus) {
    const weekly: number[] = []
    for (const wk of weekFauCounts) {
      const c = wk.get(fau) ?? 0
      if (c > 0) weekly.push(c)
    }
    const baseline = weekly.length >= BASELINE_MIN_NONZERO_WEEKS ? median(weekly) : null

    const targetShare = targetWeightSum > 0 ? round4((ratioTargets?.[fau] ?? 1.0) / targetWeightSum) : 0
    const actualShare = total14d > 0 ? round4((sets14d.get(fau) ?? 0) / total14d) : 0
    const deficit = round4(targetShare - actualShare)
    const status: FauStatus = deficit > opts.fauStatusDeadband ? 'neglected' : deficit < -opts.fauStatusDeadband ? 'over' : 'balanced'

    result.push({
      fau,
      last_session_days_ago: lastSession.get(fau) ?? null,
      last_heavy_days_ago: lastHeavy.get(fau) ?? null,
      rolling_7d_sets: sets7d.get(fau) ?? 0,
      rolling_14d_sets: sets14d.get(fau) ?? 0,
      sessions_14d: sessions14dByFau.get(fau) ?? 0,
      baseline_weekly_sets: baseline,
      target_share: targetShare,
      actual_14d_share: actualShare,
      deficit_share: deficit,
      low_data: lowData,
      // Suppressed under low data — a cheap model echoes whatever label it gets.
      ...(lowData ? {} : { status }),
    })
  }

  // Stable order: known FAUs by taxonomy order, then any unknown keys alphabetically.
  result.sort((a, b) => {
    const ai = order.get(a.fau) ?? Number.MAX_SAFE_INTEGER
    const bi = order.get(b.fau) ?? Number.MAX_SAFE_INTEGER
    return ai !== bi ? ai - bi : a.fau.localeCompare(b.fau)
  })
  return result
}

// ---------------------------------------------------------------------------
// Per-movement calibration
// ---------------------------------------------------------------------------

interface TopSetObservation {
  daysAgo: number
  weightLbs: number
  e1rm: number
  reps: number
  effort: number | null
}

/**
 * Per movement pattern, the top (max-e1RM) qualifying set from each session
 * within the calibration window. Shared by calibration and goal_progress.
 * Excludes warmups, bodyweight-exercise weights, and untagged movements.
 */
function collectTopSetsByPattern(
  input: ComputeInput,
  opts: AggregatesOptions
): Map<string, TopSetObservation[]> {
  const { now, detailSessions } = input
  const byPattern = new Map<string, TopSetObservation[]>()

  for (const session of detailSessions) {
    if (ageDays(now, session.completedAt) > opts.calibrationWindowDays) continue
    const daysAgo = ageDays(now, session.completedAt)

    // Best set per pattern within this single session.
    const sessionBest = new Map<string, TopSetObservation>()
    for (const set of session.sets) {
      if (set.isWarmup || set.isBodyweight) continue
      if (!set.movementPattern) continue
      if (set.reps < 1) continue
      const weightLbs = normalizeWeightToLbs(set.weight, set.weightUnit)
      if (!(weightLbs > 0)) continue
      const e1rm = epleyE1RM(weightLbs, set.reps)
      const existing = sessionBest.get(set.movementPattern)
      if (!existing || e1rm > existing.e1rm) {
        sessionBest.set(set.movementPattern, {
          daysAgo,
          weightLbs,
          e1rm,
          reps: set.reps,
          effort: setEffort(set),
        })
      }
    }
    for (const [pattern, obs] of sessionBest) {
      const list = byPattern.get(pattern) ?? []
      list.push(obs)
      byPattern.set(pattern, list)
    }
  }
  return byPattern
}

function computeCalibration(
  byPattern: Map<string, TopSetObservation[]>,
  opts: AggregatesOptions
): MovementCalibration[] {
  const result: MovementCalibration[] = []
  for (const [pattern, observations] of byPattern) {
    if (observations.length < opts.calibrationMinObservations) continue

    const estimate = gapDecayedEwma(
      observations.map((o) => ({ weightLbs: o.e1rm, daysAgo: o.daysAgo })),
      { alpha: opts.ewmaAlpha, typicalGapDays: opts.ewmaTypicalGapDays }
    )
    // Guaranteed non-null: observations.length >= 3.
    const ewma = estimate.estimateLbs ?? 0
    const staleness = estimate.estimateStalenessDays ?? 0

    const efforts = observations.map((o) => o.effort).filter((e): e is number => e != null)
    const avgEffort = efforts.length > 0 ? round(efforts.reduce((a, b) => a + b, 0) / efforts.length) : null

    const reps = observations.map((o) => o.reps)
    const minReps = Math.min(...reps)
    const maxReps = Math.max(...reps)
    const repRange = minReps === maxReps ? String(minReps) : `${minReps}-${maxReps}`

    // Last <= 5 observations, oldest -> newest.
    const recent: CalibrationObservation[] = [...observations]
      .sort((a, b) => b.daysAgo - a.daysAgo)
      .slice(-5)
      .map((o) => ({ weight_lbs: round(o.weightLbs), days_ago: Math.floor(o.daysAgo) }))

    result.push({
      movement_pattern: pattern,
      ewma_e1rm_lbs: round(ewma),
      estimate_staleness_days: Math.floor(staleness),
      avg_effort_rpe_equiv: avgEffort,
      typical_rep_range: repRange,
      observation_count: observations.length,
      recent_observations: recent,
      last_session_days_ago: Math.floor(Math.min(...observations.map((o) => o.daysAgo))),
    })
  }

  result.sort((a, b) => a.movement_pattern.localeCompare(b.movement_pattern))
  return result
}

/**
 * Field adapter: build the movement-pattern EWMA map the weekly-intent heavy
 * machinery consumes. Calibration emits `ewma_e1rm_lbs` / `observation_count`;
 * `determineMovementHeavy` wants `ewmaE1RMLbs` / `observationCount`. Only
 * patterns with >= calibrationMinObservations appear (they were the only ones
 * emitted); everything else falls back to effort/tag heaviness by construction.
 */
function buildEwmaMap(calibration: MovementCalibration[]): MovementEwmaMap {
  const map: MovementEwmaMap = {}
  for (const c of calibration) {
    const ewma: MovementEwma = {
      ewmaE1RMLbs: c.ewma_e1rm_lbs,
      observationCount: c.observation_count,
    }
    map[c.movement_pattern] = ewma
  }
  return map
}

// ---------------------------------------------------------------------------
// goal_progress
// ---------------------------------------------------------------------------

/** Classify the e1RM series' first->last relative change into a trend. */
function classifyTrend(e1rmSeries: number[], weeksObserved: number, opts: AggregatesOptions): GoalTrend {
  if (weeksObserved < opts.goalProgressMinWeeks || e1rmSeries.length < 2) return 'new'
  const first = e1rmSeries[0]
  const last = e1rmSeries[e1rmSeries.length - 1]
  if (!(first > 0)) return 'new'
  const rel = (last - first) / first
  if (rel > opts.goalTrendStallBand) return 'progressing'
  if (rel < -opts.goalTrendStallBand) return 'regressing'
  return 'stalled'
}

function computeGoalProgress(
  goals: string[],
  byPattern: Map<string, TopSetObservation[]>,
  opts: AggregatesOptions
): GoalProgress[] {
  const result: GoalProgress[] = []
  for (const goal of goals) {
    const pattern = interpretGoalPattern(goal)
    if (!pattern) continue // uninterpretable goals are omitted

    // Oldest -> newest observations for the mapped pattern (may be empty).
    const observations = [...(byPattern.get(pattern) ?? [])].sort((a, b) => b.daysAgo - a.daysAgo)
    const e1rmSeries = observations.map((o) => o.e1rm)
    const recentTopSets = observations.slice(-5).map((o) => round(o.weightLbs))
    // Distinct 7-day buckets observed within the calibration window.
    const weeksObserved = new Set(observations.map((o) => Math.floor(o.daysAgo / 7))).size

    result.push({
      goal,
      interpretation: `${pattern} EWMA + e1RM trend`,
      recent_top_sets_lbs: recentTopSets,
      trend: classifyTrend(e1rmSeries, weeksObserved, opts),
      weeks_observed: weeksObserved,
    })
  }
  return result
}

// ---------------------------------------------------------------------------
// Top-level
// ---------------------------------------------------------------------------

function computeDataMaturity(
  now: Date,
  qualifyingSessionsTotal: number,
  firstSessionAt: Date | null,
  opts: AggregatesOptions
): DataMaturity {
  if (qualifyingSessionsTotal < opts.coldStartMinSessions) return 'cold_start'
  const spanDays = firstSessionAt ? ageDays(now, firstSessionAt) : 0
  if (qualifyingSessionsTotal >= opts.establishedMinSessions && spanDays >= opts.maturityMinSpanDays) {
    return 'established'
  }
  return 'partial'
}

/**
 * Compute the full aggregates row for a user. Pure and I/O-free — the same core
 * serves both the persisting recompute job and #937's dry-run payload preview.
 *
 * `input.detailSessions` must be the trailing detail-window (>= ~70d) qualifying
 * sessions; `input.allTime` carries the all-time first/last/count needed for
 * freshness and maturity that may reach beyond that window. `options` overrides
 * individual thresholds; omit for today's production defaults.
 */
export function computeAggregates(
  input: ComputeInput,
  options?: Partial<AggregatesOptions>
): TrainingAggregates {
  const { now, detailSessions, allTime } = input
  const opts = resolveAggregatesOptions(options)

  const within = (days: number) =>
    detailSessions.filter((s) => ageDays(now, s.completedAt) <= days)

  const countEffective = (sessions: AggregateSessionInput[]) =>
    sessions.reduce((sum, s) => sum + effectiveSets(s).length, 0)

  const sessions7d = within(7)
  const sessions14d = within(14)
  const sessions28d = within(28)

  const sets7d = countEffective(sessions7d)
  const sets28d = countEffective(sessions28d)
  const sets14d = countEffective(sessions14d)

  // Whole-body low-data flag (shared across all per-FAU rows).
  const lowData = sessions14d.length < opts.lowDataMinSessions || sets14d < opts.lowDataMinSets

  // Freshness.
  const daysSinceAnySession = allTime.lastSessionAt
    ? Math.floor(ageDays(now, allTime.lastSessionAt))
    : null

  // Detraining gap: only when the gap is real and there was prior training.
  const detrainingGapDays =
    daysSinceAnySession != null &&
    daysSinceAnySession >= opts.detrainingMinDays &&
    allTime.qualifyingSessionsTotal >= opts.detrainingMinPriorSessions
      ? daysSinceAnySession
      : null

  // Calendar-week windows for the baseline (default 8 complete Mon-Sun weeks).
  const currentWeekStart = startOfIsoWeekUtc(now)
  const eightWeekStart = new Date(currentWeekStart.getTime() - opts.baselineWeeks * 7 * DAY_MS)

  // Whole-body weekly totals across the complete weeks (zero weeks excluded).
  const weekTotals = new Array<number>(opts.baselineWeeks).fill(0)
  for (const session of detailSessions) {
    const t = session.completedAt.getTime()
    if (t < eightWeekStart.getTime() || t >= currentWeekStart.getTime()) continue
    const weekIndex = Math.floor((t - eightWeekStart.getTime()) / (7 * DAY_MS))
    if (weekIndex < 0 || weekIndex >= opts.baselineWeeks) continue
    weekTotals[weekIndex] += effectiveSets(session).length
  }
  const nonZeroWeeks = weekTotals.filter((c) => c > 0)
  const totalWeeklySetsBaseline =
    nonZeroWeeks.length >= BASELINE_MIN_NONZERO_WEEKS ? median(nonZeroWeeks) : null

  // Acute:chronic ratio — null until the chronic denominator is meaningful.
  const firstSessionSpanDays = allTime.firstSessionAt ? ageDays(now, allTime.firstSessionAt) : 0
  const acuteChronicRatio =
    sets28d < opts.acrMin28dSets || firstSessionSpanDays < opts.maturityMinSpanDays
      ? null
      : round(sets7d / (sets28d / 4), 2)

  const topSetsByPattern = collectTopSetsByPattern(input, opts)
  const perMovementCalibration = computeCalibration(topSetsByPattern, opts)
  const ewmaMap = buildEwmaMap(perMovementCalibration)
  const perFau = computePerFau(input, opts, lowData, eightWeekStart, currentWeekStart, ewmaMap)
  const goalProgress = computeGoalProgress(input.goals ?? [], topSetsByPattern, opts)

  return {
    computedAt: now,
    sessionsLast7d: sessions7d.length,
    daysSinceAnySession,
    lastSessionAt: allTime.lastSessionAt,
    firstSessionAt: allTime.firstSessionAt,
    qualifyingSessionsTotal: allTime.qualifyingSessionsTotal,
    totalWeeklySetsBaseline,
    acuteChronicRatio,
    detrainingGapDays,
    dataMaturity: computeDataMaturity(
      now,
      allTime.qualifyingSessionsTotal,
      allTime.firstSessionAt,
      opts
    ),
    perFau,
    perMovementCalibration,
    goalProgress,
  }
}
