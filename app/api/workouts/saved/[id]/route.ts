import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  checkRateLimit,
  destructiveOpLimiter,
  workoutActionLimiter,
} from '@/lib/rate-limit'

const NAME_MAX_LENGTH = 100
const NOTES_MAX_LENGTH = 2000

/**
 * GET /api/workouts/saved/[id]
 * Returns a single saved workout (including workoutData) for the current user.
 * Used by the detail/preview view on /workouts/saved.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const saved = await prisma.savedWorkout.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        name: true,
        notes: true,
        exerciseCount: true,
        workoutData: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!saved) {
      return NextResponse.json({ error: 'Saved workout not found' }, { status: 404 })
    }

    if (saved.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId: _userId, ...rest } = saved
    return NextResponse.json({ saved: rest })
  } catch (error) {
    logger.error(
      { error, context: 'saved-workout-get' },
      'Failed to fetch saved workout'
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/workouts/saved/[id]
 * Updates metadata (name, notes) on a saved workout owned by the current user.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(workoutActionLimiter, user.id)
    if (limited) return limited

    let body: { name?: unknown; notes?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const updates: { name?: string; notes?: string | null } = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string') {
        return NextResponse.json({ error: 'name must be a string' }, { status: 400 })
      }
      const trimmed = body.name.trim()
      if (trimmed.length === 0) {
        return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
      }
      if (trimmed.length > NAME_MAX_LENGTH) {
        return NextResponse.json(
          { error: `name must be ${NAME_MAX_LENGTH} characters or fewer` },
          { status: 400 }
        )
      }
      updates.name = trimmed
    }

    if (body.notes !== undefined) {
      if (body.notes === null) {
        updates.notes = null
      } else if (typeof body.notes !== 'string') {
        return NextResponse.json({ error: 'notes must be a string or null' }, { status: 400 })
      } else {
        if (body.notes.length > NOTES_MAX_LENGTH) {
          return NextResponse.json(
            { error: `notes must be ${NOTES_MAX_LENGTH} characters or fewer` },
            { status: 400 }
          )
        }
        const trimmed = body.notes.trim()
        updates.notes = trimmed.length === 0 ? null : trimmed
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No updatable fields provided' },
        { status: 400 }
      )
    }

    const existing = await prisma.savedWorkout.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Saved workout not found' }, { status: 404 })
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.savedWorkout.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        name: true,
        notes: true,
        exerciseCount: true,
        lastUsedAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ saved: updated })
  } catch (error) {
    logger.error(
      { error, context: 'saved-workout-patch' },
      'Failed to update saved workout'
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/workouts/saved/[id]
 * Removes a saved workout owned by the current user.
 * No cascade concern in v1: WorkoutCompletion references this via a nullable FK.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(destructiveOpLimiter, user.id)
    if (limited) return limited

    const existing = await prisma.savedWorkout.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Saved workout not found' }, { status: 404 })
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.savedWorkout.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(
      { error, context: 'saved-workout-delete' },
      'Failed to delete saved workout'
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
