/**
 * Golden file for the iOS slice 6 tests (work item 179, features/ios-app/saved-workouts.feature).
 *
 * Builds one synthetic history and set of saved workouts, writes it as a ripit-export v1 file (what
 * the phone imports), and records what the web does with the same rows, using its own code against
 * the Postgres test database:
 *   lib/stats/workout-rollup.ts               computeWorkoutRollup (the summary after Finish)
 *   WorkoutRollupModal.tsx                    rendered in jsdom: its tiles, rows, trend words, the
 *                                             Save button and the suggested name
 *   app/api/workouts/saved                    POST (save), PATCH (pin, rename, archive, dismiss,
 *                                             restore), DELETE, [id]/start
 *   app/api/workouts/completions/[id]/repeat  POST (repeat a finished workout)
 *   lib/saved-workouts/groups.ts              groupSavedWorkouts with a fixed `now`
 *   lib/training/home.ts                      getTrainingHome: pinned and recent
 * Each section starts from a freshly seeded database. The clock is faked (Date only) to NOW, so the
 * routes' `new Date()` is fixed; ids the web makes (cuid) are left out of the golden.
 *
 * Regenerate (from the repo root, Docker running):
 *   npx vitest run --config scripts/ios/vitest.goldens.config.ts
 * It writes ios/RipitCore/Tests/Fixtures/saved-workouts/saved.json. Deterministic: run it twice and
 * `git diff` shows nothing. The Swift tests (SavedWorkouts*Tests) are locked; unlock them if a golden
 * changes on purpose.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PrismaClient } from '@prisma/client'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { NextRequest } from 'next/server'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'

const auth = vi.hoisted(() => ({ userId: 'golden-user' }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  const prisma = (await db()).getPrismaClient()
  return { prisma, default: prisma }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () => ({ user: { id: auth.userId, role: 'user', email: 'u@x.test' }, error: null }),
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: async () => null,
  workoutActionLimiter: {},
  destructiveOpLimiter: {},
}))
vi.mock('@/lib/logger', () => {
  const l = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
  return { logger: { ...l, child: () => l }, default: l }
})
vi.mock('@/lib/events', () => ({ recordEvent: () => {} }))
vi.mock('@/lib/coaching/links', () => ({ listTrainees: async () => [] }))
vi.mock('@/hooks/useUserSettings', () => ({ useUserSettings: () => ({ settings: null, updateSettings: vi.fn() }) }))

// jsdom has no ResizeObserver; the modal only uses it for its scroll fade.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

const OUT = join(process.cwd(), 'ios/RipitCore/Tests/Fixtures/saved-workouts')
const USER = auth.userId
/** "Now" for every section: Saturday 2026-11-07, noon in Denver. */
const NOW = new Date('2026-11-07T19:00:00.000Z')
const MIN = 60_000
const DAY = 86_400_000
const ago = (ms: number) => new Date(NOW.getTime() - ms)

// Bundled-catalog ids and names (prisma/seeds/exercise-definitions.json).
const EX = {
  bench: { id: 'cmiz7vjju0000vr0m4b1o6bec', name: 'Barbell Bench Press' },
  squat: { id: 'cmiz7vjpo0001vr0msv9of7ib', name: 'Barbell Back Squat' },
  row: { id: 'cmiz7vk1i0003vr0mqucd1f52', name: 'Barbell Row' },
  pullup: { id: 'cmiz7vkvr0008vr0m7rv3dapc', name: 'Pull-Up' },
  deadlift: { id: 'cmiz7vjvh0002vr0mtcmhiz70', name: 'Conventional Deadlift' },
  press: { id: 'cmiz7vk780004vr0md53c57bz', name: 'Overhead Press' },
  curl: { id: 'cmiz7vl1k0009vr0m306fts69', name: 'Barbell Curl' },
} as const
type ExKey = keyof typeof EX

interface SetSpec {
  reps: number
  weight: number
  unit?: 'kg'
  rpe?: number
  rir?: number
  warmup?: boolean
  /** setNumber, when not 1..n (an imported gap). */
  n?: number
}
interface LiftSpec {
  key: ExKey
  /** exercise.order; the list order is the order the sets were logged in. */
  order: number
  group?: string
  notes?: string
  sets: SetSpec[]
}
interface CompletionSpec {
  id: string
  name: string | null
  completedAt: string
  /** null: no start time (an old import). Default: an hour before completedAt. */
  startedAt?: string | null
  durationSeconds?: number | null
  archived?: boolean
  /** Logged against the program workout's own exercises (by key), not one-offs. */
  program?: boolean
  lifts: LiftSpec[]
}

// The program: one week, one workout. Its session c-prog is logged against these rows.
const PROGRAM = {
  id: 'p-gold', name: 'Strength Block', weekId: 'p-gold-w1', workoutId: 'p-gold-w1-d1', workoutName: 'Pull Day',
  exercises: [
    { key: 'row' as ExKey, order: 1, notes: null, group: null, sets: [{ reps: '8', rir: 2 }, { reps: '8', rir: 2 }] },
    { key: 'press' as ExKey, order: 2, notes: 'Strict, no leg drive', group: null, sets: [{ reps: '5' }] },
  ],
}
const programExerciseId = (key: ExKey) => `${PROGRAM.workoutId}-${key}`

// Oldest first. What each one is for is noted beside it.
const COMPLETIONS: CompletionSpec[] = [
  {
    // Old import: no start time, no duration (no Duration tile); 3 × 333.5 = 1000.5 → "1,001" (half up).
    id: 'c-old', name: 'Legs Old', completedAt: '2026-09-01T01:00:00.000Z', startedAt: null, durationSeconds: null,
    lifts: [{ key: 'squat', order: 1, sets: [{ reps: 3, weight: 333.5 }] }],
  },
  {
    // The previous bench, squat and pull-up for c-upper's "vs last" (c-bw is newer for pull-ups).
    id: 'c-push', name: 'Push A', completedAt: '2026-10-20T01:00:00.000Z',
    lifts: [
      { key: 'bench', order: 1, sets: [{ reps: 5, weight: 185 }, { reps: 5, weight: 185 }, { reps: 5, weight: 185 }] },
      { key: 'squat', order: 2, sets: [{ reps: 5, weight: 200 }] },
      { key: 'pullup', order: 3, sets: [{ reps: 10, weight: 0 }, { reps: 8, weight: 0 }] },
    ],
  },
  {
    // A program session: no Save; named after its workout; previous row and press for c-upper;
    // 45 s → "45s"; repeat copies the program exercise's name, notes and group.
    id: 'c-prog', name: null, completedAt: '2026-10-25T01:00:00.000Z', durationSeconds: 45, program: true,
    lifts: [
      { key: 'row', order: 1, sets: [{ reps: 8, weight: 155, rir: 2 }, { reps: 8, weight: 155, rir: 2 }, { reps: 8, weight: 155, rir: 2 }] },
      { key: 'press', order: 2, sets: [{ reps: 5, weight: 100 }, { reps: 5, weight: 100 }, { reps: 5, weight: 100 }, { reps: 5, weight: 100 }] },
    ],
  },
  {
    // Archived: no summary, never "last time" (c-edge's curl has none), not counted, not in Training's recent.
    id: 'c-arch', name: 'Archived Push', completedAt: '2026-10-28T01:00:00.000Z', archived: true,
    lifts: [{ key: 'bench', order: 1, sets: [{ reps: 5, weight: 500 }] }, { key: 'curl', order: 2, sets: [{ reps: 10, weight: 100 }] }],
  },
  {
    // Exactly 7 days before NOW: counts in "Last 7 Days".
    id: 'c-edge', name: 'Arms', completedAt: ago(7 * DAY).toISOString(),
    lifts: [{ key: 'curl', order: 1, sets: [{ reps: 10, weight: 60 }] }],
  },
  {
    // Bodyweight day: no volume, hero is Total Reps; 303 s → "5m 03s"; "+13 reps vs last"
    // (today's total reps against the previous top set's reps).
    id: 'c-bw', name: 'Pull-ups', completedAt: '2026-11-05T01:00:00.000Z', durationSeconds: 303,
    lifts: [{ key: 'pullup', order: 1, sets: [{ reps: 8, weight: 0 }, { reps: 8, weight: 0 }, { reps: 7, weight: 0 }] }],
  },
  {
    // Minimal: only a warm-up. Repeat still copies it.
    id: 'c-min', name: 'Quick one', completedAt: '2026-11-06T15:00:00.000Z', durationSeconds: 120,
    lifts: [{ key: 'bench', order: 1, sets: [{ reps: 10, weight: 45, warmup: true }] }],
  },
  {
    // Nothing logged: no Repeat; nameless ("Open Workout"); 0 s and no start → no duration.
    id: 'c-empty', name: null, completedAt: '2026-11-07T15:00:00.000Z', startedAt: null, durationSeconds: 0,
    lifts: [{ key: 'curl', order: 1, sets: [] }],
  },
  {
    // Archived and recent: left out of Training's 3 most recent.
    id: 'c-arch-new', name: 'Archived Today', completedAt: '2026-11-07T16:00:00.000Z', archived: true,
    lifts: [{ key: 'deadlift', order: 1, sets: [{ reps: 5, weight: 405 }] }],
  },
  {
    // The main summary, saved and repeated. Logged in a different order from exercise.order.
    id: 'c-upper', name: 'Upper', completedAt: '2026-11-07T18:00:00.000Z', durationSeconds: 3723,
    lifts: [
      // row: 3730 vs 3720 → +0.27% → "same as last"; top 156.25 → "156.3" (half up).
      { key: 'row', order: 4, group: 'A', sets: [{ reps: 8, weight: 155 }, { reps: 8, weight: 155 }, { reps: 8, weight: 156.25 }] },
      // bench: a heavier warm-up first; 2900 vs 2775 → +4.5% → "+5% vs last"; set numbers with a gap.
      { key: 'bench', order: 1, notes: 'Pause at chest', sets: [
        { reps: 8, weight: 95, warmup: true }, { reps: 5, weight: 195, rpe: 8 }, { reps: 5, weight: 195, rpe: 8, n: 4 }, { reps: 5, weight: 190, rpe: 9, n: 5 },
      ] },
      // press: 1950 vs 2000 (the program session) → -2.5% → "-2% vs last" (JS rounds half up).
      { key: 'press', order: 3, sets: [{ reps: 5, weight: 130 }, { reps: 5, weight: 130 }, { reps: 5, weight: 130 }] },
      // squat: kg and lbs mixed; the web adds raw numbers as lbs: 500 + 1125 = 1625 vs 1000 → "+63%".
      { key: 'squat', order: 2, sets: [{ reps: 5, weight: 100, unit: 'kg' }, { reps: 5, weight: 225 }] },
      // pull-up: bodyweight beside weighted lifts: 22 reps vs the previous top set's 8.
      { key: 'pullup', order: 5, group: 'A', sets: [{ reps: 12, weight: 0 }, { reps: 10, weight: 0 }] },
      // deadlift: warm-ups only: no row in the summary, but saved and repeated.
      { key: 'deadlift', order: 6, sets: [{ reps: 5, weight: 135, warmup: true }] },
      // curl: added, never logged: saved (no sets), not repeated.
      { key: 'curl', order: 7, sets: [] },
    ],
  },
]

/** A saved workout's plan; the default is one bench set. */
type Plan = Array<{ key: ExKey; order: number; notes?: string | null; group?: string | null; sets: Array<{ setNumber: number; reps: string; rir?: number | null; rpe?: number | null; isWarmup?: boolean }> }>
const PLAN: Plan = [{ key: 'bench', order: 1, sets: [{ setNumber: 1, reps: '5' }] }]
const RICH_PLAN: Plan = [
  { key: 'bench', order: 1, notes: 'Pause at chest', group: 'A', sets: [
    { setNumber: 1, reps: '10', isWarmup: true }, { setNumber: 2, reps: '5', rpe: 8 }, { setNumber: 3, reps: '3-5', rir: 2 },
  ] },
  { key: 'row', order: 2, group: 'A', sets: [{ setNumber: 1, reps: '8' }, { setNumber: 2, reps: '8' }] },
  { key: 'pullup', order: 3, sets: [] },
]

interface SavedSpec {
  id: string
  name: string
  origin?: 'session' | 'agent' | 'coach'
  createdAt: Date
  lastUsedAt?: Date
  pinnedAt?: Date
  archivedAt?: Date
  dismissedAt?: Date
  notes?: string
  plan?: Plan
}

// Every group, its sort, and the 30-day edge. Pinned has 6 (Training shows 5).
const SAVED: SavedSpec[] = [
  { id: 's-recent', name: 'Full Body', createdAt: ago(20 * DAY), lastUsedAt: ago(2 * DAY), notes: 'Keep rests short', plan: RICH_PLAN },
  { id: 's-recent-2', name: 'Leg Day', createdAt: ago(25 * DAY), lastUsedAt: ago(10 * DAY) },
  { id: 's-edge-in', name: 'Exactly 30 days', createdAt: ago(40 * DAY), lastUsedAt: ago(30 * DAY) },
  { id: 's-edge-out', name: 'Just over 30 days', createdAt: ago(40 * DAY), lastUsedAt: ago(30 * DAY + 1) },
  { id: 's-never', name: 'Never started', createdAt: ago(45 * DAY) },
  { id: 's-old', name: 'Old favourite', createdAt: ago(100 * DAY), lastUsedAt: ago(60 * DAY) },
  { id: 's-new', name: 'From my agent', origin: 'agent', createdAt: ago(60 * DAY) },
  { id: 's-new-2', name: 'From my coach', origin: 'coach', createdAt: ago(1 * DAY) },
  { id: 's-dismissed', name: 'Dismissed agent one', origin: 'agent', createdAt: ago(3 * DAY), dismissedAt: ago(2 * DAY) },
  { id: 's-agent-used', name: 'Agent, started', origin: 'agent', createdAt: ago(50 * DAY), lastUsedAt: ago(5 * DAY) },
  { id: 's-pin-1', name: 'Pinned newest', createdAt: ago(90 * DAY), lastUsedAt: ago(90 * DAY), pinnedAt: ago(1 * DAY) },
  { id: 's-pin-2', name: 'Pinned agent, unstarted', origin: 'agent', createdAt: ago(4 * DAY), pinnedAt: ago(2 * DAY) },
  { id: 's-pin-3', name: 'Pinned 3', createdAt: ago(30 * DAY), pinnedAt: ago(3 * DAY) },
  { id: 's-pin-4', name: 'Pinned 4', createdAt: ago(30 * DAY), pinnedAt: ago(4 * DAY) },
  { id: 's-pin-5', name: 'Pinned 5', createdAt: ago(30 * DAY), pinnedAt: ago(5 * DAY) },
  { id: 's-pin-6', name: 'Pinned oldest', createdAt: ago(30 * DAY), pinnedAt: ago(6 * DAY) },
  { id: 's-arch', name: 'Archived', createdAt: ago(30 * DAY), lastUsedAt: ago(1 * DAY), archivedAt: ago(5 * DAY) },
  { id: 's-arch-pinned', name: 'Archived, still pinned', createdAt: ago(30 * DAY), pinnedAt: ago(1 * DAY), archivedAt: ago(2 * DAY) },
]

function planData(plan: Plan) {
  return plan.map((p) => ({
    name: EX[p.key].name, exerciseDefinitionId: EX[p.key].id, order: p.order,
    notes: p.notes ?? null, exerciseGroup: p.group ?? null,
    sets: p.sets.map((s) => ({ setNumber: s.setNumber, reps: s.reps, rir: s.rir ?? null, rpe: s.rpe ?? null, isWarmup: s.isWarmup ?? false })),
  }))
}

// MARK: - Seeding: the same rows into Postgres and into the export file

function rowsFor(c: CompletionSpec) {
  const completedAt = new Date(c.completedAt)
  const startedAt = c.startedAt === null ? null : new Date(c.startedAt ?? completedAt.getTime() - 3600_000)
  const exercises: Array<Record<string, unknown>> = []
  const sets: Array<Record<string, unknown>> = []
  let seq = 0
  for (const lift of c.lifts) {
    const exerciseId = c.program ? programExerciseId(lift.key) : `${c.id}-${lift.key}`
    if (!c.program) {
      exercises.push({
        id: exerciseId, name: EX[lift.key].name, exerciseDefinitionId: EX[lift.key].id, order: lift.order,
        exerciseGroup: lift.group ?? null, workoutId: null, notes: lift.notes ?? null, isOneOff: true, workoutCompletionId: c.id,
      })
    }
    lift.sets.forEach((s, i) => {
      seq += 1
      sets.push({
        id: `${exerciseId}-${c.id}-s${i + 1}`, setNumber: s.n ?? i + 1, reps: s.reps, weight: s.weight, weightUnit: s.unit ?? 'lbs',
        rpe: s.rpe ?? null, rir: s.rir ?? null, isWarmup: s.warmup ?? false, exerciseId, completionId: c.id,
        // Logged a minute apart, in list order, from just after the start.
        createdAt: new Date((startedAt ?? new Date(completedAt.getTime() - 3600_000)).getTime() + seq * MIN),
      })
    })
  }
  const completion = {
    id: c.id, workoutId: c.program ? PROGRAM.workoutId : null, savedWorkoutId: null, completedAt, startedAt,
    status: 'completed', notes: null, isArchived: c.archived ?? false, cycleNumber: 1, isAdHoc: !c.program,
    name: c.name, durationSeconds: c.durationSeconds === undefined ? 3600 : c.durationSeconds, sessionRpe: null,
  }
  return { completion, exercises, sets }
}

const savedRow = (s: SavedSpec) => {
  const data = planData(s.plan ?? PLAN)
  return {
    id: s.id, name: s.name, notes: s.notes ?? null, sourceCompletionId: null, workoutData: data, exerciseCount: data.length,
    createdAt: s.createdAt, updatedAt: s.createdAt, lastUsedAt: s.lastUsedAt ?? null, pinnedAt: s.pinnedAt ?? null,
    origin: s.origin ?? 'session', archivedAt: s.archivedAt ?? null, dismissedAt: s.dismissedAt ?? null,
  }
}

const programExercises = () =>
  PROGRAM.exercises.map((e) => ({
    id: programExerciseId(e.key), name: EX[e.key].name, exerciseDefinitionId: EX[e.key].id, order: e.order,
    exerciseGroup: e.group, workoutId: PROGRAM.workoutId, notes: e.notes, isOneOff: false, workoutCompletionId: null,
    prescribedSets: e.sets.map((s, i) => ({
      id: `${programExerciseId(e.key)}-p${i + 1}`, setNumber: i + 1, reps: s.reps, weight: null,
      rpe: null, rir: 'rir' in s ? s.rir : null, isWarmup: false,
    })),
  }))

async function seed(prisma: PrismaClient) {
  const testDb = await getTestDatabase()
  await testDb.reset()
  for (const key of Object.keys(EX) as ExKey[]) {
    await prisma.exerciseDefinition.create({
      data: { id: EX[key].id, name: EX[key].name, normalizedName: EX[key].name.toLowerCase(), aliases: [], isSystem: true, userId: 'system' },
    })
  }
  await prisma.program.create({
    data: {
      id: PROGRAM.id, name: PROGRAM.name, userId: USER, isActive: true, isUserCreated: true,
      weeks: { create: { id: PROGRAM.weekId, weekNumber: 1, userId: USER, workouts: { create: { id: PROGRAM.workoutId, name: PROGRAM.workoutName, dayNumber: 1, userId: USER } } } },
    },
  })
  for (const e of programExercises()) {
    const { prescribedSets, ...exercise } = e
    await prisma.exercise.create({ data: { ...exercise, userId: USER } })
    await prisma.prescribedSet.createMany({ data: prescribedSets.map((s) => ({ ...s, exerciseId: e.id, userId: USER })) })
  }
  for (const c of COMPLETIONS) {
    const { completion, exercises, sets } = rowsFor(c)
    await prisma.workoutCompletion.create({ data: { ...completion, userId: USER } })
    for (const e of exercises) await prisma.exercise.create({ data: { ...e, userId: USER } as never })
    // One at a time, in logging order, so the rollup reads them back in that order.
    for (const s of sets) await prisma.loggedSet.create({ data: { ...s, userId: USER } as never })
  }
  for (const s of SAVED) await prisma.savedWorkout.create({ data: { ...savedRow(s), userId: USER } })
}

function exportFile() {
  const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d)
  const isoAll = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, iso(v)]))
  return {
    format: 'ripit-export',
    version: 1,
    exportedAt: NOW.toISOString(),
    userId: USER,
    settings: {},
    balanceSettings: {},
    customExercises: [],
    exerciseRefs: Object.values(EX).map((e) => ({ id: e.id, name: e.name })),
    programs: [{
      id: PROGRAM.id, name: PROGRAM.name, description: null, isActive: true, createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z', isUserCreated: true, programType: 'strength', isArchived: false, archivedAt: null,
      deletedAt: null, goals: [], level: null, durationWeeks: null, durationDisplay: null, targetDaysPerWeek: null,
      equipmentNeeded: [], focusAreas: [], sourceCommunityProgramId: null,
      weeks: [{ id: PROGRAM.weekId, weekNumber: 1, name: null, description: null, workouts: [{
        id: PROGRAM.workoutId, name: PROGRAM.workoutName, dayNumber: 1, exercises: programExercises(),
      }] }],
    }],
    workoutCompletions: COMPLETIONS.map((c) => {
      const { completion, exercises, sets } = rowsFor(c)
      return { ...isoAll(completion), exercises: exercises.map((e) => ({ ...e, prescribedSets: [] })), loggedSets: sets.map(isoAll) }
    }),
    savedWorkouts: SAVED.map((s) => isoAll(savedRow(s))),
    pinnedExercises: [],
  }
}

// MARK: - Calling the web

type Ctx = { params: Promise<{ id: string }> }
const ctx = (id: string): Ctx => ({ params: Promise.resolve({ id }) })
const req = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    ...(body !== undefined && { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  })
const clock = (at: Date) => vi.setSystemTime(at)

/** A draft as a plan: what start and repeat built (ids left out). */
async function draftPlan(prisma: PrismaClient, completionId: string) {
  const c = await prisma.workoutCompletion.findUniqueOrThrow({
    where: { id: completionId },
    include: { exercises: { orderBy: { order: 'asc' }, include: { prescribedSets: { orderBy: { setNumber: 'asc' } } } } },
  })
  const plan = {
    name: c.name, status: c.status, isAdHoc: c.isAdHoc, workoutId: c.workoutId, startedAt: c.startedAt,
    savedWorkoutId: c.savedWorkoutId,
    exercises: c.exercises.map((e) => ({
      name: e.name, exerciseDefinitionId: e.exerciseDefinitionId, order: e.order, notes: e.notes, exerciseGroup: e.exerciseGroup,
      sets: e.prescribedSets.map((s) => ({ setNumber: s.setNumber, reps: s.reps, weight: s.weight, rir: s.rir, rpe: s.rpe, isWarmup: s.isWarmup })),
    })),
  }
  // One open draft per user: clear it so the next start isn't refused.
  await prisma.workoutCompletion.delete({ where: { id: completionId } })
  return plan
}

const savedState = (r: { name: string; notes: string | null; lastUsedAt: Date | null; pinnedAt: Date | null; archivedAt: Date | null; dismissedAt: Date | null } | null) =>
  r && { name: r.name, notes: r.notes, lastUsedAt: r.lastUsedAt, pinnedAt: r.pinnedAt, archivedAt: r.archivedAt, dismissedAt: r.dismissedAt }

async function groupsOf(prisma: PrismaClient, now: Date) {
  const { groupSavedWorkouts } = await import('@/lib/saved-workouts/groups')
  const rows = await prisma.savedWorkout.findMany({ where: { userId: USER } })
  const items = rows.map((r) => ({
    id: r.id, origin: r.origin, lastUsedAt: r.lastUsedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString(),
    pinnedAt: r.pinnedAt?.toISOString() ?? null, archivedAt: r.archivedAt?.toISOString() ?? null,
    dismissedAt: r.dismissedAt?.toISOString() ?? null,
  }))
  const g = groupSavedWorkouts(items, now)
  const ids = (list: typeof items) => list.map((i) => i.id)
  return { new: ids(g.new), pinned: ids(g.pinned), recent: ids(g.recent), older: ids(g.older), archived: ids(g.archived) }
}

/** What WorkoutRollupModal shows for a rollup, read from the rendered page. */
async function view(rollup: unknown, at: Date) {
  const { WorkoutRollupModal } = await import('@/components/features/training/WorkoutRollupModal')
  clock(at)
  const { container } = render(createElement(WorkoutRollupModal, { open: true, rollup: rollup as never, onClose: () => {} }))
  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? null
  const big = [...container.querySelectorAll('.text-3xl')].slice(0, 2).map(text)
  const tiles = [...container.querySelectorAll('.grid.grid-cols-2 > div')].map((t) => ({ label: text(t.children[1]), value: text(t.children[0]) }))
  const exercises = [...container.querySelectorAll('.py-3.border-b')].map((row) => {
    const spans = row.children[1]?.querySelectorAll(':scope > span') ?? []
    return {
      name: text(row.querySelector('.text-base')),
      top: text(row.querySelector('.whitespace-nowrap')),
      line: text(spans[0]),
      trend: text(spans[1]),
    }
  })
  const note = [...container.querySelectorAll('p')].map(text).find((t) => t === 'Marked complete. Nice work.') ?? null
  const saveButton = [...container.querySelectorAll('button')].find((b) => text(b) === 'Save workout to repeat')
  let suggestedName: string | null = null
  if (saveButton) {
    fireEvent.click(saveButton)
    suggestedName = (container.querySelector('#rollup-save-name') as HTMLInputElement).value
  }
  cleanup()
  return { workoutNumber: big[0], last7Days: big[1], tiles, exercises, note, canSave: Boolean(saveButton), suggestedName }
}

// MARK: - The golden

describe('iOS slice 6 goldens', () => {
  it('writes saved.json', async () => {
    const prisma = (await getTestDatabase()).getPrismaClient()
    vi.useFakeTimers({ toFake: ['Date'], now: NOW })
    const { computeWorkoutRollup } = await import('@/lib/stats/workout-rollup')
    const savedRoute = await import('@/app/api/workouts/saved/route')
    const savedIdRoute = await import('@/app/api/workouts/saved/[id]/route')
    const startRoute = await import('@/app/api/workouts/saved/[id]/start/route')
    const repeatRoute = await import('@/app/api/workouts/completions/[id]/repeat/route')
    const { getTrainingHome } = await import('@/lib/training/home')

    // Rollups and what the modal shows.
    await seed(prisma)
    const rollups: Record<string, unknown> = {}
    for (const c of [...COMPLETIONS.map((x) => x.id), 'c-missing']) {
      clock(NOW)
      const r = await computeWorkoutRollup(prisma, c, USER)
      if (!r) {
        rollups[c] = { rollup: null }
        continue
      }
      const { workoutId: _w, isCommunitySourced: _s, ...rollup } = r
      rollups[c] = { rollup, view: await view(r, NOW) }
    }
    // The suggested name uses the local date when the summary opens: 22:30 in Denver is still the 7th.
    const upper = await computeWorkoutRollup(prisma, 'c-upper', USER)
    const suggestedNames = []
    for (const at of [NOW, new Date('2026-11-08T05:30:00.000Z'), new Date('2026-01-02T17:00:00.000Z')]) {
      suggestedNames.push({ at, name: (await view(upper, at)).suggestedName })
    }

    // Saving.
    await seed(prisma)
    clock(NOW)
    const save = async (body: Record<string, unknown>) => {
      const res = await savedRoute.POST(req('/api/workouts/saved', 'POST', body))
      const json = await res.json()
      const request = { sourceCompletionId: body.sourceCompletionId, name: body.name, notes: body.notes ?? null }
      if (res.status !== 200) return { request, status: res.status, error: json.error }
      const s = json.savedWorkout
      return {
        request, status: 200, name: s.name, notes: s.notes, sourceCompletionId: s.sourceCompletionId, workoutData: s.workoutData,
        exerciseCount: s.exerciseCount, lastUsedAt: s.lastUsedAt, origin: s.origin, pinnedAt: s.pinnedAt,
        archivedAt: s.archivedAt, dismissedAt: s.dismissedAt,
      }
    }
    const saves = {
      upper: await save({ sourceCompletionId: 'c-upper', name: '  Upper Repeat  ', notes: '  felt strong  ' }),
      upperAgain: await save({ sourceCompletionId: 'c-upper', name: 'Another name' }),
      bodyweight: await save({ sourceCompletionId: 'c-bw', name: 'Pull-ups', notes: '   ' }),
      minimal: await save({ sourceCompletionId: 'c-min', name: 'Quick one' }),
      program: await save({ sourceCompletionId: 'c-prog', name: 'Pull Day' }),
      blankName: await save({ sourceCompletionId: 'c-push', name: '   ' }),
      longName: await save({ sourceCompletionId: 'c-push', name: 'x'.repeat(101) }),
      longNotes: await save({ sourceCompletionId: 'c-push', name: 'Push', notes: 'n'.repeat(2001) }),
      // The web counts UTF-16 units: 51 emoji are 102, over the limit, though Swift counts 51 characters.
      emojiName: await save({ sourceCompletionId: 'c-push', name: '💪'.repeat(51) }),
      maxLengths: await save({ sourceCompletionId: 'c-push', name: 'x'.repeat(100), notes: 'n'.repeat(2000) }),
    }
    const savedCount = await prisma.savedWorkout.count({ where: { sourceCompletionId: 'c-upper' } })
    expect(savedCount).toBe(1)

    // Grouping and Training, on the seeded rows.
    await seed(prisma)
    const groups = await groupsOf(prisma, NOW)
    clock(NOW)
    const home = await getTrainingHome(USER)
    const training = {
      pinned: home.pinned.map((p) => ({ id: p.id, name: p.name, exerciseCount: p.exerciseCount, pinnedAt: p.pinnedAt })),
      recent: home.recent,
    }

    // Managing, step by step, a minute apart.
    await seed(prisma)
    const steps: Array<Record<string, unknown>> = []
    const STEPS: Array<[string, string, 'PATCH' | 'DELETE', unknown?]> = [
      ['pin', 's-recent', 'PATCH', { pinned: true }],
      ['pin again (keeps the first pin time)', 's-recent', 'PATCH', { pinned: true }],
      ['unpin', 's-recent', 'PATCH', { pinned: false }],
      ['archive a pinned one (unpins it)', 's-pin-1', 'PATCH', { archived: true }],
      ['restore (not pinned again; dismissed now)', 's-pin-1', 'PATCH', { archived: false }],
      ['dismiss a New one', 's-new', 'PATCH', { archived: true, dismissed: true }],
      ['restore it (keeps the dismiss time: Older, not New)', 's-new', 'PATCH', { archived: false }],
      ['archive one already dismissed', 's-dismissed', 'PATCH', { archived: true }],
      ['restore it (keeps its dismiss time)', 's-dismissed', 'PATCH', { archived: false }],
      ['rename (trimmed)', 's-recent-2', 'PATCH', { name: '  Leg Day v2  ' }],
      ['rename to blank (refused)', 's-recent-2', 'PATCH', { name: '   ' }],
      ['rename to 101 characters (refused)', 's-recent-2', 'PATCH', { name: 'x'.repeat(101) }],
      ['rename to 51 emoji (102 UTF-16 units, refused)', 's-recent-2', 'PATCH', { name: '💪'.repeat(51) }],
      ['rename an archived one', 's-arch', 'PATCH', { name: 'Archived, renamed' }],
      ['delete', 's-never', 'DELETE'],
      ['delete again (gone)', 's-never', 'DELETE'],
    ]
    for (const [i, [step, id, method, body]] of STEPS.entries()) {
      const at = new Date(NOW.getTime() + (i + 1) * MIN)
      clock(at)
      const res = method === 'DELETE'
        ? await savedIdRoute.DELETE(req(`/api/workouts/saved/${id}`, 'DELETE'), ctx(id))
        : await savedIdRoute.PATCH(req(`/api/workouts/saved/${id}`, 'PATCH', body), ctx(id))
      const error = res.status === 200 ? null : (await res.json()).error
      steps.push({ step, id, method, body: body ?? null, at, status: res.status, error, row: savedState(await prisma.savedWorkout.findUnique({ where: { id } })) })
    }
    const manage = { steps, groupsAfter: await groupsOf(prisma, new Date(NOW.getTime() + (STEPS.length + 1) * MIN)), groupsAfterAt: new Date(NOW.getTime() + (STEPS.length + 1) * MIN) }

    // Starting a saved workout, and repeating a finished one.
    await seed(prisma)
    const start = async (id: string) => {
      clock(NOW)
      const res = await startRoute.POST(req(`/api/workouts/saved/${id}/start`, 'POST'), ctx(id))
      const json = await res.json()
      const saved = savedState(await prisma.savedWorkout.findUnique({ where: { id } }))
      return res.status === 200 ? { id, status: 200, draft: await draftPlan(prisma, json.completionId), saved } : { id, status: res.status, error: json.error, saved }
    }
    const starts = { rich: await start('s-recent'), archived: await start('s-arch'), newOne: await start('s-new') }
    const repeat = async (id: string) => {
      clock(NOW)
      const res = await repeatRoute.POST(req(`/api/workouts/completions/${id}/repeat`, 'POST'), ctx(id))
      const json = await res.json()
      return res.status === 200 ? { id, status: 200, draft: await draftPlan(prisma, json.completionId) } : { id, status: res.status, error: json.error }
    }
    const repeats = {
      upper: await repeat('c-upper'), program: await repeat('c-prog'), minimal: await repeat('c-min'),
      empty: await repeat('c-empty'), archived: await repeat('c-arch'),
    }
    vi.useRealTimers()

    const golden = {
      about: 'One synthetic history and saved-workout list; the web\'s summary, saving, grouping, managing, start, repeat and Training lists for it.',
      generatedBy: 'scripts/ios/saved-workouts.goldens.ts',
      now: NOW,
      timeZone: process.env.TZ,
      file: exportFile(),
      rollups,
      suggestedNames,
      saves,
      groups,
      training,
      manage,
      starts,
      repeats,
    }
    mkdirSync(OUT, { recursive: true })
    writeFileSync(join(OUT, 'saved.json'), `${JSON.stringify(JSON.parse(JSON.stringify(golden)), null, 1)}\n`)
  })
})
