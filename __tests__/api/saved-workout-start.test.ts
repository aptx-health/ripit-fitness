import { createId } from '@paralleldrive/cuid2'
import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import {
  createTestExerciseDefinition,
  createTestUser,
} from '@/lib/test/factories'
import type { SavedWorkoutData } from '@/types/saved-workout'

// Mirrors the transaction logic in app/api/workouts/saved/[id]/start/route.ts
// Auth, rate-limiting, event logging are owned by the route layer.

type StartResult =
  | { ok: true; completionId: string }
  | { ok: false; status: 404 | 409 | 500; error: string; draftId?: string }

async function simulateStartFromSaved(
  prisma: PrismaClient,
  userId: string,
  savedWorkoutId: string,
  now: Date = new Date()
): Promise<StartResult> {
  const saved = await prisma.savedWorkout.findFirst({
    where: { id: savedWorkoutId, userId },
  })
  if (!saved) return { ok: false, status: 404, error: 'Saved workout not found' }

  const existing = await prisma.workoutCompletion.findFirst({
    where: { userId, status: 'draft', isArchived: false },
  })
  if (existing) {
    return { ok: false, status: 409, error: 'DRAFT_EXISTS', draftId: existing.id }
  }

  const workoutData = saved.workoutData as unknown as SavedWorkoutData
  if (!Array.isArray(workoutData)) {
    return { ok: false, status: 500, error: 'Bad workoutData' }
  }

  const completionId = await prisma.$transaction(async (tx) => {
    const completion = await tx.workoutCompletion.create({
      data: {
        workoutId: null,
        savedWorkoutId: saved.id,
        userId,
        status: 'draft',
        isAdHoc: true,
        name: saved.name,
        startedAt: now,
        completedAt: now,
      },
      select: { id: true },
    })

    const exerciseRows = workoutData.map((ex) => ({
      id: createId(),
      name: ex.name,
      exerciseDefinitionId: ex.exerciseDefinitionId,
      order: ex.order,
      notes: ex.notes ?? null,
      exerciseGroup: ex.exerciseGroup ?? null,
      workoutId: null,
      workoutCompletionId: completion.id,
      userId,
      isOneOff: true,
    }))
    if (exerciseRows.length > 0) {
      await tx.exercise.createMany({ data: exerciseRows })
    }

    const prescribedRows = workoutData.flatMap((ex, idx) =>
      (ex.sets ?? []).map((s) => ({
        exerciseId: exerciseRows[idx].id,
        userId,
        setNumber: s.setNumber,
        reps: s.reps,
        rir: s.rir ?? null,
        rpe: s.rpe ?? null,
        isWarmup: Boolean(s.isWarmup),
      }))
    )
    if (prescribedRows.length > 0) {
      await tx.prescribedSet.createMany({ data: prescribedRows })
    }

    await tx.savedWorkout.update({
      where: { id: saved.id },
      data: { lastUsedAt: now },
    })

    return completion.id
  })

  return { ok: true, completionId }
}

describe('POST /api/workouts/saved/[id]/start', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  async function seedSaved(workoutData: SavedWorkoutData, name = 'Push Day') {
    return prisma.savedWorkout.create({
      data: {
        userId,
        name,
        workoutData: workoutData as unknown as object,
        exerciseCount: workoutData.length,
      },
    })
  }

  it('hydrates exercises and prescribed sets onto a new draft completion', async () => {
    const def1 = await createTestExerciseDefinition(prisma, { name: 'Bench Press' })
    const def2 = await createTestExerciseDefinition(prisma, { name: 'Row' })

    const saved = await seedSaved([
      {
        name: 'Bench Press',
        exerciseDefinitionId: def1.id,
        order: 1,
        notes: null,
        exerciseGroup: null,
        sets: [
          { setNumber: 1, reps: '5', rir: 2, rpe: null, isWarmup: false },
          { setNumber: 2, reps: '5', rir: 1, rpe: null, isWarmup: false },
        ],
      },
      {
        name: 'Row',
        exerciseDefinitionId: def2.id,
        order: 2,
        notes: 'neutral grip',
        exerciseGroup: 'A',
        sets: [{ setNumber: 1, reps: '8', rir: null, rpe: 8, isWarmup: false }],
      },
    ])

    const res = await simulateStartFromSaved(prisma, userId, saved.id)
    expect(res.ok).toBe(true)
    if (!res.ok) return

    const completion = await prisma.workoutCompletion.findUnique({
      where: { id: res.completionId },
      include: {
        exercises: {
          orderBy: { order: 'asc' },
          include: { prescribedSets: { orderBy: { setNumber: 'asc' } } },
        },
      },
    })
    expect(completion).not.toBeNull()
    expect(completion?.status).toBe('draft')
    expect(completion?.isAdHoc).toBe(true)
    expect(completion?.savedWorkoutId).toBe(saved.id)
    expect(completion?.name).toBe('Push Day')
    expect(completion?.exercises).toHaveLength(2)

    const bench = completion?.exercises.find((e) => e.order === 1)
    expect(bench?.name).toBe('Bench Press')
    expect(bench?.isOneOff).toBe(true)
    expect(bench?.prescribedSets).toHaveLength(2)
    expect(bench?.prescribedSets[0].reps).toBe('5')
    expect(bench?.prescribedSets[0].rir).toBe(2)

    const row = completion?.exercises.find((e) => e.order === 2)
    expect(row?.notes).toBe('neutral grip')
    expect(row?.exerciseGroup).toBe('A')
    expect(row?.prescribedSets[0].rpe).toBe(8)
  })

  it('updates SavedWorkout.lastUsedAt on start', async () => {
    const def = await createTestExerciseDefinition(prisma)
    const saved = await seedSaved([
      {
        name: 'Squat',
        exerciseDefinitionId: def.id,
        order: 1,
        notes: null,
        exerciseGroup: null,
        sets: [{ setNumber: 1, reps: '5', rir: null, rpe: null, isWarmup: false }],
      },
    ])
    expect(saved.lastUsedAt).toBeNull()

    const now = new Date('2026-05-19T20:00:00Z')
    const res = await simulateStartFromSaved(prisma, userId, saved.id, now)
    expect(res.ok).toBe(true)

    const after = await prisma.savedWorkout.findUnique({ where: { id: saved.id } })
    expect(after?.lastUsedAt?.toISOString()).toBe(now.toISOString())
  })

  it('returns 409 when an open draft already exists', async () => {
    const def = await createTestExerciseDefinition(prisma)
    const saved = await seedSaved([
      {
        name: 'OHP',
        exerciseDefinitionId: def.id,
        order: 1,
        notes: null,
        exerciseGroup: null,
        sets: [{ setNumber: 1, reps: '5', rir: null, rpe: null, isWarmup: false }],
      },
    ])

    const existingDraft = await prisma.workoutCompletion.create({
      data: {
        userId,
        status: 'draft',
        isAdHoc: true,
        name: 'Existing draft',
      },
    })

    const res = await simulateStartFromSaved(prisma, userId, saved.id)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.status).toBe(409)
    expect(res.draftId).toBe(existingDraft.id)
  })

  it('returns 404 when the saved workout belongs to another user', async () => {
    const otherUser = await createTestUser()
    const def = await createTestExerciseDefinition(prisma)
    const saved = await prisma.savedWorkout.create({
      data: {
        userId: otherUser.id,
        name: "Other's workout",
        workoutData: [
          {
            name: 'Bench',
            exerciseDefinitionId: def.id,
            order: 1,
            notes: null,
            exerciseGroup: null,
            sets: [],
          },
        ] as unknown as object,
        exerciseCount: 1,
      },
    })

    const res = await simulateStartFromSaved(prisma, userId, saved.id)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.status).toBe(404)
  })

  it('handles a saved workout with no exercises (no-op hydration)', async () => {
    const saved = await seedSaved([], 'Empty')

    const res = await simulateStartFromSaved(prisma, userId, saved.id)
    expect(res.ok).toBe(true)
    if (!res.ok) return

    const completion = await prisma.workoutCompletion.findUnique({
      where: { id: res.completionId },
      include: { exercises: true },
    })
    expect(completion?.exercises).toHaveLength(0)
  })
})
