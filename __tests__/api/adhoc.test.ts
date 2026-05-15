import type { PrismaClient, WorkoutCompletion } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import {
  createCompleteTestScenario,
  createTestExerciseDefinition,
  createTestUser,
} from '@/lib/test/factories'

// Simulation helpers — mirror the API logic in app/api/workouts/adhoc/*
// without going through Next.js HTTP. Keep these tight; route handlers
// own auth + rate-limiting + logging, which is out of scope here.

type SimResult<T> =
  | { ok: true; status: 200; data: T }
  | { ok: false; status: 400 | 403 | 404 | 409 | 422; error: string }

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

async function simulateCreateAdHoc(
  prisma: PrismaClient,
  userId: string,
  now: Date = new Date()
): Promise<SimResult<{ completion: WorkoutCompletion }>> {
  const existing = await prisma.workoutCompletion.findFirst({
    where: { userId, status: 'draft', isArchived: false },
  })
  if (existing) {
    return { ok: false, status: 409, error: 'DRAFT_EXISTS' }
  }

  const completion = await prisma.workoutCompletion.create({
    data: {
      workoutId: null,
      userId,
      status: 'draft',
      isAdHoc: true,
      name: `Open Workout — ${DATE_FMT.format(now)}`,
      startedAt: now,
      completedAt: now,
    },
  })
  return { ok: true, status: 200, data: { completion } }
}

async function simulateAddExercise(
  prisma: PrismaClient,
  completionId: string,
  userId: string,
  exerciseDefinitionId: string
): Promise<SimResult<{ exerciseId: string; order: number }>> {
  const completion = await prisma.workoutCompletion.findUnique({
    where: { id: completionId },
  })
  if (!completion) return { ok: false, status: 404, error: 'Workout not found' }
  if (completion.userId !== userId)
    return { ok: false, status: 403, error: 'Unauthorized' }
  if (!completion.isAdHoc)
    return { ok: false, status: 400, error: 'Not an ad-hoc workout' }
  if (completion.status !== 'draft')
    return { ok: false, status: 400, error: 'Cannot add exercises to a completed workout' }

  const exerciseDefinition = await prisma.exerciseDefinition.findUnique({
    where: { id: exerciseDefinitionId },
  })
  if (!exerciseDefinition)
    return { ok: false, status: 404, error: 'Exercise definition not found' }

  const existingExercises = await prisma.exercise.findMany({
    where: { workoutCompletionId: completionId },
    select: { order: true },
  })
  const nextOrder = Math.max(0, ...existingExercises.map((e) => e.order)) + 1

  const exercise = await prisma.exercise.create({
    data: {
      name: exerciseDefinition.name,
      exerciseDefinitionId,
      order: nextOrder,
      workoutId: null,
      isOneOff: true,
      workoutCompletionId: completionId,
      userId,
    },
  })
  return { ok: true, status: 200, data: { exerciseId: exercise.id, order: nextOrder } }
}

async function simulateLogSet(
  prisma: PrismaClient,
  completionId: string,
  userId: string,
  set: {
    exerciseId: string
    setNumber: number
    reps: number
    weight: number
    weightUnit: string
    rpe?: number | null
    rir?: number | null
  }
): Promise<SimResult<{ setId: string }>> {
  const completion = await prisma.workoutCompletion.findUnique({
    where: { id: completionId },
  })
  if (!completion) return { ok: false, status: 404, error: 'Workout not found' }
  if (completion.userId !== userId) return { ok: false, status: 403, error: 'Unauthorized' }
  if (!completion.isAdHoc) return { ok: false, status: 400, error: 'Not an ad-hoc workout' }
  if (completion.status !== 'draft')
    return { ok: false, status: 400, error: 'Cannot log sets on a completed workout' }

  const exercise = await prisma.exercise.findUnique({
    where: { id: set.exerciseId },
    select: { workoutCompletionId: true },
  })
  if (!exercise || exercise.workoutCompletionId !== completionId)
    return { ok: false, status: 422, error: 'Exercise not found in this workout' }

  const loggedSet = await prisma.loggedSet.upsert({
    where: {
      completionId_exerciseId_setNumber: {
        completionId,
        exerciseId: set.exerciseId,
        setNumber: set.setNumber,
      },
    },
    update: {
      reps: set.reps,
      weight: set.weight,
      weightUnit: set.weightUnit,
      rpe: set.rpe ?? null,
      rir: set.rir ?? null,
    },
    create: {
      completionId,
      exerciseId: set.exerciseId,
      userId,
      setNumber: set.setNumber,
      reps: set.reps,
      weight: set.weight,
      weightUnit: set.weightUnit,
      rpe: set.rpe ?? null,
      rir: set.rir ?? null,
    },
  })
  return { ok: true, status: 200, data: { setId: loggedSet.id } }
}

async function simulateComplete(
  prisma: PrismaClient,
  completionId: string,
  userId: string
): Promise<SimResult<{ status: string }>> {
  const completion = await prisma.workoutCompletion.findUnique({
    where: { id: completionId },
  })
  if (!completion) return { ok: false, status: 404, error: 'Workout not found' }
  if (completion.userId !== userId) return { ok: false, status: 403, error: 'Unauthorized' }
  if (!completion.isAdHoc) return { ok: false, status: 400, error: 'Not an ad-hoc workout' }
  if (completion.status === 'completed')
    return { ok: false, status: 400, error: 'Workout already completed' }

  const setCount = await prisma.loggedSet.count({ where: { completionId } })
  if (setCount === 0)
    return { ok: false, status: 400, error: 'Log at least one set before completing.' }

  const updated = await prisma.workoutCompletion.update({
    where: { id: completionId },
    data: { status: 'completed', completedAt: new Date() },
  })
  return { ok: true, status: 200, data: { status: updated.status } }
}

describe('Ad-hoc Workout API', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  describe('Full lifecycle', () => {
    it('creates, adds exercises, logs sets, and completes', async () => {
      const exerciseDef = await createTestExerciseDefinition(prisma, {
        name: 'Ad-hoc Bench Press',
      })

      // Create
      const created = await simulateCreateAdHoc(prisma, userId)
      expect(created.ok).toBe(true)
      if (!created.ok) return
      const completionId = created.data.completion.id

      expect(created.data.completion.workoutId).toBeNull()
      expect(created.data.completion.isAdHoc).toBe(true)
      expect(created.data.completion.name).toMatch(/^Open Workout — /)
      expect(created.data.completion.status).toBe('draft')

      // Add exercise
      const added = await simulateAddExercise(prisma, completionId, userId, exerciseDef.id)
      expect(added.ok).toBe(true)
      if (!added.ok) return
      const exerciseId = added.data.exerciseId

      const exerciseRow = await prisma.exercise.findUnique({ where: { id: exerciseId } })
      expect(exerciseRow?.workoutId).toBeNull()
      expect(exerciseRow?.isOneOff).toBe(true)
      expect(exerciseRow?.workoutCompletionId).toBe(completionId)

      // Log three sets
      for (let i = 1; i <= 3; i++) {
        const result = await simulateLogSet(prisma, completionId, userId, {
          exerciseId,
          setNumber: i,
          reps: 5,
          weight: 135 + i * 5,
          weightUnit: 'lbs',
          rir: 2,
        })
        expect(result.ok).toBe(true)
      }

      // Complete
      const completed = await simulateComplete(prisma, completionId, userId)
      expect(completed.ok).toBe(true)
      if (!completed.ok) return
      expect(completed.data.status).toBe('completed')

      const finalCompletion = await prisma.workoutCompletion.findUnique({
        where: { id: completionId },
        include: { loggedSets: true, exercises: true },
      })
      expect(finalCompletion?.status).toBe('completed')
      expect(finalCompletion?.loggedSets).toHaveLength(3)
      expect(finalCompletion?.exercises).toHaveLength(1)
    })

    it('supports multiple exercises in one ad-hoc session', async () => {
      const def1 = await createTestExerciseDefinition(prisma, { name: 'Squat' })
      const def2 = await createTestExerciseDefinition(prisma, { name: 'Deadlift' })

      const created = await simulateCreateAdHoc(prisma, userId)
      expect(created.ok).toBe(true)
      if (!created.ok) return
      const completionId = created.data.completion.id

      const added1 = await simulateAddExercise(prisma, completionId, userId, def1.id)
      const added2 = await simulateAddExercise(prisma, completionId, userId, def2.id)
      expect(added1.ok && added2.ok).toBe(true)
      if (!added1.ok || !added2.ok) return

      expect(added1.data.order).toBe(1)
      expect(added2.data.order).toBe(2)
    })
  })

  describe('Validation + auth', () => {
    it('blocks creating a new ad-hoc when a draft already exists', async () => {
      const first = await simulateCreateAdHoc(prisma, userId)
      expect(first.ok).toBe(true)

      const second = await simulateCreateAdHoc(prisma, userId)
      expect(second.ok).toBe(false)
      if (second.ok) return
      expect(second.status).toBe(409)
      expect(second.error).toBe('DRAFT_EXISTS')
    })

    it('blocks creating an ad-hoc when a programmed draft exists', async () => {
      // Build a programmed scenario with a draft completion
      await createCompleteTestScenario(prisma, userId, { status: 'draft' })

      const result = await simulateCreateAdHoc(prisma, userId)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.status).toBe(409)
    })

    it("rejects adding an exercise to another user's ad-hoc", async () => {
      const otherUser = await createTestUser()
      const created = await simulateCreateAdHoc(prisma, otherUser.id)
      expect(created.ok).toBe(true)
      if (!created.ok) return

      const exerciseDef = await createTestExerciseDefinition(prisma, { name: 'Curl' })
      const result = await simulateAddExercise(
        prisma,
        created.data.completion.id,
        userId,
        exerciseDef.id
      )
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.status).toBe(403)
    })

    it('rejects logging sets after completion', async () => {
      const exerciseDef = await createTestExerciseDefinition(prisma, { name: 'Row' })
      const created = await simulateCreateAdHoc(prisma, userId)
      expect(created.ok).toBe(true)
      if (!created.ok) return
      const completionId = created.data.completion.id

      const added = await simulateAddExercise(prisma, completionId, userId, exerciseDef.id)
      expect(added.ok).toBe(true)
      if (!added.ok) return

      await simulateLogSet(prisma, completionId, userId, {
        exerciseId: added.data.exerciseId,
        setNumber: 1,
        reps: 8,
        weight: 100,
        weightUnit: 'lbs',
      })

      const completed = await simulateComplete(prisma, completionId, userId)
      expect(completed.ok).toBe(true)

      const secondAttempt = await simulateLogSet(prisma, completionId, userId, {
        exerciseId: added.data.exerciseId,
        setNumber: 2,
        reps: 8,
        weight: 105,
        weightUnit: 'lbs',
      })
      expect(secondAttempt.ok).toBe(false)
      if (secondAttempt.ok) return
      expect(secondAttempt.status).toBe(400)
    })

    it('rejects completing with no logged sets', async () => {
      const created = await simulateCreateAdHoc(prisma, userId)
      expect(created.ok).toBe(true)
      if (!created.ok) return

      const result = await simulateComplete(prisma, created.data.completion.id, userId)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.status).toBe(400)
      expect(result.error).toContain('Log at least one set')
    })
  })

  describe('History + active-draft surfacing', () => {
    it('lists ad-hoc completions alongside programmed completions', async () => {
      // Programmed completion
      const scenario = await createCompleteTestScenario(prisma, userId, {
        loggedSetCount: 2,
        status: 'completed',
      })
      expect(scenario.workout).toBeDefined()

      // Ad-hoc completion
      const exerciseDef = await createTestExerciseDefinition(prisma, { name: 'Pulldown' })
      const created = await simulateCreateAdHoc(prisma, userId)
      if (!created.ok) throw new Error('Failed to create ad-hoc')
      const adHocId = created.data.completion.id
      const added = await simulateAddExercise(prisma, adHocId, userId, exerciseDef.id)
      if (!added.ok) throw new Error('Failed to add exercise')
      await simulateLogSet(prisma, adHocId, userId, {
        exerciseId: added.data.exerciseId,
        setNumber: 1,
        reps: 10,
        weight: 80,
        weightUnit: 'lbs',
      })
      await simulateComplete(prisma, adHocId, userId)

      // Mirror /api/workouts/history select shape — must include null workout
      const completions = await prisma.workoutCompletion.findMany({
        where: { userId, status: { in: ['completed', 'draft'] } },
        orderBy: { completedAt: 'desc' },
        select: {
          id: true,
          status: true,
          isAdHoc: true,
          name: true,
          workout: {
            select: { id: true, name: true, week: { select: { program: { select: { name: true } } } } },
          },
        },
      })

      expect(completions).toHaveLength(2)
      const adHocRow = completions.find((c) => c.id === adHocId)
      expect(adHocRow).toBeDefined()
      expect(adHocRow?.isAdHoc).toBe(true)
      expect(adHocRow?.workout).toBeNull()
      expect(adHocRow?.name).toMatch(/^Open Workout — /)

      const programmedRow = completions.find((c) => c.id !== adHocId)
      expect(programmedRow?.isAdHoc).toBe(false)
      expect(programmedRow?.workout).not.toBeNull()
    })

    it('returns ad-hoc draft from active-draft lookup with name fallback', async () => {
      const created = await simulateCreateAdHoc(prisma, userId)
      expect(created.ok).toBe(true)
      if (!created.ok) return

      // Mirror /api/workouts/active-draft logic
      const draft = await prisma.workoutCompletion.findFirst({
        where: { userId, status: 'draft', isArchived: false },
        orderBy: { completedAt: 'desc' },
        include: { workout: { select: { name: true } } },
      })

      expect(draft).not.toBeNull()
      expect(draft?.isAdHoc).toBe(true)
      expect(draft?.workoutId).toBeNull()
      expect(draft?.workout).toBeNull()
      const resolvedName = draft?.workout?.name ?? draft?.name ?? 'Open Workout'
      expect(resolvedName).toMatch(/^Open Workout — /)
    })
  })
})
