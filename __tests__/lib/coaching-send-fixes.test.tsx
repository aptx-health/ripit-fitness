/**
 * Coaching slice 2 fixes after review 151 (work/152):
 *   1. ordinary programs send (rest days, exercises with no sets, RPE 0, A1/A2,
 *      lone or split labels), and what still can't be sent says where and why;
 *   3. the same thing can't wait twice on a link (409 duplicate);
 *   4. the Send button takes trainees from the page: no request of its own.
 */

import type { PrismaClient } from '@prisma/client'
import { cleanup, render, screen } from '@testing-library/react'
import { NextRequest } from 'next/server'
import { createElement } from 'react'
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
  getCurrentUser: async () => (auth.userId ? { user: { id: auth.userId, role: 'user' }, error: null } : { user: null, error: null }),
}))
vi.mock('@/lib/rate-limit', async (orig) => ({ ...(await orig<object>()), checkRateLimit: async () => null }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import SendToTrainee from '@/components/coaching/SendToTrainee'
import { ToastProvider } from '@/components/ToastProvider'
import { sendToTrainee } from '@/lib/coaching/send'
import { normaliseGroups } from '@/lib/coaching/send-normalise'

let prisma: PrismaClient
let coach: string
let sam: string
let link: string
const defs: Record<string, string> = {}

type Set = { reps: string; rpe?: number; weight?: string }
type Ex = { def: string; group?: string; sets?: Set[]; notes?: string }

async function program(name: string, weeks: Ex[][][]) {
  const row = await prisma.program.create({
    data: {
      name,
      userId: coach,
      weeks: {
        create: weeks.map((days, wi) => ({
          weekNumber: wi + 1,
          userId: coach,
          workouts: {
            create: days.map((exercises, di) => ({
              dayNumber: di + 1,
              name: `Day ${di + 1}`,
              userId: coach,
              exercises: {
                create: exercises.map((e, oi) => ({
                  order: oi + 1,
                  name: e.def,
                  exerciseDefinitionId: defs[e.def],
                  userId: coach,
                  exerciseGroup: e.group ?? null,
                  notes: e.notes ?? null,
                  prescribedSets: {
                    create: (e.sets ?? [{ reps: '8' }]).map((s, si) => ({ setNumber: si + 1, userId: coach, ...s })),
                  },
                })),
              },
            })),
          },
        })),
      },
    },
  })
  return row.id
}

async function saved(name: string, exercises: Array<{ def: string; group?: string | null; sets: number }>) {
  const row = await prisma.savedWorkout.create({
    data: {
      userId: coach,
      name,
      exerciseCount: exercises.length,
      workoutData: exercises.map((e, i) => ({
        name: e.def,
        exerciseDefinitionId: defs[e.def],
        order: i + 1,
        notes: null,
        exerciseGroup: e.group ?? null,
        sets: Array.from({ length: e.sets }, (_, j) => ({ setNumber: j + 1, reps: '10', rir: null, rpe: null, isWarmup: false })),
      })),
    },
  })
  return row.id
}

const sendProgram = (sourceId: string) => sendToTrainee(prisma, coach, { linkId: link, kind: 'program', sourceId })
const sendSaved = (sourceId: string) => sendToTrainee(prisma, coach, { linkId: link, kind: 'saved_workout', sourceId })

async function payloadOf(result: Awaited<ReturnType<typeof sendToTrainee>>) {
  expect(result.ok, JSON.stringify(result)).toBe(true)
  const p = await prisma.proposal.findUniqueOrThrow({ where: { id: (result as { proposalId: string }).proposalId } })
  return p.payload as Record<string, unknown>
}

const postSend = async (body: unknown) => {
  const { POST } = await import('@/app/api/coaching/send/route')
  const res = await POST(
    new NextRequest('http://localhost/api/coaching/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  coach = (await createTestUser()).id
  sam = (await createTestUser()).id
  await prisma.userSettings.createMany({ data: [{ userId: coach, displayName: 'Dustin' }, { userId: sam, displayName: 'Sam' }] })
  link = (await prisma.coachLink.create({ data: { coachUserId: coach, traineeUserId: sam } })).id
  for (const name of ['Bench Press', 'Cable Row', 'Lat Pulldown', 'Squat', 'Curl'])
    defs[name] = (await createTestExerciseDefinition(prisma, { name, isSystem: true })).id
  auth.userId = coach
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('superset labels before sending', () => {
  const labels = (list: Array<string | undefined>) => normaliseGroups(list.map((group) => ({ group }))).map((e) => e.group)

  it('A1/A2 become A, any case', () => {
    expect(labels(['A1', 'a2', 'b 1', 'B2'])).toEqual(['A', 'A', 'B', 'B'])
  })
  it('a label on one exercise is dropped; the exercise stays', () => {
    expect(labels([undefined, 'A', undefined, 'B', 'B'])).toEqual([undefined, undefined, undefined, 'B', 'B'])
  })
  it('a label repeated further down keeps its first run only', () => {
    expect(labels(['A', 'A', undefined, 'A', 'A'])).toEqual(['A', 'A', undefined, undefined, undefined])
  })
  it('an unreadable label is dropped', () => {
    expect(labels(['Superset 1', 'Superset 1', 'ABCD', 'ABCD'])).toEqual([undefined, undefined, undefined, undefined])
  })
})

describe('1. ordinary programs send', () => {
  it('skips rest days and exercises with no sets, reads RPE 0 as none, tidies labels', async () => {
    const id = await program('Ordinary', [
      [
        [
          { def: 'Bench Press', sets: [{ reps: '5', rpe: 0 }] },
          { def: 'Cable Row', group: 'A1' },
          { def: 'Lat Pulldown', group: 'A2' },
          { def: 'Curl', group: 'B', sets: [] },
          { def: 'Squat', group: 'C' },
        ],
        [],
        [{ def: 'Squat' }],
      ],
      [[]],
    ])
    const payload = (await payloadOf(await sendProgram(id))) as {
      weeks: Array<{ workouts: Array<{ exercises: Array<{ group?: string; prescribedSets: Array<Record<string, unknown>> }> }> }>
    }
    expect(payload.weeks).toHaveLength(1)
    const days = payload.weeks[0].workouts
    expect(days).toHaveLength(2)
    expect(days[0].exercises.map((e) => e.group ?? null)).toEqual([null, 'A', 'A', null])
    expect(days[0].exercises[0].prescribedSets[0]).not.toHaveProperty('rpe')
  })

  it('a saved workout drops exercises with no sets and tidies labels', async () => {
    const id = await saved('Arms', [
      { def: 'Curl', group: 'A1', sets: 2 },
      { def: 'Bench Press', group: 'A2', sets: 2 },
      { def: 'Squat', sets: 0 },
      { def: 'Cable Row', group: 'B', sets: 1 },
    ])
    const payload = (await payloadOf(await sendSaved(id))) as { exercises: Array<{ group?: string }> }
    expect(payload.exercises.map((e) => e.group ?? null)).toEqual(['A', 'A', null])
  })
})

describe('1. what still can not be sent says where and why', () => {
  it('names the week, day, exercise, set and field for text over the limit', async () => {
    const id = await program('Long reps', [[[{ def: 'Squat' }], [{ def: 'Bench Press', sets: [{ reps: '8' }, { reps: '5 then a slow negative' }] }]]])
    expect(await sendProgram(id)).toMatchObject({
      ok: false,
      code: 'invalid',
      reason: 'Week 1, Day 2, Bench Press, set 2: reps is too long (max 20)',
    })
    const weight = await program('Long weight', [[[{ def: 'Squat', sets: [{ reps: '5', weight: 'bodyweight plus a 25lb vest' }] }]]])
    expect(await sendProgram(weight)).toMatchObject({ reason: 'Week 1, Day 1, Squat, set 1: weight is too long (max 20)' })
    expect(await prisma.proposal.count()).toBe(0)
  })

  it('names the list that is over its limit', async () => {
    const eightDays = await program('Every day', [Array.from({ length: 8 }, () => [{ def: 'Squat' }])])
    expect(await sendProgram(eightDays)).toMatchObject({ reason: 'Week 1 has 8 days (max 7)' })
    const longWeek = await program('Long', Array.from({ length: 17 }, () => [[{ def: 'Squat' }]]))
    expect(await sendProgram(longWeek)).toMatchObject({ reason: 'The program has 17 weeks (max 16)' })
    const manySets = await saved('Volume', [{ def: 'Bench Press', sets: 11 }])
    expect(await sendSaved(manySets)).toMatchObject({ reason: 'Bench Press has 11 sets (max 10)' })
  })

  it('the route passes the reason through; the custom-exercise refusal is unchanged', async () => {
    const id = await program('Long reps', [[[{ def: 'Bench Press', sets: [{ reps: '5 then a slow negative' }] }]]])
    expect(await postSend({ linkId: link, kind: 'program', sourceId: id })).toEqual({
      status: 400,
      body: { code: 'invalid', reason: 'Week 1, Day 1, Bench Press, set 1: reps is too long (max 20)' },
    })
    defs.Fly = (await createTestExerciseDefinition(prisma, { name: "Dustin's Fly", isSystem: false, userId: coach })).id
    const fly = await program('Fly', [[[{ def: 'Fly' }]]])
    expect((await postSend({ linkId: link, kind: 'program', sourceId: fly })).body).toMatchObject({
      code: 'invalid',
      missingExercises: ["Dustin's Fly"],
    })
  })
})

describe('3. the same thing can not wait twice', () => {
  it('refuses a send identical to one still pending on the link, with 409', async () => {
    const id = await program('Starter', [[[{ def: 'Squat' }]]])
    expect((await sendProgram(id)).ok).toBe(true)
    expect(await sendProgram(id)).toMatchObject({ ok: false, code: 'duplicate' })
    expect(await postSend({ linkId: link, kind: 'program', sourceId: id })).toMatchObject({ status: 409, body: { code: 'duplicate' } })
    expect(await prisma.proposal.count()).toBe(1)
  })

  it('sends again once Sam has decided, or when the program changed', async () => {
    const id = await program('Starter', [[[{ def: 'Squat' }]]])
    const first = await sendProgram(id)
    await prisma.proposal.update({ where: { id: (first as { proposalId: string }).proposalId }, data: { status: 'rejected' } })
    expect((await sendProgram(id)).ok).toBe(true)
    await prisma.program.update({ where: { id }, data: { name: 'Starter v2' } })
    expect((await sendProgram(id)).ok).toBe(true)
  })
})

describe('4. trainees from the page', () => {
  it('a given list renders the button without any request', async () => {
    const fetchSpy = vi.fn(async () => new Response('{}'))
    vi.stubGlobal('fetch', fetchSpy)
    render(
      createElement(
        ToastProvider,
        null,
        createElement(SendToTrainee, { kind: 'program', sourceId: 'p1', trainees: [{ linkId: link, name: 'Sam' }] })
      )
    )
    expect(screen.getByRole('button', { name: 'Send to Sam' })).toBeTruthy()
    cleanup()
    render(createElement(ToastProvider, null, createElement(SendToTrainee, { kind: 'program', sourceId: 'p1', trainees: [] })))
    expect(screen.queryByRole('button', { name: /^send to/i })).toBeNull()
    await new Promise((r) => setTimeout(r, 20))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('the saved workout detail carries the owner’s trainees', async () => {
    const id = await saved('Arms', [{ def: 'Curl', sets: 2 }])
    const { GET } = await import('@/app/api/workouts/saved/[id]/route')
    const res = await GET(new NextRequest(`http://localhost/api/workouts/saved/${id}`), { params: Promise.resolve({ id }) })
    expect(((await res.json()) as { trainees: unknown }).trainees).toEqual([{ linkId: link, name: 'Sam' }])
  })
})
