/**
 * Progress S3 (pinned lifts): PUT /api/progress/pins, and the pins in GET /api/progress/week
 * (work item 116). Real test DB. Spec: features/analytics/pinned-lifts.feature, "Saving pins",
 * "Pin limit", "The report carries pins"; AGENTS.md conventions for API routes.
 *
 * Pinned (app/api/progress/pins/route.ts, `export async function PUT(request: NextRequest)`):
 *   - 401 { error } without a user. Nothing is written.
 *   - 429 comes from `checkRateLimitWithHeaders` of `@/lib/rate-limit`, called with the user's
 *     id (second argument); when it returns a response, that response is returned and nothing is
 *     written; its headers are on the success response. The limit is checked before the body is
 *     read, so a bad request costs a hit too.
 *   - body { exerciseDefinitionIds: string[] }. Not JSON, not an object, no such array, an item
 *     that is not a non-empty string, a duplicate, more than 12, or an id that is not an
 *     exercise definition: 400 { error } and nothing is written (no partial save). An empty
 *     array is valid: it unpins everything.
 *   - 200 { success: true } and the pins are replaced, in that order, through
 *     `savePins(prisma, user.id, ids)` of `@/lib/insights/pinned-lifts`; the user is marked as
 *     customized. Only the signed-in user's pins change.
 *   - Any failure is a 500 { error: 'Internal server error' } with no details.
 */

import type { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const h = vi.hoisted(() => ({
  userId: '' as string,
  limit: null as null | ((...args: unknown[]) => Promise<unknown>),
  save: null as null | ((...args: unknown[]) => Promise<unknown>),
  limitCalls: [] as unknown[][],
  saveCalls: [] as unknown[][],
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
    return h.limit ? h.limit(...args) : { response: null, headers: {} }
  },
}))
vi.mock('@/lib/insights/pinned-lifts', async (orig) => {
  const real = await orig<Record<string, unknown>>()
  return {
    ...real,
    savePins: async (...args: unknown[]) => {
      h.saveCalls.push(args)
      return h.save ? h.save(...args) : (real.savePins as (...a: unknown[]) => Promise<unknown>)(...args)
    },
  }
})

const load = (spec: string) => import(/* @vite-ignore */ spec)
const PUT = async (request: NextRequest): Promise<Response> =>
  ((await load('@/app/api/progress/pins/route')) as { PUT: (r: NextRequest) => Promise<Response> }).PUT(request)
const GET = async (request: NextRequest): Promise<Response> =>
  ((await load('@/app/api/progress/week/route')) as { GET: (r: NextRequest) => Promise<Response> }).GET(request)

type Px = { findMany: (a: unknown) => Promise<Array<{ exerciseDefinitionId: string; position: number }>>; count: (a?: unknown) => Promise<number> }
const px = (db: PrismaClient) => (db as unknown as { pinnedExercise: Px }).pinnedExercise

let prisma: PrismaClient
let userId: string
let otherUserId: string
const ids: Record<string, string> = {}

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  userId = (await createTestUser()).id
  otherUserId = (await createTestUser()).id
  h.userId = userId
  h.limit = null
  h.save = null
  h.limitCalls = []
  h.saveCalls = []
  for (const k of Object.keys(ids)) delete ids[k]
})

const def = async (name: string) => (ids[name] ??= (await createTestExerciseDefinition(prisma, { name, primaryFAUs: ['chest'] })).id)
const many = async (n: number) => Promise.all(Array.from({ length: n }, (_, i) => def(`Lift ${String(i).padStart(2, '0')}`)))

const put = (body: unknown, raw = false) =>
  PUT(
    new NextRequest('http://localhost/api/progress/pins', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: raw ? (body as string) : JSON.stringify(body),
    }),
  )
const saved = async (forUser = userId) =>
  (await px(prisma).findMany({ where: { userId: forUser }, orderBy: { position: 'asc' } })).map((r) => r.exerciseDefinitionId)
const pinCount = () => px(prisma).count()
const customized = async (forUser = userId) =>
  ((await prisma.userSettings.findUnique({ where: { userId: forUser } })) as unknown as { pinnedLiftsCustomized: boolean } | null)?.pinnedLiftsCustomized

// =====================================================================================
describe('auth', () => {
  it('is 401 without a user and writes nothing', async () => {
    h.userId = ''
    const [a] = await many(1)
    const res = await put({ exerciseDefinitionIds: [a] })
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: expect.any(String) })
    expect(await pinCount()).toBe(0)
    expect(h.saveCalls).toEqual([])
  })
})

describe('Saving pins', () => {
  it('replaces the pins, in the order sent, and answers 200 { success: true }', async () => {
    const [a, b, c] = await many(3)
    const res = await put({ exerciseDefinitionIds: [c, a, b] })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ success: true })
    expect(await saved()).toEqual([c, a, b])
    expect(await customized()).toBe(true)
  })

  it('a second save replaces the first', async () => {
    const [a, b, c] = await many(3)
    await put({ exerciseDefinitionIds: [a, b] })
    await put({ exerciseDefinitionIds: [c, a] })
    expect(await saved()).toEqual([c, a])
  })

  it('an empty list is allowed: it unpins everything and the user stays customized', async () => {
    const [a] = await many(1)
    await put({ exerciseDefinitionIds: [a] })
    const res = await put({ exerciseDefinitionIds: [] })
    expect(res.status).toBe(200)
    expect(await saved()).toEqual([])
    expect(await customized()).toBe(true)
  })

  it('twelve is allowed', async () => {
    const twelve = await many(12)
    const res = await put({ exerciseDefinitionIds: twelve })
    expect(res.status).toBe(200)
    expect(await saved()).toEqual(twelve)
  })

  it('hands savePins the signed-in user and the ids in order', async () => {
    const [a, b] = await many(2)
    await put({ exerciseDefinitionIds: [b, a] })
    expect(h.saveCalls).toHaveLength(1)
    expect(h.saveCalls[0].slice(1)).toEqual([userId, [b, a]])
  })

  it('Pins are per user: saving changes only the signed-in user\'s pins', async () => {
    const [a, b] = await many(2)
    h.userId = otherUserId
    await put({ exerciseDefinitionIds: [a] })
    h.userId = userId
    await put({ exerciseDefinitionIds: [b] })
    expect(await saved()).toEqual([b])
    expect(await saved(otherUserId)).toEqual([a])
  })

  it('a body that carries a userId does not save for someone else', async () => {
    const [a] = await many(1)
    await put({ exerciseDefinitionIds: [a], userId: otherUserId })
    expect(await saved()).toEqual([a])
    expect(await saved(otherUserId)).toEqual([])
  })
})

describe('Pin limit and bad input: 400 and nothing is written', () => {
  const bad = async (body: unknown, raw = false) => {
    const before = await pinCount()
    const res = await put(body, raw)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.any(String) })
    expect(await pinCount()).toBe(before)
    expect(h.saveCalls).toEqual([])
  }

  it('more than 12 is refused', async () => {
    await bad({ exerciseDefinitionIds: await many(13) })
  })

  it('an unknown id is refused, even next to good ones, and none of the good ones is saved', async () => {
    const [a, b] = await many(2)
    await bad({ exerciseDefinitionIds: [a, 'no-such-exercise', b] })
    expect(await saved()).toEqual([])
    expect(await customized()).toBeFalsy()
  })

  it('a duplicate is refused', async () => {
    const [a, b] = await many(2)
    await bad({ exerciseDefinitionIds: [a, b, a] })
  })

  it('a refused save leaves the pins that were there', async () => {
    const [a, b] = await many(2)
    await put({ exerciseDefinitionIds: [a, b] })
    h.saveCalls = []
    const res = await put({ exerciseDefinitionIds: [b, b] })
    expect(res.status).toBe(400)
    expect(await saved()).toEqual([a, b])
  })

  it('a body without the list is refused', async () => {
    await bad({})
    await bad({ ids: ['x'] })
  })

  it('a list that is not an array is refused', async () => {
    await bad({ exerciseDefinitionIds: 'abc' })
    await bad({ exerciseDefinitionIds: null })
    await bad({ exerciseDefinitionIds: { 0: 'x' } })
  })

  it('items that are not non-empty strings are refused', async () => {
    const [a] = await many(1)
    await bad({ exerciseDefinitionIds: [a, 7] })
    await bad({ exerciseDefinitionIds: [a, null] })
    await bad({ exerciseDefinitionIds: [a, ''] })
    await bad({ exerciseDefinitionIds: [[a]] })
  })

  it('a body that is not JSON, or not an object, is refused with a 400, not a 500', async () => {
    await bad('{not json', true)
    await bad('[]', true)
    await bad('null', true)
    await bad('"x"', true)
  })
})

describe('rate limit', () => {
  it('is checked for the signed-in user', async () => {
    const [a] = await many(1)
    await put({ exerciseDefinitionIds: [a] })
    expect(h.limitCalls).toHaveLength(1)
    expect(h.limitCalls[0][1]).toBe(userId)
  })

  it('returns the limiter\'s response and writes nothing when limited', async () => {
    const [a] = await many(1)
    const { NextResponse } = await import('next/server')
    h.limit = async () => ({ response: NextResponse.json({ error: 'Too many requests' }, { status: 429 }), headers: {} })
    const res = await put({ exerciseDefinitionIds: [a] })
    expect(res.status).toBe(429)
    expect(await pinCount()).toBe(0)
    expect(h.saveCalls).toEqual([])
  })

  it('puts the limiter\'s headers on a success', async () => {
    const [a] = await many(1)
    h.limit = async () => ({ response: null, headers: { 'X-RateLimit-Remaining': '7' } })
    const res = await put({ exerciseDefinitionIds: [a] })
    expect(res.status).toBe(200)
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('7')
  })

  it('puts the limiter\'s headers on a 400 too', async () => {
    h.limit = async () => ({ response: null, headers: { 'X-RateLimit-Remaining': '3' } })
    const res = await put({ exerciseDefinitionIds: 'nope' })
    expect(res.status).toBe(400)
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('3')
  })

  it('is checked before the input, so bad requests cost a hit too', async () => {
    await put({ exerciseDefinitionIds: 'nope' })
    expect(h.limitCalls).toHaveLength(1)
  })
})

describe('errors', () => {
  it('is a 500 { error } with no internals when saving fails', async () => {
    const [a] = await many(1)
    h.save = async () => {
      throw new Error('boom: secret detail')
    }
    const res = await put({ exerciseDefinitionIds: [a] })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'Internal server error' })
    expect(JSON.stringify(body)).not.toMatch(/boom|secret/)
  })
})

// =====================================================================================
describe('The report carries pins (GET /api/progress/week)', () => {
  const WEEK = '?start=2026-10-26&tz=America%2FDenver'
  const get = async (query = WEEK) => {
    const res = await GET(new NextRequest(`http://localhost/api/progress/week${query}`))
    return { res, body: (await res.json()) as { report: { pinned: Array<{ exerciseDefinitionId: string; name: string; lift: unknown; last: { weight: number; reps: number; e1rm: number | null; completedAt: string } | null }> } } }
  }
  async function session(ex: string, when: Date, reps: number, weight: number) {
    const defId = await def(ex)
    const c = await prisma.workoutCompletion.create({ data: { userId, status: 'completed', completedAt: when, isAdHoc: true } })
    const e = await prisma.exercise.create({
      data: { name: ex, exerciseDefinitionId: defId, order: 1, userId, workoutCompletionId: c.id, isOneOff: true },
    })
    await prisma.loggedSet.create({ data: { setNumber: 1, reps, weight, weightUnit: 'lbs', exerciseId: e.id, completionId: c.id, userId, createdAt: when } })
  }

  it('a user with no pins and no anchors gets an empty list', async () => {
    const { res, body } = await get()
    expect(res.status).toBe(200)
    expect(body.report.pinned).toEqual([])
  })

  it('has the pinned lifts in the order saved, each with this week\'s numbers or its last session', async () => {
    const [bench, squat, front] = [await def('Bench Press'), await def('Back Squat'), await def('Front Squat')]
    await session('Bench Press', new Date('2026-10-12T18:00:00Z'), 8, 185)
    await session('Back Squat', new Date('2026-10-28T18:00:00Z'), 4, 275)
    expect((await put({ exerciseDefinitionIds: [bench, squat, front] })).status).toBe(200)
    const { body } = await get()
    const pinned = body.report.pinned
    expect(pinned.map((p) => p.exerciseDefinitionId)).toEqual([bench, squat, front])
    expect(pinned.map((p) => p.name)).toEqual(['Bench Press', 'Back Squat', 'Front Squat'])
    expect(pinned[0].lift).toBeNull()
    expect(pinned[0].last).toMatchObject({ weight: 185, reps: 8 })
    expect(pinned[0].last?.e1rm).toBeCloseTo(185 * (1 + 8 / 30), 1)
    expect(new Date(pinned[0].last?.completedAt as string).getTime()).toBe(Date.parse('2026-10-12T18:00:00Z'))
    expect(pinned[1].lift).toMatchObject({ name: 'Back Squat', bestSet: { weight: 275, reps: 4 } })
    expect(pinned[2]).toMatchObject({ lift: null, last: null })
  })

  it('"last" comes only from before the week end of the week asked for', async () => {
    const bench = await def('Bench Press')
    await session('Bench Press', new Date('2026-10-05T18:00:00Z'), 8, 185)
    await session('Bench Press', new Date('2026-10-21T18:00:00Z'), 5, 225)
    await put({ exerciseDefinitionIds: [bench] })
    const { body } = await get('?start=2026-10-12&tz=America%2FDenver')
    expect(body.report.pinned[0].last).toMatchObject({ weight: 185, reps: 8 })
  })

  it('is the signed-in user\'s pins only', async () => {
    const [hack, squat] = [await def('Hack Squat'), await def('Back Squat')]
    h.userId = otherUserId
    await put({ exerciseDefinitionIds: [hack] })
    h.userId = userId
    await put({ exerciseDefinitionIds: [squat] })
    expect((await get()).body.report.pinned.map((p) => p.name)).toEqual(['Back Squat'])
  })

  it('the numbers are raw: no wording', async () => {
    const bench = await def('Bench Press')
    await session('Bench Press', new Date('2026-10-12T18:00:00Z'), 8, 185)
    await put({ exerciseDefinitionIds: [bench] })
    const text = JSON.stringify((await get()).body.report.pinned)
    expect(text).not.toMatch(/Not this week|No sessions yet|Last:|e1RM/)
  })
})
