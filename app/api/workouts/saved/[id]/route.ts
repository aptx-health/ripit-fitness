import type { Prisma } from '@prisma/client'
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

    // Another user's workout is a 404 too, so ids can't be probed.
    if (!saved || saved.userId !== user.id) {
      return NextResponse.json({ error: 'Saved workout not found' }, { status: 404 })
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
 * Updates metadata (name, notes) and the pin on a saved workout owned by the
 * current user. `pinned: true` keeps an existing pinnedAt, so pinning again
 * doesn't move it; `false` clears it. A pin-only change leaves updatedAt as it
 * was. Another user's workout is a 404, the same as an unknown id.
 *
 * `archived` is sent on its own (see archive below).
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

    let body: { name?: unknown; notes?: unknown; pinned?: unknown; archived?: unknown; dismissed?: unknown; undo?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Awaited so a database failure lands in this catch (500, logged).
    if (body && typeof body === 'object' && 'archived' in body) return await archive(id, user.id, body)

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

    if (body.pinned !== undefined && typeof body.pinned !== 'boolean') {
      return NextResponse.json({ error: 'pinned must be a boolean' }, { status: 400 })
    }
    const pinned = body.pinned as boolean | undefined

    if (Object.keys(updates).length === 0 && pinned === undefined) {
      return NextResponse.json(
        { error: 'No updatable fields provided' },
        { status: 400 }
      )
    }

    const existing = await prisma.savedWorkout.findUnique({
      where: { id },
      select: { id: true, userId: true, pinnedAt: true, updatedAt: true },
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Saved workout not found' }, { status: 404 })
    }

    const pinnedAt = pinned === undefined ? undefined : pinned ? (existing.pinnedAt ?? new Date()) : null
    const pinOnly = Object.keys(updates).length === 0

    const updated = await prisma.savedWorkout.update({
      where: { id },
      data: {
        ...updates,
        ...(pinnedAt !== undefined && { pinnedAt }),
        // Pinning isn't an edit: keep updatedAt so nothing reads it as one.
        ...(pinOnly && { updatedAt: existing.updatedAt }),
      },
      select: LIST_FIELDS,
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

const LIST_FIELDS = {
  id: true,
  name: true,
  notes: true,
  exerciseCount: true,
  lastUsedAt: true,
  pinnedAt: true,
  createdAt: true,
  origin: true,
  archivedAt: true,
  dismissedAt: true,
} satisfies Prisma.SavedWorkoutSelect

/** An ISO date or null, as Undo sends back what archive returned. */
function dateOrNull(value: unknown): Date | null | undefined {
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * Archive or restore, by hand only.
 *   { archived: true, dismissed?: true }  archives and unpins; Dismiss (from the
 *     New group) also sets dismissedAt. The response's `previous` is what Undo
 *     sends back.
 *   { archived: false, undo: { pinnedAt, dismissedAt } }  Undo: puts the pin
 *     and dismissedAt back as they were, so a dismissed AI workout returns to New.
 *     Only on an archived workout, and pinnedAt no later than now; otherwise 400.
 *   { archived: false }  Restore: never pinned again, and dismissedAt is set so
 *     the workout goes to Recent or Older by its date, never New.
 * Archiving isn't an edit: updatedAt stays, so reverting an agent's create still works.
 */
async function archive(id: string, userId: string, body: { archived?: unknown; dismissed?: unknown; undo?: unknown }) {
  const { archived, dismissed, undo } = body
  if (typeof archived !== 'boolean') {
    return NextResponse.json({ error: 'archived must be a boolean' }, { status: 400 })
  }
  if (dismissed !== undefined && (dismissed !== true || !archived)) {
    return NextResponse.json({ error: 'dismissed must be true, with archived: true' }, { status: 400 })
  }
  let undone: { pinnedAt: Date | null; dismissedAt: Date | null } | undefined
  if (undo !== undefined) {
    const u = undo as { pinnedAt?: unknown; dismissedAt?: unknown } | null
    const pinnedAt = dateOrNull(u?.pinnedAt)
    const dismissedAt = dateOrNull(u?.dismissedAt)
    if (archived || !u || typeof u !== 'object' || pinnedAt === undefined || dismissedAt === undefined) {
      return NextResponse.json(
        { error: 'undo must be { pinnedAt, dismissedAt } (ISO dates or null), with archived: false' },
        { status: 400 }
      )
    }
    undone = { pinnedAt, dismissedAt }
  }

  const existing = await prisma.savedWorkout.findUnique({
    where: { id },
    select: { userId: true, pinnedAt: true, dismissedAt: true, archivedAt: true, updatedAt: true },
  })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Saved workout not found' }, { status: 404 })
  }

  const now = new Date()
  // Undo only puts back what archive took: the row must be archived, and the
  // pin can't be dated after now (a far-future pinnedAt would sort first forever).
  if (undone && (!existing.archivedAt || (undone.pinnedAt && undone.pinnedAt > now))) {
    return NextResponse.json(
      { error: 'undo is only for an archived workout, with a pinnedAt no later than now' },
      { status: 400 }
    )
  }
  const data = archived
    ? { archivedAt: now, pinnedAt: null, ...(dismissed && { dismissedAt: now }) }
    : undone
      ? { archivedAt: null, ...undone }
      : { archivedAt: null, dismissedAt: existing.dismissedAt ?? now }

  const updated = await prisma.savedWorkout.update({
    where: { id },
    data: { ...data, updatedAt: existing.updatedAt },
    select: LIST_FIELDS,
  })

  logger.info({ userId, savedWorkoutId: id, archived, dismissed: !!dismissed, undo: !!undone }, 'Saved workout archive changed')

  return NextResponse.json({
    saved: updated,
    ...(archived && { previous: { pinnedAt: existing.pinnedAt, dismissedAt: existing.dismissedAt } }),
  })
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

    // Another user's workout is a 404 too, so ids can't be probed.
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Saved workout not found' }, { status: 404 })
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
