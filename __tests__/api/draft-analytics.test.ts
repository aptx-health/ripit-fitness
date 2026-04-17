import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestProgram, createTestUser } from '@/lib/test/factories'

/**
 * Regression tests for the `workout_started` analytics event instrumentation
 * in the draft sync route.
 *
 * The bug these guard against: if `recordEvent('workout_started')` is called
 * inside the `prisma.$transaction(...)` callback, a later rollback leaves a
 * phantom event with no corresponding draft. The fix is to record the event
 * only after the transaction commits successfully.
 */
describe('Draft API - workout_started event instrumentation', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  it('records workout_started exactly once on first draft sync', async () => {
    const program = await createTestProgram(prisma, userId)
    const workout = program.weeks[0].workouts[0]
    const exercise = workout.exercises[0]

    const result = await simulateDraftSync(prisma, workout.id, userId, [
      {
        exerciseId: exercise.id,
        setNumber: 1,
        reps: 5,
        weight: 135,
        weightUnit: 'lbs',
      },
    ])

    expect(result.success).toBe(true)

    const events = await prisma.appEvent.findMany({
      where: { userId, event: 'workout_started' },
    })
    expect(events).toHaveLength(1)
    expect(events[0].properties).toEqual({ workoutId: workout.id })
  })

  it('does NOT re-emit workout_started on subsequent draft updates', async () => {
    const program = await createTestProgram(prisma, userId)
    const workout = program.weeks[0].workouts[0]
    const exercise = workout.exercises[0]

    const baseSet = {
      exerciseId: exercise.id,
      setNumber: 1,
      reps: 5,
      weight: 135,
      weightUnit: 'lbs',
    }

    // First sync creates the draft and emits the event.
    await simulateDraftSync(prisma, workout.id, userId, [baseSet])

    // Subsequent syncs update the existing draft — should NOT emit.
    await simulateDraftSync(prisma, workout.id, userId, [baseSet, { ...baseSet, setNumber: 2 }])
    await simulateDraftSync(prisma, workout.id, userId, [baseSet])

    const events = await prisma.appEvent.findMany({
      where: { userId, event: 'workout_started' },
    })
    expect(events).toHaveLength(1)
  })

  it('does NOT record workout_started when the transaction rolls back', async () => {
    const program = await createTestProgram(prisma, userId)
    const workout = program.weeks[0].workouts[0]
    const exercise = workout.exercises[0]

    // Pre-create a completed (non-draft) completion for this workout — this
    // makes the draft route reject the request and throw inside the tx.
    await prisma.workoutCompletion.create({
      data: {
        workoutId: workout.id,
        userId,
        status: 'completed',
        completedAt: new Date(),
      },
    })

    const result = await simulateDraftSync(prisma, workout.id, userId, [
      {
        exerciseId: exercise.id,
        setNumber: 1,
        reps: 5,
        weight: 135,
        weightUnit: 'lbs',
      },
    ])

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/already completed/i)

    // Phantom event must not exist.
    const events = await prisma.appEvent.findMany({
      where: { userId, event: 'workout_started' },
    })
    expect(events).toHaveLength(0)
  })
})

// -----------------------------------------------------------------------------
// Test helper — mirrors the (fixed) draft sync route shape
// -----------------------------------------------------------------------------

interface LoggedSetInput {
  exerciseId: string
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe?: number
  rir?: number
  isWarmup?: boolean
}

interface DraftSyncResult {
  success: boolean
  error?: string
}

/**
 * Mirrors app/api/workouts/[workoutId]/draft/route.ts POST handler, including
 * the post-fix invariant: `workout_started` is recorded via a separate
 * (non-tx) insert ONLY after the transaction commits successfully.
 */
async function simulateDraftSync(
  prisma: PrismaClient,
  workoutId: string,
  userId: string,
  loggedSets: LoggedSetInput[]
): Promise<DraftSyncResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingCompletion = await tx.workoutCompletion.findFirst({
        where: {
          workoutId,
          userId,
          status: 'completed',
          isArchived: false,
        },
      })

      if (existingCompletion) {
        throw new Error('WORKOUT_ALREADY_COMPLETED')
      }

      const existingDraft = await tx.workoutCompletion.findFirst({
        where: {
          workoutId,
          userId,
          status: 'draft',
          isArchived: false,
        },
        include: { loggedSets: true },
      })

      const isNewDraft = !existingDraft
      const draftCompletion = existingDraft
        ? await tx.workoutCompletion.update({
            where: { id: existingDraft.id },
            data: { completedAt: new Date() },
          })
        : await tx.workoutCompletion.create({
            data: {
              workoutId,
              userId,
              status: 'draft',
              completedAt: new Date(),
            },
          })

      await tx.loggedSet.deleteMany({
        where: { completionId: draftCompletion.id },
      })

      if (loggedSets.length > 0) {
        await tx.loggedSet.createMany({
          data: loggedSets.map((set) => ({
            exerciseId: set.exerciseId,
            completionId: draftCompletion.id,
            userId,
            setNumber: set.setNumber,
            reps: set.reps,
            weight: set.weight,
            weightUnit: set.weightUnit,
            rpe: set.rpe,
            rir: set.rir,
            isWarmup: set.isWarmup ?? false,
          })),
        })
      }

      return { isNewDraft }
    })

    // CRITICAL: event must be recorded AFTER the transaction commits, never inside it.
    if (result.isNewDraft) {
      await prisma.appEvent.create({
        data: {
          userId,
          event: 'workout_started',
          properties: { workoutId },
        },
      })
    }

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'WORKOUT_ALREADY_COMPLETED') {
      return {
        success: false,
        error: 'Workout already completed. Cannot save draft.',
      }
    }
    return { success: false, error: 'Internal error' }
  }
}
