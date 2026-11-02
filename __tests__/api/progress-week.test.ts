/**
 * Progress S1: GET /api/progress/week?start=YYYY-MM-DD&tz=<IANA>
 * (app/api/progress/week/route.ts, `export async function GET(request: NextRequest)`).
 * Spec: features/analytics/weekly-report.feature (work item 107), AGENTS.md
 * conventions for API routes.
 *
 * Pinned:
 *   - 401 { error } without a user. Nothing is read.
 *   - 429 comes from `checkRateLimitWithHeaders` of `@/lib/rate-limit`, called
 *     with the user's id (as the other settings routes do); when it returns a
 *     response, that response is returned and nothing is read; its headers
 *     are on the success response.
 *   - `tz` is required and must be a valid IANA zone; `start` is optional
 *     (default: the current week in `tz`), must be YYYY-MM-DD, a real date and a
 *     Monday. Anything else is a 400 { error } and nothing is read.
 *   - 200 { success: true, report } where report is getWeeklyReport(prisma,
 *     user.id, { weekStart, timeZone }) (see progress-report.test.ts), scoped to
 *     the signed-in user.
 *   - Any failure is a 500 { error: 'Internal server error' } with no details.
 */

import type { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const h = vi.hoisted(() => ({
  userId: '' as string,
  limit: null as null | ((...args: unknown[]) => Promise<unknown>),
  report: null as null | ((...args: unknown[]) => Promise<unknown>),
  limitCalls: [] as unknown[][],
  reportCalls: [] as unknown[][],
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
vi.mock('@/lib/insights/progress', async (orig) => {
  const real = await orig<Record<string, unknown>>()
  return {
    ...real,
    getWeeklyReport: async (...args: unknown[]) => {
      h.reportCalls.push(args)
      return h.report ? h.report(...args) : (real.getWeeklyReport as (...a: unknown[]) => Promise<unknown>)(...args)
    },
  }
})

const load = (spec: string) => import(/* @vite-ignore */ spec)
const GET = async (request: NextRequest): Promise<Response> =>
  ((await load('@/app/api/progress/week/route')) as { GET: (r: NextRequest) => Promise<Response> }).GET(request)

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
  h.limit = null
  h.report = null
  h.limitCalls = []
  h.reportCalls = []
})
afterEach(() => {
  vi.useRealTimers()
})

const call = (query: string) => GET(new NextRequest(`http://localhost/api/progress/week${query}`))
type Json = {
  success?: boolean
  error?: string
  report: { weekStart: string; isCurrentWeek: boolean; target: number; current: { workouts: number; workingSets: number }; weeks: unknown[] }
}
const body = async (res: Response) => (await res.json()) as Json

async function workoutAt(owner: string, when: Date, sets = 3) {
  const def = await createTestExerciseDefinition(prisma, { name: 'Bench Press', primaryFAUs: ['chest'] })
  const c = await prisma.workoutCompletion.create({
    data: { userId: owner, status: 'completed', completedAt: when, isAdHoc: true },
  })
  const e = await prisma.exercise.create({
    data: { name: 'Bench Press', exerciseDefinitionId: def.id, order: 1, userId: owner, workoutCompletionId: c.id, isOneOff: true },
  })
  await prisma.loggedSet.createMany({
    data: Array.from({ length: sets }, (_, i) => ({
      setNumber: i + 1,
      reps: 5,
      weight: 100,
      weightUnit: 'lbs',
      exerciseId: e.id,
      completionId: c.id,
      userId: owner,
      createdAt: when,
    })),
  })
}

describe('auth', () => {
  it('is 401 without a user and reads nothing', async () => {
    h.userId = ''
    const res = await call('?start=2026-10-26&tz=America%2FDenver')
    expect(res.status).toBe(401)
    expect(typeof (await body(res)).error).toBe('string')
    expect(h.reportCalls).toHaveLength(0)
    expect(h.limitCalls).toHaveLength(0)
  })
})

describe('a report', () => {
  it('is 200 { success: true, report } for the week asked for', async () => {
    await workoutAt(userId, new Date('2026-10-28T18:00:00Z'), 4)
    const res = await call('?start=2026-10-26&tz=America%2FDenver')
    expect(res.status).toBe(200)
    const json = await body(res)
    expect(json.success).toBe(true)
    expect(json.report.weekStart).toBe('2026-10-26')
    expect(json.report.current).toMatchObject({ weekStart: '2026-10-26', workouts: 1, workingSets: 4 })
    expect(json.report.weeks).toHaveLength(8)
    expect(json.report.target).toBe(3)
  })

  it('hands the loader the signed-in user, the week and the zone', async () => {
    h.report = async () => ({ weekStart: '2026-10-26' })
    await call('?start=2026-10-26&tz=America%2FDenver')
    expect(h.reportCalls).toHaveLength(1)
    const [, uid, opts] = h.reportCalls[0] as [unknown, string, Record<string, unknown>]
    expect(uid).toBe(userId)
    expect(opts).toMatchObject({ weekStart: '2026-10-26', timeZone: 'America/Denver' })
  })

  it('Only your own data: another user\'s workouts in the same week do not count', async () => {
    await workoutAt(userId, new Date('2026-10-27T18:00:00Z'), 2)
    await workoutAt(otherUserId, new Date('2026-10-27T18:00:00Z'), 9)
    await workoutAt(otherUserId, new Date('2026-10-28T18:00:00Z'), 9)
    const json = await body(await call('?start=2026-10-26&tz=America%2FDenver'))
    expect(json.report.current.workouts).toBe(1)
    expect(json.report.current.workingSets).toBe(2)
  })

  it('Sunday-evening workout: the zone sent decides the week', async () => {
    await workoutAt(userId, new Date('2026-10-26T03:00:00Z')) // Sun 21:00 in Denver
    const denver = await body(await call('?start=2026-10-19&tz=America%2FDenver'))
    expect(denver.report.current.workouts).toBe(1)
    const utc = await body(await call('?start=2026-10-26&tz=UTC'))
    expect(utc.report.current.workouts).toBe(1)
    const denverNext = await body(await call('?start=2026-10-26&tz=America%2FDenver'))
    expect(denverNext.report.current.workouts).toBe(0)
  })

  it('without start it is the current week in the zone asked for', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // Monday 2026-10-26 03:00 UTC: still Sunday evening in Denver, already Monday in UTC.
    vi.setSystemTime(new Date('2026-10-26T03:00:00Z'))
    const denver = await body(await call('?tz=America%2FDenver'))
    expect(denver.report.weekStart).toBe('2026-10-19')
    expect(denver.report.isCurrentWeek).toBe(true)
    const utc = await body(await call('?tz=UTC'))
    expect(utc.report.weekStart).toBe('2026-10-26')
  })

  it('marks an earlier week as not current', async () => {
    const json = await body(await call('?start=2020-01-06&tz=America%2FDenver'))
    expect(json.report.isCurrentWeek).toBe(false)
  })
})

describe('bad input is a 400 and reads nothing', () => {
  it.each([
    ['no tz', '?start=2026-10-26'],
    ['empty tz', '?start=2026-10-26&tz='],
    ['not a zone', '?start=2026-10-26&tz=Mars%2FOlympus'],
    ['a zone-like injection', '?start=2026-10-26&tz=America%2FDenver%27%3B--'],
    ['start in the wrong format', '?start=10%2F26%2F2026&tz=America%2FDenver'],
    ['start with a time', '?start=2026-10-26T00%3A00%3A00Z&tz=America%2FDenver'],
    ['start that is not a date', '?start=2026-13-45&tz=America%2FDenver'],
    ['start that is a day that does not exist', '?start=2026-02-30&tz=America%2FDenver'],
    ['start with trailing text', '?start=2026-10-26abc&tz=America%2FDenver'],
    ['start that is a Tuesday', '?start=2026-10-27&tz=America%2FDenver'],
    ['start that is a Sunday', '?start=2026-10-25&tz=America%2FDenver'],
    ['empty start', '?start=&tz=America%2FDenver'],
  ])('%s', async (_name, query) => {
    const res = await call(query)
    expect(res.status).toBe(400)
    const json = await body(res)
    expect(typeof json.error).toBe('string')
    expect(json.success).not.toBe(true)
    expect(h.reportCalls).toHaveLength(0)
  })
})

describe('rate limit', () => {
  it('is checked for the signed-in user', async () => {
    await call('?start=2026-10-26&tz=America%2FDenver')
    expect(h.limitCalls).toHaveLength(1)
    expect(h.limitCalls[0][1]).toBe(userId)
  })

  it('returns the limiter\'s response and reads nothing when limited', async () => {
    h.limit = async () => ({ response: NextResponse.json({ error: 'Too many requests' }, { status: 429 }), headers: {} })
    const res = await call('?start=2026-10-26&tz=America%2FDenver')
    expect(res.status).toBe(429)
    expect(h.reportCalls).toHaveLength(0)
  })

  it('puts the limiter\'s headers on a success', async () => {
    h.limit = async () => ({ response: null, headers: { 'X-RateLimit-Remaining': '41' } })
    const res = await call('?start=2026-10-26&tz=America%2FDenver')
    expect(res.status).toBe(200)
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('41')
  })

  it('checks the limit before the input, so bad requests cost a hit too', async () => {
    h.limit = async () => ({ response: NextResponse.json({ error: 'Too many requests' }, { status: 429 }), headers: {} })
    const res = await call('?start=nonsense&tz=nowhere')
    expect(res.status).toBe(429)
  })
})

describe('errors', () => {
  it('is a 500 { error } with no internals when the loader fails', async () => {
    h.report = async () => {
      throw new Error('relation "secret_table" does not exist')
    }
    const res = await call('?start=2026-10-26&tz=America%2FDenver')
    expect(res.status).toBe(500)
    const text = JSON.stringify(await body(res))
    expect(text).toContain('Internal server error')
    expect(text).not.toContain('secret_table')
    expect(text).not.toMatch(/stack|at .*\.ts/i)
  })
})
