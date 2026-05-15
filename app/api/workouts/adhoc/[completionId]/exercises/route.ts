import type { Prisma } from '@prisma/client'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { findAdHocCompletion } from '@/lib/db/adhoc-completion'
import { logger } from '@/lib/logger'
import { checkRateLimit, workoutActionLimiter } from '@/lib/rate-limit'

type AddAdHocExerciseRequest = {
  exerciseDefinitionId: string
  notes?: string
}

const exerciseInclude = {
  prescribedSets: { orderBy: { setNumber: 'asc' as const } },
  exerciseDefinition: {
    select: {
      id: true,
      name: true,
      primaryFAUs: true,
      secondaryFAUs: true,
      equipment: true,
      instructions: true,
    },
  },
} satisfies Prisma.ExerciseInclude

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ completionId: string }> }
) {
  try {
    const { completionId } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(workoutActionLimiter, user.id)
    if (limited) return limited

    const body = (await request.json()) as AddAdHocExerciseRequest
    const { exerciseDefinitionId, notes } = body

    if (!exerciseDefinitionId) {
      return NextResponse.json(
        { error: 'Exercise definition ID is required' },
        { status: 400 }
      )
    }

    const lookup = await findAdHocCompletion(completionId, user.id)
    if (!lookup.ok) {
      return NextResponse.json({ error: lookup.error }, { status: lookup.status })
    }

    if (lookup.completion.status !== 'draft') {
      return NextResponse.json(
        { error: 'Cannot add exercises to a completed workout' },
        { status: 400 }
      )
    }

    const exerciseDefinition = await prisma.exerciseDefinition.findUnique({
      where: { id: exerciseDefinitionId },
      select: { id: true, name: true },
    })

    if (!exerciseDefinition) {
      return NextResponse.json(
        { error: 'Exercise definition not found' },
        { status: 404 }
      )
    }

    // Order is unique-within-completion; compute next from existing rows.
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
        notes: notes || null,
        userId: user.id,
      },
      include: exerciseInclude,
    })

    return NextResponse.json({ success: true, exercise })
  } catch (err) {
    logger.error(
      { error: err, context: 'adhoc-exercise-add' },
      'Failed to add exercise to ad-hoc workout'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
