import { Prisma, type PrismaClient } from '@prisma/client'
import { ANCHOR_PATTERNS } from '@/lib/exercises/anchor-patterns'
import { LBS_PER_KG, type WeekLift, type WeightUnit } from '@/lib/insights/progress-records'

/**
 * The Progress tab's pinned lifts (S3): the exercise definitions a user tracks
 * on the Lifts tab, in their order. Until the user saves pins, the pins are
 * their anchor lifts (UserTrainingProfile.targetMovements); once saved, the
 * saved list is the answer, empty included.
 */

export const MAX_PINS = 12

/** The best set of a pinned lift's latest session before the week end, in the user's unit. */
export interface LastSet {
  weight: number
  reps: number
  /** Null for bodyweight. */
  e1rm: number | null
  completedAt: Date
}

export interface PinnedLift {
  exerciseDefinitionId: string
  name: string
  /** The lift's entry in the report's lifts; null when it had no working set that week. */
  lift: WeekLift | null
  /** Only when `lift` is null; null when it has never been done before the week end. */
  last: LastSet | null
}

type PinsDb = Pick<PrismaClient, 'userSettings' | 'pinnedExercise' | 'userTrainingProfile'>

/** The user's pinned exercise definition ids, in order. Three queries, whatever the count. */
export async function resolvePins(db: PinsDb, userId: string): Promise<string[]> {
  const [settings, saved, profile] = await Promise.all([
    db.userSettings.findUnique({ where: { userId }, select: { pinnedLiftsCustomized: true } }),
    db.pinnedExercise.findMany({ where: { userId }, select: { exerciseDefinitionId: true }, orderBy: { position: 'asc' } }),
    db.userTrainingProfile.findUnique({ where: { userId }, select: { targetMovements: true } }),
  ])
  if (settings?.pinnedLiftsCustomized) return saved.map((p) => p.exerciseDefinitionId)
  return anchorPins(profile?.targetMovements)
}

/** Anchor ids in ANCHOR_PATTERNS order, each once at its first place, at most MAX_PINS. */
function anchorPins(targetMovements: Prisma.JsonValue | undefined): string[] {
  if (!targetMovements || typeof targetMovements !== 'object' || Array.isArray(targetMovements)) return []
  const ids = new Set<string>()
  for (const pattern of ANCHOR_PATTERNS) {
    const listed = targetMovements[pattern]
    if (!Array.isArray(listed)) continue
    for (const id of listed) if (typeof id === 'string') ids.add(id)
  }
  return [...ids].slice(0, MAX_PINS)
}

/**
 * Replaces the user's pins with `ids`, in order, and marks them as customized. Input is valid.
 * Saves for one user run one at a time (a transaction-scoped advisory lock), so
 * overlapping saves can't collide on the unique index: the last one wins.
 */
export async function savePins(db: PrismaClient, userId: string, ids: string[]): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('pinned-lifts'), hashtext(${userId}))`
    await tx.pinnedExercise.deleteMany({ where: { userId } })
    await tx.pinnedExercise.createMany({
      data: ids.map((exerciseDefinitionId, position) => ({ userId, exerciseDefinitionId, position })),
    })
    await tx.userSettings.upsert({
      where: { userId },
      create: { userId, pinnedLiftsCustomized: true },
      update: { pinnedLiftsCustomized: true },
    })
  })
}

type PinnedDb = Pick<PrismaClient, 'exerciseDefinition' | '$queryRaw'>

/**
 * The pins' names, and the last session of each pin not done in the week.
 * Pins whose definition is gone are dropped. Two queries, whatever the count.
 */
export async function loadPinned(
  db: PinnedDb,
  userId: string,
  { pins, doneIds, weekEnd, unit }: { pins: string[]; doneIds: Set<string>; weekEnd: Date; unit: WeightUnit },
): Promise<Array<Omit<PinnedLift, 'lift'>>> {
  if (pins.length === 0) return []
  const notDone = pins.filter((id) => !doneIds.has(id))
  const [definitions, lasts] = await Promise.all([
    db.exerciseDefinition.findMany({ where: { id: { in: pins } }, select: { id: true, name: true } }),
    lastSets(db, userId, notDone, weekEnd),
  ])
  const names = new Map(definitions.map((d) => [d.id, d.name]))
  const toUnit = (lbs: number) => (unit === 'kg' ? lbs / LBS_PER_KG : lbs)
  return pins.flatMap((id) => {
    const name = names.get(id)
    if (name == null) return []
    const row = lasts.get(id)
    const last = row
      ? { weight: toUnit(row.lbs), reps: row.reps, e1rm: row.e1rm == null ? null : toUnit(row.e1rm), completedAt: row.completedAt }
      : null
    return [{ exerciseDefinitionId: id, name, last }]
  })
}

/**
 * Per exercise, the best working set (highest e1RM, then the heavier, then the
 * most reps) of its latest completed session before `before`. Weights in pounds.
 */
async function lastSets(
  db: PinnedDb,
  userId: string,
  exerciseDefinitionIds: string[],
  before: Date,
): Promise<Map<string, { lbs: number; reps: number; e1rm: number | null; completedAt: Date }>> {
  if (exerciseDefinitionIds.length === 0) return new Map()
  const rows = await db.$queryRaw<Array<{ exerciseDefinitionId: string; lbs: number; reps: number; e1rm: number | null; completedAt: Date }>>(Prisma.sql`
    WITH s AS (
      SELECT e."exerciseDefinitionId", c.id AS "completionId", c."completedAt", ls.reps,
             ls.weight * CASE WHEN ls."weightUnit" = 'kg' THEN ${LBS_PER_KG} ELSE 1 END AS lbs
      FROM "LoggedSet" ls
      JOIN "WorkoutCompletion" c ON c.id = ls."completionId"
      JOIN "Exercise" e ON e.id = ls."exerciseId"
      WHERE c."userId" = ${userId}
        AND c.status = 'completed'
        AND c."isArchived" = false
        AND ls."isWarmup" = false
        AND c."completedAt" < (${before.toISOString()}::timestamptz AT TIME ZONE 'UTC')
        AND e."exerciseDefinitionId" = ANY(${exerciseDefinitionIds}::text[])
    )
    SELECT DISTINCT ON ("exerciseDefinitionId") "exerciseDefinitionId", "completedAt", reps, lbs,
           CASE WHEN lbs <= 0 THEN NULL WHEN reps = 1 THEN lbs ELSE lbs * (1 + reps / 30.0) END AS e1rm
    FROM s
    ORDER BY "exerciseDefinitionId", "completedAt" DESC, "completionId", e1rm DESC NULLS LAST, lbs DESC, reps DESC
  `)
  return new Map(
    rows.map((r) => [
      r.exerciseDefinitionId,
      { lbs: Number(r.lbs), reps: Number(r.reps), e1rm: r.e1rm == null ? null : Number(r.e1rm), completedAt: r.completedAt },
    ]),
  )
}
