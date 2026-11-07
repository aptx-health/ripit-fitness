/**
 * Workout library slice 3 fixes (work 147, after review 146), against the real
 * route handlers and the test database:
 *   1. a coach-sent workout (proposal with coachLinkId, no agent token) lists
 *      with fromCoach and no agent name, instead of breaking the list;
 *   2. Undo is refused (400, no write) unless the row is archived and the pin
 *      it puts back is no later than now;
 *   3. starting an archived workout restores it, as Restore does.
 */

import type { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const auth = vi.hoisted(() => ({ userId: '' }))

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

const DAY = 86_400_000
const daysAgo = (n: number) => new Date(Date.now() - n * DAY)
type Ctx = { params: Promise<{ id: string }> }
const ctx = (id: string): Ctx => ({ params: Promise.resolve({ id }) })
const req = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    ...(body !== undefined && { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  })

let prisma: PrismaClient
let user: string

async function seed(name: string, data: Record<string, unknown> = {}) {
  const def = await createTestExerciseDefinition(prisma, { name: `Row ${Math.random().toString(36).slice(2, 7)}` })
  const plan = [
    {
      name: def.name,
      exerciseDefinitionId: def.id,
      order: 1,
      notes: null,
      exerciseGroup: null,
      sets: [{ setNumber: 1, reps: '8', rir: null, rpe: null, isWarmup: false }],
    },
  ]
  return prisma.savedWorkout.create({
    data: { userId: user, name, workoutData: plan, exerciseCount: 1, createdAt: daysAgo(5), ...data },
  })
}

async function patch(id: string, body: unknown) {
  const { PATCH } = await import('@/app/api/workouts/saved/[id]/route')
  const res = await PATCH(req(`/api/workouts/saved/${id}`, 'PATCH', body), ctx(id))
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  // BetterAuth's user table isn't in Prisma; coach names fall back to its email (lib/coaching/names.ts).
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "user" (id text PRIMARY KEY, role text, email text)')
  user = (await createTestUser()).id
  auth.userId = user
})

describe('1. a coach-sent workout in the list', () => {
  it('lists with fromCoach and no agent name, next to an agent one with its name', async () => {
    const coach = (await createTestUser()).id
    const link = await prisma.coachLink.create({ data: { coachUserId: coach, traineeUserId: user } })
    const token = await prisma.agentToken.create({ data: { userId: user, name: 'Hermes', tokenHash: `t-${Math.random()}` } })
    const fromCoach = await seed('Coach Plan', { origin: 'agent' })
    const fromAgent = await seed('Agent Plan', { origin: 'agent' })
    const proposal = { userId: user, kind: 'saved_workout.create', status: 'applied', summary: 's', rationale: 'r', payload: {} }
    await prisma.proposal.create({ data: { ...proposal, coachLinkId: link.id, targetId: fromCoach.id } })
    await prisma.proposal.create({ data: { ...proposal, agentTokenId: token.id, targetId: fromAgent.id } })

    const { GET } = await import('@/app/api/workouts/saved/route')
    const res = await GET(req('/api/workouts/saved', 'GET'))
    expect(res.status).toBe(200)
    const { saved } = (await res.json()) as { saved: Array<{ name: string; source: string | null; fromCoach: boolean }> }
    const by = Object.fromEntries(saved.map((s) => [s.name, s]))
    expect(by['Coach Plan']).toMatchObject({ source: null, fromCoach: true })
    expect(by['Agent Plan']).toMatchObject({ source: 'Hermes', fromCoach: false })
  })
})

describe('2. Undo', () => {
  it('is refused on a workout that is not archived, and writes nothing', async () => {
    const w = await seed('Leg Day', { lastUsedAt: daysAgo(2) })
    const res = await patch(w.id, { archived: false, undo: { pinnedAt: daysAgo(1).toISOString(), dismissedAt: null } })
    expect(res.status).toBe(400)
    const after = await prisma.savedWorkout.findUniqueOrThrow({ where: { id: w.id } })
    expect(after.pinnedAt).toBeNull()
    expect(after.updatedAt).toEqual(w.updatedAt)
  })

  it('is refused with a pinnedAt after now (it would sort first forever), and the row stays archived', async () => {
    const w = await seed('Upper A', { pinnedAt: daysAgo(3) })
    expect((await patch(w.id, { archived: true })).status).toBe(200)
    const res = await patch(w.id, { archived: false, undo: { pinnedAt: '9999-01-01T00:00:00.000Z', dismissedAt: null } })
    expect(res.status).toBe(400)
    const after = await prisma.savedWorkout.findUniqueOrThrow({ where: { id: w.id } })
    expect(after.archivedAt).not.toBeNull()
    expect(after.pinnedAt).toBeNull()
  })

  it('still puts an archived workout back with the pin archive returned', async () => {
    const pinnedAt = daysAgo(3)
    const w = await seed('Upper A', { pinnedAt })
    const archived = await patch(w.id, { archived: true })
    const previous = archived.body.previous as { pinnedAt: string; dismissedAt: null }
    expect((await patch(w.id, { archived: false, undo: previous })).status).toBe(200)
    const after = await prisma.savedWorkout.findUniqueOrThrow({ where: { id: w.id } })
    expect(after.archivedAt).toBeNull()
    expect(after.pinnedAt?.toISOString()).toBe(pinnedAt.toISOString())
  })
})

describe('3. starting an archived workout', () => {
  it('restores it, as Restore does: unarchived, used now, not pinned, never New again', async () => {
    const w = await seed('Machine Upper', { origin: 'agent', archivedAt: daysAgo(1) })
    const { POST } = await import('@/app/api/workouts/saved/[id]/start/route')
    const res = await POST(req(`/api/workouts/saved/${w.id}/start`, 'POST'), ctx(w.id))
    expect(res.status).toBe(200)
    const after = await prisma.savedWorkout.findUniqueOrThrow({ where: { id: w.id } })
    expect(after.archivedAt).toBeNull()
    expect(after.lastUsedAt).not.toBeNull()
    expect(after.pinnedAt).toBeNull()
    expect(after.dismissedAt).not.toBeNull()

    const { groupSavedWorkouts } = await import('@/lib/saved-workouts/groups')
    const iso = (d: Date | null) => (d ? d.toISOString() : null)
    const groups = groupSavedWorkouts([
      { ...after, lastUsedAt: iso(after.lastUsedAt), createdAt: after.createdAt.toISOString(), pinnedAt: null, archivedAt: null, dismissedAt: iso(after.dismissedAt) },
    ])
    expect(groups.recent.map((g) => g.name)).toEqual(['Machine Upper'])
  })

  it('leaves an unarchived workout as it was apart from lastUsedAt', async () => {
    const w = await seed('Leg Day', { lastUsedAt: daysAgo(2) })
    const { POST } = await import('@/app/api/workouts/saved/[id]/start/route')
    expect((await POST(req(`/api/workouts/saved/${w.id}/start`, 'POST'), ctx(w.id))).status).toBe(200)
    const after = await prisma.savedWorkout.findUniqueOrThrow({ where: { id: w.id } })
    expect(after.archivedAt).toBeNull()
    expect(after.dismissedAt).toBeNull()
  })
})
