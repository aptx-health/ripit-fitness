import { prisma } from '@/lib/db'
import { programDetailHref } from '@/lib/training/program-href'
import { resolveDurationSeconds } from '@/lib/workout-history'

/**
 * Data for the Training home: Up Next, Pinned Workouts, Recent Workouts and
 * Current Program.
 * Skipped counts as done, and only the user's own non-archived completions
 * count.
 */

export interface UpNext {
  programId: string
  programName: string
  workoutId: string
  workoutName: string
  weekNumber: number
  dayNumber: number
  exerciseCount: number
  hasDraft: boolean
  href: string
}

export interface PinnedWorkout {
  id: string
  name: string
  exerciseCount: number
  pinnedAt: Date
}

export interface RecentSession {
  id: string
  name: string
  completedAt: Date
  durationSeconds: number | null
  canRepeat: boolean
}

export interface CurrentProgram {
  programId: string
  programName: string
  weekNumber: number
  totalWeeks: number
  workoutsDone: number
  workoutsTotal: number
}

export interface TrainingHomeData {
  upNext: UpNext | null
  pinned: PinnedWorkout[]
  recent: RecentSession[]
  currentProgram: CurrentProgram | null
}

const RECENT_LIMIT = 3
const PINNED_LIMIT = 5
const DONE_STATUSES = ['completed', 'skipped']

export async function getTrainingHome(userId: string): Promise<TrainingHomeData> {
  const [program, recent, pinned] = await Promise.all([
    prisma.program.findFirst({
      where: { userId, isActive: true, isArchived: false, deletedAt: null },
      select: {
        id: true,
        name: true,
        weeks: {
          orderBy: { weekNumber: 'asc' },
          select: {
            weekNumber: true,
            workouts: {
              orderBy: { dayNumber: 'asc' },
              select: {
                id: true,
                name: true,
                dayNumber: true,
                _count: { select: { exercises: true } },
                completions: {
                  where: { userId, isArchived: false, status: { in: DONE_STATUSES } },
                  select: { id: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    }),
    prisma.workoutCompletion.findMany({
      where: { userId, status: 'completed', isArchived: false },
      orderBy: { completedAt: 'desc' },
      take: RECENT_LIMIT,
      select: {
        id: true,
        name: true,
        completedAt: true,
        startedAt: true,
        durationSeconds: true,
        workout: { select: { name: true } },
        _count: { select: { loggedSets: true } },
      },
    }),
    prisma.savedWorkout.findMany({
      where: { userId, pinnedAt: { not: null } },
      orderBy: { pinnedAt: 'desc' },
      take: PINNED_LIMIT,
      select: { id: true, name: true, exerciseCount: true, pinnedAt: true },
    }),
  ])

  return {
    ...(program ? await programSections(program, userId) : { upNext: null, currentProgram: null }),
    pinned: pinned.map((w) => ({ ...w, pinnedAt: w.pinnedAt as Date })),
    recent: recent.map((c) => ({
      id: c.id,
      name: c.workout?.name ?? c.name ?? 'Open Workout',
      completedAt: c.completedAt,
      durationSeconds: resolveDurationSeconds(c.durationSeconds, c.startedAt, c.completedAt),
      canRepeat: c._count.loggedSets > 0,
    })),
  }
}

type ActiveProgram = {
  id: string
  name: string
  weeks: Array<{
    weekNumber: number
    workouts: Array<{
      id: string
      name: string
      dayNumber: number
      _count: { exercises: number }
      completions: Array<{ id: string }>
    }>
  }>
}

async function programSections(program: ActiveProgram, userId: string) {
  const workouts = program.weeks.flatMap((week) => week.workouts.map((w) => ({ ...w, weekNumber: week.weekNumber })))
  const next = workouts.find((w) => w.completions.length === 0)

  const currentProgram: CurrentProgram = {
    programId: program.id,
    programName: program.name,
    weekNumber: next?.weekNumber ?? program.weeks.at(-1)?.weekNumber ?? 1,
    totalWeeks: program.weeks.length,
    workoutsDone: workouts.length - workouts.filter((w) => w.completions.length === 0).length,
    workoutsTotal: workouts.length,
  }
  if (!next) return { upNext: null, currentProgram }

  const draft = await prisma.workoutCompletion.findFirst({
    where: { userId, workoutId: next.id, status: 'draft', isArchived: false },
    select: { id: true },
  })

  return {
    upNext: {
      programId: program.id,
      programName: program.name,
      workoutId: next.id,
      workoutName: next.name,
      weekNumber: next.weekNumber,
      dayNumber: next.dayNumber,
      exerciseCount: next._count.exercises,
      hasDraft: Boolean(draft),
      href: programDetailHref(program.id, { week: String(next.weekNumber), resume: next.id }),
    },
    currentProgram,
  }
}
