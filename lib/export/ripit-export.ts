import type { Prisma, PrismaClient } from '@prisma/client'
import type { SavedWorkoutData } from '@/types/saved-workout'

/**
 * The "Download my data" file (GET /api/me/export): every training row a user
 * owns, as Prisma rows, nested. Format: docs/RIPIT_EXPORT_FORMAT.md. The iOS
 * app imports it, so field names and nesting are a contract: change them only
 * with a new version.
 *
 * A fixed number of queries however much data the user has (nested includes
 * run one query per level).
 */

export const RIPIT_EXPORT_FORMAT = 'ripit-export'
export const RIPIT_EXPORT_VERSION = 1

const sessionExercisesInclude = {
  prescribedSets: { orderBy: [{ setNumber: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.ExerciseInclude

const programInclude = {
  weeks: {
    orderBy: { weekNumber: 'asc' },
    include: {
      workouts: {
        orderBy: { dayNumber: 'asc' },
        include: { exercises: { orderBy: [{ order: 'asc' }, { id: 'asc' }], include: sessionExercisesInclude } },
      },
    },
  },
} satisfies Prisma.ProgramInclude

const completionInclude = {
  // Exercises that belong to the session itself: all of an ad-hoc session's,
  // and those added during a program-linked one.
  exercises: { orderBy: [{ order: 'asc' }, { id: 'asc' }], include: sessionExercisesInclude },
  loggedSets: { orderBy: [{ exercise: { order: 'asc' } }, { setNumber: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.WorkoutCompletionInclude

export async function buildRipitExport(prisma: PrismaClient, userId: string, now: Date = new Date()) {
  const [settings, balanceSettings, customExercises, programs, workoutCompletions, savedWorkouts, pinnedExercises] =
    await Promise.all([
      prisma.userSettings.findUnique({ where: { userId } }),
      prisma.userMuscleBalanceSettings.findUnique({ where: { userId } }),
      prisma.exerciseDefinition.findMany({ where: { userId, isSystem: false }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
      prisma.program.findMany({ where: { userId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], include: programInclude }),
      prisma.workoutCompletion.findMany({
        where: { userId },
        orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
        include: completionInclude,
      }),
      prisma.savedWorkout.findMany({ where: { userId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
      prisma.pinnedExercise.findMany({ where: { userId }, orderBy: [{ position: 'asc' }, { id: 'asc' }] }),
    ])

  // Every other definition the file mentions, as id and name only.
  const used = new Set<string>()
  for (const p of programs)
    for (const w of p.weeks) for (const wo of w.workouts) for (const e of wo.exercises) used.add(e.exerciseDefinitionId)
  for (const c of workoutCompletions) for (const e of c.exercises) used.add(e.exerciseDefinitionId)
  for (const s of savedWorkouts) {
    const data = s.workoutData as unknown as SavedWorkoutData
    if (Array.isArray(data)) for (const e of data) if (typeof e?.exerciseDefinitionId === 'string') used.add(e.exerciseDefinitionId)
  }
  for (const p of pinnedExercises) used.add(p.exerciseDefinitionId)
  for (const d of customExercises) used.delete(d.id)

  const exerciseRefs = await prisma.exerciseDefinition.findMany({
    where: { id: { in: [...used] } },
    select: { id: true, name: true },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  })

  return {
    format: RIPIT_EXPORT_FORMAT,
    version: RIPIT_EXPORT_VERSION,
    exportedAt: now.toISOString(),
    userId,
    settings,
    balanceSettings,
    customExercises,
    exerciseRefs,
    programs,
    workoutCompletions,
    savedWorkouts,
    pinnedExercises,
  }
}

export type RipitExport = Awaited<ReturnType<typeof buildRipitExport>>

/** `ripit-export-YYYY-MM-DD.json`, the UTC date of the export. */
export function exportFilename(exportedAt: Date): string {
  return `ripit-export-${exportedAt.toISOString().slice(0, 10)}.json`
}
