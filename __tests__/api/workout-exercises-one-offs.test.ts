/**
 * L3 fix 1 (work item 100) and its hardening (102), server side: the plan
 * sheet's list and reorder cover exercises added during a session (one-offs
 * on its completion), and only for this user's session of this workout.
 *   GET  /api/workouts/:id/exercises?completionId=   adds that session's
 *        one-offs, ordered by order then id; without the query it lists only
 *        the workout's own. Another user's or another workout's session adds nothing.
 *   GET  /api/workouts/:id/exercises/:order?completionId=   counts the same set.
 *   POST /api/workouts/:id/exercises/reorder { exercises, completionId }
 *        accepts one-offs of that session only, and returns them in its list.
 *   POST /api/workouts/:id/exercises/add-during-logging   puts a new one-off
 *        after the session's earlier one-offs (no tie).
 */

import type { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import {
  createTestExerciseDefinition,
  createTestProgram,
  createTestUser,
  createTestWorkoutCompletion,
} from '@/lib/test/factories'

const auth = vi.hoisted(() => ({ userId: '' }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  return { prisma: (await db()).getPrismaClient() }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    auth.userId ? { user: { id: auth.userId, role: 'user' }, error: null } : { user: null, error: null },
}))

import { GET as AT } from '@/app/api/workouts/[workoutId]/exercises/[order]/route'
import { POST as ADD } from '@/app/api/workouts/[workoutId]/exercises/add-during-logging/route'
import { POST as REORDER } from '@/app/api/workouts/[workoutId]/exercises/reorder/route'
import { GET } from '@/app/api/workouts/[workoutId]/exercises/route'

let prisma: PrismaClient
let userId: string
let workoutId: string
let otherWorkoutId: string
let completionId: string
let ownIds: string[]
let oneOffId: string

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  const user = await createTestUser()
  userId = user.id
  auth.userId = user.id
  const program = await createTestProgram(prisma, user.id, { workoutsPerWeek: 2, exercisesPerWorkout: 2 })
  const [w1, w2] = program.weeks[0].workouts
  workoutId = w1.id
  otherWorkoutId = w2.id
  ownIds = w1.exercises.map((e) => e.id)
  const completion = await createTestWorkoutCompletion(prisma, workoutId, user.id)
  completionId = completion.id
  oneOffId = (await addOneOff(user.id, completionId, 3, 'Added Curl')).id
})

/** A one-off on a completion, as add-during-logging makes it. */
async function addOneOff(owner: string, completion: string, order: number, name = 'One-off', id?: string) {
  const def = await prisma.exerciseDefinition.findFirstOrThrow()
  return prisma.exercise.create({
    data: {
      id,
      name,
      exerciseDefinitionId: def.id,
      order,
      userId: owner,
      isOneOff: true,
      workoutCompletionId: completion,
    },
  })
}

/** Another user with their own program, session on it, and a one-off there. */
async function otherUser() {
  const other = await createTestUser()
  const program = await createTestProgram(prisma, other.id, { exercisesPerWorkout: 1 })
  const w = program.weeks[0].workouts[0]
  const completion = await createTestWorkoutCompletion(prisma, w.id, other.id)
  const oneOff = await addOneOff(other.id, completion.id, 2, 'Their Curl')
  return { id: other.id, workoutId: w.id, completionId: completion.id, oneOffId: oneOff.id }
}

const list = async (query = '') => {
  const res = await GET(new NextRequest(`http://localhost/api/workouts/${workoutId}/exercises${query}`), {
    params: Promise.resolve({ workoutId }),
  })
  return { status: res.status, ids: ((await res.json()).exercises ?? []).map((e: { id: string }) => e.id) as string[] }
}

const reorder = (ids: string[], session: string | null = completionId) =>
  REORDER(
    new NextRequest(`http://localhost/api/workouts/${workoutId}/exercises/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exercises: ids.map((exerciseId, i) => ({ exerciseId, order: i + 1 })),
        completionId: session,
      }),
    }),
    { params: Promise.resolve({ workoutId }) }
  )

/** GET exercises/:order — the id at that position and the total. */
const at = async (order: number, query = '') => {
  const res = await AT(new NextRequest(`http://localhost/api/workouts/${workoutId}/exercises/${order}${query}`), {
    params: Promise.resolve({ workoutId, order: String(order) }),
  })
  const body = await res.json()
  return { status: res.status, id: body.exercise?.id as string | undefined, total: body.totalExercises as number }
}

describe('GET exercises with the session id', () => {
  it('lists the workout exercises and then the session one-off', async () => {
    expect(await list(`?completionId=${completionId}`)).toEqual({ status: 200, ids: [...ownIds, oneOffId] })
  })

  it('without the query lists only the workout exercises', async () => {
    expect(await list()).toEqual({ status: 200, ids: ownIds })
  })
})

describe('GET exercises: the session must be this user\'s session of this workout', () => {
  it("another user's session adds none of their one-offs", async () => {
    const them = await otherUser()
    expect(await list(`?completionId=${them.completionId}`)).toEqual({ status: 200, ids: ownIds })
  })

  it("the user's own session of another workout adds nothing", async () => {
    const elsewhere = await createTestWorkoutCompletion(prisma, otherWorkoutId, userId)
    await addOneOff(userId, elsewhere.id, 3, 'Elsewhere Curl')
    expect(await list(`?completionId=${elsewhere.id}`)).toEqual({ status: 200, ids: ownIds })
  })

  it('signed out: 401', async () => {
    auth.userId = ''
    expect((await list()).status).toBe(401)
  })

  it("another user's workout: 403", async () => {
    const them = await otherUser()
    const res = await GET(new NextRequest(`http://localhost/api/workouts/${them.workoutId}/exercises`), {
      params: Promise.resolve({ workoutId: them.workoutId }),
    })
    expect(res.status).toBe(403)
  })

  it('two one-offs on the same order keep a stable order (by id)', async () => {
    // Added second, but its id sorts first: only the id tiebreak puts it first.
    const twin = await addOneOff(userId, completionId, 3, 'Twin Curl', '0-twin')
    const tied = [twin.id, oneOffId]
    expect((await list(`?completionId=${completionId}`)).ids).toEqual([...ownIds, ...tied])
    expect((await list(`?completionId=${completionId}`)).ids).toEqual([...ownIds, ...tied])
  })
})

describe('GET exercises/:order counts the same exercises', () => {
  it('with the session: the one-off is 3rd of 3', async () => {
    expect(await at(3, `?completionId=${completionId}`)).toMatchObject({ status: 200, id: oneOffId, total: 3 })
  })

  it("another user's session: only the workout's own 2", async () => {
    const them = await otherUser()
    expect((await at(1, `?completionId=${them.completionId}`)).total).toBe(2)
  })

  it('tied one-offs come back in id order at each position', async () => {
    // Added second, but its id sorts first: only the id tiebreak puts it first.
    const twin = await addOneOff(userId, completionId, 3, 'Twin Curl', '0-twin')
    const tied = [twin.id, oneOffId]
    expect((await at(3, `?completionId=${completionId}`)).id).toBe(tied[0])
    expect((await at(4, `?completionId=${completionId}`)).id).toBe(tied[1])
  })
})

describe('Reorder with a session one-off', () => {
  it('puts the one-off first and saves the new order', async () => {
    const res = await reorder([oneOffId, ...ownIds])
    expect(res.status).toBe(200)
    expect((await list(`?completionId=${completionId}`)).ids).toEqual([oneOffId, ...ownIds])
  })

  it('returns the one-off in its list, in the new order', async () => {
    const res = await reorder([ownIds[0], oneOffId, ownIds[1]])
    const body = await res.json()
    expect(body.exercises.map((e: { id: string }) => e.id)).toEqual([ownIds[0], oneOffId, ownIds[1]])
  })

  it('without the session id a one-off is refused', async () => {
    expect((await reorder([oneOffId, ...ownIds], null)).status).toBe(400)
  })

  it('a one-off from another session of the same workout is refused', async () => {
    const earlier = await createTestWorkoutCompletion(prisma, workoutId, userId, 'completed')
    const old = await addOneOff(userId, earlier.id, 3, 'Old Curl')
    expect((await reorder([...ownIds, old.id])).status).toBe(400)
  })

  it("the user's own one-off from another workout is refused", async () => {
    const elsewhere = await createTestWorkoutCompletion(prisma, otherWorkoutId, userId)
    const theirs = await addOneOff(userId, elsewhere.id, 3, 'Elsewhere Curl')
    expect((await reorder([...ownIds, theirs.id])).status).toBe(400)
    expect((await reorder([...ownIds, theirs.id], elsewhere.id)).status).toBe(400)
  })

  it("another user's one-off is refused, even with their session id", async () => {
    const them = await otherUser()
    expect((await reorder([...ownIds, them.oneOffId])).status).toBe(400)
    expect((await reorder([...ownIds, them.oneOffId], them.completionId)).status).toBe(400)
  })

  it('signed out: 401', async () => {
    auth.userId = ''
    expect((await reorder(ownIds)).status).toBe(401)
  })

  it('still refuses an exercise from another workout', async () => {
    const other = await prisma.exercise.findFirstOrThrow({ where: { workoutId: otherWorkoutId } })
    const res = await reorder([...ownIds, other.id])
    expect(res.status).toBe(400)
  })
})

describe('Adding a one-off during logging', () => {
  const add = async () => {
    const def = await createTestExerciseDefinition(prisma, { name: `Added ${Math.random()}` })
    const res = await ADD(
      new NextRequest(`http://localhost/api/workouts/${workoutId}/exercises/add-during-logging`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseDefinitionId: def.id,
          applyToFuture: false,
          workoutCompletionId: completionId,
          prescribedSets: [{ setNumber: 1, reps: '10', intensityType: 'NONE' }],
        }),
      }),
      { params: Promise.resolve({ workoutId }) }
    )
    expect(res.status).toBeLessThan(300)
  }

  it("goes after the session's earlier one-offs, so orders never tie", async () => {
    await add()
    await add()
    const orders = (
      await prisma.exercise.findMany({ where: { workoutCompletionId: completionId }, select: { order: true } })
    ).map((e) => e.order)
    expect(new Set(orders).size).toBe(orders.length)
    expect([...orders].sort((a, b) => a - b)).toEqual([3, 4, 5])
  })
})
