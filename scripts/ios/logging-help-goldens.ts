/**
 * Golden file for the iOS logging-help tests (work item 174, features/ios-app/logging-help.feature).
 *
 * Builds one synthetic history, writes it as a ripit-export v1 file (what the phone imports), and
 * records what the web computes for it with its own pure functions:
 *   lib/constants/intensity-presets.ts       RPE_PRESETS, RIR_PRESETS
 *   lib/format/last-session-reference.ts     formatLastSessionSummary (the "Last time" line)
 *   lib/workout/prefill.ts                   pickPrefillSourceSet, appliedSetToForm (tapping it)
 *   lib/stats/exercise-history-derivation.ts sessionE1RMs, allTimePRSessionIndex (History tab)
 * The queries that feed them (lib/queries/exercise-history.ts getBatchExercisePerformance and
 * getRecentExercisePerformances, limit 4 from app/api/exercises/[exerciseId]/history/route.ts) need
 * Postgres, so their composition is repeated here from their source (see `sessionsFor`).
 * ExerciseHistoryPanel's rules are repeated too: PR shown only when 2+ sessions have an e1RM,
 * warm-ups split from working sets. LastSessionReference shows a tappable line only with a summary.
 *
 * Regenerate (from the repo root):
 *   npx tsx scripts/ios/logging-help-goldens.ts
 * It writes ios/RipitCore/Tests/Fixtures/logging-help/history.json. Deterministic: run it twice and
 * `git diff` shows nothing. The Swift tests (LoggingHelpGoldenTests) are locked; unlock them if a
 * golden changes on purpose.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { RIR_PRESETS, RPE_PRESETS } from '@/lib/constants/intensity-presets'
import { formatLastSessionSummary } from '@/lib/format/last-session-reference'
import { allTimePRSessionIndex, sessionE1RMs } from '@/lib/stats/exercise-history-derivation'
import { appliedSetToForm, pickPrefillSourceSet } from '@/lib/workout/prefill'

const OUT = join(process.cwd(), 'ios/RipitCore/Tests/Fixtures/logging-help')
const HISTORY_SESSION_LIMIT = 4

// Bundled-catalog ids and names (prisma/seeds/exercise-definitions.json).
const EX = {
  bench: { id: 'cmiz7vjju0000vr0m4b1o6bec', name: 'Barbell Bench Press' },
  squat: { id: 'cmiz7vjpo0001vr0msv9of7ib', name: 'Barbell Back Squat' },
  row: { id: 'cmiz7vk1i0003vr0mqucd1f52', name: 'Barbell Row' },
  pullup: { id: 'cmiz7vkvr0008vr0m7rv3dapc', name: 'Pull-Up' },
  deadlift: { id: 'cmiz7vjvh0002vr0mtcmhiz70', name: 'Conventional Deadlift' },
  press: { id: 'cmiz7vk780004vr0md53c57bz', name: 'Overhead Press' },
} as const
type ExKey = keyof typeof EX

interface SetSpec {
  reps: number
  weight: number
  unit?: 'lbs' | 'kg'
  rpe?: number
  rir?: number
  warmup?: boolean
}
interface WorkoutSpec {
  /** UTC instant the workout finished. */
  at: string
  /** Completion name; null for a nameless ad-hoc workout ("Open Workout" on the web). */
  name: string | null
  archived?: boolean
  lifts: Array<[ExKey, SetSpec[]]>
}

// Oldest first. Each lift's cases are noted beside it.
const WORKOUTS: WorkoutSpec[] = [
  // bench: 5 sessions, the oldest the heaviest, so the PR is among the 4 shown only.
  { at: '2026-09-01T01:00:00Z', name: 'Push A', lifts: [['bench', [{ reps: 5, weight: 250 }]]] },
  {
    at: '2026-09-08T01:00:00Z', name: 'Push A', lifts: [
      ['bench', [{ reps: 5, weight: 185 }, { reps: 5, weight: 195 }]],
      // deadlift: an older session that ties the newer one's e1RM: the newer one gets the PR.
      ['deadlift', [{ reps: 3, weight: 315 }]],
      // pullup: bodyweight only, no e1RM.
      ['pullup', [{ reps: 10, weight: 0 }, { reps: 8, weight: 0 }]],
    ],
  },
  {
    at: '2026-09-15T01:00:00Z', name: null, lifts: [
      // bench: a tie inside a session; a heavier warm-up that must not count.
      ['bench', [{ reps: 5, weight: 300, warmup: true }, { reps: 6, weight: 190 }, { reps: 5, weight: 195 }]],
      ['deadlift', [{ reps: 3, weight: 315 }]],
      // squat: 15 reps (no 12-rep cap here, unlike Progress) beats a heavier triple; kg.
      ['squat', [{ reps: 3, weight: 140, unit: 'kg' }, { reps: 15, weight: 110, unit: 'kg' }]],
    ],
  },
  {
    at: '2026-09-22T01:00:00Z', name: 'Push B', lifts: [
      ['bench', [{ reps: 5, weight: 200, rpe: 8 }, { reps: 5, weight: 200, rpe: 8 }]],
      // pullup: one weighted session, so 2 sessions but only 1 with an e1RM: no PR.
      ['pullup', [{ reps: 8, weight: 25 }]],
      // row: an older session, then an archived newer one that still counts.
      ['row', [{ reps: 8, weight: 155, rir: 2 }]],
    ],
  },
  {
    at: '2026-09-29T01:00:00Z', name: 'Pull B', archived: true, lifts: [
      ['row', [{ reps: 8, weight: 165, rir: 2 }, { reps: 8, weight: 165, rir: 2 }, { reps: 8, weight: 165, rir: 2 }]],
    ],
  },
  {
    at: '2026-10-06T01:00:00Z', name: 'Legs', lifts: [
      // squat: mixed units in one session; the web's line shows raw numbers with the first set's unit.
      ['squat', [{ reps: 5, weight: 100, unit: 'kg', rpe: 8 }, { reps: 5, weight: 225, rpe: 9 }]],
      // deadlift: the latest session is warm-ups only: "Last logged sets were warmups", no tap.
      ['deadlift', [{ reps: 5, weight: 135, warmup: true }, { reps: 3, weight: 225, warmup: true }]],
    ],
  },
  {
    at: '2026-10-13T01:00:00Z', name: 'Push A', lifts: [
      // bench latest: uniform working sets with a warm-up first; a fractional weight; RPE uniform.
      ['bench', [
        { reps: 8, weight: 95, warmup: true },
        { reps: 5, weight: 202.5, rpe: 8 }, { reps: 5, weight: 202.5, rpe: 8 }, { reps: 5, weight: 202.5, rpe: 8 },
      ]],
      // press: one session only: an e1RM but no PR; RIR and RPE both uniform: RIR wins.
      ['press', [{ reps: 6, weight: 95, rir: 2, rpe: 8 }, { reps: 5, weight: 100, rir: 2, rpe: 8 }]],
      // pullup latest: bodyweight, varied reps: "BW × 12,10".
      ['pullup', [{ reps: 12, weight: 0 }, { reps: 10, weight: 0 }]],
    ],
  },
]

const LIFTS: ExKey[] = ['bench', 'squat', 'row', 'pullup', 'deadlift', 'press']

interface HistorySet {
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
  isWarmup: boolean
}
interface Session {
  completedAt: Date
  workoutName: string
  sets: HistorySet[]
}

function build() {
  const completions: object[] = []
  const all: Array<{ completedAt: Date; name: string | null; lifts: Map<ExKey, HistorySet[]> }> = []
  WORKOUTS.forEach((w, wi) => {
    const cid = `c-help-${String(wi + 1).padStart(3, '0')}`
    const completedAt = new Date(w.at)
    const startedAt = new Date(completedAt.getTime() - 3600 * 1000)
    const exercises: object[] = []
    const loggedSets: object[] = []
    const lifts = new Map<ExKey, HistorySet[]>()
    w.lifts.forEach(([key, specs], ei) => {
      const eid = `${cid}-e${ei + 1}`
      exercises.push({
        id: eid, name: EX[key].name, exerciseDefinitionId: EX[key].id, order: ei + 1, exerciseGroup: null,
        workoutId: null, notes: null, isOneOff: true, workoutCompletionId: cid, prescribedSets: [],
      })
      const sets = specs.map((s, si): HistorySet => ({
        setNumber: si + 1, reps: s.reps, weight: s.weight, weightUnit: s.unit ?? 'lbs',
        rpe: s.rpe ?? null, rir: s.rir ?? null, isWarmup: s.warmup ?? false,
      }))
      sets.forEach((s, si) => loggedSets.push({
        id: `${eid}-s${si + 1}`, ...s, exerciseId: eid, completionId: cid, createdAt: completedAt.toISOString(),
      }))
      lifts.set(key, sets)
    })
    completions.push({
      id: cid, workoutId: null, savedWorkoutId: null, completedAt: completedAt.toISOString(), startedAt: startedAt.toISOString(),
      status: 'completed', notes: null, isArchived: w.archived ?? false, cycleNumber: 1, isAdHoc: true, name: w.name,
      durationSeconds: 3600, sessionRpe: null, exercises, loggedSets,
    })
    all.push({ completedAt, name: w.name, lifts })
  })
  const file = {
    format: 'ripit-export',
    version: 1,
    exportedAt: '2026-10-20T00:00:00.000Z',
    userId: 'golden-user',
    settings: {},
    balanceSettings: {},
    customExercises: [],
    exerciseRefs: LIFTS.map((k) => ({ id: EX[k].id, name: EX[k].name })),
    programs: [],
    workoutCompletions: completions,
    savedWorkouts: [],
    pinnedExercises: [],
  }
  return { file, all }
}

/** getRecentExercisePerformances: completed (archived too), newest first, sets by setNumber. */
function sessionsFor(all: ReturnType<typeof build>['all'], key: ExKey, limit: number): Session[] {
  return all
    .filter((w) => w.lifts.has(key))
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    .slice(0, limit)
    .map((w) => ({
      completedAt: w.completedAt,
      workoutName: w.name ?? 'Open Workout',
      sets: [...(w.lifts.get(key) ?? [])].sort((a, b) => a.setNumber - b.setNumber),
    }))
}

function lastTime(all: ReturnType<typeof build>['all'], key: ExKey) {
  const [last] = sessionsFor(all, key, 1)
  if (!last) return null
  const { summary } = formatLastSessionSummary(last)
  // LastSessionReference: tappable only when there's a summary and a set to apply.
  const source = summary ? pickPrefillSourceSet([], last.sets) : null
  return {
    completedAt: last.completedAt,
    workoutName: last.workoutName,
    summary,
    fill: source ? appliedSetToForm(source, true) : null,
    fillWithoutEffort: source ? appliedSetToForm(source, false) : null,
  }
}

function history(all: ReturnType<typeof build>['all'], key: ExKey) {
  const sessions = sessionsFor(all, key, HISTORY_SESSION_LIMIT)
  const e1rms = sessionE1RMs(sessions)
  const prIndex = allTimePRSessionIndex(sessions)
  const showPR = e1rms.filter((v) => v !== null).length >= 2
  return sessions.map((s, i) => ({
    completedAt: s.completedAt,
    workoutName: s.workoutName,
    workingSets: s.sets.filter((x) => !x.isWarmup),
    warmupSets: s.sets.filter((x) => x.isWarmup),
    e1rm: e1rms[i],
    isPR: showPR && i === prIndex,
  }))
}

const { file, all } = build()
const golden = {
  about: 'One synthetic history; per lift the web\'s "Last time" line, its tap-to-fill, and the History tab.',
  generatedBy: 'scripts/ios/logging-help-goldens.ts',
  presets: { rpe: RPE_PRESETS, rir: RIR_PRESETS },
  file,
  lifts: Object.fromEntries(LIFTS.map((k) => [EX[k].id, { name: k, lastTime: lastTime(all, k), history: history(all, k) }])),
}
mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'history.json'), `${JSON.stringify(JSON.parse(JSON.stringify(golden)), null, 1)}\n`)
console.log('wrote history.json')
