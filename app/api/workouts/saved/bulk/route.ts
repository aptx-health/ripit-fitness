import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, destructiveOpLimiter, workoutActionLimiter } from '@/lib/rate-limit'
import {
  MAX_TAGS_PER_WORKOUT,
  normaliseTag,
  STARTER_TAGS,
  TAG_LIMIT_MESSAGES,
  tagLimitBroken,
} from '@/lib/saved-workouts/tags'

const MAX_BULK = 100

const ACTIONS = ['archive', 'undoArchive', 'tag', 'delete'] as const
type Action = (typeof ACTIONS)[number]


type Previous = Record<string, { pinnedAt: string | null; dismissedAt: string | null }>

const bad = (error: string) => NextResponse.json({ error }, { status: 400 })

/** 1 to MAX_BULK strings, repeats dropped; null otherwise. */
function idList(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_BULK) return null
  if (raw.some((id) => typeof id !== 'string' || !id)) return null
  return [...new Set(raw as string[])]
}

/** An ISO date (no later than now) or null, as archive returned them for Undo. */
function validDate(value: unknown, now: Date): boolean {
  if (value === null) return true
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date <= now
}

/**
 * POST /api/workouts/saved/bulk (workout library slice 4: select mode)
 *   { action: 'archive', ids }          as the row's Archive: archivedAt now, unpinned.
 *                                        Answers { ids, previous } for Undo.
 *   { action: 'undoArchive', previous } puts pinnedAt and dismissedAt back.
 *   { action: 'tag', ids, tag }         adds the tag, keeping the others; a workout
 *                                        at 8 tags is skipped ({ ids, skipped }).
 *   { action: 'delete', ids }           deletes; sessions done from them stay.
 * `ids` in each answer are the workouts actually changed. Another user's or an
 * unknown id is ignored. At most MAX_BULK ids. Like the single-row routes,
 * archive and tag aren't edits, so updatedAt stays (raw SQL, which skips
 * @updatedAt). A fixed number of queries whatever the number of ids.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { action?: unknown; ids?: unknown; tag?: unknown; previous?: unknown }
    try {
      body = await request.json()
    } catch {
      return bad('Invalid JSON body')
    }
    const action = body?.action as Action
    if (!ACTIONS.includes(action)) return bad(`action must be one of ${ACTIONS.join(', ')}`)

    const limited = await checkRateLimit(action === 'delete' ? destructiveOpLimiter : workoutActionLimiter, user.id)
    if (limited) return limited

    if (action === 'undoArchive') return await undoArchive(user.id, body.previous)

    const ids = idList(body.ids)
    if (!ids) return bad(`ids must be an array of 1 to ${MAX_BULK} ids`)

    if (action === 'archive') return await archive(user.id, ids)
    if (action === 'tag') return await tag(user.id, ids, body.tag)
    return await remove(user.id, ids)
  } catch (error) {
    logger.error({ error, context: 'saved-workouts-bulk' }, 'Failed to change saved workouts in bulk')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** The user's unarchived ones: archivedAt now, pin cleared, dismissedAt untouched. */
async function archive(userId: string, ids: string[]) {
  const rows = await prisma.savedWorkout.findMany({
    where: { id: { in: ids }, userId, archivedAt: null },
    select: { id: true, pinnedAt: true, dismissedAt: true },
  })
  const changed = ids.filter((id) => rows.some((r) => r.id === id))
  if (changed.length) {
    await prisma.$executeRaw`
      UPDATE "SavedWorkout" SET "archivedAt" = (now() AT TIME ZONE 'UTC'), "pinnedAt" = NULL
      WHERE "id" = ANY(${changed}) AND "userId" = ${userId} AND "archivedAt" IS NULL`
  }
  const previous = Object.fromEntries(rows.map((r) => [r.id, { pinnedAt: r.pinnedAt, dismissedAt: r.dismissedAt }]))
  logger.info({ userId, count: changed.length }, 'Saved workouts archived in bulk')
  return NextResponse.json({ ids: changed, previous })
}

/** Undo a bulk archive: each of the user's archived ids gets its pin and dismissal back. */
async function undoArchive(userId: string, raw: unknown) {
  const now = new Date()
  const previous = raw as Previous
  const keys = raw && typeof raw === 'object' && !Array.isArray(raw) ? idList(Object.keys(raw)) : null
  if (!keys || keys.some((id) => !previous[id] || typeof previous[id] !== 'object' || !validDate(previous[id].pinnedAt, now) || !validDate(previous[id].dismissedAt, now))) {
    return bad(`previous must map 1 to ${MAX_BULK} ids to { pinnedAt, dismissedAt } (ISO dates or null)`)
  }
  // One statement for every id: the values go in as JSON rows.
  const values = JSON.stringify(keys.map((id) => ({ id, ...previous[id] })))
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "SavedWorkout" AS w
    SET "archivedAt" = NULL,
        "pinnedAt" = (v."pinnedAt" AT TIME ZONE 'UTC'),
        "dismissedAt" = (v."dismissedAt" AT TIME ZONE 'UTC')
    FROM jsonb_to_recordset(${values}::jsonb) AS v(id text, "pinnedAt" timestamptz, "dismissedAt" timestamptz)
    WHERE w."id" = v.id AND w."userId" = ${userId} AND w."archivedAt" IS NOT NULL
    RETURNING w."id"`
  const restored = new Set(rows.map((r) => r.id))
  logger.info({ userId, count: restored.size }, 'Saved workouts bulk archive undone')
  return NextResponse.json({ ids: keys.filter((id) => restored.has(id)) })
}

/** Add one tag (tidied and matched as in slice 2) to each of the user's ids. */
async function tag(userId: string, ids: string[], raw: unknown) {
  if (typeof raw !== 'string') return bad('tag must be a string')
  const userTags = (
    await prisma.$queryRaw<{ tag: string }[]>`
      SELECT DISTINCT unnest("tags") AS tag FROM "SavedWorkout" WHERE "userId" = ${userId}`
  ).map((r) => r.tag)
  const name = normaliseTag(raw, [...userTags, ...STARTER_TAGS])
  if (!name) return bad('tag cannot be empty')
  const limit = tagLimitBroken([name], userTags)
  if (limit) return NextResponse.json({ error: TAG_LIMIT_MESSAGES[limit], limit }, { status: 400 })

  const rows = await prisma.savedWorkout.findMany({ where: { id: { in: ids }, userId }, select: { id: true, tags: true } })
  const lower = name.toLowerCase()
  const changed: string[] = []
  const skipped: string[] = []
  for (const id of ids) {
    const row = rows.find((r) => r.id === id)
    if (!row || row.tags.some((t) => t.toLowerCase() === lower)) continue
    if (row.tags.length >= MAX_TAGS_PER_WORKOUT) skipped.push(id)
    else changed.push(id)
  }
  // The WHERE checks the 8 and the duplicate again, so a request racing this
  // one can't leave a workout with 9 tags or the same tag twice.
  const tagged = changed.length
    ? new Set(
        (
          await prisma.$queryRaw<{ id: string }[]>`
            UPDATE "SavedWorkout" SET "tags" = array_append("tags", ${name})
            WHERE "id" = ANY(${changed}) AND "userId" = ${userId}
              AND cardinality("tags") < ${MAX_TAGS_PER_WORKOUT}
              AND NOT EXISTS (SELECT 1 FROM unnest("tags") AS t WHERE lower(t) = lower(${name}))
            RETURNING "id"`
        ).map((r) => r.id)
      )
    : new Set<string>()
  const added = changed.filter((id) => tagged.has(id))
  logger.info({ userId, count: added.length, skipped: skipped.length }, 'Saved workouts tagged in bulk')
  return NextResponse.json({ ids: added, skipped })
}

/** Delete the user's ids. WorkoutCompletion.savedWorkoutId is a plain column, so sessions stay. */
async function remove(userId: string, ids: string[]) {
  const rows = await prisma.savedWorkout.findMany({ where: { id: { in: ids }, userId }, select: { id: true } })
  const changed = ids.filter((id) => rows.some((r) => r.id === id))
  if (changed.length) await prisma.savedWorkout.deleteMany({ where: { id: { in: changed }, userId } })
  logger.info({ userId, count: changed.length }, 'Saved workouts deleted in bulk')
  return NextResponse.json({ ids: changed })
}
