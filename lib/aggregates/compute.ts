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
import { epleyE1RM, gapDecayedEwma } from '@/lib/learning/math'
import { normalizeWeightToLbs } from '@/lib/stats/exercise-performance'
import type {
  AggregateSessionInput,
  AggregateSetInput,
  CalibrationObservation,
  ComputeInput,
  DataMaturity,
  MovementCalibration,
  PerFauAggregate,
  TrainingAggregates,
} from './types'

const DAY_MS = 24 * 60 * 60 * 1000
const CALIBRATION_WINDOW_DAYS = 30
const CALIBRATION_MIN_OBSERVATIONS = 3
const BASELINE_WEEKS = 8
const DETRAINING_MIN_DAYS = 10
const DETRAINING_MIN_PRIOR_SESSIONS = 3
const LOW_DATA_MIN_SESSIONS = 3
const LOW_DATA_MIN_SETS = 20
const ACR_MIN_28D_SETS = 20
const ESTABLISHED_MIN_SESSIONS = 10
const COLD_START_MIN_SESSIONS = 3
const MATURITY_MIN_SPAN_DAYS = 28

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

function computePerFau(
  input: ComputeInput,
  lowData: boolean,
  eightWeekStart: Date,
  currentWeekStart: Date
): PerFauAggregate[] {
  const { now, detailSessions } = input

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
    { length: BASELINE_WEEKS },
    () => new Map<string, number>()
  )
  for (const session of detailSessions) {
    const t = session.completedAt.getTime()
    if (t < eightWeekStart.getTime() || t >= currentWeekStart.getTime()) continue
    const weekIndex = Math.floor((t - eightWeekStart.getTime()) / (7 * DAY_MS))
    if (weekIndex < 0 || weekIndex >= BASELINE_WEEKS) continue
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

  const order = new Map(ALL_FAUS.map((f, i) => [f as string, i]))
  const result: PerFauAggregate[] = []
  for (const fau of presentFaus) {
    const weekly: number[] = []
    for (const wk of weekFauCounts) {
      const c = wk.get(fau) ?? 0
      if (c > 0) weekly.push(c)
    }
    const baseline = weekly.length >= 2 ? median(weekly) : null
    result.push({
      fau,
      rolling_7d_sets: sets7d.get(fau) ?? 0,
      rolling_14d_sets: sets14d.get(fau) ?? 0,
      sessions_14d: sessions14dByFau.get(fau) ?? 0,
      baseline_weekly_sets: baseline,
      low_data: lowData,
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

function computeCalibration(input: ComputeInput): MovementCalibration[] {
  const { now, detailSessions } = input

  // Per movement pattern: the top (max-e1RM) qualifying set from each session.
  const byPattern = new Map<string, TopSetObservation[]>()

  for (const session of detailSessions) {
    if (ageDays(now, session.completedAt) > CALIBRATION_WINDOW_DAYS) continue
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

  const result: MovementCalibration[] = []
  for (const [pattern, observations] of byPattern) {
    if (observations.length < CALIBRATION_MIN_OBSERVATIONS) continue

    const estimate = gapDecayedEwma(
      observations.map((o) => ({ weightLbs: o.e1rm, daysAgo: o.daysAgo }))
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

// ---------------------------------------------------------------------------
// Top-level
// ---------------------------------------------------------------------------

function computeDataMaturity(
  now: Date,
  qualifyingSessionsTotal: number,
  firstSessionAt: Date | null
): DataMaturity {
  if (qualifyingSessionsTotal < COLD_START_MIN_SESSIONS) return 'cold_start'
  const spanDays = firstSessionAt ? ageDays(now, firstSessionAt) : 0
  if (qualifyingSessionsTotal >= ESTABLISHED_MIN_SESSIONS && spanDays >= MATURITY_MIN_SPAN_DAYS) {
    return 'established'
  }
  return 'partial'
}

/**
 * Compute the full aggregates row for a user.
 *
 * `input.detailSessions` must be the trailing detail-window (>= ~70d) qualifying
 * sessions; `input.allTime` carries the all-time first/last/count needed for
 * freshness and maturity that may reach beyond that window.
 */
export function computeAggregates(input: ComputeInput): TrainingAggregates {
  const { now, detailSessions, allTime } = input

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
  const lowData = sessions14d.length < LOW_DATA_MIN_SESSIONS || sets14d < LOW_DATA_MIN_SETS

  // Freshness.
  const daysSinceAnySession = allTime.lastSessionAt
    ? Math.floor(ageDays(now, allTime.lastSessionAt))
    : null

  // Detraining gap: only when the gap is real and there was prior training.
  const detrainingGapDays =
    daysSinceAnySession != null &&
    daysSinceAnySession >= DETRAINING_MIN_DAYS &&
    allTime.qualifyingSessionsTotal >= DETRAINING_MIN_PRIOR_SESSIONS
      ? daysSinceAnySession
      : null

  // Calendar-week windows for the 8-week baselines.
  const currentWeekStart = startOfIsoWeekUtc(now)
  const eightWeekStart = new Date(currentWeekStart.getTime() - BASELINE_WEEKS * 7 * DAY_MS)

  // Whole-body weekly totals across the 8 complete weeks (zero weeks excluded).
  const weekTotals = new Array<number>(BASELINE_WEEKS).fill(0)
  for (const session of detailSessions) {
    const t = session.completedAt.getTime()
    if (t < eightWeekStart.getTime() || t >= currentWeekStart.getTime()) continue
    const weekIndex = Math.floor((t - eightWeekStart.getTime()) / (7 * DAY_MS))
    if (weekIndex < 0 || weekIndex >= BASELINE_WEEKS) continue
    weekTotals[weekIndex] += effectiveSets(session).length
  }
  const nonZeroWeeks = weekTotals.filter((c) => c > 0)
  const totalWeeklySetsBaseline = nonZeroWeeks.length >= 2 ? median(nonZeroWeeks) : null

  // Acute:chronic ratio — null until the chronic denominator is meaningful.
  const firstSessionSpanDays = allTime.firstSessionAt ? ageDays(now, allTime.firstSessionAt) : 0
  const acuteChronicRatio =
    sets28d < ACR_MIN_28D_SETS || firstSessionSpanDays < MATURITY_MIN_SPAN_DAYS
      ? null
      : round(sets7d / (sets28d / 4), 2)

  const perFau = computePerFau(input, lowData, eightWeekStart, currentWeekStart)
  const perMovementCalibration = computeCalibration(input)

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
    dataMaturity: computeDataMaturity(now, allTime.qualifyingSessionsTotal, allTime.firstSessionAt),
    perFau,
    perMovementCalibration,
  }
}
