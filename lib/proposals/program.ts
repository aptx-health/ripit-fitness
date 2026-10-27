import type { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { pluralize } from '@/lib/format/pluralize'
import { visibleTo } from './exercise-definition'

/**
 * `program.create` proposals: an agent drafts a whole new program. Week, day,
 * exercise order and set numbers come from array position, starting at 1.
 */

const prescribedSet = z
  .object({
    reps: z.string().trim().min(1).max(20),
    weight: z.string().trim().max(20).optional(),
    rpe: z.number().int().min(1).max(10).optional(),
    rir: z.number().int().min(0).max(10).optional(),
    isWarmup: z.boolean().optional(),
  })
  .strict()

const programExercise = z
  .object({
    exerciseDefinitionId: z.string().min(1),
    notes: z.string().trim().max(500).optional(),
    prescribedSets: z.array(prescribedSet).min(1).max(10),
  })
  .strict()

const programWorkout = z
  .object({
    name: z.string().trim().min(1).max(100),
    exercises: z.array(programExercise).min(1).max(15),
  })
  .strict()

const programWeek = z
  .object({
    name: z.string().trim().max(100).optional(),
    workouts: z.array(programWorkout).min(1).max(7),
  })
  .strict()

export const programInput = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(2000).optional(),
    weeks: z.array(programWeek).min(1).max(16),
  })
  .strict()

export type ProgramInput = z.infer<typeof programInput>

export type ProgramCheck =
  | { ok: true; program: ProgramInput; definitionNames: Map<string, string> }
  | { ok: false; code: 'invalid'; error: string; field: string }

/** The offending key for a zod issue: the last named segment of its path. */
export function issueField(path: readonly PropertyKey[]): string | undefined {
  return path.filter((p): p is string => typeof p === 'string').at(-1)
}

export function programSummary(program: ProgramInput): string {
  return `New program: ${program.name} (${pluralize(program.weeks.length, 'week')})`
}

/**
 * Shape and limits, then every exercise definition must exist and be visible
 * to the user. Shared by propose and approve.
 */
export async function checkProgram(
  db: PrismaClient | Prisma.TransactionClient,
  input: unknown,
  userId: string
): Promise<ProgramCheck> {
  const parsed = programInput.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, code: 'invalid', error: issue.message, field: issueField(issue.path) ?? 'program' }
  }
  const program = parsed.data

  const ids = [
    ...new Set(program.weeks.flatMap((w) => w.workouts.flatMap((wo) => wo.exercises.map((e) => e.exerciseDefinitionId)))),
  ]
  const found = await db.exerciseDefinition.findMany({
    where: { id: { in: ids }, ...visibleTo(userId) },
    select: { id: true, name: true },
  })
  const definitionNames = new Map(found.map((d) => [d.id, d.name]))
  const missing = ids.find((id) => !definitionNames.has(id))
  if (missing) {
    return { ok: false, code: 'invalid', error: `exercise not found: ${missing}`, field: 'exerciseDefinitionId' }
  }
  return { ok: true, program, definitionNames }
}

// Optional text left empty (or blank, which the schema trims to empty) is stored as null.
function orNull(value: string | undefined): string | null {
  return value ? value : null
}

/** Create the program and its whole tree with one nested create. Inactive until Dustin activates it. */
export async function createProgram(
  tx: Prisma.TransactionClient,
  program: ProgramInput,
  definitionNames: Map<string, string>,
  userId: string
) {
  return tx.program.create({
    data: {
      name: program.name,
      description: program.description,
      userId,
      isActive: false,
      isUserCreated: true,
      programType: 'strength',
      copyStatus: 'ready',
      weeks: {
        create: program.weeks.map((week, wi) => ({
          weekNumber: wi + 1,
          name: orNull(week.name),
          userId,
          workouts: {
            create: week.workouts.map((workout, di) => ({
              dayNumber: di + 1,
              name: workout.name,
              userId,
              exercises: {
                create: workout.exercises.map((exercise, oi) => ({
                  order: oi + 1,
                  exerciseDefinitionId: exercise.exerciseDefinitionId,
                  name: definitionNames.get(exercise.exerciseDefinitionId) ?? '',
                  notes: orNull(exercise.notes),
                  userId,
                  prescribedSets: {
                    createMany: {
                      data: exercise.prescribedSets.map((set, si) => ({
                        setNumber: si + 1,
                        reps: set.reps,
                        weight: orNull(set.weight),
                        rpe: set.rpe,
                        rir: set.rir,
                        isWarmup: set.isWarmup ?? false,
                        userId,
                      })),
                    },
                  },
                })),
              },
            })),
          },
        })),
      },
    },
  })
}

/** Program tree for the get_program tool and the admin outline, ordered by position. */
export const programTreeSelect = {
  weekNumber: true,
  name: true,
  workouts: {
    orderBy: { dayNumber: 'asc' },
    select: {
      dayNumber: true,
      name: true,
      exercises: {
        orderBy: { order: 'asc' },
        select: {
          order: true,
          exerciseDefinitionId: true,
          name: true,
          notes: true,
          prescribedSets: {
            orderBy: { setNumber: 'asc' },
            select: { setNumber: true, reps: true, weight: true, rpe: true, rir: true, isWarmup: true },
          },
        },
      },
    },
  },
} satisfies Prisma.WeekSelect
