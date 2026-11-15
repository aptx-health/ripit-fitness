/**
 * Work 166 polish from review 165: the review screen uses the coach's first
 * name, keeps a long exercise name out of the fieldset legend, names the copy
 * "Add a copy" would make, and a unique-name race on the copy is a retryable
 * refusal the trainee can read.
 */

import type { PrismaClient } from '@prisma/client'
import { cleanup, render, screen, within } from '@testing-library/react'
import { NextRequest } from 'next/server'
import { type ComponentType, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, prefetch: () => {} }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

type Json = Record<string, unknown>
const LONG = 'Single Arm Kneeling Half Kneeling Cable Pulldown With A Long Pause'

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
  await prisma.userSettings.create({ data: { userId: coach, displayName: 'Dustin Coach' } })
  linkId = (await prisma.coachLink.create({ data: { coachUserId: coach, traineeUserId: trainee } })).id
  fly = (await createTestExerciseDefinition(prisma, { name: 'Cable Fly', isSystem: false, userId: coach })).id
  auth.userId = trainee
})
afterEach(() => cleanup())

async function send(ids: string[], name = 'Fly Session') {
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

async function detail(id: string) {
  const { getSuggestionDetail } = await import('@/lib/suggestions/detail')
  const d = await getSuggestionDetail(trainee, id)
  expect(d).toBeTruthy()
  return d as NonNullable<typeof d>
}

async function renderReview(id: string) {
  const Review = (await import('@/components/suggestions/SuggestionReview')).default as unknown as ComponentType<{
    suggestion: Json
  }>
  render(createElement(Review, { suggestion: (await detail(id)) as unknown as Json }))
}

const groupNamed = (name: string) =>
  screen.getAllByRole('group').find((g) => g.querySelector('legend')?.textContent === name) as HTMLElement

describe('the review screen', () => {
  it("names the coach by first name, as the copy is named", async () => {
    const d = await detail(await send([fly]))
    expect(d.coachFirstName).toBe('Dustin')
    await renderReview(d.id)
    const group = groupNamed('Cable Fly')
    expect(group.textContent).toContain("Dustin's exercise")
    expect(document.body.textContent).toContain('Exercises from Dustin')
    expect(document.body.textContent).not.toContain("Dustin Coach's exercise")
    expect(document.body.textContent).not.toContain('Exercises from Dustin Coach')
  })

  it('keeps a long name out of the visible legend, still naming the group', async () => {
    const long = (await createTestExerciseDefinition(prisma, { name: LONG, isSystem: false, userId: coach })).id
    await renderReview(await send([long]))
    const group = groupNamed(LONG)
    const legend = group.querySelector('legend') as HTMLElement
    expect(legend.className).toContain('sr-only')
    expect(within(group).getAllByText(LONG).some((el) => el.tagName !== 'LEGEND')).toBe(true)
  })

  it('"Add a copy" names the copy it would make, with the next free number', async () => {
    await createTestExerciseDefinition(prisma, { name: 'Cable Fly (from Dustin)', isSystem: false, userId: coach })
    const d = await detail(await send([fly]))
    expect(d.customExercises[0]).toMatchObject({ copyName: 'Cable Fly (from Dustin) 2', earlierCopy: null })
    await renderReview(d.id)
    expect(groupNamed('Cable Fly').textContent).toContain(
      'Adds "Cable Fly (from Dustin) 2" to your exercises; you can rename it.'
    )
  })

  it('says "You have this from an earlier send" instead when the copy is reused', async () => {
    const { approveProposal } = await import('@/lib/proposals/service')
    expect((await approveProposal(prisma, await send([fly]), trainee)).ok).toBe(true)
    const d = await detail(await send([fly], 'Fly Session 2'))
    expect(d.customExercises[0]).toMatchObject({ earlierCopy: 'Cable Fly (from Dustin)', copyName: null })
    await renderReview(d.id)
    const text = groupNamed('Cable Fly').textContent ?? ''
    expect(text).toContain('You have this from an earlier send')
    expect(text).not.toContain('Adds "')
  })
})

describe('a unique-name race on the copy', () => {
  /** Makes the copy's insert fail as a unique violation, as when another insert takes the name first. */
  async function raceCopyName() {
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION race_copy() RETURNS trigger AS $$
      BEGIN IF NEW.name LIKE '%(from Dustin)%' THEN
        RAISE unique_violation USING MESSAGE = 'duplicate key value violates unique constraint "ExerciseDefinition_normalizedName_key"';
      END IF; RETURN NEW; END $$ LANGUAGE plpgsql`)
    await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS race_copy ON "ExerciseDefinition"')
    await prisma.$executeRawUnsafe(
      'CREATE TRIGGER race_copy BEFORE INSERT ON "ExerciseDefinition" FOR EACH ROW EXECUTE FUNCTION race_copy()'
    )
  }
  const unrace = () => prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS race_copy ON "ExerciseDefinition"')

  it('is a readable refusal, nothing applied, and a retry works', async () => {
    const id = await send([fly])
    await raceCopyName()
    try {
      const { POST } = await import('@/app/api/suggestions/[id]/accept/route')
      const res = await POST(new NextRequest(`http://localhost/api/suggestions/${id}/accept`, { method: 'POST' }), {
        params: Promise.resolve({ id }),
      })
      expect(res.status).toBe(422)
      expect(await res.json()).toMatchObject({ code: 'invalid', error: expect.stringContaining("Couldn't name the copy") })
    } finally {
      await unrace()
    }
    expect(await prisma.exerciseDefinition.count({ where: { userId: trainee } })).toBe(0)
    expect(await prisma.savedWorkout.count({ where: { userId: trainee } })).toBe(0)
    expect((await prisma.proposal.findUniqueOrThrow({ where: { id } })).status).toBe('pending')

    const { approveProposal } = await import('@/lib/proposals/service')
    expect((await approveProposal(prisma, id, trainee)).ok).toBe(true)
    expect((await prisma.exerciseDefinition.findMany({ where: { userId: trainee } })).map((d) => d.name)).toEqual([
      'Cable Fly (from Dustin)',
    ])
  })
})
