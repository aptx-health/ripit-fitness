import type { PrismaClient } from '@prisma/client'
import type { SavedWorkoutData } from '@/types/saved-workout'

/**
 * Training data for the ripit-export tests and the committed fixture
 * (docs/fixtures/ripit-export-v1.json). Dates are fixed so the fixture reads
 * the same each time it is rebuilt; only the cuid ids change.
 */

const at = (iso: string) => new Date(iso)

/** System exercises, created once per database (normalizedName is unique). */
export async function seedSystemExercises(prisma: PrismaClient) {
  const make = async (name: string, primaryFAUs: string[], equipment: string[]) => {
    const normalizedName = name.toLowerCase()
    const existing = await prisma.exerciseDefinition.findUnique({ where: { normalizedName } })
    if (existing) return existing
    return prisma.exerciseDefinition.create({
      data: { name, normalizedName, isSystem: true, primaryFAUs, equipment, userId: '00000000-0000-0000-0000-000000000000' },
    })
  }
  return {
    squat: await make('Barbell Back Squat', ['quads', 'glutes'], ['barbell']),
    bench: await make('Barbell Bench Press', ['chest', 'triceps'], ['barbell']),
    row: await make('Barbell Bent-Over Row', ['lats', 'mid_back'], ['barbell']),
    pullup: await make('Pull-Up', ['lats', 'biceps'], ['bodyweight']),
    deadlift: await make('Conventional Deadlift', ['hamstrings', 'glutes'], ['barbell']),
  }
}

type Sys = Awaited<ReturnType<typeof seedSystemExercises>>

interface PlannedExercise {
  defId: string
  name: string
  group?: string
  sets: Array<{ reps: string; weight?: string; rir?: number; rpe?: number; isWarmup?: boolean }>
}

async function createProgram(
  prisma: PrismaClient,
  userId: string,
  data: { name: string; isActive?: boolean; archivedAt?: Date; createdAt: Date },
  weeks: Array<Array<{ name: string; exercises: PlannedExercise[] }>>
) {
  const program = await prisma.program.create({
    data: {
      name: data.name,
      userId,
      isActive: data.isActive ?? false,
      isUserCreated: true,
      isArchived: !!data.archivedAt,
      archivedAt: data.archivedAt ?? null,
      createdAt: data.createdAt,
      goals: ['strength'],
      level: 'intermediate',
      targetDaysPerWeek: weeks[0]?.length ?? 1,
    },
  })
  const workouts: Array<{ id: string; exerciseIds: string[] }> = []
  for (const [w, days] of weeks.entries()) {
    const week = await prisma.week.create({ data: { programId: program.id, weekNumber: w + 1, userId } })
    for (const [d, day] of days.entries()) {
      const workout = await prisma.workout.create({ data: { name: day.name, dayNumber: d + 1, weekId: week.id, userId } })
      const exerciseIds: string[] = []
      for (const [i, ex] of day.exercises.entries()) {
        const exercise = await prisma.exercise.create({
          data: {
            name: ex.name,
            exerciseDefinitionId: ex.defId,
            order: i + 1,
            exerciseGroup: ex.group ?? null,
            workoutId: workout.id,
            userId,
          },
        })
        exerciseIds.push(exercise.id)
        await prisma.prescribedSet.createMany({
          data: ex.sets.map((s, n) => ({
            exerciseId: exercise.id,
            userId,
            setNumber: n + 1,
            reps: s.reps,
            weight: s.weight ?? null,
            rir: s.rir ?? null,
            rpe: s.rpe ?? null,
            isWarmup: s.isWarmup ?? false,
          })),
        })
      }
      workouts.push({ id: workout.id, exerciseIds })
    }
  }
  return { program, workouts }
}

async function logSets(
  prisma: PrismaClient,
  userId: string,
  completionId: string,
  exerciseId: string,
  sets: Array<{ reps: number; weight: number; unit: 'lbs' | 'kg'; rir?: number; rpe?: number; isWarmup?: boolean }>,
  loggedAt: Date
) {
  await prisma.loggedSet.createMany({
    data: sets.map((s, n) => ({
      completionId,
      exerciseId,
      userId,
      setNumber: n + 1,
      reps: s.reps,
      weight: s.weight,
      weightUnit: s.unit,
      rir: s.rir ?? null,
      rpe: s.rpe ?? null,
      isWarmup: s.isWarmup ?? false,
      createdAt: loggedAt,
    })),
  })
}

/**
 * Everything the export covers: an active program with a superset, an archived
 * program, a finished, an abandoned and an ad-hoc workout (kg and lbs sets),
 * a saved workout, a custom exercise, a pinned lift and settings.
 */
export async function seedTrainingData(prisma: PrismaClient, userId: string, sys: Sys, label = '') {
  const sledPush = await prisma.exerciseDefinition.create({
    data: {
      name: `Sled Push${label}`,
      normalizedName: `sled push${label.toLowerCase()}`,
      isSystem: false,
      createdBy: userId,
      userId,
      equipment: ['sled'],
      primaryFAUs: ['quads', 'glutes'],
      instructions: 'Drive the sled 20 m, low hips.',
      createdAt: at('2026-09-01T15:00:00.000Z'),
    },
  })

  const active = await createProgram(
    prisma,
    userId,
    { name: `Strength Block${label}`, isActive: true, createdAt: at('2026-10-01T15:00:00.000Z') },
    [
      [
        {
          name: 'Squat + Press',
          exercises: [
            {
              defId: sys.squat.id,
              name: sys.squat.name,
              sets: [
                { reps: '5', weight: '135lbs', isWarmup: true },
                { reps: '5', weight: '225lbs', rir: 2 },
                { reps: '5', weight: '225lbs', rir: 2 },
              ],
            },
            { defId: sys.bench.id, name: sys.bench.name, group: 'A', sets: [{ reps: '8', weight: '65%', rpe: 8 }, { reps: '8', weight: '65%', rpe: 8 }] },
            { defId: sys.row.id, name: sys.row.name, group: 'A', sets: [{ reps: '10', weight: 'RPE 8' }, { reps: '10', weight: 'RPE 8' }] },
          ],
        },
        {
          name: 'Pull',
          exercises: [
            { defId: sys.deadlift.id, name: sys.deadlift.name, sets: [{ reps: '3-5', weight: '275lbs', rir: 2 }] },
            { defId: sys.pullup.id, name: sys.pullup.name, sets: [{ reps: 'AMRAP' }] },
          ],
        },
      ],
      [
        {
          name: 'Squat + Press',
          exercises: [
            { defId: sys.squat.id, name: sys.squat.name, sets: [{ reps: '5', weight: '230lbs', rir: 2 }] },
            { defId: sys.bench.id, name: sys.bench.name, group: 'A', sets: [{ reps: '8', weight: '67.5%' }] },
            { defId: sys.row.id, name: sys.row.name, group: 'A', sets: [{ reps: '10' }] },
          ],
        },
      ],
    ]
  )

  const archived = await createProgram(
    prisma,
    userId,
    { name: `Old Hypertrophy${label}`, archivedAt: at('2026-09-30T12:00:00.000Z'), createdAt: at('2026-07-01T15:00:00.000Z') },
    [[{ name: 'Upper', exercises: [{ defId: sys.pullup.id, name: sys.pullup.name, sets: [{ reps: '8-12' }] }] }]]
  )

  // Finished: week 1 day 1, lbs.
  const day1 = active.workouts[0]
  const finished = await prisma.workoutCompletion.create({
    data: {
      workoutId: day1.id,
      userId,
      status: 'completed',
      startedAt: at('2026-10-06T13:00:00.000Z'),
      completedAt: at('2026-10-06T14:05:00.000Z'),
      durationSeconds: 3900,
      sessionRpe: 7,
      notes: 'Felt quick.',
    },
  })
  await logSets(prisma, userId, finished.id, day1.exerciseIds[0], [
    { reps: 5, weight: 135, unit: 'lbs', isWarmup: true },
    { reps: 5, weight: 225, unit: 'lbs', rir: 2 },
    { reps: 5, weight: 225, unit: 'lbs', rir: 1 },
  ], finished.completedAt)
  await logSets(prisma, userId, finished.id, day1.exerciseIds[1], [
    { reps: 8, weight: 155, unit: 'lbs', rpe: 8 },
    { reps: 7, weight: 155, unit: 'lbs', rpe: 9 },
  ], finished.completedAt)
  await logSets(prisma, userId, finished.id, day1.exerciseIds[2], [
    { reps: 10, weight: 135, unit: 'lbs' },
    { reps: 10, weight: 135, unit: 'lbs' },
  ], finished.completedAt)

  // Abandoned: week 1 day 2, the second cycle, a few sets.
  const day2 = active.workouts[1]
  const abandoned = await prisma.workoutCompletion.create({
    data: {
      workoutId: day2.id,
      userId,
      status: 'abandoned',
      cycleNumber: 2,
      startedAt: at('2026-10-08T13:00:00.000Z'),
      completedAt: at('2026-10-08T13:20:00.000Z'),
    },
  })
  await logSets(prisma, userId, abandoned.id, day2.exerciseIds[0], [{ reps: 4, weight: 275, unit: 'lbs', rir: 1 }], abandoned.completedAt)

  // Ad-hoc, kg: two one-off exercises (one custom) with their own plan.
  const adHoc = await prisma.workoutCompletion.create({
    data: {
      userId,
      status: 'completed',
      isAdHoc: true,
      name: `Saturday Garage${label}`,
      startedAt: at('2026-10-11T16:00:00.000Z'),
      completedAt: at('2026-10-11T16:45:00.000Z'),
      durationSeconds: 2700,
    },
  })
  const oneOff = async (defId: string, name: string, order: number, group: string | null, reps: string) => {
    const ex = await prisma.exercise.create({
      data: { name, exerciseDefinitionId: defId, order, exerciseGroup: group, workoutCompletionId: adHoc.id, isOneOff: true, userId },
    })
    await prisma.prescribedSet.createMany({
      data: [1, 2].map((setNumber) => ({ exerciseId: ex.id, userId, setNumber, reps })),
    })
    return ex
  }
  const sled = await oneOff(sledPush.id, sledPush.name, 1, null, '20m')
  const pull = await oneOff(sys.pullup.id, sys.pullup.name, 2, null, '8')
  await logSets(prisma, userId, adHoc.id, sled.id, [
    { reps: 1, weight: 80, unit: 'kg' },
    { reps: 1, weight: 100, unit: 'kg' },
  ], adHoc.completedAt)
  await logSets(prisma, userId, adHoc.id, pull.id, [
    { reps: 8, weight: 0, unit: 'kg' },
    { reps: 6, weight: 10, unit: 'kg', rir: 1 },
  ], adHoc.completedAt)

  const workoutData: SavedWorkoutData = [
    { name: sledPush.name, exerciseDefinitionId: sledPush.id, order: 1, notes: null, exerciseGroup: null, sets: [1, 2].map((setNumber) => ({ setNumber, reps: '20m', rir: null, rpe: null, isWarmup: false })) },
    { name: sys.pullup.name, exerciseDefinitionId: sys.pullup.id, order: 2, notes: 'Add load if 8 is easy', exerciseGroup: null, sets: [1, 2].map((setNumber) => ({ setNumber, reps: '8', rir: 1, rpe: null, isWarmup: false })) },
  ]
  const saved = await prisma.savedWorkout.create({
    data: {
      userId,
      name: `Garage Day${label}`,
      sourceCompletionId: adHoc.id,
      workoutData,
      exerciseCount: workoutData.length,
      createdAt: at('2026-10-11T17:00:00.000Z'),
    },
  })

  await prisma.pinnedExercise.create({ data: { userId, exerciseDefinitionId: sys.squat.id, position: 0, createdAt: at('2026-10-02T12:00:00.000Z') } })
  await prisma.pinnedExercise.create({ data: { userId, exerciseDefinitionId: sys.deadlift.id, position: 1, createdAt: at('2026-10-02T12:00:00.000Z') } })

  await prisma.userSettings.create({
    data: { userId, displayName: `Dana${label}`, defaultWeightUnit: 'lbs', intensityEnabled: true, weeklyWorkoutTarget: 4, onboardingCompleted: true, createdAt: at('2026-09-01T15:00:00.000Z') },
  })
  await prisma.userMuscleBalanceSettings.create({
    data: { userId, targets: { chest: 12, lats: 14, quads: 12, hamstrings: 10 }, lookbackDays: 14, createdAt: at('2026-09-01T15:00:00.000Z') },
  })

  return { sledPush, active, archived, finished, abandoned, adHoc, saved }
}

/** n program-linked finished workouts with a few sets each, for the query-count check. */
export async function seedWorkouts(prisma: PrismaClient, userId: string, sys: Sys, n: number) {
  for (let i = 0; i < n; i++) {
    const { workouts } = await createProgram(
      prisma,
      userId,
      { name: `Program ${i + 1}`, createdAt: at('2026-10-01T15:00:00.000Z') },
      [[{ name: `Day ${i + 1}`, exercises: [{ defId: sys.squat.id, name: sys.squat.name, group: 'A', sets: [{ reps: '5' }, { reps: '5' }] }] }]]
    )
    const c = await prisma.workoutCompletion.create({ data: { workoutId: workouts[0].id, userId, status: 'completed' } })
    await logSets(prisma, userId, c.id, workouts[0].exerciseIds[0], [{ reps: 5, weight: 100, unit: 'kg' }, { reps: 5, weight: 100, unit: 'kg' }], new Date())
    const adHoc = await prisma.workoutCompletion.create({ data: { userId, status: 'completed', isAdHoc: true, name: `Free ${i}` } })
    const ex = await prisma.exercise.create({
      data: { name: sys.bench.name, exerciseDefinitionId: sys.bench.id, order: 1, workoutCompletionId: adHoc.id, isOneOff: true, userId },
    })
    await logSets(prisma, userId, adHoc.id, ex.id, [{ reps: 8, weight: 60, unit: 'kg' }], new Date())
    await prisma.savedWorkout.create({ data: { userId, name: `Saved ${i}`, workoutData: [], exerciseCount: 0 } })
  }
}
