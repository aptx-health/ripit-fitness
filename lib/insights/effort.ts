import { setEffort } from '@/lib/aggregates/compute'
import { round1 } from './stall'

/**
 * Effort numbers for the get_effort_summary MCP tool: how hard each rolling
 * 7-day week was, newest first. Raw numbers only; the agent decides what
 * counts as a hard week. Pure: the tool does the one query.
 */

export interface EffortSessionRow {
  completedAt: Date
  sessionRpe: number | null
  /** Every non-warmup set, whatever its weight or reps, so bodyweight work counts. */
  sets: Array<{ rpe: number | null; rir: number | null; exerciseDefinitionId: string }>
}

export interface EffortWeek {
  start: string
  end: string
  sessions: number
  workingSets: number
  ratedSets: number
  coveragePct: number | null
  avgEffort: number | null
  distribution: { le6: number; rpe7: number; rpe8: number; rpe9: number; rpe10: number }
  pctAtOrAbove9: number | null
  pctAt10: number | null
  exercisesTrained: number
  exercisesTopSetAt10: number
  sessionRpe: { count: number; avg: number | null }
}

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** Effort counts cut-short (abandoned) sessions too: the work was still done. */
export const EFFORT_SESSION_STATUSES = ['completed', 'abandoned']

const pct = (part: number, whole: number) => (whole === 0 ? null : round1((part / whole) * 100))
const avg = (values: number[]) => (values.length === 0 ? null : round1(values.reduce((s, v) => s + v, 0) / values.length))

function summarize(start: Date, end: Date, sessions: EffortSessionRow[]): EffortWeek {
  const distribution = { le6: 0, rpe7: 0, rpe8: 0, rpe9: 0, rpe10: 0 }
  const efforts: number[] = []
  const exercises = new Set<string>()
  // Hardest rated working set per exercise this week.
  const topEffort = new Map<string, number>()
  let workingSets = 0

  for (const session of sessions) {
    for (const set of session.sets) {
      workingSets++
      exercises.add(set.exerciseDefinitionId)
      const effort = setEffort(set)
      if (effort === null) continue
      efforts.push(effort)
      topEffort.set(set.exerciseDefinitionId, Math.max(effort, topEffort.get(set.exerciseDefinitionId) ?? -Infinity))
      const bucket = Math.round(effort)
      if (bucket <= 6) distribution.le6++
      else if (bucket === 7) distribution.rpe7++
      else if (bucket === 8) distribution.rpe8++
      else if (bucket === 9) distribution.rpe9++
      else distribution.rpe10++
    }
  }

  const sessionRpes = sessions.map((s) => s.sessionRpe).filter((v): v is number => v !== null)
  const rated = efforts.length
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    sessions: sessions.length,
    workingSets,
    ratedSets: rated,
    coveragePct: pct(rated, workingSets),
    avgEffort: avg(efforts),
    distribution,
    pctAtOrAbove9: pct(efforts.filter((e) => e >= 9).length, rated),
    pctAt10: pct(efforts.filter((e) => e >= 10).length, rated),
    exercisesTrained: exercises.size,
    exercisesTopSetAt10: [...topEffort.values()].filter((e) => e >= 10).length,
    sessionRpe: { count: sessionRpes.length, avg: avg(sessionRpes) },
  }
}

/** `weeks` rolling 7-day buckets ending at `now`; index 0 is the last 7 days. */
export function computeEffortSummary(sessions: EffortSessionRow[], weeks: number, now: Date): EffortWeek[] {
  return Array.from({ length: weeks }, (_, i) => {
    const end = new Date(now.getTime() - i * WEEK_MS)
    const start = new Date(end.getTime() - WEEK_MS)
    const inWeek = sessions.filter((s) => s.completedAt > start && s.completedAt <= end)
    return summarize(start, end, inWeek)
  })
}
