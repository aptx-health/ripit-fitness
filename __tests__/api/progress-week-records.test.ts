/**
 * Progress S2: GET /api/progress/week also carries records, lifts and the trend note
 * (work item 111). Real test DB. Spec: features/analytics/weekly-records.feature,
 * "Records and lifts come with the week". The maths and the loader are pinned in
 * progress-records.test.ts and progress-records-report.test.ts; the S1 route contract
 * (auth, limits, input, errors) is progress-week.test.ts and is unchanged.
 *
 * Pinned: on top of S1's `report`, the body has
 *   report.weightUnit  'lbs' | 'kg'
 *   report.records     [{ exerciseDefinitionId, name, kind: 'e1rm' | 'rep', weight, reps, e1rm, previous }]
 *   report.lifts       [{ exerciseDefinitionId, name, workingSets, bestSet: { weight, reps }, e1rm,
 *                         previousE1rm, bestE1rm, sessionsBelowBest }]
 *   report.trend       { effortRisingWeeks, effortFrom, effortTo, lastLightWeeksAgo } | null
 * all numbers raw: no wording, no chips, no formatted strings.
 */

import type { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
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
vi.mock('@/lib/rate-limit', async (orig) => ({
  ...(await orig<typeof import('@/lib/rate-limit')>()),
  checkRateLimitWithHeaders: async () => ({ response: null, headers: {} }),
}))

const load = (spec: string) => import(/* @vite-ignore */ spec)
const GET = async (request: NextRequest): Promise<Response> =>
  ((await load('@/app/api/progress/week/route')) as { GET: (r: NextRequest) => Promise<Response> }).GET(request)

type Rec = { exerciseDefinitionId: string; name: string; kind: string; weight: number; reps: number; e1rm: number | null; previous: number }
type Lift = { name: string; workingSets: number; bestSet: { weight: number; reps: number }; e1rm: number | null; previousE1rm: number | null; bestE1rm: number | null; sessionsBelowBest: number }
type Body = { success?: boolean; report: { weightUnit: string; records: Rec[]; lifts: Lift[]; trend: unknown } }

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

const call = async (query: string) => {
  const res = await GET(new NextRequest(`http://localhost/api/progress/week${query}`))
  return { res, body: (await res.json()) as Body }
}
const WEEK = '?start=2026-10-26&tz=America%2FDenver'

async function lift(ex: string, when: Date, reps: number, weight: number, o: { owner?: string; unit?: string } = {}) {
  const owner = o.owner ?? userId
  const def = await createTestExerciseDefinition(prisma, { name: ex, primaryFAUs: ['chest'] })
  const c = await prisma.workoutCompletion.create({ data: { userId: owner, status: 'completed', completedAt: when, isAdHoc: true } })
  const e = await prisma.exercise.create({
    data: { name: ex, exerciseDefinitionId: def.id, order: 1, userId: owner, workoutCompletionId: c.id, isOneOff: true },
  })
  await prisma.loggedSet.create({
    data: { setNumber: 1, reps, weight, weightUnit: o.unit ?? 'lbs', exerciseId: e.id, completionId: c.id, userId: owner, createdAt: when },
  })
}

describe('records, lifts and trend come with the week', () => {
  it('a user with no data gets empty lists, a null note and pounds', async () => {
    const { res, body } = await call(WEEK)
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.report.records).toEqual([])
    expect(body.report.lifts).toEqual([])
    expect(body.report.trend).toBeNull()
    expect(body.report.weightUnit).toBe('lbs')
  })

  it('has the week\'s records and lifts as raw numbers', async () => {
    await lift('Back Squat', new Date('2026-10-12T18:00:00Z'), 4, 250)
    await lift('Back Squat', new Date('2026-10-28T18:00:00Z'), 4, 275)
    const { body } = await call(WEEK)
    expect(body.report.records).toHaveLength(1)
    expect(body.report.records[0]).toMatchObject({ name: 'Back Squat', kind: 'e1rm', weight: 275, reps: 4 })
    expect(typeof body.report.records[0].exerciseDefinitionId).toBe('string')
    expect(body.report.records[0].e1rm).toBeCloseTo(275 * (1 + 4 / 30), 1)
    expect(body.report.records[0].previous).toBeCloseTo(250 * (1 + 4 / 30), 1)
    expect(body.report.lifts).toHaveLength(1)
    expect(body.report.lifts[0]).toMatchObject({ name: 'Back Squat', workingSets: 1, bestSet: { weight: 275, reps: 4 }, sessionsBelowBest: 0 })
    expect(body.report.lifts[0].previousE1rm).toBeCloseTo(250 * (1 + 4 / 30), 1)
    expect(body.report.lifts[0].bestE1rm).toBeCloseTo(275 * (1 + 4 / 30), 1)
  })

  it('the numbers are raw: the wording is the page\'s job', async () => {
    await lift('Bench Press', new Date('2026-10-12T18:00:00Z'), 8, 180)
    await lift('Bench Press', new Date('2026-10-12T18:30:00Z'), 5, 225)
    await lift('Bench Press', new Date('2026-10-28T18:00:00Z'), 8, 185)
    const { body } = await call(WEEK)
    const text = JSON.stringify({ r: body.report.records, l: body.report.lifts, t: body.report.trend })
    expect(body.report.records).toHaveLength(1)
    expect(text).not.toMatch(/\bwas\b|session below|weeks? running|light week|Flat|Rep PR|\bPR\b|best 8-rep/i)
    for (const r of body.report.records) {
      expect(typeof r.weight).toBe('number')
      expect(typeof r.reps).toBe('number')
      expect(typeof r.previous).toBe('number')
    }
  })

  it('Past weeks show the records set in that week', async () => {
    await lift('Back Squat', new Date('2026-10-12T18:00:00Z'), 4, 250)
    await lift('Back Squat', new Date('2026-10-20T18:00:00Z'), 4, 275)
    await lift('Back Squat', new Date('2026-10-28T18:00:00Z'), 4, 300)
    const earlier = await call('?start=2026-10-19&tz=America%2FDenver')
    expect(earlier.body.report.records.map((r) => r.weight)).toEqual([275])
    const shown = await call(WEEK)
    expect(shown.body.report.records.map((r) => r.weight)).toEqual([300])
  })

  it('the zone sent decides which week a Sunday-evening set is in', async () => {
    await lift('Back Squat', new Date('2026-10-12T18:00:00Z'), 4, 250)
    await lift('Back Squat', new Date('2026-10-26T03:00:00Z'), 4, 270) // Sun 21:00 Denver, Mon 03:00 UTC
    expect((await call('?start=2026-10-26&tz=America%2FDenver')).body.report.records).toEqual([])
    expect((await call('?start=2026-10-26&tz=UTC')).body.report.records.map((r) => r.weight)).toEqual([270])
  })

  it('Only your own data: another user\'s sets are not in anyone else\'s records or lifts', async () => {
    await lift('Back Squat', new Date('2026-10-12T18:00:00Z'), 4, 250)
    await lift('Back Squat', new Date('2026-10-28T18:00:00Z'), 4, 275)
    await lift('Bench Press', new Date('2026-10-28T18:00:00Z'), 5, 300, { owner: otherUserId })
    const mine = await call(WEEK)
    expect(mine.body.report.lifts.map((l) => l.name)).toEqual(['Back Squat'])
    h.userId = otherUserId
    const theirs = await call(WEEK)
    expect(theirs.body.report.records).toEqual([])
    expect(theirs.body.report.lifts.map((l) => l.name)).toEqual(['Bench Press'])
  })

  it('weights are in the signed-in user\'s unit', async () => {
    await prisma.userSettings.create({ data: { userId, defaultWeightUnit: 'kg' } })
    await lift('Back Squat', new Date('2026-10-12T18:00:00Z'), 5, 100, { unit: 'kg' })
    await lift('Back Squat', new Date('2026-10-28T18:00:00Z'), 5, 110, { unit: 'kg' })
    const { body } = await call(WEEK)
    expect(body.report.weightUnit).toBe('kg')
    expect(body.report.records[0].weight).toBeCloseTo(110, 1)
    expect(body.report.records[0].e1rm).toBeCloseTo(110 * (1 + 5 / 30), 1)
    expect(body.report.lifts[0].bestSet.weight).toBeCloseTo(110, 1)
  })

  it('S1\'s own numbers are still there', async () => {
    await lift('Back Squat', new Date('2026-10-28T18:00:00Z'), 4, 275)
    const { body } = await call(WEEK)
    expect(body.report).toMatchObject({ weekStart: '2026-10-26', target: 3, current: { workouts: 1, workingSets: 1 } })
    expect((body.report as unknown as { weeks: unknown[] }).weeks).toHaveLength(8)
  })
})
