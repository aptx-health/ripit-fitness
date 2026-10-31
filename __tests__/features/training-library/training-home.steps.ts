/**
 * Step definitions for features/training-library/training-home.feature.
 * Codes strictly against initiatives/training-library/docs/spec.md
 * ("TL2 Training home").
 *
 * Seams the implementer builds to (new modules; names are the contract):
 *
 *   lib/training/home.ts
 *     getTrainingHome(userId) -> Promise<TrainingHomeData>
 *       { upNext: { programId, programName, workoutId, workoutName,
 *                   weekNumber, dayNumber, exerciseCount, hasDraft, href } | null,
 *         recent: Array<{ id, name, completedAt: Date,
 *                         durationSeconds: number | null, canRepeat }>,
 *         currentProgram: { programId, programName, weekNumber, totalWeeks,
 *                           workoutsDone, workoutsTotal } | null }
 *       href = programDetailHref(programId, { week, resume: workoutId }).
 *       Skipped counts as done everywhere. Only the user's own, non-archived
 *       completions count. Recent = 3 newest completed, non-archived.
 *
 *   app/api/workouts/completions/[id]/repeat/route.ts
 *     POST(req, { params: Promise<{ id }> }) -> 200 { completionId } | 401 |
 *       404 | 409 { error: 'DRAFT_EXISTS', message, draft } | 422
 *       { error: 'NOTHING_TO_REPEAT' }. Shares the saved-start hydrate helper.
 *
 *   lib/training/program-links.ts (added next to the TL1 exports)
 *     trainingResumeRedirectTarget(userId, query) -> Promise<string | null>
 *       the active program's detail URL with the query kept, but only when
 *       `resume` is in the query and there is an active program; else null.
 *       (trainingRedirectTarget from TL1 is not touched by these tests.)
 *
 *   lib/training/home-redirect.ts
 *     homeRedirectTarget(userId) -> Promise<'/onboarding' | '/training'>
 *       what `/` does for a signed-in user.
 *
 *   components/training/TrainingHome.tsx (default export), props { home }
 *     see __tests__/components/training-home-view.test.tsx.
 *
 * Modules under test are loaded lazily inside steps so a missing module fails
 * the scenario that needs it, not the whole file.
 *
 * vitest-cucumber runs every step as its own test, so state is created once
 * per scenario in its first step. There is no Background in this feature.
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { cleanup, render, screen } from '@testing-library/react'
import { NextRequest } from 'next/server'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const auth = vi.hoisted(() => ({ userId: '' }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  return { prisma: (await db()).getPrismaClient() }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    auth.userId
      ? { user: { id: auth.userId, role: 'user' }, error: null }
      : { user: null, error: null },
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: async () => null,
  workoutActionLimiter: {},
  programManagementLimiter: {},
}))
vi.mock('@/lib/events', () => ({ recordEvent: () => {} }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/training',
  useSearchParams: () => new URLSearchParams(),
}))

const feature = await loadFeature('features/training-library/training-home.feature')

// ---------------------------------------------------------------------------
// Types (local: the modules don't exist yet)
// ---------------------------------------------------------------------------
interface UpNext {
  programId: string
  programName: string
  workoutId: string
  workoutName: string
  weekNumber: number
  dayNumber: number
  exerciseCount: number
  hasDraft: boolean
  href: string
}
interface RecentRow {
  id: string
  name: string
  completedAt: Date
  durationSeconds: number | null
  canRepeat: boolean
}
interface CurrentProgram {
  programId: string
  programName: string
  weekNumber: number
  totalWeeks: number
  workoutsDone: number
  workoutsTotal: number
}
interface Home {
  upNext: UpNext | null
  recent: RecentRow[]
  currentProgram: CurrentProgram | null
}
type Query = Record<string, string | string[] | undefined>
type Status = 'completed' | 'skipped' | 'draft' | 'abandoned'

interface SetSpec {
  reps: number
  rir?: number | null
  rpe?: number | null
  weight?: number
  warmup?: boolean
  /** Logged order, in seconds after the session started (default: array order). */
  at?: number
}
interface ExSpec {
  name: string
  order?: number
  sets: SetSpec[]
}

interface SeededProgram {
  id: string
  name: string
  weeks: Array<{ id: string; weekNumber: number; workouts: Array<{ id: string; dayNumber: number }> }>
}

interface State {
  prisma: PrismaClient
  userId: string
  otherUserId: string
  starter?: SeededProgram
  home?: Home
  target?: string | null
  repeat?: { status: number; body: Record<string, unknown> }
  sourceId?: string
  before?: Record<string, number>
  homeBefore?: Home
}

let s: State

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------
const load = (spec: string) => import(/* @vite-ignore */ spec)

async function getHome(userId = s.userId): Promise<Home> {
  const mod = (await load('@/lib/training/home')) as { getTrainingHome: (u: string) => Promise<Home> }
  return mod.getTrainingHome(userId)
}
async function resumeTarget(query: Query, userId = s.userId) {
  const mod = (await load('@/lib/training/program-links')) as {
    trainingResumeRedirectTarget: (u: string, q: Query) => Promise<string | null>
  }
  return mod.trainingResumeRedirectTarget(userId, query)
}
async function rootTarget(userId = s.userId) {
  const mod = (await load('@/lib/training/home-redirect')) as {
    homeRedirectTarget: (u: string) => Promise<string>
  }
  return mod.homeRedirectTarget(userId)
}
async function callRepeat(id: string, userId = s.userId) {
  auth.userId = userId
  const mod = (await load('@/app/api/workouts/completions/[id]/repeat/route')) as {
    POST: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>
  }
  const res = await mod.POST(new NextRequest(`http://localhost/api/workouts/completions/${id}/repeat`, { method: 'POST' }), {
    params: Promise.resolve({ id }),
  })
  auth.userId = s.userId
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}
async function renderHome(home: Home) {
  const mod = (await load('@/components/training/TrainingHome')) as { default: never }
  return render(createElement(mod.default, { home }))
}

function parse(target: string) {
  const url = new URL(target, 'http://localhost')
  const params: Record<string, string[]> = {}
  for (const [k, v] of url.searchParams) {
    params[k] = [...(params[k] ?? []), v]
  }
  return { path: url.pathname, params }
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------
const DAY = 86_400_000
const noon = (daysAgo: number) => new Date(Math.floor(Date.now() / DAY) * DAY - daysAgo * DAY + 12 * 3_600_000)

async function seedProgram(
  prisma: PrismaClient,
  userId: string,
  opts: { name: string; weeks: number; perWeek?: number; isActive: boolean; isArchived?: boolean }
): Promise<SeededProgram> {
  const perWeek = opts.perWeek ?? 2
  const program = await prisma.program.create({
    data: {
      name: opts.name,
      userId,
      isActive: opts.isActive,
      isArchived: opts.isArchived ?? false,
      weeks: {
        create: Array.from({ length: opts.weeks }, (_, w) => ({
          weekNumber: w + 1,
          userId,
          workouts: {
            create: Array.from({ length: perWeek }, (_, d) => ({
              name: `${opts.name} W${w + 1} D${d + 1}`,
              dayNumber: d + 1,
              userId,
            })),
          },
        })),
      },
    },
    include: {
      weeks: { orderBy: { weekNumber: 'asc' }, include: { workouts: { orderBy: { dayNumber: 'asc' } } } },
    },
  })
  return {
    id: program.id,
    name: program.name,
    weeks: program.weeks.map((w) => ({
      id: w.id,
      weekNumber: w.weekNumber,
      workouts: w.workouts.map((x) => ({ id: x.id, dayNumber: x.dayNumber })),
    })),
  }
}

const wid = (p: SeededProgram, week: number, day: number) => p.weeks[week - 1].workouts[day - 1].id

async function mark(
  workoutId: string,
  status: Status,
  opts: { userId?: string; isArchived?: boolean } = {}
) {
  return s.prisma.workoutCompletion.create({
    data: {
      workoutId,
      userId: opts.userId ?? s.userId,
      status,
      completedAt: new Date(),
      isArchived: opts.isArchived ?? false,
    },
  })
}

async function defFor(name: string) {
  return createTestExerciseDefinition(s.prisma, { name })
}

/** Rows for one exercise plus its logged sets, tied to a completion. */
async function logExercises(
  completionId: string,
  userId: string,
  specs: ExSpec[],
  target: { workoutId: string } | { adHoc: true },
  start: Date
) {
  for (const [i, spec] of specs.entries()) {
    const def = await defFor(spec.name)
    const ex = await s.prisma.exercise.create({
      data: {
        name: spec.name,
        exerciseDefinitionId: def.id,
        order: spec.order ?? i + 1,
        userId,
        ...('workoutId' in target
          ? { workoutId: target.workoutId }
          : { workoutCompletionId: completionId, isOneOff: true }),
      },
    })
    for (const [j, set] of spec.sets.entries()) {
      await s.prisma.loggedSet.create({
        data: {
          setNumber: j + 1,
          reps: set.reps,
          weight: set.weight ?? 100,
          rir: set.rir ?? null,
          rpe: set.rpe ?? null,
          isWarmup: set.warmup ?? false,
          exerciseId: ex.id,
          completionId,
          userId,
          createdAt: new Date(start.getTime() + (set.at ?? i * 100 + j) * 1000),
        },
      })
    }
  }
}

interface SessionOpts {
  userId?: string
  status?: Status
  name?: string | null
  workoutId?: string
  savedWorkoutId?: string
  completedAt?: Date
  startedAt?: Date | null
  durationSeconds?: number | null
  isArchived?: boolean
  exercises?: ExSpec[]
}

async function seedSession(o: SessionOpts = {}) {
  const userId = o.userId ?? s.userId
  const completedAt = o.completedAt ?? noon(1)
  const completion = await s.prisma.workoutCompletion.create({
    data: {
      userId,
      status: o.status ?? 'completed',
      workoutId: o.workoutId ?? null,
      savedWorkoutId: o.savedWorkoutId ?? null,
      isAdHoc: !o.workoutId,
      name: o.name === undefined ? 'Session' : o.name,
      completedAt,
      startedAt: o.startedAt ?? null,
      durationSeconds: o.durationSeconds ?? null,
      isArchived: o.isArchived ?? false,
    },
  })
  if (o.exercises) {
    await logExercises(
      completion.id,
      userId,
      o.exercises,
      o.workoutId ? { workoutId: o.workoutId } : { adHoc: true },
      o.startedAt ?? completedAt
    )
  }
  return completion
}

const UPPER: ExSpec[] = [
  {
    name: 'Barbell Bench Press',
    sets: [
      { reps: 8, rir: 2, rpe: 8, weight: 135 },
      { reps: 8, rir: 1, rpe: 9, weight: 135 },
      { reps: 6, rir: 0, rpe: 10, weight: 145 },
    ],
  },
  {
    name: 'Chest Supported Row',
    sets: [
      { reps: 10, rir: 3, rpe: null, weight: 90 },
      { reps: 10, rir: null, rpe: 8, weight: 90 },
      { reps: 12, rir: 2, rpe: 7, weight: 80, warmup: true },
    ],
  },
]

async function freshState(): Promise<State> {
  const db = await getTestDatabase()
  await db.reset()
  const prisma = db.getPrismaClient()
  const user = await createTestUser()
  const other = await createTestUser()
  auth.userId = user.id
  return { prisma, userId: user.id, otherUserId: other.id }
}

async function withStarter(weeks = 5, perWeek = 2) {
  s = await freshState()
  s.starter = await seedProgram(s.prisma, s.userId, { name: 'Machine Starter', weeks, perWeek, isActive: true })
  return s.starter
}
const starter = () => s.starter as SeededProgram

async function finishWeek(week: number, status: 'completed' | 'skipped' = 'completed') {
  for (const w of starter().weeks[week - 1].workouts) await mark(w.id, status)
}

async function counts() {
  const p = s.prisma
  return {
    completions: await p.workoutCompletion.count(),
    exercises: await p.exercise.count(),
    prescribed: await p.prescribedSet.count(),
    logged: await p.loggedSet.count(),
  }
}

async function newDraft() {
  return s.prisma.workoutCompletion.findFirst({
    where: { userId: s.userId, status: 'draft', isArchived: false },
    include: {
      exercises: { orderBy: { order: 'asc' }, include: { prescribedSets: { orderBy: { setNumber: 'asc' } } } },
    },
  })
}

const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------
describeFeature(feature, ({ Rule }) => {
  Rule("Up Next shows the active program's next workout", ({ RuleScenario }) => {
    RuleScenario('The next unfinished workout is up next', ({ Given, When, Then, And }) => {
      Given(
        'an active program "Machine Starter" where week 1 is done and week 2 day 1 "Full Body A" has 5 exercises',
        async () => {
          await withStarter()
          await finishWeek(1)
          const wo = starter().weeks[1].workouts[0].id
          await s.prisma.workout.update({ where: { id: wo }, data: { name: 'Full Body A' } })
          const def = await defFor('Back Squat')
          for (let i = 1; i <= 5; i++) {
            await s.prisma.exercise.create({
              data: { name: `Lift ${i}`, exerciseDefinitionId: def.id, order: i, workoutId: wo, userId: s.userId },
            })
          }
        }
      )
      When('the user opens Training', async () => {
        s.home = await getHome()
      })
      Then('Up Next shows "Machine Starter", "Week 2 · Day 1", "Full Body A" and 5 exercises', async () => {
        const u = s.home?.upNext
        expect(u).toBeTruthy()
        expect(u?.programName).toBe('Machine Starter')
        expect(u?.weekNumber).toBe(2)
        expect(u?.dayNumber).toBe(1)
        expect(u?.workoutName).toBe('Full Body A')
        expect(u?.exerciseCount).toBe(5)
        await renderHome(s.home as Home)
        expect(screen.getByText(/up next/i)).toBeTruthy()
        expect(screen.getAllByText('Machine Starter').length).toBeGreaterThan(0)
        expect(screen.getByText(/week 2\s*·\s*day 1/i)).toBeTruthy()
        expect(screen.getByText('Full Body A')).toBeTruthy()
        expect(screen.getByText(/5 exercises/i)).toBeTruthy()
        cleanup()
      })
      And('"Start Workout" opens week 2 of "Machine Starter" with "Full Body A" resumed', async () => {
        const u = s.home?.upNext as UpNext
        const { path, params } = parse(u.href)
        expect(path).toBe(`/library/programs/${starter().id}`)
        expect(params).toEqual({ week: ['2'], resume: [wid(starter(), 2, 1)] })
        await renderHome(s.home as Home)
        const link = screen.getByText(/start workout/i).closest('a')
        expect(link?.getAttribute('href')).toBe(u.href)
        cleanup()
      })
    })

    RuleScenario('Skipped workouts are passed over', ({ Given, When, Then }) => {
      Given('an active program where week 2 day 1 was skipped and day 2 is unfinished', async () => {
        await withStarter()
        await finishWeek(1)
        await mark(wid(starter(), 2, 1), 'skipped')
      })
      When('the user opens Training', async () => {
        s.home = await getHome()
      })
      Then('Up Next shows week 2 day 2', () => {
        expect(s.home?.upNext?.weekNumber).toBe(2)
        expect(s.home?.upNext?.dayNumber).toBe(2)
        expect(s.home?.upNext?.workoutId).toBe(wid(starter(), 2, 2))
        expect(parse(s.home?.upNext?.href as string).params.resume).toEqual([wid(starter(), 2, 2)])
      })
    })

    RuleScenario('A workout already in progress says Continue', ({ Given, When, Then }) => {
      Given('the user has a draft for the next workout of the active program', async () => {
        await withStarter()
        await finishWeek(1)
        await mark(wid(starter(), 2, 1), 'draft')
      })
      When('the user opens Training', async () => {
        s.home = await getHome()
      })
      Then('Up Next\'s button says "Continue"', async () => {
        expect(s.home?.upNext?.workoutId).toBe(wid(starter(), 2, 1))
        expect(s.home?.upNext?.hasDraft).toBe(true)
        await renderHome(s.home as Home)
        const link = screen.getByText(/continue/i).closest('a')
        expect(link?.getAttribute('href')).toBe(s.home?.upNext?.href)
        expect(screen.queryByText(/start workout/i)).toBeNull()
        cleanup()
      })
    })

    RuleScenario("No Up Next without an active program or when it's all done", ({ Given, When, Then, And }) => {
      Given('the user has no active program', async () => {
        s = await freshState()
        s.starter = await seedProgram(s.prisma, s.userId, { name: 'Machine Starter', weeks: 2, isActive: false })
        expect(await s.prisma.program.count({ where: { userId: s.userId, isActive: true } })).toBe(0)
      })
      When('the user opens Training', async () => {
        s.home = await getHome()
      })
      Then('there is no Up Next section', async () => {
        expect(s.home?.upNext).toBeNull()
        await renderHome(s.home as Home)
        expect(screen.queryByText(/up next/i)).toBeNull()
        cleanup()
      })
      And('there is no Current Program section', async () => {
        expect(s.home?.currentProgram).toBeNull()
        await renderHome(s.home as Home)
        expect(screen.queryByText(/current program/i)).toBeNull()
        cleanup()
      })
    })
  })

  Rule('Recent Workouts make it easy to repeat something', ({ RuleScenario }) => {
    RuleScenario('The three newest completed sessions are shown', ({ Given, When, Then }) => {
      Given(
        'the user completed 4 sessions, has a draft, abandoned a session and has an archived session',
        async () => {
          await withStarter(2)
          const w = wid(starter(), 1, 1)
          await seedSession({ name: 'Session One', completedAt: noon(10), durationSeconds: 1800, exercises: UPPER })
          await seedSession({ name: null, workoutId: w, completedAt: noon(8), startedAt: new Date(noon(8).getTime() - 3900_000), exercises: UPPER.slice(0, 1) })
          await seedSession({ name: 'Session Three', completedAt: noon(5), durationSeconds: 2700, exercises: UPPER })
          await seedSession({ name: 'Session Four', completedAt: noon(3), exercises: UPPER })
          await seedSession({ name: 'Archived Newer', completedAt: noon(2), isArchived: true, exercises: UPPER })
          await seedSession({ name: 'Abandoned Newer', status: 'abandoned', completedAt: noon(1), exercises: UPPER })
          await seedSession({ name: 'Draft Newest', status: 'draft', completedAt: noon(0), exercises: UPPER })
          expect(await s.prisma.workoutCompletion.count({ where: { userId: s.userId, status: 'completed' } })).toBe(5)
        }
      )
      When('the user opens Training', async () => {
        s.home = await getHome()
      })
      Then('Recent Workouts shows the 3 newest completed sessions with their names, dates and durations', async () => {
        const r = s.home?.recent as RecentRow[]
        expect(r.map((x) => x.name)).toEqual(['Session Four', 'Session Three', 'Machine Starter W1 D1'])
        expect(r.map((x) => x.durationSeconds)).toEqual([null, 2700, 3900])
        expect(r.map((x) => x.completedAt.getTime())).toEqual([noon(3).getTime(), noon(5).getTime(), noon(8).getTime()])
        await renderHome(s.home as Home)
        expect(screen.getByText(/recent workouts/i)).toBeTruthy()
        for (const name of ['Session Four', 'Session Three', 'Machine Starter W1 D1']) {
          expect(screen.getByText(name)).toBeTruthy()
        }
        expect(screen.getByText(fmtDate(noon(5)))).toBeTruthy()
        expect(screen.getByText('45 min')).toBeTruthy()
        expect(screen.getByText('1h 05m')).toBeTruthy()
        expect(screen.queryByText('Session One')).toBeNull()
        expect(screen.queryByText('Draft Newest')).toBeNull()
        cleanup()
      })
    })

    RuleScenario('Repeating an ad-hoc session', ({ Given, When, Then, And }) => {
      Given('the user completed an ad-hoc session "Upper Body" with 2 exercises and 3 logged sets each', async () => {
        s = await freshState()
        const c = await seedSession({ name: 'Upper Body', completedAt: noon(2), exercises: UPPER })
        s.sourceId = c.id
      })
      When('the user repeats "Upper Body"', async () => {
        s.repeat = await callRepeat(s.sourceId as string)
        expect(s.repeat.status).toBe(200)
      })
      Then('a new freeform session "Upper Body" is in progress with the same 2 exercises in order', async () => {
        const draft = await newDraft()
        expect(draft).not.toBeNull()
        expect(s.repeat?.body.completionId).toBe(draft?.id)
        expect(draft?.id).not.toBe(s.sourceId)
        expect(draft?.name).toBe('Upper Body')
        expect(draft?.status).toBe('draft')
        expect(draft?.isAdHoc).toBe(true)
        expect(draft?.workoutId).toBeNull()
        expect(draft?.savedWorkoutId).toBeNull()
        expect(draft?.exercises.map((e) => e.name)).toEqual(['Barbell Bench Press', 'Chest Supported Row'])
      })
      And('each exercise plans 3 sets with the logged reps, RIR and RPE but no weight', async () => {
        const draft = await newDraft()
        const plan = draft?.exercises.map((e) =>
          e.prescribedSets.map((p) => ({ n: p.setNumber, reps: p.reps, rir: p.rir, rpe: p.rpe, w: p.weight }))
        )
        expect(plan).toEqual([
          [
            { n: 1, reps: '8', rir: 2, rpe: 8, w: null },
            { n: 2, reps: '8', rir: 1, rpe: 9, w: null },
            { n: 3, reps: '6', rir: 0, rpe: 10, w: null },
          ],
          [
            { n: 1, reps: '10', rir: 3, rpe: null, w: null },
            { n: 2, reps: '10', rir: null, rpe: 8, w: null },
            { n: 3, reps: '12', rir: 2, rpe: 7, w: null },
          ],
        ])
      })
    })

    RuleScenario("Repeating a program session doesn't advance the program", ({ Given, When, Then, And }) => {
      Given('the user completed week 1 day 1 of the active program', async () => {
        await withStarter()
        const c = await seedSession({ workoutId: wid(starter(), 1, 1), name: null, completedAt: noon(1), exercises: UPPER })
        s.sourceId = c.id
        s.homeBefore = await getHome()
        s.before = {
          programCompletions: await s.prisma.workoutCompletion.count({ where: { workoutId: { not: null } } }),
        }
      })
      When('the user repeats that session', async () => {
        s.repeat = await callRepeat(s.sourceId as string)
        expect(s.repeat.status).toBe(200)
      })
      Then('a new freeform session is in progress with its exercises', async () => {
        const draft = await newDraft()
        expect(draft?.isAdHoc).toBe(true)
        expect(draft?.workoutId).toBeNull()
        expect(draft?.name).toBe('Machine Starter W1 D1')
        expect(draft?.exercises.map((e) => e.name)).toEqual(['Barbell Bench Press', 'Chest Supported Row'])
      })
      And("the program's progress is unchanged", async () => {
        const after = await getHome()
        expect(after.currentProgram).toEqual(s.homeBefore?.currentProgram)
        expect(after.currentProgram?.workoutsDone).toBe(1)
        expect(after.upNext?.workoutId).toBe(wid(starter(), 1, 2))
        expect(after.upNext?.hasDraft).toBe(false)
        expect(await s.prisma.workoutCompletion.count({ where: { workoutId: { not: null } } })).toBe(s.before?.programCompletions)
      })
    })

    RuleScenario('Repeat is refused while another session is in progress', ({ Given, When, Then, And }) => {
      Given('the user has a session in progress', async () => {
        s = await freshState()
        const done = await seedSession({ name: 'Upper Body', completedAt: noon(2), exercises: UPPER })
        s.sourceId = done.id
        await seedSession({ name: 'Leg Day', status: 'draft', completedAt: noon(0), exercises: UPPER.slice(0, 1) })
      })
      When('the user repeats a recent session', async () => {
        s.before = await counts()
        s.repeat = await callRepeat(s.sourceId as string)
      })
      Then('it is refused because a session is already in progress', async () => {
        expect(s.repeat?.status).toBe(409)
        expect(s.repeat?.body.error).toBe('DRAFT_EXISTS')
        const existing = await s.prisma.workoutCompletion.findFirst({ where: { userId: s.userId, status: 'draft' } })
        expect((s.repeat?.body.draft as { completionId: string }).completionId).toBe(existing?.id)
        expect(typeof s.repeat?.body.message).toBe('string')
      })
      And('no new session is created', async () => {
        expect(await counts()).toEqual(s.before)
      })
    })

    RuleScenario("Another user's session can't be repeated", ({ When, Then }) => {
      When("the user repeats another user's session", async () => {
        s = await freshState()
        const theirs = await seedSession({ userId: s.otherUserId, name: 'Theirs', completedAt: noon(2), exercises: UPPER })
        s.before = await counts()
        s.repeat = await callRepeat(theirs.id)
      })
      Then('it is not found', async () => {
        expect(s.repeat?.status).toBe(404)
        expect(await counts()).toEqual(s.before)
        expect(await s.prisma.workoutCompletion.count({ where: { userId: s.userId } })).toBe(0)
      })
    })
  })

  Rule('Current Program is a compact summary', ({ RuleScenario }) => {
    RuleScenario('Current Program shows progress', ({ Given, When, Then, And }) => {
      Given(
        'an active program "Machine Starter" with 5 weeks and 10 workouts, 3 completed or skipped, currently in week 2',
        async () => {
          await withStarter(5, 2)
          await mark(wid(starter(), 1, 1), 'completed')
          await mark(wid(starter(), 1, 2), 'skipped')
          await mark(wid(starter(), 2, 1), 'completed')
        }
      )
      When('the user opens Training', async () => {
        s.home = await getHome()
      })
      Then(
        'Current Program shows "Machine Starter", "Week 2 of 5", "3 of 10 workouts done" and a progress bar',
        async () => {
          expect(s.home?.currentProgram).toEqual({
            programId: starter().id,
            programName: 'Machine Starter',
            weekNumber: 2,
            totalWeeks: 5,
            workoutsDone: 3,
            workoutsTotal: 10,
          })
          await renderHome(s.home as Home)
          expect(screen.getByText(/current program/i)).toBeTruthy()
          expect(screen.getAllByText('Machine Starter').length).toBeGreaterThan(0)
          expect(screen.getByText(/week 2 of 5/i)).toBeTruthy()
          expect(screen.getByText(/3 of 10 workouts done/i)).toBeTruthy()
          const bar = screen.getByRole('progressbar')
          expect(bar.getAttribute('aria-valuenow')).toBe('3')
          expect(bar.getAttribute('aria-valuemax')).toBe('10')
          cleanup()
        }
      )
      And('"View Program" opens its detail page', async () => {
        await renderHome(s.home as Home)
        const link = screen.getByText(/view program/i).closest('a')
        expect(link?.getAttribute('href')).toBe(`/library/programs/${starter().id}`)
        cleanup()
      })
    })
  })

  Rule('Training works for everyone', ({ RuleScenario }) => {
    RuleScenario('A brand-new user sees a simple start', ({ Given, When, Then }) => {
      Given('the user has no programs and no sessions', async () => {
        s = await freshState()
        expect(await s.prisma.program.count()).toBe(0)
        expect(await s.prisma.workoutCompletion.count()).toBe(0)
      })
      When('the user opens Training', async () => {
        s.home = await getHome()
      })
      Then('they see "Start a workout" and "Find a program"', async () => {
        expect(s.home).toEqual({ upNext: null, recent: [], currentProgram: null })
        await renderHome(s.home as Home)
        expect(screen.getByText(/start a workout/i)).toBeTruthy()
        const find = new URL(screen.getByText(/find a program/i).closest('a')?.getAttribute('href') ?? '', 'http://x')
        expect([find.pathname, find.searchParams.get('type'), find.searchParams.get('tab')]).toEqual(['/library', 'programs', 'browse'])
        expect(screen.queryByText(/up next/i)).toBeNull()
        expect(screen.queryByText(/recent workouts/i)).toBeNull()
        expect(screen.queryByText(/current program/i)).toBeNull()
        cleanup()
      })
    })

    RuleScenario('The home address always opens Training', ({ Given, When, Then }) => {
      Given('the user has finished onboarding and has no active program', async () => {
        s = await freshState()
        await s.prisma.userSettings.create({ data: { userId: s.userId, onboardingCompleted: true } })
        await seedProgram(s.prisma, s.userId, { name: 'Old Split', weeks: 2, isActive: false })
      })
      When("the user opens the app's home address", async () => {
        s.target = await rootTarget()
      })
      Then('they land on Training', () => {
        expect(s.target).toBe('/training')
      })
    })

    RuleScenario('An old resume link still works', ({ When, Then }) => {
      When('the user opens Training with a workout to resume', async () => {
        await withStarter()
        s.target = await resumeTarget({ week: '3', resume: wid(starter(), 3, 1) })
      })
      Then("they land on the active program's detail screen with that workout resumed", () => {
        expect(s.target).toBeTruthy()
        const { path, params } = parse(s.target as string)
        expect(path).toBe(`/library/programs/${starter().id}`)
        expect(params.resume).toEqual([wid(starter(), 3, 1)])
        expect(params.week).toEqual(['3'])
      })
    })
  })
})

// ---------------------------------------------------------------------------
// Edges: Up Next
// ---------------------------------------------------------------------------
describe('training home: Up Next', () => {
  beforeEach(async () => {
    await withStarter()
  })

  it('is the first workout of a new program', async () => {
    const u = (await getHome()).upNext
    expect([u?.weekNumber, u?.dayNumber, u?.hasDraft]).toEqual([1, 1, false])
  })

  it('goes in week then day order, even if later weeks have progress', async () => {
    await mark(wid(starter(), 1, 1), 'completed')
    await finishWeek(3)
    const u = (await getHome()).upNext
    expect([u?.weekNumber, u?.dayNumber]).toEqual([1, 2])
  })

  it('moves to the next week when a week is done with a mix of completed and skipped', async () => {
    await mark(wid(starter(), 1, 1), 'completed')
    await mark(wid(starter(), 1, 2), 'skipped')
    expect((await getHome()).upNext?.weekNumber).toBe(2)
  })

  it('a draft does not count as done', async () => {
    await mark(wid(starter(), 1, 1), 'draft')
    expect((await getHome()).upNext?.workoutId).toBe(wid(starter(), 1, 1))
  })

  it('an archived completion (after a restart) does not count as done', async () => {
    await finishWeek(1)
    await s.prisma.workoutCompletion.updateMany({ data: { isArchived: true } })
    expect((await getHome()).upNext?.weekNumber).toBe(1)
  })

  it("another user's completions do not count", async () => {
    await mark(wid(starter(), 1, 1), 'completed', { userId: s.otherUserId })
    expect((await getHome()).upNext?.workoutId).toBe(wid(starter(), 1, 1))
  })

  it('says Continue only for a draft of that very workout', async () => {
    await mark(wid(starter(), 3, 1), 'draft')
    expect((await getHome()).upNext?.hasDraft).toBe(false)
  })

  it('an ad-hoc draft is not a draft of the next workout', async () => {
    await seedSession({ status: 'draft', name: 'Freestyle' })
    expect((await getHome()).upNext?.hasDraft).toBe(false)
  })

  it("another user's draft, or an archived one, is not a draft of the next workout", async () => {
    await mark(wid(starter(), 1, 1), 'draft', { userId: s.otherUserId })
    await mark(wid(starter(), 1, 1), 'draft', { isArchived: true })
    expect((await getHome()).upNext?.hasDraft).toBe(false)
  })

  it('is absent, with Current Program still shown, when every workout is done', async () => {
    for (let w = 1; w <= 5; w++) await finishWeek(w, w % 2 ? 'completed' : 'skipped')
    const home = await getHome()
    expect(home.upNext).toBeNull()
    expect(home.currentProgram).toMatchObject({ weekNumber: 5, totalWeeks: 5, workoutsDone: 10, workoutsTotal: 10 })
  })

  it('is absent for an archived program that kept the active flag', async () => {
    await s.prisma.program.update({ where: { id: starter().id }, data: { isArchived: true } })
    const home = await getHome()
    expect(home.upNext).toBeNull()
    expect(home.currentProgram).toBeNull()
  })

  it('is absent for a deleted program', async () => {
    await s.prisma.program.update({ where: { id: starter().id }, data: { deletedAt: new Date() } })
    const home = await getHome()
    expect(home.upNext).toBeNull()
    expect(home.currentProgram).toBeNull()
  })

  it("ignores another user's active program", async () => {
    await s.prisma.program.update({ where: { id: starter().id }, data: { userId: s.otherUserId } })
    const home = await getHome()
    expect(home.upNext).toBeNull()
    expect(home.currentProgram).toBeNull()
  })

  it('uses only the active program when the user has several', async () => {
    const other = await seedProgram(s.prisma, s.userId, { name: 'Old Split', weeks: 3, isActive: false })
    const home = await getHome()
    expect(home.upNext?.programId).toBe(starter().id)
    expect(home.currentProgram?.programId).toBe(starter().id)
    expect(home.upNext?.workoutId).not.toBe(wid(other, 1, 1))
  })

  it('counts the exercises of that workout', async () => {
    const def = await defFor('Back Squat')
    for (let i = 1; i <= 3; i++) {
      await s.prisma.exercise.create({
        data: { name: `E${i}`, exerciseDefinitionId: def.id, order: i, workoutId: wid(starter(), 1, 1), userId: s.userId },
      })
    }
    expect((await getHome()).upNext?.exerciseCount).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Edges: Current Program
// ---------------------------------------------------------------------------
describe('training home: Current Program', () => {
  beforeEach(async () => {
    await withStarter()
  })

  it('starts at week 1 with nothing done', async () => {
    expect((await getHome()).currentProgram).toMatchObject({ weekNumber: 1, totalWeeks: 5, workoutsDone: 0, workoutsTotal: 10 })
  })

  it('counts skipped as done', async () => {
    await finishWeek(1, 'skipped')
    expect((await getHome()).currentProgram).toMatchObject({ workoutsDone: 2, weekNumber: 2 })
  })

  it('counts a workout once however many times it was completed', async () => {
    await mark(wid(starter(), 1, 1), 'completed')
    await mark(wid(starter(), 1, 1), 'completed')
    expect((await getHome()).currentProgram?.workoutsDone).toBe(1)
  })

  it('does not count drafts, archived or other users\' completions', async () => {
    await mark(wid(starter(), 1, 1), 'draft')
    await mark(wid(starter(), 1, 2), 'completed', { isArchived: true })
    await mark(wid(starter(), 2, 1), 'completed', { userId: s.otherUserId })
    expect((await getHome()).currentProgram?.workoutsDone).toBe(0)
  })

  it('shows the week of the first unfinished workout', async () => {
    await finishWeek(1)
    await finishWeek(2)
    expect((await getHome()).currentProgram?.weekNumber).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Edges: Recent Workouts
// ---------------------------------------------------------------------------
describe('training home: Recent Workouts', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  it('is empty with no completed sessions, whatever else exists', async () => {
    await seedSession({ status: 'draft' })
    await seedSession({ status: 'abandoned' })
    await seedSession({ status: 'skipped' })
    expect((await getHome()).recent).toEqual([])
  })

  it('lists fewer than three when there are fewer', async () => {
    await seedSession({ name: 'Only', exercises: UPPER })
    expect((await getHome()).recent.map((r) => r.name)).toEqual(['Only'])
  })

  it("never includes another user's sessions", async () => {
    await seedSession({ userId: s.otherUserId, name: 'Theirs', exercises: UPPER })
    await seedSession({ name: 'Mine', completedAt: noon(9), exercises: UPPER })
    expect((await getHome()).recent.map((r) => r.name)).toEqual(['Mine'])
  })

  it('includes saved-workout sessions, newest first', async () => {
    const saved = await s.prisma.savedWorkout.create({
      data: { userId: s.userId, name: 'Pull', workoutData: [], exerciseCount: 0 },
    })
    await seedSession({ name: 'Older', completedAt: noon(6), exercises: UPPER })
    await seedSession({ name: 'Pull', savedWorkoutId: saved.id, completedAt: noon(2), exercises: UPPER })
    expect((await getHome()).recent.map((r) => r.name)).toEqual(['Pull', 'Older'])
  })

  it('prefers the stored duration, then the timestamps, else none', async () => {
    const t = noon(4)
    await seedSession({ name: 'Stored', completedAt: noon(1), durationSeconds: 1500, startedAt: new Date(noon(1).getTime() - 9000_000), exercises: UPPER })
    await seedSession({ name: 'Stamped', completedAt: t, startedAt: new Date(t.getTime() - 600_000), exercises: UPPER })
    await seedSession({ name: 'Unknown', completedAt: noon(6), exercises: UPPER })
    expect((await getHome()).recent.map((r) => [r.name, r.durationSeconds])).toEqual([
      ['Stored', 1500],
      ['Stamped', 600],
      ['Unknown', null],
    ])
  })

  it('a session with no logged sets is listed but cannot be repeated', async () => {
    await seedSession({ name: 'Empty', completedAt: noon(1) })
    await seedSession({ name: 'Full', completedAt: noon(2), exercises: UPPER })
    expect((await getHome()).recent.map((r) => [r.name, r.canRepeat])).toEqual([
      ['Empty', false],
      ['Full', true],
    ])
  })
})

// ---------------------------------------------------------------------------
// Edges: Repeat
// ---------------------------------------------------------------------------
describe('training home: Repeat', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  it('needs a signed-in user', async () => {
    const c = await seedSession({ exercises: UPPER })
    const saved = auth.userId
    auth.userId = ''
    const mod = (await load('@/app/api/workouts/completions/[id]/repeat/route')) as {
      POST: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>
    }
    const res = await mod.POST(new NextRequest('http://localhost/x', { method: 'POST' }), { params: Promise.resolve({ id: c.id }) })
    auth.userId = saved
    expect(res.status).toBe(401)
    expect(await s.prisma.workoutCompletion.count({ where: { status: 'draft' } })).toBe(0)
  })

  it('creates exactly one draft, owned by the user, with one-off exercises', async () => {
    const c = await seedSession({ name: 'Upper Body', exercises: UPPER })
    const { status, body } = await callRepeat(c.id)
    expect(status).toBe(200)
    const drafts = await s.prisma.workoutCompletion.findMany({ where: { status: 'draft' }, include: { exercises: true } })
    expect(drafts).toHaveLength(1)
    expect(drafts[0].id).toBe(body.completionId)
    expect(drafts[0].userId).toBe(s.userId)
    expect(drafts[0].isArchived).toBe(false)
    expect(drafts[0].startedAt).not.toBeNull()
    for (const e of drafts[0].exercises) {
      expect(e.isOneOff).toBe(true)
      expect(e.workoutId).toBeNull()
      expect(e.userId).toBe(s.userId)
    }
  })

  it('keeps each exercise\'s library definition', async () => {
    const c = await seedSession({ exercises: UPPER })
    await callRepeat(c.id)
    const draft = await newDraft()
    const names = draft?.exercises.map((e) => e.exerciseDefinitionId)
    const defs = await s.prisma.exerciseDefinition.findMany({ where: { name: { in: ['Barbell Bench Press', 'Chest Supported Row'] } } })
    const byName = Object.fromEntries(defs.map((d) => [d.name, d.id]))
    expect(names).toEqual([byName['Barbell Bench Press'], byName['Chest Supported Row']])
  })

  it('orders exercises by when they were first logged', async () => {
    const c = await seedSession({
      name: 'Out of order',
      exercises: [
        { name: 'Second Lift', order: 1, sets: [{ reps: 5, at: 600 }] },
        { name: 'First Lift', order: 2, sets: [{ reps: 5, at: 10 }] },
        { name: 'Third Lift', order: 3, sets: [{ reps: 5, at: 1200 }] },
      ],
    })
    await callRepeat(c.id)
    const draft = await newDraft()
    expect(draft?.exercises.map((e) => e.name)).toEqual(['First Lift', 'Second Lift', 'Third Lift'])
  })

  it('numbers sets in the order they were logged, whatever order they were saved in', async () => {
    const c = await seedSession({ name: 'Sets' })
    const def = await defFor('Overhead Press')
    const ex = await s.prisma.exercise.create({
      data: { name: 'Overhead Press', exerciseDefinitionId: def.id, order: 1, userId: s.userId, workoutCompletionId: c.id, isOneOff: true },
    })
    for (const n of [3, 1, 2]) {
      await s.prisma.loggedSet.create({
        data: { setNumber: n, reps: 4 + n, weight: 60, exerciseId: ex.id, completionId: c.id, userId: s.userId },
      })
    }
    await callRepeat(c.id)
    const draft = await newDraft()
    expect(draft?.exercises[0].prescribedSets.map((p) => [p.setNumber, p.reps])).toEqual([
      [1, '5'],
      [2, '6'],
      [3, '7'],
    ])
  })

  it('copies the warm-up flag and plans the same number of sets, warm-ups included', async () => {
    const c = await seedSession({ exercises: UPPER })
    await callRepeat(c.id)
    const draft = await newDraft()
    expect(draft?.exercises[1].prescribedSets.map((p) => p.isWarmup)).toEqual([false, false, true])
    expect(draft?.exercises[0].prescribedSets.map((p) => p.isWarmup)).toEqual([false, false, false])
  })

  it('never copies weight, and plans reps as text', async () => {
    const c = await seedSession({ exercises: UPPER })
    await callRepeat(c.id)
    const rows = await s.prisma.prescribedSet.findMany()
    expect(rows).toHaveLength(6)
    expect(rows.every((r) => r.weight === null)).toBe(true)
    expect(rows.every((r) => typeof r.reps === 'string')).toBe(true)
    expect(rows.every((r) => r.userId === s.userId)).toBe(true)
  })

  it('leaves the source session as it was', async () => {
    const c = await seedSession({ name: 'Upper Body', exercises: UPPER })
    const before = await s.prisma.workoutCompletion.findUnique({ where: { id: c.id }, include: { loggedSets: true, exercises: true } })
    await callRepeat(c.id)
    const after = await s.prisma.workoutCompletion.findUnique({ where: { id: c.id }, include: { loggedSets: true, exercises: true } })
    expect(after).toEqual(before)
  })

  it('repeats a program session under the workout\'s name, with no program link', async () => {
    await withStarter()
    const c = await seedSession({ workoutId: wid(starter(), 1, 1), name: null, exercises: UPPER })
    const { status } = await callRepeat(c.id)
    expect(status).toBe(200)
    const draft = await newDraft()
    expect(draft?.name).toBe('Machine Starter W1 D1')
    expect(draft?.workoutId).toBeNull()
    expect(draft?.savedWorkoutId).toBeNull()
    expect(draft?.exercises.map((e) => e.workoutId)).toEqual([null, null])
  })

  it('repeating a saved-workout session starts a plain freeform one and leaves the saved workout alone', async () => {
    const saved = await s.prisma.savedWorkout.create({
      data: { userId: s.userId, name: 'Pull', workoutData: [], exerciseCount: 0 },
    })
    const c = await seedSession({ name: 'Pull', savedWorkoutId: saved.id, exercises: UPPER })
    await callRepeat(c.id)
    const draft = await newDraft()
    expect(draft?.savedWorkoutId).toBeNull()
    const after = await s.prisma.savedWorkout.findUnique({ where: { id: saved.id } })
    expect(after?.lastUsedAt).toBeNull()
  })

  it('is refused with DRAFT_EXISTS when a draft exists, and writes nothing', async () => {
    const c = await seedSession({ exercises: UPPER })
    const existing = await seedSession({ status: 'draft', name: 'Mid-session', exercises: UPPER.slice(0, 1) })
    const before = await counts()
    const { status, body } = await callRepeat(c.id)
    expect(status).toBe(409)
    expect(body.error).toBe('DRAFT_EXISTS')
    expect(body.draft).toMatchObject({ completionId: existing.id, isAdHoc: true, name: 'Mid-session' })
    expect(await counts()).toEqual(before)
  })

  it('a program draft also blocks it', async () => {
    await withStarter()
    const c = await seedSession({ exercises: UPPER })
    await mark(wid(starter(), 1, 1), 'draft')
    expect((await callRepeat(c.id)).status).toBe(409)
  })

  it("an archived draft, or another user's draft, does not block it", async () => {
    const c = await seedSession({ exercises: UPPER })
    await seedSession({ status: 'draft', isArchived: true })
    await seedSession({ status: 'draft', userId: s.otherUserId })
    expect((await callRepeat(c.id)).status).toBe(200)
  })

  it('a second repeat is refused until the first session is finished', async () => {
    const c = await seedSession({ exercises: UPPER })
    expect((await callRepeat(c.id)).status).toBe(200)
    const before = await counts()
    expect((await callRepeat(c.id)).status).toBe(409)
    expect(await counts()).toEqual(before)
  })

  it.each([
    ['a draft', 'draft'],
    ['an abandoned session', 'abandoned'],
    ['a skipped one', 'skipped'],
  ] as const)('%s is not found', async (_n, status) => {
    const c = await seedSession({ status, exercises: UPPER })
    const before = await counts()
    expect((await callRepeat(c.id)).status).toBe(404)
    expect(await counts()).toEqual(before)
  })

  it('an unknown id is not found', async () => {
    expect((await callRepeat('does-not-exist')).status).toBe(404)
    expect(await counts()).toEqual({ completions: 0, exercises: 0, prescribed: 0, logged: 0 })
  })

  it("another user's session is not found even while the user has a draft", async () => {
    const theirs = await seedSession({ userId: s.otherUserId, exercises: UPPER })
    await seedSession({ status: 'draft' })
    expect((await callRepeat(theirs.id)).status).toBe(404)
  })

  it('a completed session with no logged sets is 422 NOTHING_TO_REPEAT, with no write', async () => {
    const c = await seedSession({ name: 'Nothing' })
    const before = await counts()
    const { status, body } = await callRepeat(c.id)
    expect(status).toBe(422)
    expect(body.error).toBe('NOTHING_TO_REPEAT')
    expect(await counts()).toEqual(before)
  })
})

// ---------------------------------------------------------------------------
// Edges: redirects
// ---------------------------------------------------------------------------
describe('training home: redirects', () => {
  beforeEach(async () => {
    await withStarter()
  })

  it('/training with no query is the home page, not a redirect', async () => {
    expect(await resumeTarget({})).toBeNull()
  })

  it('/training?week=3 means nothing now: no redirect', async () => {
    expect(await resumeTarget({ week: '3' })).toBeNull()
  })

  it('/training?resume= keeps every param', async () => {
    const t = await resumeTarget({ resume: 'w-1', week: '2', expand: 'first' })
    const { path, params } = parse(t as string)
    expect(path).toBe(`/library/programs/${starter().id}`)
    expect(params).toEqual({ resume: ['w-1'], week: ['2'], expand: ['first'] })
  })

  it('?resume= with no active program shows the home page', async () => {
    await s.prisma.program.update({ where: { id: starter().id }, data: { isActive: false } })
    expect(await resumeTarget({ resume: 'w-1' })).toBeNull()
  })

  it('?resume= does not go to an archived, deleted or other user\'s program', async () => {
    await s.prisma.program.update({ where: { id: starter().id }, data: { isArchived: true } })
    expect(await resumeTarget({ resume: 'w-1' })).toBeNull()
    await s.prisma.program.update({ where: { id: starter().id }, data: { isArchived: false, deletedAt: new Date() } })
    expect(await resumeTarget({ resume: 'w-1' })).toBeNull()
    await s.prisma.program.update({ where: { id: starter().id }, data: { deletedAt: null, userId: s.otherUserId } })
    expect(await resumeTarget({ resume: 'w-1' })).toBeNull()
  })

  it('the home address goes to Training with or without an active program', async () => {
    expect(await rootTarget()).toBe('/training')
    await s.prisma.program.updateMany({ data: { isActive: false } })
    expect(await rootTarget()).toBe('/training')
  })

  it('the home address goes to Training for a user with no settings row', async () => {
    expect(await rootTarget()).toBe('/training')
  })

  it('onboarding still comes first', async () => {
    await s.prisma.userSettings.create({ data: { userId: s.userId, onboardingCompleted: false } })
    expect(await rootTarget()).toBe('/onboarding')
    await s.prisma.userSettings.update({ where: { userId: s.userId }, data: { onboardingCompleted: true } })
    expect(await rootTarget()).toBe('/training')
  })
})

afterEach(() => {
  cleanup()
})
