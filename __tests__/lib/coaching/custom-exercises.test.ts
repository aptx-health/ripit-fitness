/**
 * Work 164 additions to features/coaching/custom-exercises.feature (lead calls
 * on the 163 packet): a copy name over the 100-character limit trims the base
 * name with "…", and accept choices for exercises not in the send are refused
 * with 400 before anything is applied.
 */

import type { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copyName } from '@/lib/coaching/custom-exercises'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'
import { countQueries } from '@/lib/test/query-count'

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

describe('copyName', () => {
  it('is "<name> (from <first>)" with " <n>" from 2 up', () => {
    expect(copyName('Cable Fly', 'Dustin')).toBe('Cable Fly (from Dustin)')
    expect(copyName('Cable Fly', 'Dustin', 3)).toBe('Cable Fly (from Dustin) 3')
  })

  it('trims the base name with "…" so the whole fits 100 characters', () => {
    const long = `Single Arm ${'Very '.repeat(20)}Long Cable Fly`
    const name = copyName(long, 'Dustin')
    expect(name.length).toBeLessThanOrEqual(100)
    expect(name).toMatch(/… \(from Dustin\)$/)
    expect(long.startsWith(name.split('…')[0])).toBe(true)
    const numbered = copyName(long, 'Dustin', 12)
    expect(numbered.length).toBeLessThanOrEqual(100)
    expect(numbered).toMatch(/… \(from Dustin\) 12$/)
  })

  it('leaves a name that fits exactly alone', () => {
    const fits = 'x'.repeat(100 - ' (from Dustin)'.length)
    expect(copyName(fits, 'Dustin')).toBe(`${fits} (from Dustin)`)
  })
})

describe('accepting a coach send with long names and stray choices', () => {
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
    const name = `Single Arm ${'Very '.repeat(18)}Long Fly`
    fly = (await createTestExerciseDefinition(prisma, { name, isSystem: false, userId: coach, equipment: ['cable'], primaryFAUs: ['chest'] })).id
    auth.userId = trainee
  })

  async function sendWorkout(ids: string[]) {
    const saved = await prisma.savedWorkout.create({
      data: {
        userId: coach,
        name: `W ${ids.length}`,
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

  it('makes a copy whose trimmed name fits', async () => {
    const id = await sendWorkout([fly])
    const r = await postAccept(id, {})
    expect(r.status).toBe(200)
    const [copy] = await prisma.exerciseDefinition.findMany({ where: { userId: trainee } })
    expect(copy.name.length).toBeLessThanOrEqual(100)
    expect(copy.name).toMatch(/… \(from Dustin\)$/)
  })

  it('refuses a choice for an exercise not in the send with 400, applying nothing', async () => {
    const id = await sendWorkout([fly])
    const r = await postAccept(id, { exercises: { 'not-in-send': { use: 'copy' } } })
    expect(r.status).toBe(400)
    expect(r.body).toMatchObject({ code: 'invalid' })
    expect(await prisma.exerciseDefinition.count({ where: { userId: trainee } })).toBe(0)
    expect(await prisma.savedWorkout.count({ where: { userId: trainee } })).toBe(0)
    expect((await prisma.proposal.findUniqueOrThrow({ where: { id } })).status).toBe('pending')
  })

  it('refuses any choice for a send that carries no custom exercises with 400', async () => {
    const shared = (await createTestExerciseDefinition(prisma, { name: 'Leg Press', isSystem: true })).id
    const id = await sendWorkout([shared])
    const r = await postAccept(id, { exercises: { [fly]: { use: 'copy' } } })
    expect(r.status).toBe(400)
    expect((await prisma.proposal.findUniqueOrThrow({ where: { id } })).status).toBe('pending')
  })

  it('accepts with the same number of queries for 1 or 3 custom exercises', async () => {
    const { approveProposal } = await import('@/lib/proposals/service')
    const more = []
    for (const name of ['Coach Row', 'Coach Curl']) {
      more.push((await createTestExerciseDefinition(prisma, { name, isSystem: false, userId: coach, equipment: ['cable'], primaryFAUs: ['chest'] })).id)
    }
    const one = await sendWorkout([fly])
    const three = await sendWorkout([fly, ...more])
    const a = await countQueries(prisma, () => approveProposal(prisma, one, trainee))
    await prisma.exerciseDefinition.deleteMany({ where: { userId: trainee } })
    await prisma.savedWorkout.deleteMany({ where: { userId: trainee } })
    // Same starting state: no recorded copy for the earlier-copy lookup to find.
    await prisma.proposal.delete({ where: { id: one } })
    const b = await countQueries(prisma, () => approveProposal(prisma, three, trainee))
    expect(await prisma.exerciseDefinition.count({ where: { userId: trainee } })).toBe(3)
    expect(b.count).toBe(a.count)
  })
})
