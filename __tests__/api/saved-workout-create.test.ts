import type { PrismaClient, WorkoutCompletion } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import {
  createTestExerciseDefinition,
  createTestUser,
} from '@/lib/test/factories'
import type { SavedWorkoutData } from '@/types/saved-workout'

// Mirrors the snapshot logic in app/api/workouts/saved/route.ts (POST).
// The route layer owns auth + rate limiting + analytics — this exercises the
// validation + idempotency + snapshot transformation.

type CreateResult =
  | { ok: true; created: boolean; savedWorkoutId: string }
  | { ok: false; status: 400 | 404; error: string }

async function simulateCreateSavedWorkout(
  prisma: PrismaClient,
  userId: string,
  body: { sourceCompletionId?: string; name?: string; notes?: string }
): Promise<CreateResult> {
  const sourceCompletionId = body.sourceCompletionId
  if (!sourceCompletionId) {
    return { ok: false, status: 400, error: 'sourceCompletionId is required' }
  }
  const name = (body.name ?? '').trim()
  if (!name) return { ok: false, status: 400, error: 'name is required' }

  const existing = await prisma.savedWorkout.findFirst({
    where: { sourceCompletionId, userId },
  })
  if (existing) {
    return { ok: true, created: false, savedWorkoutId: existing.id }
  }

  const completion = await prisma.workoutCompletion.findUnique({
    where: { id: sourceCompletionId },
    include: {
      exercises: {
        orderBy: { order: 'asc' },
        include: { loggedSets: { orderBy: { setNumber: 'asc' } } },
      },
    },
  })
  if (!completion || completion.userId !== userId) {
    return { ok: false, status: 404, error: 'Completion not found' }
  }
  if (completion.status !== 'completed') {
    return { ok: false, status: 400, error: 'not completed' }
  }
  if (!completion.isAdHoc) {
    return { ok: false, status: 400, error: 'not freestyle' }
  }

  const workoutData: SavedWorkoutData = completion.exercises.map((ex) => ({
    name: ex.name,
    exerciseDefinitionId: ex.exerciseDefinitionId,
    order: ex.order,
    notes: ex.notes ?? null,
    exerciseGroup: ex.exerciseGroup ?? null,
    sets: ex.loggedSets.map((s) => ({
      setNumber: s.setNumber,
      reps: String(s.reps),
      rir: s.rir ?? null,
      rpe: s.rpe ?? null,
      isWarmup: Boolean(s.isWarmup),
    })),
  }))

  const saved = await prisma.savedWorkout.create({
    data: {
      userId,
      name,
      notes: body.notes?.trim() || null,
      sourceCompletionId,
      workoutData: workoutData as unknown as object,
      exerciseCount: workoutData.length,
      lastUsedAt: completion.completedAt,
    },
  })

  return { ok: true, created: true, savedWorkoutId: saved.id }
}

describe('POST /api/workouts/saved', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()
    const user = await createTestUser()
    userId = user.id
  })

  async function seedFreestyleCompletion(
    options: { isAdHoc?: boolean; status?: string } = {}
  ): Promise<WorkoutCompletion> {
    return prisma.workoutCompletion.create({
      data: {
        userId,
        status: options.status ?? 'completed',
        isAdHoc: options.isAdHoc ?? true,
        name: 'Friday Push',
        startedAt: new Date('2026-05-18T16:00:00Z'),
        completedAt: new Date('2026-05-18T17:00:00Z'),
      },
    })
  }

  it('snapshots exercises + logged sets, dropping weight/timestamps', async () => {
    const def1 = await createTestExerciseDefinition(prisma, { name: 'Bench Press' })
    const def2 = await createTestExerciseDefinition(prisma, { name: 'Row' })
    const completion = await seedFreestyleCompletion()

    const benchEx = await prisma.exercise.create({
      data: {
        name: 'Bench Press',
        exerciseDefinitionId: def1.id,
        order: 1,
        userId,
        isOneOff: true,
        workoutCompletionId: completion.id,
      },
    })
    const rowEx = await prisma.exercise.create({
      data: {
        name: 'Row',
        exerciseDefinitionId: def2.id,
        order: 2,
        userId,
        isOneOff: true,
        workoutCompletionId: completion.id,
        notes: 'neutral grip',
      },
    })

    await prisma.loggedSet.createMany({
      data: [
        {
          setNumber: 1,
          reps: 5,
          weight: 135,
          rir: 2,
          isWarmup: false,
          exerciseId: benchEx.id,
          completionId: completion.id,
          userId,
        },
        {
          setNumber: 2,
          reps: 5,
          weight: 135,
          rir: 1,
          isWarmup: false,
          exerciseId: benchEx.id,
          completionId: completion.id,
          userId,
        },
        {
          setNumber: 1,
          reps: 8,
          weight: 95,
          rpe: 8,
          isWarmup: false,
          exerciseId: rowEx.id,
          completionId: completion.id,
          userId,
        },
      ],
    })

    const res = await simulateCreateSavedWorkout(prisma, userId, {
      sourceCompletionId: completion.id,
      name: 'Push Day',
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.created).toBe(true)

    const saved = await prisma.savedWorkout.findUnique({
      where: { id: res.savedWorkoutId },
    })
    expect(saved?.exerciseCount).toBe(2)
    expect(saved?.lastUsedAt?.toISOString()).toBe(completion.completedAt.toISOString())

    const data = saved?.workoutData as unknown as SavedWorkoutData
    expect(data).toHaveLength(2)
    expect(data[0].name).toBe('Bench Press')
    expect(data[0].sets).toHaveLength(2)
    expect(data[0].sets[0].reps).toBe('5')
    expect(data[0].sets[0].rir).toBe(2)
    // No weight, timestamps, or completion id should leak into the snapshot.
    expect(JSON.stringify(data)).not.toContain('"weight"')
    expect(JSON.stringify(data)).not.toContain(completion.id)
    expect(data[1].notes).toBe('neutral grip')
    expect(data[1].sets[0].rpe).toBe(8)
  })

  it('is idempotent: second call returns existing SavedWorkout', async () => {
    const def = await createTestExerciseDefinition(prisma)
    const completion = await seedFreestyleCompletion()
    await prisma.exercise.create({
      data: {
        name: 'Squat',
        exerciseDefinitionId: def.id,
        order: 1,
        userId,
        isOneOff: true,
        workoutCompletionId: completion.id,
      },
    })

    const first = await simulateCreateSavedWorkout(prisma, userId, {
      sourceCompletionId: completion.id,
      name: 'Leg Day',
    })
    const second = await simulateCreateSavedWorkout(prisma, userId, {
      sourceCompletionId: completion.id,
      name: 'Different Name',
    })
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(second.created).toBe(false)
    expect(second.savedWorkoutId).toBe(first.savedWorkoutId)

    const count = await prisma.savedWorkout.count({
      where: { sourceCompletionId: completion.id },
    })
    expect(count).toBe(1)
  })

  it('rejects non-freestyle completions (isAdHoc=false)', async () => {
    const completion = await seedFreestyleCompletion({ isAdHoc: false })
    const res = await simulateCreateSavedWorkout(prisma, userId, {
      sourceCompletionId: completion.id,
      name: 'Try Save',
    })
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.status).toBe(400)
  })

  it('rejects non-completed completions', async () => {
    const completion = await seedFreestyleCompletion({ status: 'draft' })
    const res = await simulateCreateSavedWorkout(prisma, userId, {
      sourceCompletionId: completion.id,
      name: 'Try Save',
    })
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.status).toBe(400)
  })

  it("returns 404 when the completion belongs to another user", async () => {
    const otherUser = await createTestUser()
    const completion = await prisma.workoutCompletion.create({
      data: {
        userId: otherUser.id,
        status: 'completed',
        isAdHoc: true,
        completedAt: new Date(),
      },
    })

    const res = await simulateCreateSavedWorkout(prisma, userId, {
      sourceCompletionId: completion.id,
      name: 'Try Save',
    })
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.status).toBe(404)
  })
})
