import type { Prisma } from '@prisma/client'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { findAdHocCompletion } from '@/lib/db/adhoc-completion'
import { exerciseDefinitionSelectForLogger } from '@/lib/db/selects'
import { logger } from '@/lib/logger'
import { checkRateLimit, workoutActionLimiter } from '@/lib/rate-limit'

type AddAdHocExerciseRequest = {
  exerciseDefinitionId?: string
  exerciseDefinitionIds?: string[]
  notes?: string
}

const exerciseInclude = {
  prescribedSets: { orderBy: { setNumber: 'asc' as const } },
  exerciseDefinition: { select: exerciseDefinitionSelectForLogger },
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
    const { exerciseDefinitionId, exerciseDefinitionIds, notes } = body

    const ids = exerciseDefinitionIds && exerciseDefinitionIds.length > 0
      ? exerciseDefinitionIds
      : exerciseDefinitionId
        ? [exerciseDefinitionId]
        : []

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'Exercise definition ID is required' },
        { status: 400 }
      )
    }

    if (ids.length > 20) {
      return NextResponse.json(
        { error: 'Cannot add more than 20 exercises at once' },
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

    const definitions = await prisma.exerciseDefinition.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    })

    if (definitions.length !== ids.length) {
      return NextResponse.json(
        { error: 'One or more exercise definitions not found' },
        { status: 404 }
      )
    }

    // Preserve client-supplied insertion order.
    const definitionsById = new Map(definitions.map((d) => [d.id, d]))
    const ordered = ids.map((id) => definitionsById.get(id)!)

    // Order is unique-within-completion; compute next from existing rows.
    const orderAgg = await prisma.exercise.aggregate({
      where: { workoutCompletionId: completionId },
      _max: { order: true },
    })
    const baseOrder = orderAgg._max.order ?? 0

    // Single-roundtrip insert + a follow-up findMany to hydrate the include.
    // Cuts N+1 inserts inside $transaction down to two queries.
    const createdRows = await prisma.exercise.createManyAndReturn({
      data: ordered.map((def, idx) => ({
        name: def.name,
        exerciseDefinitionId: def.id,
        order: baseOrder + idx + 1,
        workoutId: null,
        isOneOff: true,
        workoutCompletionId: completionId,
        notes: notes || null,
        userId: user.id,
      })),
      select: { id: true, order: true },
    })

    const created = await prisma.exercise.findMany({
      where: { id: { in: createdRows.map((r) => r.id) } },
      include: exerciseInclude,
      orderBy: { order: 'asc' },
    })

    // Backwards-compatible response: keep `exercise` for single-add callers,
    // always include `exercises` array for batch callers.
    return NextResponse.json({
      success: true,
      exercise: created[0],
      exercises: created,
    })
  } catch (err) {
    logger.error(
      { error: err, context: 'adhoc-exercise-add' },
      'Failed to add exercise to ad-hoc workout'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
