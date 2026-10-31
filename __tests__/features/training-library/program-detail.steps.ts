/**
 * Step definitions for features/training-library/program-detail.feature.
 * Codes strictly against initiatives/training-library/docs/spec.md
 * ("TL1 Program Detail").
 *
 * Seams the implementer builds to (all new modules; names are the contract):
 *
 *   lib/db/program-week.ts
 *     getProgramWeek(programId, userId, weekNumber?) -> ProgramWeekData | null
 *       null = the page is a 404 (unknown id, someone else's, soft-deleted).
 *       Otherwise the old CurrentStrengthWeekData shape ({ program, week,
 *       totalWeeks }) with program widened to { id, name, isActive,
 *       isArchived }, plus canTrain (active, not archived) and canActivate
 *       (not active, not archived). Without weekNumber it returns the current
 *       week: the first week with a workout that is neither completed nor
 *       skipped, else the last week.
 *
 *   lib/training/program-links.ts
 *     programDetailHref(programId, query?) -> "/library/programs/<id>[?k=v]"
 *     trainingRedirectTarget(userId, query) -> Promise<string | null>
 *       the active program's detail URL with the query kept; null = no active
 *       program, so /training shows NoActiveProgram.
 *     legacyProgramRedirectTarget(programId, query) -> string
 *       where /programs/[id] sends you, query kept.
 *
 * Existing modules whose behaviour changes (tested here):
 *   app/api/programs/[programId]/activate/route.ts   (unchanged contract)
 *   app/api/workouts/history/route.ts   workout.week.program gains `id`
 *   components/WorkoutHistoryList.tsx   program link -> program detail
 *
 * The view (StrengthWeekView read-only, Make active button, restart) is in
 * __tests__/components/program-detail-view.test.tsx.
 *
 * Modules under test are loaded lazily inside steps so a missing module fails
 * the scenario that needs it, not the whole file.
 *
 * vitest-cucumber runs every step as its own test, so state is created once
 * per scenario in the first Background step. Never reset it in afterEach.
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextRequest } from 'next/server'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'

const auth = vi.hoisted(() => ({ userId: '' }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  return { prisma: (await db()).getPrismaClient() }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () => ({ user: { id: auth.userId, role: 'user' }, error: null }),
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: async () => null,
  programManagementLimiter: {},
}))
vi.mock('@/lib/events', () => ({ recordEvent: () => {} }))

const feature = await loadFeature('features/training-library/program-detail.feature')

// ---------------------------------------------------------------------------
// Types for the seams (local, because the modules don't exist yet)
// ---------------------------------------------------------------------------
interface WeekData {
  program: { id: string; name: string; isActive: boolean; isArchived: boolean }
  week: {
    id: string
    weekNumber: number
    workouts: Array<{
      id: string
      name: string
      dayNumber: number
      completions: Array<{ id: string; status: string }>
    }>
  }
  totalWeeks: number
  canTrain: boolean
  canActivate: boolean
}
type Query = Record<string, string | string[] | undefined>

interface SeededProgram {
  id: string
  name: string
  weeks: Array<{ id: string; weekNumber: number; workouts: Array<{ id: string; dayNumber: number }> }>
}

interface State {
  prisma: PrismaClient
  userId: string
  otherUserId: string
  starter: SeededProgram
  split: SeededProgram
  last?: WeekData | null
  otherProgram?: SeededProgram
  target?: string | null
  historyPayload?: { completions: Array<Record<string, unknown>> }
}

let s: State

// ---------------------------------------------------------------------------
// Lazy loaders
// ---------------------------------------------------------------------------
const load = (spec: string) => import(/* @vite-ignore */ spec)

async function weekLoader() {
  return (await load('@/lib/db/program-week')) as {
    getProgramWeek: (programId: string, userId: string, weekNumber?: number) => Promise<WeekData | null>
  }
}
async function links() {
  return (await load('@/lib/training/program-links')) as {
    programDetailHref: (programId: string, query?: Record<string, string | undefined>) => string
    trainingRedirectTarget: (userId: string, query: Query) => Promise<string | null>
    legacyProgramRedirectTarget: (programId: string, query: Query) => string
  }
}

async function open(programId: string, weekNumber?: number, userId = s.userId) {
  const { getProgramWeek } = await weekLoader()
  return weekNumber === undefined
    ? getProgramWeek(programId, userId)
    : getProgramWeek(programId, userId, weekNumber)
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------
const WORKOUTS_PER_WEEK = 2

async function seedProgram(
  prisma: PrismaClient,
  userId: string,
  opts: { name: string; weeks: number; isActive: boolean; isArchived?: boolean }
): Promise<SeededProgram> {
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
            create: Array.from({ length: WORKOUTS_PER_WEEK }, (_, d) => ({
              name: `${opts.name} W${w + 1} D${d + 1}`,
              dayNumber: d + 1,
              userId,
            })),
          },
        })),
      },
    },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: { workouts: { orderBy: { dayNumber: 'asc' } } },
      },
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

async function logStatus(
  workoutId: string,
  status: 'completed' | 'skipped' | 'draft' | 'abandoned',
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

function workoutOf(p: SeededProgram, week: number, day: number) {
  return p.weeks[week - 1].workouts[day - 1].id
}

async function finishWeek(p: SeededProgram, week: number, status: 'completed' | 'skipped' = 'completed') {
  for (const w of p.weeks[week - 1].workouts) await logStatus(w.id, status)
}

async function freshState(): Promise<State> {
  const db = await getTestDatabase()
  await db.reset()
  const prisma = db.getPrismaClient()
  const user = await createTestUser()
  const other = await createTestUser()
  auth.userId = user.id
  const starter = await seedProgram(prisma, user.id, { name: 'Machine Starter', weeks: 5, isActive: true })
  const split = await seedProgram(prisma, user.id, { name: 'Old Split', weeks: 3, isActive: false })
  return { prisma, userId: user.id, otherUserId: other.id, starter, split }
}

function parse(target: string) {
  const url = new URL(target, 'http://localhost')
  const params: Record<string, string[]> = {}
  for (const [k, v] of url.searchParams) {
    params[k] = [...(params[k] ?? []), v]
  }
  return { path: url.pathname, params }
}

async function callActivate(programId: string) {
  const mod = (await load('@/app/api/programs/[programId]/activate/route')) as {
    POST: (req: NextRequest, ctx: { params: Promise<{ programId: string }> }) => Promise<Response>
  }
  return mod.POST(new NextRequest(`http://localhost/api/programs/${programId}/activate`, { method: 'POST' }), {
    params: Promise.resolve({ programId }),
  })
}

async function callHistory(userId: string) {
  auth.userId = userId
  const mod = (await load('@/app/api/workouts/history/route')) as {
    GET: (req: NextRequest) => Promise<Response>
  }
  const res = await mod.GET(new NextRequest('http://localhost/api/workouts/history?limit=5'))
  return { status: res.status, body: (await res.json()) as { completions: Array<Record<string, unknown>> } }
}

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------
describeFeature(feature, ({ Background, Rule }) => {
  Background(({ Given }) => {
    Given('a user with programs "Machine Starter" (active, 5 weeks) and "Old Split" (not active, 3 weeks)', async () => {
      s = await freshState()
      expect(await s.prisma.program.count({ where: { userId: s.userId } })).toBe(2)
      expect(s.starter.weeks).toHaveLength(5)
      expect(s.split.weeks).toHaveLength(3)
    })
  })

  Rule('Every program the user owns has a detail screen', ({ RuleScenario }) => {
    RuleScenario('The active program opens at its current week', ({ Given, When, Then, And }) => {
      Given('"Machine Starter" week 1 is all completed or skipped and week 2 has an unfinished workout', async () => {
        await logStatus(workoutOf(s.starter, 1, 1), 'completed')
        await logStatus(workoutOf(s.starter, 1, 2), 'skipped')
        await logStatus(workoutOf(s.starter, 2, 1), 'completed')
      })
      When('the user opens the detail screen for "Machine Starter"', async () => {
        s.last = await open(s.starter.id)
      })
      Then('it shows week 2 of 5', () => {
        expect(s.last).not.toBeNull()
        expect(s.last?.program.id).toBe(s.starter.id)
        expect(s.last?.program.name).toBe('Machine Starter')
        expect(s.last?.week.weekNumber).toBe(2)
        expect(s.last?.totalWeeks).toBe(5)
      })
      And('the user can start a workout and complete the week', () => {
        expect(s.last?.canTrain).toBe(true)
        expect(s.last?.canActivate).toBe(false)
      })
    })

    RuleScenario('A chosen week is shown', ({ When, Then }) => {
      When('the user opens the detail screen for "Machine Starter" at week 4', async () => {
        s.last = await open(s.starter.id, 4)
      })
      Then('it shows week 4 of 5', () => {
        expect(s.last).not.toBeNull()
        expect(s.last?.program.id).toBe(s.starter.id)
        expect(s.last?.week.weekNumber).toBe(4)
        expect(s.last?.totalWeeks).toBe(5)
        expect(s.last?.week.workouts.map((w) => w.dayNumber)).toEqual([1, 2])
      })
    })

    RuleScenario('A finished program opens at its last week', ({ Given, When, Then }) => {
      Given('every workout in "Old Split" is completed', async () => {
        for (const w of s.split.weeks) await finishWeek(s.split, w.weekNumber)
        expect(await s.prisma.workoutCompletion.count({ where: { userId: s.userId, status: 'completed' } })).toBe(6)
      })
      When('the user opens the detail screen for "Old Split"', async () => {
        s.last = await open(s.split.id)
      })
      Then('it shows week 3 of 3', () => {
        expect(s.last).not.toBeNull()
        expect(s.last?.program.id).toBe(s.split.id)
        expect(s.last?.week.weekNumber).toBe(3)
        expect(s.last?.totalWeeks).toBe(3)
      })
    })

    RuleScenario("Another user's program is not found", ({ When, Then }) => {
      When("the user opens the detail screen for another user's program", async () => {
        s.otherProgram = await seedProgram(s.prisma, s.otherUserId, {
          name: 'Their Program',
          weeks: 2,
          isActive: true,
        })
        s.last = await open(s.otherProgram.id)
      })
      Then('the page is not found', async () => {
        expect(s.last).toBeNull()
        // The program exists, and the owner can open it: it is the ownership
        // check that says no, not a bad id.
        const owner = await open(s.otherProgram?.id as string, undefined, s.otherUserId)
        expect(owner?.program.name).toBe('Their Program')
      })
    })

    RuleScenario('A deleted program is not found', ({ Given, When, Then }) => {
      Given('"Old Split" was deleted', async () => {
        await s.prisma.program.update({ where: { id: s.split.id }, data: { deletedAt: new Date() } })
      })
      When('the user opens the detail screen for "Old Split"', async () => {
        s.last = await open(s.split.id)
      })
      Then('the page is not found', async () => {
        expect(s.last).toBeNull()
        // A chosen week doesn't get around it either.
        expect(await open(s.split.id, 1)).toBeNull()
        // The other program is unaffected.
        expect((await open(s.starter.id))?.program.name).toBe('Machine Starter')
      })
    })
  })

  Rule("Programs that aren't active are view-only", ({ RuleScenario }) => {
    RuleScenario("A non-active program can't be trained", ({ When, Then, And }) => {
      When('the user opens the detail screen for "Old Split"', async () => {
        s.last = await open(s.split.id)
      })
      Then('its weeks and workouts are shown', () => {
        expect(s.last).not.toBeNull()
        expect(s.last?.program.name).toBe('Old Split')
        expect(s.last?.program.isActive).toBe(false)
        expect(s.last?.week.weekNumber).toBe(1)
        expect(s.last?.totalWeeks).toBe(3)
        expect(s.last?.week.workouts.map((w) => w.name)).toEqual(['Old Split W1 D1', 'Old Split W1 D2'])
      })
      And('there is no way to start or log a workout or complete a week', () => {
        expect(s.last?.canTrain).toBe(false)
      })
      And('a "Make active to train" button is shown', () => {
        expect(s.last?.canActivate).toBe(true)
      })
    })

    RuleScenario('Making it active from the detail screen', ({ When, Then, And }) => {
      When('the user makes "Old Split" active from its detail screen', async () => {
        const before = await open(s.split.id)
        expect(before?.canActivate).toBe(true)
        const res = await callActivate(s.split.id)
        expect(res.status).toBe(200)
      })
      Then('"Old Split" is the active program', async () => {
        const rows = await s.prisma.program.findMany({ where: { userId: s.userId }, select: { id: true, isActive: true } })
        expect(rows.filter((r) => r.isActive).map((r) => r.id)).toEqual([s.split.id])
      })
      And('its detail screen lets the user train', async () => {
        const split = await open(s.split.id)
        expect(split?.canTrain).toBe(true)
        expect(split?.canActivate).toBe(false)
        // The program it replaced is now the view-only one.
        const starter = await open(s.starter.id)
        expect(starter?.canTrain).toBe(false)
        expect(starter?.canActivate).toBe(true)
      })
    })

    RuleScenario('An archived program has no Make active button', ({ Given, When, Then }) => {
      Given('"Old Split" is archived', async () => {
        await s.prisma.program.update({ where: { id: s.split.id }, data: { isArchived: true } })
      })
      When('the user opens the detail screen for "Old Split"', async () => {
        s.last = await open(s.split.id)
      })
      Then('its weeks are shown read-only without a "Make active to train" button', () => {
        expect(s.last).not.toBeNull()
        expect(s.last?.program.isArchived).toBe(true)
        expect(s.last?.week.weekNumber).toBe(1)
        expect(s.last?.week.workouts).toHaveLength(2)
        expect(s.last?.canTrain).toBe(false)
        expect(s.last?.canActivate).toBe(false)
      })
    })
  })

  Rule('Old addresses lead to the detail screen', ({ RuleScenario }) => {
    RuleScenario('Training opens the active program\'s detail for now', ({ When, Then }) => {
      When('the user opens Training with week 3 and a workout to resume', async () => {
        const { trainingRedirectTarget } = await links()
        s.target = await trainingRedirectTarget(s.userId, { week: '3', resume: workoutOf(s.starter, 3, 1) })
      })
      Then('they land on the "Machine Starter" detail screen at week 3 with that workout resumed', () => {
        expect(s.target).toBeTruthy()
        const { path, params } = parse(s.target as string)
        expect(path).toBe(`/library/programs/${s.starter.id}`)
        expect(params.week).toEqual(['3'])
        expect(params.resume).toEqual([workoutOf(s.starter, 3, 1)])
      })
    })

    RuleScenario('Training without an active program', ({ Given, When, Then }) => {
      Given('the user has no active program', async () => {
        await s.prisma.program.updateMany({ where: { userId: s.userId }, data: { isActive: false } })
        expect(await s.prisma.program.count({ where: { userId: s.userId, isActive: true } })).toBe(0)
      })
      When('the user opens Training', async () => {
        const { trainingRedirectTarget } = await links()
        s.target = await trainingRedirectTarget(s.userId, {})
      })
      Then('they see the no-active-program screen', () => {
        expect(s.target).toBeNull()
      })
    })

    RuleScenario('The old program address redirects', ({ When, Then }) => {
      When('the user opens the old program address for "Old Split"', async () => {
        const { legacyProgramRedirectTarget } = await links()
        s.target = legacyProgramRedirectTarget(s.split.id, {})
      })
      Then('they land on the "Old Split" detail screen', async () => {
        expect(parse(s.target as string).path).toBe(`/library/programs/${s.split.id}`)
        // And that address is a working detail screen.
        expect((await open(s.split.id))?.program.name).toBe('Old Split')
      })
    })

    RuleScenario('Workout history links to the right program', ({ Given, When, Then }) => {
      Given('the user completed a workout in "Machine Starter"', async () => {
        await logStatus(workoutOf(s.starter, 1, 1), 'completed')
      })
      When("the user follows that workout's program link in their history", async () => {
        const { status, body } = await callHistory(s.userId)
        expect(status).toBe(200)
        s.historyPayload = body
        expect(body.completions).toHaveLength(1)
      })
      Then('they land on the "Machine Starter" detail screen', async () => {
        vi.stubGlobal(
          'fetch',
          vi.fn(async () => ({ ok: true, json: async () => s.historyPayload }))
        )
        const { default: WorkoutHistoryList } = (await load('@/components/WorkoutHistoryList')) as {
          default: (p: { count: number }) => unknown
        }
        render(createElement(WorkoutHistoryList as never, { count: 1 }))
        fireEvent.click(await screen.findByText('Machine Starter W1 D1'))
        const link = await screen.findByRole('link', { name: /view full workout/i })
        expect(link.getAttribute('href')).toBe(`/library/programs/${s.starter.id}?week=1`)
        // Not the workout id the link used to point at.
        expect(link.getAttribute('href')).not.toContain(workoutOf(s.starter, 1, 1))
        cleanup()
        vi.unstubAllGlobals()
      })
    })
  })
})

// ---------------------------------------------------------------------------
// Edges from the spec that the scenarios don't spell out
// ---------------------------------------------------------------------------
describe('program detail: current week', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  it('opens at week 1 when nothing has been logged', async () => {
    expect((await open(s.starter.id))?.week.weekNumber).toBe(1)
  })

  it('counts skipped as done: a week of only skipped workouts is passed', async () => {
    await finishWeek(s.starter, 1, 'skipped')
    await finishWeek(s.starter, 2, 'skipped')
    expect((await open(s.starter.id))?.week.weekNumber).toBe(3)
  })

  it('a mix of one completed and one skipped workout is done', async () => {
    await logStatus(workoutOf(s.starter, 1, 1), 'completed')
    await logStatus(workoutOf(s.starter, 1, 2), 'skipped')
    expect((await open(s.starter.id))?.week.weekNumber).toBe(2)
  })

  it('a week with one workout done and one untouched stays current', async () => {
    await logStatus(workoutOf(s.starter, 1, 1), 'completed')
    expect((await open(s.starter.id))?.week.weekNumber).toBe(1)
  })

  it('a draft in progress is not done', async () => {
    await logStatus(workoutOf(s.starter, 1, 1), 'completed')
    await logStatus(workoutOf(s.starter, 1, 2), 'draft')
    expect((await open(s.starter.id))?.week.weekNumber).toBe(1)
  })

  it('an archived completion (after a restart) is not done', async () => {
    await finishWeek(s.starter, 1)
    await s.prisma.workoutCompletion.updateMany({ where: { userId: s.userId }, data: { isArchived: true } })
    expect((await open(s.starter.id))?.week.weekNumber).toBe(1)
  })

  it('stops at the first unfinished week even if a later week is finished', async () => {
    await finishWeek(s.starter, 3)
    expect((await open(s.starter.id))?.week.weekNumber).toBe(1)
  })

  it('applies the same rule to a program that is not active', async () => {
    await finishWeek(s.split, 1)
    const data = await open(s.split.id)
    expect(data?.week.weekNumber).toBe(2)
    expect(data?.canTrain).toBe(false)
  })

  it('uses this program\'s workouts, not the active program\'s', async () => {
    // Machine Starter (active) is all done; Old Split has not been touched.
    for (const w of s.starter.weeks) await finishWeek(s.starter, w.weekNumber)
    expect((await open(s.split.id))?.week.weekNumber).toBe(1)
    expect((await open(s.starter.id))?.week.weekNumber).toBe(5)
  })

  it('an explicit week overrides the current week', async () => {
    await finishWeek(s.starter, 1)
    expect((await open(s.starter.id))?.week.weekNumber).toBe(2)
    expect((await open(s.starter.id, 1))?.week.weekNumber).toBe(1)
    expect((await open(s.starter.id, 5))?.week.weekNumber).toBe(5)
  })

  it('shows the completion status of each workout so finished ones can be viewed', async () => {
    await logStatus(workoutOf(s.split, 1, 1), 'completed')
    await logStatus(workoutOf(s.split, 1, 2), 'skipped')
    const data = await open(s.split.id, 1)
    expect(data?.week.workouts.map((w) => w.completions.map((c) => c.status))).toEqual([['completed'], ['skipped']])
  })

  it('does not count another user\'s completions toward the current week', async () => {
    for (const w of s.starter.weeks[0].workouts) await logStatus(w.id, 'completed', { userId: s.otherUserId })
    expect((await open(s.starter.id))?.week.weekNumber).toBe(1)
  })

  it('does not show completions that were archived by a restart', async () => {
    await logStatus(workoutOf(s.split, 1, 1), 'completed', { isArchived: true })
    const data = await open(s.split.id, 1)
    expect(data?.week.workouts[0].completions).toEqual([])
  })

  it('ignores another user\'s completions of the same workout', async () => {
    await logStatus(workoutOf(s.starter, 1, 1), 'completed', { userId: s.otherUserId })
    const data = await open(s.starter.id, 1)
    expect(data?.week.workouts[0].completions).toEqual([])
  })
})

describe('program detail: who can open what', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  it('an unknown id is not found', async () => {
    expect(await open('does-not-exist')).toBeNull()
  })

  it("another user's active program is not found, with or without a week", async () => {
    const theirs = await seedProgram(s.prisma, s.otherUserId, { name: 'Theirs', weeks: 2, isActive: true })
    expect(await open(theirs.id)).toBeNull()
    expect(await open(theirs.id, 1)).toBeNull()
  })

  it("another user's archived program is not found", async () => {
    const theirs = await seedProgram(s.prisma, s.otherUserId, { name: 'Theirs', weeks: 2, isActive: false, isArchived: true })
    expect(await open(theirs.id)).toBeNull()
  })

  it('an archived program shows its weeks, including a chosen week, with no train or activate', async () => {
    await s.prisma.program.update({ where: { id: s.split.id }, data: { isArchived: true } })
    await logStatus(workoutOf(s.split, 2, 1), 'completed')
    const data = await open(s.split.id, 2)
    expect(data?.week.weekNumber).toBe(2)
    expect(data?.week.workouts[0].completions[0].status).toBe('completed')
    expect(data?.canTrain).toBe(false)
    expect(data?.canActivate).toBe(false)
  })

  it('an archived program that still has the active flag is read-only with no activate', async () => {
    await s.prisma.program.update({ where: { id: s.split.id }, data: { isActive: true, isArchived: true } })
    const data = await open(s.split.id)
    expect(data?.program.isArchived).toBe(true)
    expect(data?.canTrain).toBe(false)
    expect(data?.canActivate).toBe(false)
  })

  it.each([
    ['active', { isActive: true, isArchived: false }, { canTrain: true, canActivate: false }],
    ['not active', { isActive: false, isArchived: false }, { canTrain: false, canActivate: true }],
    ['archived', { isActive: false, isArchived: true }, { canTrain: false, canActivate: false }],
  ])('a %s program with no weeks is found, with no week to show', async (_n, flags, access) => {
    const empty = await seedProgram(s.prisma, s.userId, { name: 'Empty', weeks: 0, ...flags })
    for (const data of [await open(empty.id), await open(empty.id, 2)]) {
      expect(data).not.toBeNull()
      expect((data as unknown as { week: unknown }).week).toBeNull()
      expect(data?.totalWeeks).toBe(0)
      expect(data?.program.name).toBe('Empty')
      expect(data).toMatchObject(access)
    }
  })

  it("another user's program with no weeks is still not found", async () => {
    const theirs = await seedProgram(s.prisma, s.otherUserId, { name: 'Theirs', weeks: 0, isActive: true })
    expect(await open(theirs.id)).toBeNull()
  })

  it('a deleted program with no weeks is not found', async () => {
    const empty = await seedProgram(s.prisma, s.userId, { name: 'Empty', weeks: 0, isActive: false })
    await s.prisma.program.update({ where: { id: empty.id }, data: { deletedAt: new Date() } })
    expect(await open(empty.id)).toBeNull()
  })

  it('a deleted program is not found even if it was active', async () => {
    await s.prisma.program.update({ where: { id: s.starter.id }, data: { deletedAt: new Date() } })
    expect(await open(s.starter.id)).toBeNull()
  })

  it('only the active program can be trained', async () => {
    expect(await open(s.starter.id)).toMatchObject({ canTrain: true, canActivate: false })
    expect(await open(s.split.id)).toMatchObject({ canTrain: false, canActivate: true })
  })
})

describe('program detail: redirects', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  it('/training goes to the active program with no query when none was given', async () => {
    const { trainingRedirectTarget } = await links()
    const target = await trainingRedirectTarget(s.userId, {})
    expect(target).toBe(`/library/programs/${s.starter.id}`)
  })

  it('/training keeps week, resume and every other query param', async () => {
    const { trainingRedirectTarget } = await links()
    const target = await trainingRedirectTarget(s.userId, {
      week: '2',
      resume: 'w-123',
      expand: 'first',
      debugHistoryCount: '0',
    })
    const { path, params } = parse(target as string)
    expect(path).toBe(`/library/programs/${s.starter.id}`)
    expect(params).toEqual({ week: ['2'], resume: ['w-123'], expand: ['first'], debugHistoryCount: ['0'] })
  })

  it('/training skips params that are undefined', async () => {
    const { trainingRedirectTarget } = await links()
    const target = await trainingRedirectTarget(s.userId, { week: undefined, resume: 'w-1' })
    expect(parse(target as string).params).toEqual({ resume: ['w-1'] })
  })

  it('/training keeps a repeated param as repeated values', async () => {
    const { trainingRedirectTarget } = await links()
    const target = await trainingRedirectTarget(s.userId, { week: ['1', '2'] })
    expect(parse(target as string).params).toEqual({ week: ['1', '2'] })
  })

  it('/training goes to an active program that has no weeks yet', async () => {
    await s.prisma.program.updateMany({ where: { userId: s.userId }, data: { isActive: false } })
    const empty = await seedProgram(s.prisma, s.userId, { name: 'Empty', weeks: 0, isActive: true })
    const { trainingRedirectTarget } = await links()
    expect(await trainingRedirectTarget(s.userId, { week: '2' })).toBe(`/library/programs/${empty.id}?week=2`)
  })

  it('/training goes to whichever program is active', async () => {
    await s.prisma.program.update({ where: { id: s.starter.id }, data: { isActive: false } })
    await s.prisma.program.update({ where: { id: s.split.id }, data: { isActive: true } })
    const { trainingRedirectTarget } = await links()
    expect(parse((await trainingRedirectTarget(s.userId, {})) as string).path).toBe(`/library/programs/${s.split.id}`)
  })

  it("/training ignores another user's active program", async () => {
    await s.prisma.program.updateMany({ where: { userId: s.userId }, data: { isActive: false } })
    await seedProgram(s.prisma, s.otherUserId, { name: 'Theirs', weeks: 2, isActive: true })
    const { trainingRedirectTarget } = await links()
    expect(await trainingRedirectTarget(s.userId, { week: '2' })).toBeNull()
  })

  it('/training does not treat an archived program as active', async () => {
    await s.prisma.program.updateMany({ where: { userId: s.userId }, data: { isActive: false } })
    await s.prisma.program.update({ where: { id: s.split.id }, data: { isActive: true, isArchived: true } })
    const { trainingRedirectTarget } = await links()
    expect(await trainingRedirectTarget(s.userId, {})).toBeNull()
  })

  it('/training does not treat a deleted active program as active', async () => {
    await s.prisma.program.update({ where: { id: s.starter.id }, data: { deletedAt: new Date() } })
    const { trainingRedirectTarget } = await links()
    expect(await trainingRedirectTarget(s.userId, {})).toBeNull()
  })

  it('/training with no active program redirects nowhere, whatever the query', async () => {
    await s.prisma.program.updateMany({ where: { userId: s.userId }, data: { isActive: false } })
    const { trainingRedirectTarget } = await links()
    expect(await trainingRedirectTarget(s.userId, { week: '3', resume: 'w' })).toBeNull()
  })

  it('/programs/[id] keeps the query string', async () => {
    const { legacyProgramRedirectTarget } = await links()
    const { path, params } = parse(legacyProgramRedirectTarget(s.split.id, { week: '2', resume: 'w-9' }))
    expect(path).toBe(`/library/programs/${s.split.id}`)
    expect(params).toEqual({ week: ['2'], resume: ['w-9'] })
  })

  it('/programs/[id] with no query has no question mark', async () => {
    const { legacyProgramRedirectTarget } = await links()
    expect(legacyProgramRedirectTarget(s.split.id, {})).toBe(`/library/programs/${s.split.id}`)
  })

  it('/programs/[id] does not check the id: it redirects whatever it is given', async () => {
    const { legacyProgramRedirectTarget } = await links()
    expect(legacyProgramRedirectTarget('abc123', { week: '1' })).toBe('/library/programs/abc123?week=1')
  })

  it('programDetailHref builds the detail address, with and without a query', async () => {
    const { programDetailHref } = await links()
    expect(programDetailHref('p1')).toBe('/library/programs/p1')
    expect(programDetailHref('p1', {})).toBe('/library/programs/p1')
    expect(programDetailHref('p1', { week: '1' })).toBe('/library/programs/p1?week=1')
    const { params } = parse(programDetailHref('p1', { week: '2', resume: 'w1', skipped: undefined }))
    expect(params).toEqual({ week: ['2'], resume: ['w1'] })
  })
})

describe('program detail: workout history link', () => {
  beforeEach(async () => {
    s = await freshState()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('the history route says which program each session belongs to', async () => {
    await logStatus(workoutOf(s.split, 2, 1), 'completed')
    const { body } = await callHistory(s.userId)
    const workout = body.completions[0].workout as { week: { program: { id: string; name: string } } }
    expect(workout.week.program).toEqual({ id: s.split.id, name: 'Old Split' })
  })

  it('each session links to its own program, not the active one', async () => {
    await logStatus(workoutOf(s.starter, 1, 1), 'completed')
    await logStatus(workoutOf(s.split, 3, 1), 'completed')
    const { body } = await callHistory(s.userId)
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => body })))
    const { default: WorkoutHistoryList } = (await load('@/components/WorkoutHistoryList')) as {
      default: (p: { count: number }) => unknown
    }
    render(createElement(WorkoutHistoryList as never, { count: 2 }))
    fireEvent.click(await screen.findByText('Old Split W3 D1'))
    fireEvent.click(await screen.findByText('Machine Starter W1 D1'))
    await waitFor(() => expect(screen.getAllByRole('link', { name: /view full workout/i })).toHaveLength(2))
    const hrefs = screen
      .getAllByRole('link', { name: /view full workout/i })
      .map((a) => a.getAttribute('href'))
      .sort()
    // Each link opens the week that session was in.
    expect(hrefs).toEqual([`/library/programs/${s.split.id}?week=3`, `/library/programs/${s.starter.id}?week=1`].sort())
  })

  it('a freestyle session has no program link', async () => {
    await s.prisma.workoutCompletion.create({
      data: { userId: s.userId, status: 'completed', completedAt: new Date(), isAdHoc: true, name: 'Arm day' },
    })
    const { body } = await callHistory(s.userId)
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => body })))
    const { default: WorkoutHistoryList } = (await load('@/components/WorkoutHistoryList')) as {
      default: (p: { count: number }) => unknown
    }
    render(createElement(WorkoutHistoryList as never, { count: 1 }))
    fireEvent.click(await screen.findByText('Arm day'))
    expect(screen.queryByRole('link', { name: /view full workout/i })).toBeNull()
  })
})
