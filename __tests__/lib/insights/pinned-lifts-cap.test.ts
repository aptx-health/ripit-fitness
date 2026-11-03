/**
 * Pinned "Not this week" rows cap e1RM at 12 reps (work item 128, lead follow-up). Real test DB.
 * Spec: features/analytics/lift-page.feature, "The Progress row agrees". `loadPinned` gives a pin
 * not done in the week its last session's best set: the best e1RM from sets of 12 reps or fewer,
 * else (a session of only higher-rep sets) the heaviest set with no e1RM, so the row reads
 * "Last: 155×16" like the S2 Lifts row.
 */

import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { loadPinned } from '@/lib/insights/pinned-lifts'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const WEEK_END = new Date('2026-10-26T06:00:00Z')
const epley = (w: number, r: number) => (r === 1 ? w : w * (1 + r / 30))

let prisma: PrismaClient
let userId: string
let calf: string

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  userId = (await createTestUser()).id
  calf = (await createTestExerciseDefinition(prisma, { name: 'Calf Raise', primaryFAUs: ['calves'] })).id
})

async function session(when: string, sets: Array<{ reps: number; weight: number }>) {
  const at = new Date(when)
  const c = await prisma.workoutCompletion.create({ data: { userId, status: 'completed', completedAt: at, isAdHoc: true } })
  const e = await prisma.exercise.create({
    data: { name: 'Calf Raise', exerciseDefinitionId: calf, order: 1, userId, workoutCompletionId: c.id, isOneOff: true },
  })
  await prisma.loggedSet.createMany({
    data: sets.map((s, i) => ({ setNumber: i + 1, reps: s.reps, weight: s.weight, weightUnit: 'lbs', exerciseId: e.id, completionId: c.id, userId })),
  })
}
const last = async () => (await loadPinned(prisma, userId, { pins: [calf], doneIds: new Set(), weekEnd: WEEK_END, unit: 'lbs' }))[0].last

describe('the last session of a pinned lift', () => {
  it('of only higher-rep sets: the heaviest set, no e1RM', async () => {
    await session('2026-10-21T23:00:00Z', [
      { reps: 20, weight: 135 },
      { reps: 16, weight: 155 },
      { reps: 15, weight: 155 },
    ])
    expect(await last()).toMatchObject({ weight: 155, reps: 16, e1rm: null })
  })

  it('with a set of 12 or fewer: that set and its e1RM, though a 20-rep set would score higher', async () => {
    await session('2026-10-21T23:00:00Z', [
      { reps: 20, weight: 150 },
      { reps: 12, weight: 140 },
    ])
    const out = await last()
    expect(out).toMatchObject({ weight: 140, reps: 12 })
    expect(out?.e1rm).toBeCloseTo(epley(140, 12), 5)
  })

  it('12 reps still counts', async () => {
    await session('2026-10-21T23:00:00Z', [{ reps: 12, weight: 100 }])
    expect((await last())?.e1rm).toBeCloseTo(140, 5)
  })
})
