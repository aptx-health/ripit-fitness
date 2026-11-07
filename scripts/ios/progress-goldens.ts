/**
 * Golden files for the iOS Progress tests (work item 166, features/ios-app/progress.feature).
 *
 * Builds a few synthetic histories, writes each as a ripit-export v1 file (what the phone imports),
 * and records what the web computes for it with its own pure functions:
 *   lib/insights/progress.ts          summarizeWeeks, computeNormal, computeStreak, weekStartFor, weekBounds
 *   lib/insights/progress-records.ts  computeWeekRecords, computeWeekLifts, computeTrendNote
 *   lib/insights/lift-history.ts      computeLiftSessions, computeRepRecords, weeklySets, chartSeries
 * getWeeklyReport, getLiftHistory and loadPinned need Postgres, so their composition is repeated
 * here from their source (see `weeklyReport`, `liftPage` and `lastSet` below).
 *
 * Regenerate (from the repo root):
 *   npx tsx scripts/ios/progress-goldens.ts
 * It writes ios/RipitCore/Tests/Fixtures/progress/<name>.json. The output is deterministic: run it
 * twice and `git diff` shows nothing. The Swift tests (ProgressGoldenTests) are locked; unlock them
 * if a golden changes on purpose.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  type ChartRange,
  chartSeries,
  computeLiftSessions,
  computeRepRecords,
  type LiftSet,
  weeklySets,
} from '@/lib/insights/lift-history'
import {
  addWeeks,
  computeNormal,
  computeStreak,
  summarizeWeeks,
  weekBounds,
  weekStartFor,
} from '@/lib/insights/progress'
import {
  computeTrendNote,
  computeWeekLifts,
  computeWeekRecords,
  LBS_PER_KG,
  MAX_PR_REPS,
  type WeightUnit,
} from '@/lib/insights/progress-records'

const OUT = join(process.cwd(), 'ios/RipitCore/Tests/Fixtures/progress')
const TZ = 'America/Denver'

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
  /** Local start, America/Denver, e.g. '2026-11-02T18:00'. */
  at: string
  minutes?: number
  /** Minutes paused: the stored durationSeconds is this much shorter than finish minus start. */
  paused?: number
  /** Leave durationSeconds null, so the time is finish minus start. */
  noDuration?: boolean
  lifts: Array<[ExKey, SetSpec[]]>
  archived?: boolean
}
interface HistorySpec {
  name: string
  about: string
  now: string
  unit: WeightUnit
  target: number
  pins: ExKey[]
  /** Monday weeks to report on. */
  reportWeeks: string[]
  lifts: ExKey[]
  workouts: WorkoutSpec[]
}

// --- local time -----------------------------------------------------------------------------

/** A Denver wall-clock time as an instant (DST-aware), by trying both offsets. */
function denver(local: string): Date {
  for (const offset of ['-07:00', '-06:00']) {
    const d = new Date(`${local}:00${offset}`)
    const back = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(d)
    if (back.replace(' ', 'T') === local) return d
  }
  throw new Error(`no Denver time ${local}`)
}

// --- the export file ------------------------------------------------------------------------

interface Built {
  file: object
  history: LiftSet[]
  workouts: Array<{ completedAt: Date; startedAt: Date; durationSeconds: number | null; archived: boolean; sets: LiftSet[] }>
}

function build(spec: HistorySpec): Built {
  const completions: object[] = []
  const history: LiftSet[] = []
  const workouts: Built['workouts'] = []
  const used = new Set<ExKey>()
  spec.workouts.forEach((w, wi) => {
    const cid = `c-${spec.name}-${String(wi + 1).padStart(3, '0')}`
    const startedAt = denver(w.at)
    const elapsed = (w.minutes ?? 60) * 60
    const completedAt = new Date(startedAt.getTime() + elapsed * 1000)
    const durationSeconds = w.noDuration ? null : elapsed - (w.paused ?? 0) * 60
    const exercises: object[] = []
    const loggedSets: object[] = []
    const sets: LiftSet[] = []
    w.lifts.forEach(([key, specs], ei) => {
      used.add(key)
      const eid = `${cid}-e${ei + 1}`
      exercises.push({
        id: eid, name: EX[key].name, exerciseDefinitionId: EX[key].id, order: ei + 1, exerciseGroup: null,
        workoutId: null, notes: null, isOneOff: true, workoutCompletionId: cid, prescribedSets: [],
      })
      specs.forEach((s, si) => {
        const unit = s.unit ?? 'lbs'
        loggedSets.push({
          id: `${eid}-s${si + 1}`, setNumber: si + 1, reps: s.reps, weight: s.weight, weightUnit: unit,
          rpe: s.rpe ?? null, rir: s.rir ?? null, isWarmup: s.warmup ?? false, exerciseId: eid,
          completionId: cid, createdAt: completedAt.toISOString(),
        })
        const set: LiftSet = {
          completionId: cid, completedAt, exerciseDefinitionId: EX[key].id, name: EX[key].name,
          reps: s.reps, weight: s.weight, weightUnit: unit, isWarmup: s.warmup ?? false, rpe: s.rpe ?? null, rir: s.rir ?? null,
        }
        sets.push(set)
        if (!w.archived) history.push(set)
      })
    })
    completions.push({
      id: cid, workoutId: null, savedWorkoutId: null, completedAt: completedAt.toISOString(), startedAt: startedAt.toISOString(),
      status: 'completed', notes: null, isArchived: w.archived ?? false, cycleNumber: 1, isAdHoc: true, name: `Workout ${wi + 1}`,
      durationSeconds, sessionRpe: null, exercises, loggedSets,
    })
    workouts.push({ completedAt, startedAt, durationSeconds, archived: w.archived ?? false, sets })
  })
  for (const k of spec.pins) used.add(k)
  const file = {
    format: 'ripit-export',
    version: 1,
    exportedAt: new Date(spec.now).toISOString(),
    userId: 'golden-user',
    settings: {},
    balanceSettings: {},
    customExercises: [],
    exerciseRefs: [...used].map((k) => ({ id: EX[k].id, name: EX[k].name })),
    programs: [],
    workoutCompletions: completions,
    savedWorkouts: [],
    pinnedExercises: spec.pins.map((k, position) => ({
      id: `pin-${spec.name}-${position}`, userId: 'golden-user', exerciseDefinitionId: EX[k].id, position,
      createdAt: new Date(spec.now).toISOString(),
    })),
  }
  return { file, history, workouts }
}

// --- the report, as getWeeklyReport composes it ----------------------------------------------

/** loadPinned's lastSets: the best working set of the latest completed session before `before`. */
function lastSet(history: LiftSet[], id: string, before: Date, unit: WeightUnit) {
  const sets = history.filter((s) => s.exerciseDefinitionId === id && !s.isWarmup && s.completedAt < before)
  if (sets.length === 0) return null
  const latest = sets.reduce((a, b) =>
    b.completedAt > a.completedAt || (b.completedAt.getTime() === a.completedAt.getTime() && b.completionId < a.completionId) ? b : a)
  const rows = sets
    .filter((s) => s.completionId === latest.completionId)
    .map((s) => {
      const lbs = s.weightUnit === 'kg' ? s.weight * LBS_PER_KG : s.weight
      const e1rm = lbs <= 0 || s.reps > MAX_PR_REPS ? null : s.reps === 1 ? lbs : lbs * (1 + s.reps / 30)
      return { lbs, reps: s.reps, e1rm }
    })
    .sort((a, b) => (b.e1rm ?? -Infinity) - (a.e1rm ?? -Infinity) || b.lbs - a.lbs || b.reps - a.reps)
  const toUnit = (lbs: number) => (unit === 'kg' ? lbs / LBS_PER_KG : lbs)
  const r = rows[0]
  return { weight: toUnit(r.lbs), reps: r.reps, e1rm: r.e1rm == null ? null : toUnit(r.e1rm), completedAt: latest.completedAt }
}

function weeklyReport(spec: HistorySpec, built: Built, weekStart: string) {
  const now = new Date(spec.now)
  const counted = built.workouts.filter((w) => !w.archived)
  const weekStarts = Array.from({ length: 9 }, (_, i) => addWeeks(weekStart, i - 8))
  const rangeEnd = weekBounds(weekStart, TZ).end
  const shownStart = weekBounds(weekStart, TZ).start
  const summary = summarizeWeeks({
    workouts: counted.map((w) => ({ completedAt: w.completedAt, startedAt: w.startedAt, durationSeconds: w.durationSeconds, sets: w.sets })),
    cardio: [],
    weekStarts,
    timeZone: TZ,
  })
  const prior = summary.slice(0, 8)
  const current = summary[8]
  const first = counted.map((w) => w.completedAt).sort((a, b) => a.getTime() - b.getTime())[0]
  const firstWeek = first ? weekStartFor(first, TZ) : null
  const sinceFirst = firstWeek ? prior.filter((w) => w.weekStart >= firstWeek) : []

  // The streak over every week from the first workout's week (what olderStreakWeeks extends to).
  const allWeeks: string[] = []
  if (firstWeek) for (let w = firstWeek; w <= weekStart; w = addWeeks(w, 1)) allWeeks.push(w)
  const counts = summarizeWeeks({
    workouts: counted.map((w) => ({ completedAt: w.completedAt, startedAt: w.startedAt, durationSeconds: w.durationSeconds, sets: w.sets })),
    cardio: [],
    weekStarts: allWeeks,
    timeZone: TZ,
  }).map((w) => w.workouts)

  const lifts = computeWeekLifts(built.history, shownStart, rangeEnd, spec.unit)
  const weeks = summary.slice(1)
  const doneIds = new Set(built.history.filter((s) => !s.isWarmup && s.completedAt >= shownStart && s.completedAt < rangeEnd).map((s) => s.exerciseDefinitionId))
  const pinned = spec.pins.map((k) => {
    const id = EX[k].id
    const lift = lifts.find((l) => l.exerciseDefinitionId === id) ?? null
    return { exerciseDefinitionId: id, name: EX[k].name, lift, last: lift || doneIds.has(id) ? null : lastSet(built.history, id, rangeEnd, spec.unit) }
  })
  return {
    weekStart,
    isCurrentWeek: weekStartFor(now, TZ) === weekStart,
    target: spec.target,
    current,
    normal: computeNormal(sinceFirst),
    normalWeeks: sinceFirst.length,
    streak: computeStreak(counts, spec.target, now < rangeEnd),
    weeks,
    weightUnit: spec.unit,
    records: computeWeekRecords(built.history, shownStart, rangeEnd, spec.unit),
    lifts,
    trend: computeTrendNote(weeks, sinceFirst, { openWeek: now < rangeEnd }),
    pinned,
  }
}

// --- the lift page, as getLiftHistory composes it ---------------------------------------------

const RANGES: ChartRange[] = ['3M', '6M', '1Y', 'All']

function liftPage(spec: HistorySpec, built: Built, key: ExKey) {
  const now = new Date(spec.now)
  const history = built.history
    .filter((s) => s.exerciseDefinitionId === EX[key].id && !s.isWarmup)
    .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime() || a.completionId.localeCompare(b.completionId))
  const sessions = computeLiftSessions(history, spec.unit)
  const thisWeek = weekBounds(weekStartFor(now, TZ), TZ).start
  return {
    history: {
      name: EX[key].name,
      weightUnit: spec.unit,
      isBodyweight: history.length > 0 && history.every((s) => s.weight === 0),
      sessions,
      records: computeRepRecords(history, spec.unit, thisWeek),
      weeklySets: weeklySets(history, 'All', now, TZ),
    },
    charts: Object.fromEntries(RANGES.map((r) => [r, chartSeries(sessions, r, now, TZ)])),
  }
}

// --- the histories ----------------------------------------------------------------------------

/** A civil date plus `n` days. */
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/** `n` weeks of Mondays ending with `last`, oldest first. */
const mondays = (last: string, n: number) => Array.from({ length: n }, (_, i) => addWeeks(last, i - n + 1))

function basic(): HistorySpec {
  // Ten weeks of three workouts, then this week (open, now is Thursday): an e1RM PR on bench,
  // a rep PR on squat at 5 reps, a warm-up that must not count, ratings on most sets.
  const workouts: WorkoutSpec[] = []
  mondays('2026-10-26', 10).forEach((monday, i) => {
    const bench = 185 + i * 2.5
    const squat = 245 + i * 5
    workouts.push(
      { at: `${monday}T18:00`, lifts: [['bench', [{ reps: 5, weight: 135, warmup: true }, { reps: 5, weight: bench, rpe: 7 }, { reps: 5, weight: bench, rpe: 8 }]], ['row', [{ reps: 8, weight: 155, rir: 2 }]]] },
      { at: `${addDays(monday, 2)}T18:00`, lifts: [['squat', [{ reps: 5, weight: squat, rpe: 8 }, { reps: 3, weight: squat + 20, rpe: 9 }]]] },
      { at: `${addDays(monday, 4)}T09:30`, lifts: [['press', [{ reps: 6, weight: 95, rpe: 8 }]], ['pullup', [{ reps: 8, weight: 0 }]]] },
    )
  })
  workouts.push({ at: '2026-09-05T10:00', paused: 12, lifts: [['press', [{ reps: 10, weight: 70, rpe: 8 }]]] })
  // Sunday 20:30 in Denver is Monday in UTC: it belongs to the week of 12 Oct, not 19 Oct.
  workouts.push({ at: '2026-10-18T20:30', minutes: 40, noDuration: true, lifts: [['row', [{ reps: 8, weight: 150, rir: 3 }, { reps: 8, weight: 150, rir: 2 }]]] })
  workouts.push(
    { at: '2026-11-02T18:00', lifts: [['bench', [{ reps: 5, weight: 215, rpe: 9 }, { reps: 3, weight: 225, rpe: 10 }]], ['row', [{ reps: 8, weight: 160, rir: 1 }, { reps: 8, weight: 160, rir: 1 }, { reps: 8, weight: 160, rir: 0 }]]] },
    { at: '2026-11-04T07:15', lifts: [['squat', [{ reps: 5, weight: 300, rpe: 9 }, { reps: 12, weight: 185 }, { reps: 15, weight: 205 }]], ['press', [{ reps: 10, weight: 75, rpe: 9 }]]] },
  )
  return {
    name: 'basic',
    about: 'Ten steady weeks over the DST change, then an open week with e1RM PRs and a rep PR (press at 10 reps)',
    now: denver('2026-11-05T12:00').toISOString(),
    unit: 'lbs',
    target: 3,
    pins: ['squat', 'deadlift', 'pullup'],
    reportWeeks: ['2026-11-02', '2026-10-26'],
    lifts: ['bench', 'squat', 'pullup', 'press'],
    workouts,
  }
}

function mixedUnits(): HistorySpec {
  // Bench logged in kg and lbs over 14 months, shown in kg; a single (1 rep) and a bodyweight lift.
  const workouts: WorkoutSpec[] = []
  const starts = ['2025-09-08', '2025-10-13', '2026-01-12', '2026-04-06', '2026-06-01', '2026-08-03', '2026-09-14', '2026-10-05', '2026-10-19', '2026-10-26']
  starts.forEach((monday, i) => {
    const kg = i % 2 === 0
    workouts.push({
      at: `${monday}T17:30`,
      lifts: [
        ['bench', kg ? [{ reps: 5, weight: 80 + i * 2.5, unit: 'kg' }, { reps: 1, weight: 100 + i * 2, unit: 'kg' }] : [{ reps: 5, weight: 180 + i * 5 }, { reps: 8, weight: 155 + i * 4 }]],
        ['pullup', [{ reps: 6 + i, weight: 0 }, { reps: 4 + i, weight: 0 }]],
      ],
    })
  })
  // One rated set of three: under half rated, so the week has no effort.
  workouts.push({ at: '2026-11-03T17:30', lifts: [['bench', [{ reps: 5, weight: 105, unit: 'kg', rpe: 8 }, { reps: 5, weight: 230 }]], ['pullup', [{ reps: 17, weight: 0 }]]] })
  return {
    name: 'mixed-units',
    about: 'Bench in kg and lbs over 14 months, shown in kg; bodyweight pull-ups; charts for every range',
    now: denver('2026-11-06T20:00').toISOString(),
    unit: 'kg',
    target: 2,
    pins: ['bench', 'squat'],
    reportWeeks: ['2026-11-02'],
    lifts: ['bench', 'pullup'],
    workouts,
  }
}

function gapWeek(): HistorySpec {
  // Six weeks with a gap week and a light week, RPE rising for the last three, and an archived
  // workout that must not count anywhere. The shown week is closed (now is the next Tuesday).
  const w = (at: string, rpes: number[], weight = 200, archived = false): WorkoutSpec => ({
    at,
    archived,
    lifts: [['deadlift', rpes.map((rpe) => ({ reps: 5, weight, rpe }))]],
  })
  const five = (rpe: number) => [rpe, rpe, rpe, rpe, rpe]
  return {
    name: 'gap-week',
    about: 'A gap week, a light week, rising RPE, an archived workout, a 15-rep set; closed and open (empty) weeks',
    now: denver('2026-11-10T08:00').toISOString(),
    unit: 'lbs',
    target: 2,
    pins: ['deadlift', 'bench'],
    reportWeeks: ['2026-11-09', '2026-11-02', '2026-10-26'],
    lifts: ['deadlift'],
    workouts: [
      w('2026-09-21T18:00', five(7)), w('2026-09-23T18:00', five(7)),
      w('2026-09-28T18:00', five(7)), w('2026-09-30T18:00', five(7)),
      // 2026-10-05: gap week
      w('2026-10-12T18:00', [7, 7]),
      w('2026-10-19T18:00', [7, 7, 8, 8, 8]), w('2026-10-21T18:00', [7, 7, 8, 8, 8]),
      w('2026-10-26T18:00', five(8)), w('2026-10-28T18:00', five(8)), w('2026-10-29T18:00', five(10), 405, true),
      w('2026-11-02T18:00', [8, 8, 8, 9, 9], 225), w('2026-11-04T18:00', [8, 8, 8, 9, 9], 230),
      // 15 reps: past the 12-rep cap, so it is no e1RM record even though its Epley is higher.
      { at: '2026-11-06T18:00', lifts: [['deadlift', [{ reps: 15, weight: 250, rpe: 9 }]]] },
    ],
  }
}

// --- write ------------------------------------------------------------------------------------

function round(value: unknown): unknown {
  // Dates as ISO strings; everything else as JSON would.
  return JSON.parse(JSON.stringify(value))
}

mkdirSync(OUT, { recursive: true })
for (const spec of [basic(), mixedUnits(), gapWeek()]) {
  const built = build(spec)
  const golden = {
    about: spec.about,
    generatedBy: 'scripts/ios/progress-goldens.ts',
    timeZone: TZ,
    now: spec.now,
    unit: spec.unit,
    target: spec.target,
    file: built.file,
    weekStarts: built.workouts.map((w) => ({ instant: w.completedAt.toISOString(), weekStart: weekStartFor(w.completedAt, TZ) })),
    reports: Object.fromEntries(spec.reportWeeks.map((week) => [week, weeklyReport(spec, built, week)])),
    lifts: Object.fromEntries(spec.lifts.map((k) => [EX[k].id, liftPage(spec, built, k)])),
  }
  writeFileSync(join(OUT, `${spec.name}.json`), `${JSON.stringify(round(golden), null, 1)}\n`)
  console.log(`wrote ${spec.name}.json`)
}
