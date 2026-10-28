import { epleyE1RM } from '@/lib/learning/math'
import { bestWorkingSet } from '@/lib/stats/exercise-history-derivation'
import { normalizeWeightToLbs } from '@/lib/stats/exercise-performance'

/**
 * Stall numbers for the get_stall_signals MCP tool: per exercise, the best
 * working-set e1RM of each recent session and how it moved. Raw numbers only;
 * the agent decides what counts as a stall. Pure: the tool does the one query.
 */

/** One loaded working set (non-warmup, weight > 0, reps > 0) with the session and exercise it belongs to. */
export interface StallSetRow {
  completionId: string
  completedAt: Date
  exerciseDefinitionId: string
  name: string
  reps: number
  weight: number
  weightUnit: string
}

export interface StallPoint {
  date: string
  e1rmLbs: number
  weight: number
  unit: string
  reps: number
}

export interface StallEntry {
  exerciseDefinitionId: string
  name: string
  sessionsAnalyzed: number
  spanDays: number
  firstDate: string
  lastDate: string
  earlyE1rmLbs: number
  lateE1rmLbs: number
  changePct: number | null
  bestE1rmLbs: number
  sessionsSinceBest: number
  repRange: { min: number; max: number }
  series: StallPoint[]
}

/** Stall counts finished sessions only: a cut-short workout shouldn't drag the average down. */
export const STALL_SESSION_STATUSES = ['completed']

const DAY_MS = 24 * 60 * 60 * 1000

export const round1 = (value: number) => Math.round(value * 10) / 10

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length

interface SessionBest {
  completedAt: Date
  e1rm: number
  set: { reps: number; weight: number; weightUnit: string; isWarmup: boolean }
}

function entryFor(defId: string, name: string, sessions: SessionBest[]): StallEntry {
  const e1rms = sessions.map((s) => s.e1rm)
  const early = mean(e1rms.slice(0, 2))
  const late = mean(e1rms.slice(-2))

  // Latest session wins a tie for best.
  let bestIndex = 0
  for (let i = 1; i < e1rms.length; i++) if (e1rms[i] >= e1rms[bestIndex]) bestIndex = i

  const reps = sessions.map((s) => s.set.reps)
  const first = sessions[0].completedAt
  const last = sessions[sessions.length - 1].completedAt
  return {
    exerciseDefinitionId: defId,
    name,
    sessionsAnalyzed: sessions.length,
    spanDays: Math.floor((last.getTime() - first.getTime()) / DAY_MS),
    firstDate: first.toISOString(),
    lastDate: last.toISOString(),
    earlyE1rmLbs: round1(early),
    lateE1rmLbs: round1(late),
    changePct: sessions.length < 2 ? null : round1(((late - early) / early) * 100),
    bestE1rmLbs: round1(e1rms[bestIndex]),
    sessionsSinceBest: e1rms.length - 1 - bestIndex,
    repRange: { min: Math.min(...reps), max: Math.max(...reps) },
    series: sessions.map((s) => ({
      date: s.completedAt.toISOString(),
      e1rmLbs: round1(s.e1rm),
      weight: s.set.weight,
      unit: s.set.weightUnit,
      reps: s.set.reps,
    })),
  }
}

/**
 * Group working sets by exercise, then by session; keep each session's best set
 * and the most recent `sessions` sessions. Sorted by changePct ascending
 * (nulls last), then by name.
 */
export function computeStallSignals(rows: StallSetRow[], sessions: number): StallEntry[] {
  const byExercise = new Map<string, { name: string; bySession: Map<string, StallSetRow[]> }>()
  for (const row of rows) {
    let exercise = byExercise.get(row.exerciseDefinitionId)
    if (!exercise) {
      exercise = { name: row.name, bySession: new Map() }
      byExercise.set(row.exerciseDefinitionId, exercise)
    }
    const sets = exercise.bySession.get(row.completionId) ?? []
    sets.push(row)
    exercise.bySession.set(row.completionId, sets)
  }

  const entries: StallEntry[] = []
  for (const [defId, { name, bySession }] of byExercise) {
    const bests: SessionBest[] = []
    for (const sets of bySession.values()) {
      const set = bestWorkingSet(sets.map((r) => ({ ...r, isWarmup: false })))
      if (!set) continue
      const e1rm = epleyE1RM(normalizeWeightToLbs(set.weight, set.weightUnit), set.reps)
      bests.push({ completedAt: sets[0].completedAt, e1rm, set })
    }
    if (bests.length === 0) continue
    bests.sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime())
    entries.push(entryFor(defId, name, bests.slice(-sessions)))
  }

  return entries.sort((a, b) => {
    if (a.changePct !== b.changePct) {
      if (a.changePct === null) return 1
      if (b.changePct === null) return -1
      return a.changePct - b.changePct
    }
    return a.name.localeCompare(b.name)
  })
}
