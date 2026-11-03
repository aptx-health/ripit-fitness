/**
 * Planned sets in the workout logger: what the ad-hoc logger page loads (work item 120). Real test DB.
 * Spec: features/workout-logging/adhoc-planned-sets.feature (Background, "Exercises without a plan",
 * "Fresh ad-hoc sessions").
 *
 * Pinned: the page `app/(app)/training/adhoc/[completionId]/page.tsx` (default export, as today) renders
 * <AdHocLoggerView> whose `initialExercises` entries now each carry
 *   prescribedSets: Array<{ setNumber: number, reps: string, rpe: number | null, rir: number | null, isWarmup: boolean }>
 * the exercise's PrescribedSets in setNumber order; [] (not missing) for an exercise with none. The rest of
 * the entry and the redirects are as today. The test calls the page and its loader child directly.
 */

import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const h = vi.hoisted(() => ({ userId: '' as string }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  return { prisma: (await db()).getPrismaClient() }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    h.userId ? { user: { id: h.userId, role: 'user', email: 'a@b.c' }, error: null } : { user: null, error: null },
}))
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`)
  },
}))

const load = (spec: string) => import(/* @vite-ignore */ spec)

type PlanSet = { setNumber: number; reps: string; rpe: number | null; rir: number | null; isWarmup: boolean }
type Ex = { id: string; name: string; prescribedSets: PlanSet[] }
type SavedSet = { setNumber: number; reps: string; rir: number | null; rpe: number | null; isWarmup: boolean }

let prisma: PrismaClient
let userId: string
let otherUserId: string

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  userId = (await createTestUser()).id
  otherUserId = (await createTestUser()).id
  h.userId = userId
})

const def = async (name: string) => (await createTestExerciseDefinition(prisma, { name, primaryFAUs: ['quads'] })).id

/** A session started from a saved workout, through the real start function. */
async function startFrom(plan: Array<{ name: string; sets: SavedSet[] }>, owner = userId): Promise<string> {
  const { startDraftFromPlan } = (await load('@/lib/workouts/start-draft')) as typeof import('@/lib/workouts/start-draft')
  const data = await Promise.all(
    plan.map(async (ex, i) => ({
      name: ex.name,
      exerciseDefinitionId: await def(ex.name),
      order: i + 1,
      notes: null,
      exerciseGroup: null,
      sets: ex.sets,
    })),
  )
  const res = await startDraftFromPlan({ userId: owner, name: 'Leg day', plan: data })
  if (!res.ok) throw new Error('draft exists')
  return res.completionId
}
const sets = (reps: string[], o: { rpe?: number; rir?: number } = {}): SavedSet[] =>
  reps.map((r, i) => ({ setNumber: i + 1, reps: r, rpe: o.rpe ?? null, rir: o.rir ?? null, isWarmup: false }))

/** What the page hands the logger view. */
async function page(completionId: string) {
  const mod = (await load('@/app/(app)/training/adhoc/[completionId]/page')) as {
    default: (p: { params: Promise<{ completionId: string }>; searchParams: Promise<{ new?: string }> }) => Promise<{ props: { children: { type: (p: unknown) => Promise<{ props: { initialExercises: Ex[] } }>; props: unknown } } }>
  }
  const shell = await mod.default({ params: Promise.resolve({ completionId }), searchParams: Promise.resolve({}) })
  const loader = shell.props.children
  return (await loader.type(loader.props)).props.initialExercises
}

describe('a session started from a saved workout', () => {
  it('Back Squat is planned as 3 sets of 8 reps at RPE 8', async () => {
    const id = await startFrom([{ name: 'Back Squat', sets: sets(['8', '8', '8'], { rpe: 8 }) }])
    const [squat] = await page(id)
    expect(squat.name).toBe('Back Squat')
    expect(squat.prescribedSets).toEqual([
      { setNumber: 1, reps: '8', rpe: 8, rir: null, isWarmup: false },
      { setNumber: 2, reps: '8', rpe: 8, rir: null, isWarmup: false },
      { setNumber: 3, reps: '8', rpe: 8, rir: null, isWarmup: false },
    ])
  })

  it('each exercise has its own plan, in the order of the exercises', async () => {
    const id = await startFrom([
      { name: 'Back Squat', sets: sets(['8', '8', '8'], { rpe: 8 }) },
      { name: 'Leg Press', sets: sets(['12', '12'], { rir: 2 }) },
      { name: 'Plank', sets: sets(['60', '60', '60']) },
    ])
    const ex = await page(id)
    expect(ex.map((e) => e.name)).toEqual(['Back Squat', 'Leg Press', 'Plank'])
    expect(ex.map((e) => e.prescribedSets.length)).toEqual([3, 2, 3])
    expect(ex[1].prescribedSets[0]).toMatchObject({ reps: '12', rir: 2, rpe: null })
    expect(ex[2].prescribedSets[0]).toMatchObject({ reps: '60', rir: null, rpe: null })
  })

  it('the sets come in setNumber order, whatever order they were stored in', async () => {
    const id = await startFrom([{ name: 'Bench Press', sets: sets(['5', '5', '8'], { rpe: 8 }) }])
    const exercise = await prisma.exercise.findFirstOrThrow({ where: { workoutCompletionId: id } })
    // Rewrite the plan so that the stored order is 3, 1, 2.
    await prisma.prescribedSet.deleteMany({ where: { exerciseId: exercise.id } })
    for (const [setNumber, reps] of [[3, '8'], [1, '5'], [2, '5']] as const) {
      await prisma.prescribedSet.create({ data: { exerciseId: exercise.id, userId, setNumber, reps, rpe: 8 } })
    }
    const [bench] = await page(id)
    expect(bench.prescribedSets.map((s) => s.setNumber)).toEqual([1, 2, 3])
    expect(bench.prescribedSets.map((s) => s.reps)).toEqual(['5', '5', '8'])
  })

  it('warm-up sets and rep ranges come through as stored', async () => {
    const id = await startFrom([
      {
        name: 'Deadlift',
        sets: [
          { setNumber: 1, reps: '10', rpe: null, rir: null, isWarmup: true },
          { setNumber: 2, reps: '3-5', rpe: null, rir: 2, isWarmup: false },
        ],
      },
    ])
    const [dead] = await page(id)
    expect(dead.prescribedSets).toEqual([
      { setNumber: 1, reps: '10', rpe: null, rir: null, isWarmup: true },
      { setNumber: 2, reps: '3-5', rpe: null, rir: 2, isWarmup: false },
    ])
  })

  it('an exercise added during the session has no plan: an empty list', async () => {
    const id = await startFrom([{ name: 'Back Squat', sets: sets(['8', '8', '8'], { rpe: 8 }) }])
    const lat = await def('Lateral Raise')
    await prisma.exercise.create({
      data: { name: 'Lateral Raise', exerciseDefinitionId: lat, order: 2, userId, workoutCompletionId: id, isOneOff: true },
    })
    const ex = await page(id)
    expect(ex.map((e) => e.name)).toEqual(['Back Squat', 'Lateral Raise'])
    expect(ex[0].prescribedSets).toHaveLength(3)
    expect(ex[1].prescribedSets).toEqual([])
  })

  it('a planned exercise whose saved sets were empty has an empty list too', async () => {
    const id = await startFrom([{ name: 'Back Squat', sets: [] }])
    expect((await page(id))[0].prescribedSets).toEqual([])
  })

  it('the rest of the entry is as before', async () => {
    const id = await startFrom([{ name: 'Back Squat', sets: sets(['8'], { rpe: 8 }) }])
    const [squat] = await page(id)
    expect(squat).toMatchObject({ name: 'Back Squat', notes: null, exerciseDefinition: { primaryFAUs: ['quads'] } })
    expect(typeof squat.id).toBe('string')
  })
})

describe('Fresh ad-hoc sessions', () => {
  it('a session the user builds as they go has no plan on any exercise', async () => {
    const completion = await prisma.workoutCompletion.create({
      data: { userId, status: 'draft', isAdHoc: true, name: 'Open Workout', startedAt: new Date() },
    })
    for (const [i, name] of ['Back Squat', 'Bench Press'].entries()) {
      await prisma.exercise.create({
        data: { name, exerciseDefinitionId: await def(name), order: i + 1, userId, workoutCompletionId: completion.id, isOneOff: true },
      })
    }
    const ex = await page(completion.id)
    expect(ex).toHaveLength(2)
    expect(ex.map((e) => e.prescribedSets)).toEqual([[], []])
  })
})

describe('Only your own session', () => {
  it('another user\'s session is not loaded: the page redirects and no plan is handed over', async () => {
    const id = await startFrom([{ name: 'Back Squat', sets: sets(['8', '8', '8'], { rpe: 8 }) }], otherUserId)
    await expect(page(id)).rejects.toThrow('REDIRECT:/training')
  })

  it('a user not signed in is sent to log in', async () => {
    const id = await startFrom([{ name: 'Back Squat', sets: sets(['8'], { rpe: 8 }) }])
    h.userId = ''
    await expect(page(id)).rejects.toThrow('REDIRECT:/login')
  })

  it('two users with the same saved workout each get their own session\'s plan', async () => {
    const mine = await startFrom([{ name: 'Back Squat', sets: sets(['8', '8', '8'], { rpe: 8 }) }])
    const theirs = await startFrom([{ name: 'Back Squat', sets: sets(['5', '5'], { rpe: 9 }) }], otherUserId)
    expect((await page(mine))[0].prescribedSets).toHaveLength(3)
    h.userId = otherUserId
    const other = (await page(theirs))[0].prescribedSets
    expect(other.map((s) => s.reps)).toEqual(['5', '5'])
    expect(other[0].rpe).toBe(9)
  })
})
