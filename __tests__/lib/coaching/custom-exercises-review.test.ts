/** Work 165 review: spoofed earlier copies, picking the source itself, retry after a refusal, double accept. */

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
  getCurrentUser: async () => ({ user: { id: auth.userId, role: 'user', email: 'x@x.test' }, error: null }),
}))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: async () => null, workoutActionLimiter: {} }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

describe('coach send review edges', () => {
  let prisma: PrismaClient
  let coach: string
  let trainee: string
  let linkId: string
  let fly: string

  beforeEach(async () => {
    const db = await getTestDatabase()
    await db.reset()
    prisma = db.getPrismaClient()
    coach = (await createTestUser()).id
    trainee = (await createTestUser()).id
    await prisma.userSettings.create({ data: { userId: coach, displayName: 'Dustin' } })
    linkId = (await prisma.coachLink.create({ data: { coachUserId: coach, traineeUserId: trainee } })).id
    fly = (await createTestExerciseDefinition(prisma, { name: 'Cable Fly', isSystem: false, userId: coach })).id
    auth.userId = trainee
  })

  async function sendWorkout(ids: string[], name = 'W') {
    const saved = await prisma.savedWorkout.create({
      data: {
        userId: coach,
        name,
        exerciseCount: ids.length,
        workoutData: ids.map((id, i) => ({
          name: `E${i}`,
          exerciseDefinitionId: id,
          order: i + 1,
          notes: null,
          exerciseGroup: null,
          sets: [{ setNumber: 1, reps: '10', rir: null, rpe: null, isWarmup: false }],
        })),
      },
    })
    const { sendToTrainee } = await import('@/lib/coaching/send')
    const r = await sendToTrainee(prisma, coach, { linkId, kind: 'saved_workout', sourceId: saved.id })
    if (!r.ok) throw new Error(JSON.stringify(r))
    return r.proposalId
  }

  async function postAccept(id: string, body: unknown) {
    const { POST } = await import('@/app/api/suggestions/[id]/accept/route')
    const req = new NextRequest(`http://localhost/api/suggestions/${id}/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const res = await POST(req, { params: Promise.resolve({ id }) })
    return { status: res.status, body: await res.json() }
  }

  it('ignores a recorded copyId that is not one of the trainee\'s own exercises', async () => {
    const other = (await createTestUser()).id
    const theirs = (await createTestExerciseDefinition(prisma, { name: 'Other Fly', isSystem: false, userId: other })).id
    const system = (await createTestExerciseDefinition(prisma, { name: 'Pec Deck', isSystem: true })).id
    for (const copyId of [theirs, system]) {
      await prisma.proposal.create({
        data: {
          userId: trainee,
          coachLinkId: linkId,
          kind: 'saved_workout.create',
          status: 'applied',
          decidedAt: new Date(),
          summary: 'forged',
          rationale: '',
          payload: { name: 'x', exercises: [], customExercises: [{ sourceId: fly, name: 'Cable Fly', copyId }] },
        },
      })
    }
    const id = await sendWorkout([fly])
    expect((await postAccept(id, {})).status).toBe(200)
    const copies = await prisma.exerciseDefinition.findMany({ where: { userId: trainee } })
    expect(copies.map((c) => c.name)).toEqual(['Cable Fly (from Dustin)'])
    const workout = await prisma.savedWorkout.findFirstOrThrow({ where: { userId: trainee } })
    expect(JSON.stringify(workout.workoutData)).toContain(copies[0].id)
    expect(JSON.stringify(workout.workoutData)).not.toContain(theirs)
    expect(JSON.stringify(workout.workoutData)).not.toContain(system)
  })

  it("refuses 'Use one of mine' naming the coach's source exercise, keeps it pending, then a retry works", async () => {
    const id = await sendWorkout([fly])
    const bad = await postAccept(id, { exercises: { [fly]: { use: 'mine', exerciseDefinitionId: fly } } })
    expect(bad.status).toBe(422)
    expect(bad.body.error).toMatch(/Cable Fly/)
    expect(await prisma.exerciseDefinition.count({ where: { userId: trainee } })).toBe(0)
    expect((await prisma.proposal.findUniqueOrThrow({ where: { id } })).status).toBe('pending')
    expect((await postAccept(id, {})).status).toBe(200)
    const copy = await prisma.exerciseDefinition.findFirstOrThrow({ where: { userId: trainee } })
    expect(copy).toMatchObject({ isSystem: false, userId: trainee, name: 'Cable Fly (from Dustin)' })
  })

  it('two accepts at once make one copy and one workout', async () => {
    const id = await sendWorkout([fly])
    const results = await Promise.all([postAccept(id, {}), postAccept(id, {})])
    expect(results.map((r) => r.status).sort()).toEqual([200, 409])
    expect(await prisma.exerciseDefinition.count({ where: { userId: trainee } })).toBe(1)
    expect(await prisma.savedWorkout.count({ where: { userId: trainee } })).toBe(1)
  })

  it('two different pending sends of the same exercise, accepted one after the other, share one copy', async () => {
    const a = await sendWorkout([fly], 'A')
    const b = await sendWorkout([fly], 'B')
    expect((await postAccept(a, {})).status).toBe(200)
    expect((await postAccept(b, {})).status).toBe(200)
    expect(await prisma.exerciseDefinition.count({ where: { userId: trainee } })).toBe(1)
  })
})
