/**
 * Quick swap review fix F1 (work 214): the replace route stores each sent set's prescribed weight,
 * this week only and with applyToFuture, and a set sent without one gets none.
 * Real test DB, route called directly. Mocks and fixtures as in exercise-similar.test.ts (copied).
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
const replace = async (exerciseId: string, body: Record<string, unknown>) =>
  replacePOST(
    new NextRequest(`http://localhost/api/exercises/${exerciseId}/replace`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ exerciseId }) }
  )

const weights = async (exerciseId: string) =>
  (
    await prisma.prescribedSet.findMany({ where: { exerciseId }, orderBy: { setNumber: 'asc' }, select: { setNumber: true, reps: true, rir: true, weight: true } })
  ).map((s) => [s.setNumber, s.reps, s.rir, s.weight])
const edited = [
  { setNumber: 1, reps: '8', intensityType: 'RIR', intensityValue: 2, weight: '50 lbs' },
  { setNumber: 2, reps: '8', intensityType: 'RIR', intensityValue: 2, weight: '55 lbs' },
  { setNumber: 3, reps: '8', intensityType: 'RIR', intensityValue: 2 },
]

describe('POST /api/exercises/<id>/replace stores prescribed weight with edited sets', () => {
  it('this week only', async () => {
    const { goblets } = await programWithGoblet([{ reps: '8', rir: 2, count: 2 }])
    const res = await replace(goblets[0], { newExerciseDefinitionId: d['Dumbbell Lunge'], applyToFuture: false, prescribedSets: edited })
    expect(res.status).toBe(200)
    expect(await weights(goblets[0])).toEqual([
      [1, '8', 2, '50 lbs'],
      [2, '8', 2, '55 lbs'],
      [3, '8', 2, null],
    ])
  })

  it('with applyToFuture, every swapped week gets the sent sets and weights', async () => {
    const { goblets } = await programWithGoblet([{ reps: '6', rir: 1, count: 4 }, { reps: '5', rir: 3, count: 5 }])
    const res = await replace(goblets[0], { newExerciseDefinitionId: d['Dumbbell Lunge'], applyToFuture: true, prescribedSets: edited })
    expect(res.status).toBe(200)
    for (const id of goblets) {
      expect(await weights(id)).toEqual([
        [1, '8', 2, '50 lbs'],
        [2, '8', 2, '55 lbs'],
        [3, '8', 2, null],
      ])
    }
  })
})
