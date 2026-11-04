/**
 * Per-lift page: GET /api/progress/lift/[id] (work item 125). Real test DB. Spec:
 * features/analytics/lift-page.feature, "Lift history API", "A lift that isn't the user's";
 * AGENTS.md conventions for API routes. The loader behind it is lift-history-loader.test.ts.
 *
 * Pinned (app/api/progress/lift/[id]/route.ts, `GET(request, { params: Promise<{ id: string }> })`,
 * query `?tz=<IANA zone>`):
 *   - 401 { error } without a user, before anything is read.
 *   - rate limit: `checkRateLimitWithHeaders(<a NEW limiter>, user.id, { endpoint })` of
 *     `@/lib/rate-limit`, called before the exercise is looked up; a returned `response` is returned
 *     as is; its headers are on the success response. The limiter is not the week or the pins
 *     limiter, and docs/RATE_LIMITING.md lists `/api/progress/lift` with 30 / 60s.
 *   - tz missing or not an IANA zone: 400 { error }.
 *   - id not an exercise, or another user's private exercise: 404 { error } and nothing about it.
 *   - 200 { success: true, lift } where lift = the loader's answer as JSON (dates as ISO strings,
 *     weights raw and unrounded) plus
 *       pinned: [{ exerciseDefinitionId, name }]  the user's pinned lifts in order (resolvePins;
 *       the anchor lifts until the user saves pins), for the page's chips.
 *   - any failure: 500 { error: 'Internal server error' } with no details, and `logger.error` called.
 */

import type { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const h = vi.hoisted(() => ({
  userId: '' as string,
  limit: null as null | ((...args: unknown[]) => Promise<unknown>),
  limitCalls: [] as unknown[][],
  fail: false,
  logged: [] as unknown[][],
  order: [] as string[],
}))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  return { prisma: (await db()).getPrismaClient() }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    h.userId ? { user: { id: h.userId, role: 'user', email: 'a@b.c' }, error: null } : { user: null, error: null },
}))
vi.mock('@/lib/rate-limit', async (orig) => ({
  ...(await orig<typeof import('@/lib/rate-limit')>()),
  checkRateLimitWithHeaders: async (...args: unknown[]) => {
    h.limitCalls.push(args)
    h.order.push('limit')
    return h.limit ? h.limit(...args) : { response: null, headers: {} }
  },
}))
vi.mock('@/lib/logger', async (orig) => {
  const real = await orig<{ logger: Record<string, unknown> }>()
  return { ...real, logger: { ...real.logger, error: (...args: unknown[]) => void h.logged.push(args) } }
})
vi.mock('@/lib/insights/lift-history', async (orig) => {
  const real = await orig<Record<string, unknown>>()
  return {
    ...real,
    getLiftHistory: async (...args: unknown[]) => {
      h.order.push('load')
      if (h.fail) throw new Error('boom: secret detail')
      return (real.getLiftHistory as (...a: unknown[]) => Promise<unknown>)(...args)
    },
  }
})

const load = (spec: string) => import(/* @vite-ignore */ spec)
const GET = async (request: NextRequest, id: string): Promise<Response> =>
  ((await load('@/app/api/progress/lift/[id]/route')) as {
    GET: (r: NextRequest, c: { params: Promise<{ id: string }> }) => Promise<Response>
  }).GET(request, { params: Promise.resolve({ id }) })

type Body = {
  success?: boolean
  error?: string
  lift?: {
    name: string
    weightUnit: string
    isBodyweight: boolean
    sessions: Array<{ completionId: string; date: string; sets: Array<{ weight: number; reps: number }>; e1rm: number | null; topSet: { weight: number; reps: number }; avgRpe: number | null }>
    records: Array<{ reps: number; weight: number; date: string; isNew: boolean }>
    weeklySets: Array<{ weekStart: string; sets: number }>
    pinned: Array<{ exerciseDefinitionId: string; name: string }>
  }
}

let prisma: PrismaClient
let userId: string
let otherUserId: string
let squat: string

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  userId = (await createTestUser()).id
  otherUserId = (await createTestUser()).id
  squat = (await createTestExerciseDefinition(prisma, { name: 'Back Squat', primaryFAUs: ['quads'] })).id
  h.userId = userId
  h.limit = null
  h.limitCalls = []
  h.fail = false
  h.logged = []
  h.order = []
})

const call = async (id: string, query = '?tz=America%2FDenver') => {
  const res = await GET(new NextRequest(`http://localhost/api/progress/lift/${id}${query}`), id)
  return { res, body: (await res.json()) as Body }
}

async function session(when: string, sets: Array<{ reps: number; weight: number; unit?: string; warmup?: boolean }>, o: { owner?: string; def?: string } = {}) {
  const owner = o.owner ?? userId
  const at = new Date(when)
  const c = await prisma.workoutCompletion.create({ data: { userId: owner, status: 'completed', completedAt: at, isAdHoc: true } })
  const e = await prisma.exercise.create({
    data: { name: 'Back Squat', exerciseDefinitionId: o.def ?? squat, order: 1, userId: owner, workoutCompletionId: c.id, isOneOff: true },
  })
  for (const [i, x] of sets.entries()) {
    await prisma.loggedSet.create({
      data: { setNumber: i + 1, reps: x.reps, weight: x.weight, weightUnit: x.unit ?? 'lbs', isWarmup: x.warmup ?? false, exerciseId: e.id, completionId: c.id, userId: owner, createdAt: at },
    })
  }
}

// =====================================================================================
describe('auth and limits', () => {
  it('is 401 without a user and touches neither the limiter nor the loader', async () => {
    h.userId = ''
    const { res, body } = await call(squat)
    expect(res.status).toBe(401)
    expect(body.error).toBeTruthy()
    expect(h.limitCalls).toEqual([])
    expect(h.order).toEqual([])
  })

  it('rate limits per user with its own limiter, before reading anything', async () => {
    await call(squat)
    expect(h.limitCalls).toHaveLength(1)
    expect(h.limitCalls[0][1]).toBe(userId)
    const rl = await import('@/lib/rate-limit')
    expect(h.limitCalls[0][0]).toBeTruthy()
    expect(h.limitCalls[0][0]).not.toBe(rl.progressReadLimiter)
    expect(h.limitCalls[0][0]).not.toBe(rl.progressPinsLimiter)
    expect(h.order).toEqual(['limit', 'load'])
  })

  it('returns the limiter’s 429 and does not load', async () => {
    h.limit = async () => ({ response: new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }), headers: {} })
    const { res } = await call(squat)
    expect(res.status).toBe(429)
    expect(h.order).toEqual(['limit'])
  })

  it('puts the limiter’s headers on the success response', async () => {
    h.limit = async () => ({ response: null, headers: { 'X-RateLimit-Remaining': '29' } })
    const { res } = await call(squat)
    expect(res.status).toBe(200)
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('29')
  })

  it('docs/RATE_LIMITING.md lists the new limit', async () => {
    const { readFileSync } = await import('node:fs')
    const doc = readFileSync(`${process.cwd()}/docs/RATE_LIMITING.md`, 'utf8')
    const row = doc.split('\n').find((line) => line.includes('/api/progress/lift'))
    expect(row).toBeTruthy()
    expect(row).toMatch(/30\s*\/\s*60s/)
  })
})

// =====================================================================================
describe('input', () => {
  it('needs a valid tz', async () => {
    for (const query of ['', '?tz=', '?tz=Not%2FAZone', '?tz=%20']) {
      const { res, body } = await call(squat, query)
      expect(res.status, query).toBe(400)
      expect(body.error).toBeTruthy()
    }
  })

  it('404s an id that is not an exercise', async () => {
    const { res, body } = await call('no-such-exercise')
    expect(res.status).toBe(404)
    expect(body.error).toBeTruthy()
    expect(body.lift).toBeUndefined()
  })

  it('404s another user’s private exercise and reveals nothing about it', async () => {
    const theirs = (await createTestExerciseDefinition(prisma, { name: 'Secret Lift', userId: otherUserId })).id
    await session('2026-10-20T18:00:00Z', [{ reps: 5, weight: 100 }], { owner: otherUserId, def: theirs })
    const { res, body } = await call(theirs)
    expect(res.status).toBe(404)
    expect(JSON.stringify(body)).not.toContain('Secret Lift')
  })

  it('serves the user’s own private exercise', async () => {
    const mine = (await createTestExerciseDefinition(prisma, { name: 'My Lift', userId })).id
    const { res, body } = await call(mine)
    expect(res.status).toBe(200)
    expect(body.lift?.name).toBe('My Lift')
  })
})

// =====================================================================================
describe('the answer', () => {
  it('is raw numbers: names, unit, sessions, records and weeks', async () => {
    await session('2026-10-30T18:00:00Z', [{ reps: 4, weight: 275 }, { reps: 6, weight: 255 }])
    await session('2026-10-20T18:00:00Z', [{ reps: 5, weight: 245 }])
    const { res, body } = await call(squat)
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    const lift = body.lift as NonNullable<Body['lift']>
    expect(lift.name).toBe('Back Squat')
    expect(lift.weightUnit).toBe('lbs')
    expect(lift.isBodyweight).toBe(false)
    expect(lift.sessions).toHaveLength(2)
    const [newest] = lift.sessions
    expect(newest.date).toBe('2026-10-30T18:00:00.000Z')
    expect(newest.sets).toEqual([{ weight: 275, reps: 4 }, { weight: 255, reps: 6 }])
    expect(newest.topSet).toEqual({ weight: 275, reps: 4 })
    expect(typeof newest.e1rm).toBe('number')
    expect(newest.e1rm).toBeCloseTo(275 * (1 + 4 / 30), 6) // the better of 311.67 and 306
    expect(newest.avgRpe).toBeNull()
    expect(lift.records.map((r) => r.reps)).toEqual([4, 5, 6])
    expect(lift.records[0]).toMatchObject({ reps: 4, weight: 275, date: '2026-10-30T18:00:00.000Z' })
    expect(lift.weeklySets.reduce((n, w) => n + w.sets, 0)).toBe(3)
    expect(Array.isArray(lift.pinned)).toBe(true)
  })

  it('keeps the e1RM unrounded', async () => {
    await session('2026-10-20T18:00:00Z', [{ reps: 4, weight: 275 }])
    const { body } = await call(squat)
    expect(body.lift?.sessions[0].e1rm).toBeCloseTo(275 * (1 + 4 / 30), 6) // 311.666...
    expect(Number.isInteger(body.lift?.sessions[0].e1rm)).toBe(false)
  })

  it('has only this user’s sets, and a kg user gets kg', async () => {
    await session('2026-10-20T18:00:00Z', [{ reps: 5, weight: 100, unit: 'kg' }])
    await session('2026-10-21T18:00:00Z', [{ reps: 5, weight: 400 }], { owner: otherUserId })
    await prisma.userSettings.create({ data: { userId, defaultWeightUnit: 'kg' } })
    const { body } = await call(squat)
    expect(body.lift?.weightUnit).toBe('kg')
    expect(body.lift?.sessions).toHaveLength(1)
    expect(body.lift?.sessions[0].sets[0].weight).toBeCloseTo(100, 6)
  })

  it('an exercise never logged is a 200 with empty lists', async () => {
    const { res, body } = await call(squat)
    expect(res.status).toBe(200)
    expect(body.lift).toMatchObject({ name: 'Back Squat', sessions: [], records: [], weeklySets: [] })
  })

  it('uses the tz for the week: Sunday night and Monday morning Denver are different weeks', async () => {
    await session('2026-01-12T06:30:00Z', [{ reps: 5, weight: 200 }]) // Sun Jan 11, 23:30 MST
    await session('2026-01-12T07:30:00Z', [{ reps: 5, weight: 210 }]) // Mon Jan 12, 00:30 MST
    const counted = (b: Body) => (b.lift?.weeklySets ?? []).filter((w) => w.sets > 0).length
    expect(counted((await call(squat, '?tz=America%2FDenver')).body)).toBe(2)
    expect(counted((await call(squat, '?tz=UTC')).body)).toBe(1)
  })
})

// =====================================================================================
describe('pinned lifts for the page’s chips', () => {
  it('lists the pins in order, with names', async () => {
    const bench = (await createTestExerciseDefinition(prisma, { name: 'Bench Press', primaryFAUs: ['chest'] })).id
    const dead = (await createTestExerciseDefinition(prisma, { name: 'Deadlift', primaryFAUs: ['hamstrings'] })).id
    const { savePins } = await load('@/lib/insights/pinned-lifts')
    await savePins(prisma, userId, [dead, squat, bench])
    const { body } = await call(squat)
    expect(body.lift?.pinned).toEqual([
      { exerciseDefinitionId: dead, name: 'Deadlift' },
      { exerciseDefinitionId: squat, name: 'Back Squat' },
      { exerciseDefinitionId: bench, name: 'Bench Press' },
    ])
  })

  it('is empty after the user unpins everything, and another user’s pins never show', async () => {
    const { savePins } = await load('@/lib/insights/pinned-lifts')
    await savePins(prisma, userId, [])
    await savePins(prisma, otherUserId, [squat])
    expect((await call(squat)).body.lift?.pinned).toEqual([])
  })

  it('falls back to the anchor lifts until pins are saved', async () => {
    await prisma.userTrainingProfile.create({ data: { userId, ratioTargets: {}, targetMovements: { squat: [squat] } } })
    expect((await call(squat)).body.lift?.pinned).toEqual([{ exerciseDefinitionId: squat, name: 'Back Squat' }])
  })
})

// =====================================================================================
describe('failures', () => {
  it('a failure is a 500 with no details, and it is logged', async () => {
    h.fail = true
    const { res, body } = await call(squat)
    expect(res.status).toBe(500)
    expect(body).toEqual({ error: 'Internal server error' })
    expect(JSON.stringify(body)).not.toContain('secret')
    expect(h.logged).toHaveLength(1)
  })
})
