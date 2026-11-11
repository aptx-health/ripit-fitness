/**
 * Quick swap at the API level (work 211). Real test DB, routes called directly.
 * Behaviour: features/workout-logging/quick-swap.feature. Ranking itself: __tests__/lib/exercises/similar.test.ts.
 *
 * PINNED (new)
 *   GET /api/exercises/similar?definitionId=<exercise definition id>
 *     200 { similar: [{ id, name, primaryFAUs, secondaryFAUs, equipment, ... }] }: up to 8, ranked by
 *       rankSimilar over every exercise the user can use (isSystem, or the user's own custom) that shares a
 *       primary muscle, ties in name order. The definition itself is never listed. An untagged definition
 *       (no primaryFAUs) gives { similar: [] }.
 *     401 signed out; 400 no definitionId; 404 a definition that does not exist or the user can't see
 *       (another user's custom), so it can't be used to probe them; 429 when checkRateLimit (keyed on the
 *       user id) refuses; 500 and logger.error when the database fails.
 *
 * EXISTING (regression guards; these pass before the build)
 *   POST /api/exercises/<exerciseId>/replace without prescribedSets keeps the exercise's prescribed sets;
 *   with applyToFuture it swaps the same exercise in this and later weeks, each keeping its own sets, and
 *   leaves earlier weeks, other exercises and logged sets alone.
 */

import type { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const auth = vi.hoisted(() => ({ userId: '' }))
const rl = vi.hoisted(() => ({ refuse: false, keys: [] as string[] }))
const boom = vi.hoisted(() => ({ on: false }))
const log = vi.hoisted(() => ({ error: vi.fn() }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  const real = (await db()).getPrismaClient()
  // boom.on makes every database call from app code fail (the tests keep the real client).
  const prisma = new Proxy(real, {
    get(target, key) {
      if (boom.on) throw new Error('database unavailable (test)')
      const value = Reflect.get(target, key)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  return { prisma, default: prisma }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    auth.userId
      ? { user: { id: auth.userId, role: 'user', email: `${auth.userId}@x.test` }, error: null }
      : { user: null, error: null },
}))
vi.mock('@/lib/logger', () => {
  const l = { error: log.error, warn: vi.fn(), info: vi.fn(), debug: vi.fn(), trace: vi.fn(), fatal: vi.fn() }
  return { logger: { ...l, child: () => l }, default: l }
})
vi.mock('@/lib/rate-limit', async () => {
  const refused = () => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
  return new Proxy(
    {},
    {
      has: () => true,
      get: (_t, key) => {
        if (key === 'then' || key === '__esModule') return undefined
        if (key === 'getClientIp') return () => '203.0.113.7'
        if (key === 'checkRateLimit')
          return async (_l: unknown, k: string) => {
            rl.keys.push(String(k))
            return rl.refuse ? refused() : null
          }
        if (key === 'checkRateLimitWithHeaders')
          return async (_l: unknown, k: string) => {
            rl.keys.push(String(k))
            return { response: rl.refuse ? refused() : null, headers: {} }
          }
        return {}
      },
    }
  )
})

type Handler = (r: NextRequest, c?: unknown) => Promise<Response>
const load = (spec: string) => import(/* @vite-ignore */ spec)
const similarRoute = async () => (await load('@/app/api/exercises/similar/route')) as { GET: Handler }
const { POST: replacePOST } = (await import('@/app/api/exercises/[exerciseId]/replace/route')) as { POST: Handler }

let prisma: PrismaClient
let me: string
let other: string
const d: Record<string, string> = {}

async function makeDef(name: string, primaryFAUs: string[], equipment: string[], movementPattern: string | null, owner?: string) {
  const made = await createTestExerciseDefinition(prisma, {
    name,
    primaryFAUs,
    equipment,
    ...(owner ? { userId: owner, isSystem: false } : { isSystem: true }),
  })
  await prisma.exerciseDefinition.update({ where: { id: made.id }, data: { movementPattern } })
  d[name] = made.id
  return made.id
}

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  me = (await createTestUser()).id
  other = (await createTestUser()).id
  auth.userId = me
  rl.refuse = false
  rl.keys.length = 0
  boom.on = false
  log.error.mockClear()
  for (const k of Object.keys(d)) delete d[k]
  await makeDef('Dumbbell Goblet Squat', ['quads', 'glutes'], ['dumbbell'], 'squat')
  await makeDef('Dumbbell Front Squat', ['quads', 'glutes'], ['dumbbell'], 'squat')
  await makeDef('Dumbbell Lunge', ['quads', 'glutes'], ['dumbbell'], 'lunge')
  await makeDef('Barbell Back Squat', ['quads', 'glutes'], ['barbell'], 'squat')
  await makeDef('Leg Extension', ['quads'], ['machine'], null)
  await makeDef('Hip Thrust', ['glutes'], ['barbell'], 'hinge')
  await makeDef('Dumbbell Step Up', ['glutes'], ['dumbbell'], null)
  await makeDef('Dumbbell Curl', ['biceps'], ['dumbbell'], 'squat')
  await makeDef('Plank', [], ['bodyweight'], null)
  await makeDef('My Split Squat', ['quads', 'glutes'], ['dumbbell'], null, me)
  await makeDef('Their Goblet Variant', ['quads', 'glutes'], ['dumbbell'], 'squat', other)
})

async function similar(definitionId?: string) {
  const qs = definitionId === undefined ? '' : `?definitionId=${encodeURIComponent(definitionId)}`
  const res = await (await similarRoute()).GET(new NextRequest(`http://localhost/api/exercises/similar${qs}`))
  const body = (await res.json().catch(() => ({}))) as { similar?: Array<Record<string, unknown>> }
  return { status: res.status, body, names: (body.similar ?? []).map((e) => e.name as string) }
}

describe('GET /api/exercises/similar: ranking against the database', () => {
  it('goblet squat: same pattern first, then the dumbbell pair, barbell, the one-muscle dumbbell, then the rest', async () => {
    const { status, names } = await similar(d['Dumbbell Goblet Squat'])
    expect(status).toBe(200)
    expect(names).toEqual([
      'Dumbbell Front Squat',
      'Dumbbell Lunge',
      'My Split Squat',
      'Barbell Back Squat',
      'Dumbbell Step Up',
      'Hip Thrust',
      'Leg Extension',
    ])
  })

  it('each entry carries what the picker cards need', async () => {
    const { body } = await similar(d['Dumbbell Goblet Squat'])
    const lunge = body.similar?.find((e) => e.name === 'Dumbbell Lunge')
    expect(lunge).toMatchObject({ id: d['Dumbbell Lunge'], primaryFAUs: ['quads', 'glutes'], equipment: ['dumbbell'] })
    expect(lunge).toHaveProperty('secondaryFAUs')
  })

  it('never lists the current exercise, no-shared-muscle ones or the untagged', async () => {
    const { names } = await similar(d['Dumbbell Goblet Squat'])
    expect(names).not.toContain('Dumbbell Goblet Squat')
    expect(names).not.toContain('Dumbbell Curl')
    expect(names).not.toContain('Plank')
  })

  it('ranks over every match, not just the first rows by name: the best match named last still leads', async () => {
    // Twelve one-muscle matches named "Aa..." come before "Zz Best" alphabetically.
    for (let i = 0; i < 12; i++) await makeDef(`Aa Quad Drill ${String(i).padStart(2, '0')}`, ['quads'], ['machine'], null)
    await makeDef('Zz Best Squat', ['quads', 'glutes'], ['dumbbell'], 'squat')
    const { names } = await similar(d['Dumbbell Goblet Squat'])
    expect(names).toHaveLength(8)
    expect(names.slice(0, 2).sort()).toEqual(['Dumbbell Front Squat', 'Zz Best Squat'])
    expect(names).toContain('Dumbbell Lunge')
    expect(names).toContain('My Split Squat')
    expect(names).toContain('Barbell Back Squat')
    expect(names).toContain('Dumbbell Step Up')
  })

  it('ties come back in name order', async () => {
    await makeDef('Ab Leg Drill', ['quads'], ['machine'], null)
    const { names } = await similar(d['Dumbbell Goblet Squat'])
    expect(names.slice(5)).toEqual(['Ab Leg Drill', 'Hip Thrust', 'Leg Extension'])
  })

  it('an untagged current exercise gives an empty list', async () => {
    const { status, body } = await similar(d.Plank)
    expect(status).toBe(200)
    expect(body.similar).toEqual([])
  })

  it('works for my own custom exercise as the current one', async () => {
    const { status, names } = await similar(d['My Split Squat'])
    expect(status).toBe(200)
    expect(names).toContain('Dumbbell Goblet Squat')
    expect(names).not.toContain('My Split Squat')
  })
})

describe('GET /api/exercises/similar: only exercises I can use', () => {
  it('lists library exercises and my own custom ones, never another user\'s', async () => {
    const { names } = await similar(d['Dumbbell Goblet Squat'])
    expect(names).toContain('My Split Squat')
    expect(names).toContain('Dumbbell Lunge')
    expect(names).not.toContain('Their Goblet Variant')
  })

  it('the other user sees their own custom and not mine', async () => {
    auth.userId = other
    const { names } = await similar(d['Dumbbell Goblet Squat'])
    expect(names).toContain('Their Goblet Variant')
    expect(names).not.toContain('My Split Squat')
  })

  it('another user\'s custom exercise as the current one is 404, with nothing listed', async () => {
    const { status, body } = await similar(d['Their Goblet Variant'])
    expect(status).toBe(404)
    expect(body.similar).toBeUndefined()
  })

  it('an unknown id is 404', async () => {
    expect((await similar('does-not-exist')).status).toBe(404)
  })
})

describe('GET /api/exercises/similar: guards', () => {
  it('401 when signed out', async () => {
    auth.userId = ''
    expect((await similar(d['Dumbbell Goblet Squat'])).status).toBe(401)
  })

  it('400 without a definitionId', async () => {
    expect((await similar()).status).toBe(400)
    expect((await similar('')).status).toBe(400)
  })

  it('429 when rate limited, keyed on the user', async () => {
    rl.refuse = true
    const { status, body } = await similar(d['Dumbbell Goblet Squat'])
    expect(status).toBe(429)
    expect(body.similar).toBeUndefined()
    expect(rl.keys.some((k) => k.includes(me))).toBe(true)
  })

  it('500 and a logged error when the database fails', async () => {
    boom.on = true
    const { status } = await similar(d['Dumbbell Goblet Squat'])
    boom.on = false
    expect(status).toBe(500)
    expect(log.error).toHaveBeenCalled()
  })
})

// --- replace keeps sets (existing route) ------------------------------------------------------
type SetSpec = { reps: string; rir: number | null; count: number }
async function programWithGoblet(weeks: SetSpec[]) {
  const program = await prisma.program.create({ data: { name: 'Legs', userId: me, isUserCreated: true } })
  const goblets: string[] = []
  let legExtension = ''
  for (const [i, spec] of weeks.entries()) {
    const week = await prisma.week.create({ data: { weekNumber: i + 1, programId: program.id, userId: me } })
    const workout = await prisma.workout.create({ data: { name: 'Legs', dayNumber: 1, weekId: week.id, userId: me } })
    const ex = await prisma.exercise.create({
      data: {
        name: 'Dumbbell Goblet Squat',
        exerciseDefinitionId: d['Dumbbell Goblet Squat'],
        order: 1,
        workoutId: workout.id,
        userId: me,
        prescribedSets: {
          create: Array.from({ length: spec.count }, (_, k) => ({ setNumber: k + 1, reps: spec.reps, rir: spec.rir, userId: me })),
        },
      },
    })
    goblets.push(ex.id)
    if (i === 0) {
      legExtension = (
        await prisma.exercise.create({
          data: {
            name: 'Leg Extension',
            exerciseDefinitionId: d['Leg Extension'],
            order: 2,
            workoutId: workout.id,
            userId: me,
            prescribedSets: { create: [{ setNumber: 1, reps: '12', userId: me }] },
          },
        })
      ).id
    }
  }
  return { goblets, legExtension }
}
const shape = async (exerciseId: string) => {
  const ex = await prisma.exercise.findUniqueOrThrow({
    where: { id: exerciseId },
    select: { exerciseDefinitionId: true, name: true, prescribedSets: { orderBy: { setNumber: 'asc' }, select: { setNumber: true, reps: true, rir: true, rpe: true } } },
  })
  return ex
}
const sets = (count: number, reps: string, rir: number | null) =>
  Array.from({ length: count }, (_, k) => ({ setNumber: k + 1, reps, rir, rpe: null }))
const replace = async (exerciseId: string, body: Record<string, unknown>) =>
  replacePOST(
    new NextRequest(`http://localhost/api/exercises/${exerciseId}/replace`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ exerciseId }) }
  )

describe('POST /api/exercises/<id>/replace keeps sets when none are sent (existing)', () => {
  it('this week only: the exercise becomes Dumbbell Lunge with 3 x 8 @ RIR 2; week 2 is untouched', async () => {
    const { goblets } = await programWithGoblet([{ reps: '8', rir: 2, count: 3 }, { reps: '6', rir: 1, count: 4 }])
    const res = await replace(goblets[0], { newExerciseDefinitionId: d['Dumbbell Lunge'], applyToFuture: false })
    expect(res.status).toBe(200)
    expect(await shape(goblets[0])).toEqual({ exerciseDefinitionId: d['Dumbbell Lunge'], name: 'Dumbbell Lunge', prescribedSets: sets(3, '8', 2) })
    expect((await shape(goblets[1])).exerciseDefinitionId).toBe(d['Dumbbell Goblet Squat'])
  })

  it('future weeks: from week 2 on, each week keeps its own sets; week 1 and the other exercise are untouched', async () => {
    const { goblets, legExtension } = await programWithGoblet([
      { reps: '8', rir: 2, count: 3 },
      { reps: '6', rir: 1, count: 4 },
      { reps: '5', rir: 3, count: 5 },
    ])
    const res = await replace(goblets[1], { newExerciseDefinitionId: d['Dumbbell Lunge'], applyToFuture: true })
    expect(res.status).toBe(200)
    expect((await shape(goblets[0])).exerciseDefinitionId).toBe(d['Dumbbell Goblet Squat'])
    expect(await shape(goblets[1])).toEqual({ exerciseDefinitionId: d['Dumbbell Lunge'], name: 'Dumbbell Lunge', prescribedSets: sets(4, '6', 1) })
    expect(await shape(goblets[2])).toEqual({ exerciseDefinitionId: d['Dumbbell Lunge'], name: 'Dumbbell Lunge', prescribedSets: sets(5, '5', 3) })
    expect((await shape(legExtension)).exerciseDefinitionId).toBe(d['Leg Extension'])
  })

  it('logged sets stay with the workout', async () => {
    const { goblets } = await programWithGoblet([{ reps: '8', rir: 2, count: 3 }])
    const ex = await prisma.exercise.findUniqueOrThrow({ where: { id: goblets[0] }, select: { workoutId: true } })
    const completion = await prisma.workoutCompletion.create({ data: { workoutId: ex.workoutId, userId: me, status: 'draft' } })
    await prisma.loggedSet.createMany({
      data: [1, 2].map((setNumber) => ({ setNumber, reps: 8, weight: 50, exerciseId: goblets[0], completionId: completion.id, userId: me })),
    })
    expect((await replace(goblets[0], { newExerciseDefinitionId: d['Dumbbell Lunge'], applyToFuture: false })).status).toBe(200)
    const logged = await prisma.loggedSet.findMany({ where: { completionId: completion.id }, orderBy: { setNumber: 'asc' } })
    expect(logged.map((s) => [s.setNumber, s.reps, s.weight, s.exerciseId])).toEqual([
      [1, 8, 50, goblets[0]],
      [2, 8, 50, goblets[0]],
    ])
  })
})
