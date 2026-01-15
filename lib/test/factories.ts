import { PrismaClient } from '@prisma/client'

export type TestUser = {
  id: string
}

export type TestProgram = {
  id: string
  name: string
  userId: string
  weeks: Array<{
    id: string
    weekNumber: number
    workouts: Array<{
      id: string
      name: string
      dayNumber: number
      exercises: Array<{
        id: string
        name: string
        exerciseDefinitionId: string
        order: number
      }>
    }>
  }>
}

export type TestExerciseDefinition = {
  id: string
  name: string
  normalizedName: string
}

export async function createTestUser(): Promise<TestUser> {
  // Create mock Supabase user ID for testing
  // In real app, this comes from Supabase auth
  const userId = 'test-user-' + Math.random().toString(36).substring(2, 15)
  return { id: userId }
}

export async function createTestExerciseDefinition(
  prisma: PrismaClient, 
  overrides: Partial<{ name: string; aliases: string[] }> = {}
): Promise<TestExerciseDefinition> {
  const name = overrides.name || 'Barbell Bench Press'
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  
  const exerciseDefinition = await prisma.exerciseDefinition.create({
    data: {
      name,
      normalizedName,
      aliases: overrides.aliases || ['bench press', 'bench'],
      category: 'chest',
      isSystem: true,
      createdBy: null
    }
  })
  
  return {
    id: exerciseDefinition.id,
    name: exerciseDefinition.name,
    normalizedName: exerciseDefinition.normalizedName
  }
}

export async function createTestProgram(
  prisma: PrismaClient, 
  userId: string,
  overrides: Partial<{
    name: string
    weeks: number
    workoutsPerWeek: number
    exercisesPerWorkout: number
  }> = {}
): Promise<TestProgram> {
  const programName = overrides.name || 'Test Program'
  const weekCount = overrides.weeks || 1
  const workoutsPerWeek = overrides.workoutsPerWeek || 1
  const exercisesPerWorkout = overrides.exercisesPerWorkout || 1

  // Create exercise definitions first
  const exerciseDefinitions: TestExerciseDefinition[] = []
  for (let i = 0; i < exercisesPerWorkout; i++) {
    const exerciseDef = await createTestExerciseDefinition(prisma, {
      name: `Test Exercise ${i + 1}`,
      aliases: [`exercise${i + 1}`, `ex${i + 1}`]
    })
    exerciseDefinitions.push(exerciseDef)
  }

  // Create program with nested weeks, workouts, and exercises
  const program = await prisma.program.create({
    data: {
      name: programName,
      description: 'Test program for unit testing',
      userId,
      isActive: true,
      weeks: {
        create: Array.from({ length: weekCount }, (_, weekIndex) => ({
          weekNumber: weekIndex + 1,
          userId,
          workouts: {
            create: Array.from({ length: workoutsPerWeek }, (_, workoutIndex) => ({
              name: `Day ${workoutIndex + 1}`,
              dayNumber: workoutIndex + 1,
              userId,
              exercises: {
                create: exerciseDefinitions.map((exerciseDef, exerciseIndex) => ({
                  name: exerciseDef.name,
                  exerciseDefinitionId: exerciseDef.id,
                  order: exerciseIndex + 1,
                  exerciseGroup: null,
                  notes: null,
                  userId
                }))
              }
            }))
          }
        }))
      }
    },
    include: {
      weeks: {
        include: {
          workouts: {
            include: {
              exercises: true
            }
          }
        },
        orderBy: { weekNumber: 'asc' }
      }
    }
  })

  return {
    id: program.id,
    name: program.name,
    userId: program.userId,
    weeks: program.weeks.map(week => ({
      id: week.id,
      weekNumber: week.weekNumber,
      workouts: week.workouts.map(workout => ({
        id: workout.id,
        name: workout.name,
        dayNumber: workout.dayNumber,
        exercises: workout.exercises.map(exercise => ({
          id: exercise.id,
          name: exercise.name,
          exerciseDefinitionId: exercise.exerciseDefinitionId,
          order: exercise.order
        }))
      }))
    }))
  }
}

export async function createTestWorkoutCompletion(
  prisma: PrismaClient,
  workoutId: string,
  userId: string,
  status: 'draft' | 'completed' | 'abandoned' = 'draft'
) {
  return await prisma.workoutCompletion.create({
    data: {
      workoutId,
      userId,
      status,
      completedAt: new Date(),
      notes: null
    },
    include: {
      loggedSets: true
    }
  })
}

export async function createTestLoggedSets(
  prisma: PrismaClient,
  completionId: string,
  exerciseId: string,
  setCount: number = 3
) {
  const loggedSets = []
  
  for (let i = 1; i <= setCount; i++) {
    const loggedSet = await prisma.loggedSet.create({
      data: {
        completionId,
        exerciseId,
        setNumber: i,
        reps: 10,
        weight: 135.0,
        weightUnit: 'lbs',
        rpe: 8,
        rir: 2
      }
    })
    loggedSets.push(loggedSet)
  }
  
  return loggedSets
}

export async function createTestPrescribedSets(
  prisma: PrismaClient,
  exerciseId: string,
  userId: string,
  setCount: number = 3
) {
  const prescribedSets = []

  for (let i = 1; i <= setCount; i++) {
    const prescribedSet = await prisma.prescribedSet.create({
      data: {
        exerciseId,
        setNumber: i,
        reps: '10',
        weight: '135lbs',
        rpe: 8,
        rir: 2,
        userId
      }
    })
    prescribedSets.push(prescribedSet)
  }

  return prescribedSets
}

// Helper to create a complete test scenario with program, workout completion, and logged sets
export async function createCompleteTestScenario(
  prisma: PrismaClient,
  userId: string,
  options: {
    loggedSetCount?: number
    status?: 'draft' | 'completed' | 'abandoned'
  } = {}
) {
  const { loggedSetCount = 3, status = 'draft' } = options
  
  // Create program structure
  const program = await createTestProgram(prisma, userId)
  const workout = program.weeks[0].workouts[0]
  const exercise = workout.exercises[0]
  
  // Create prescribed sets
  await createTestPrescribedSets(prisma, exercise.id, userId, 3)
  
  // Create workout completion
  const completion = await createTestWorkoutCompletion(
    prisma,
    workout.id,
    userId,
    status
  )
  
  // Create logged sets
  const loggedSets = await createTestLoggedSets(
    prisma,
    completion.id,
    exercise.id,
    loggedSetCount
  )
  
  return {
    program,
    workout,
    exercise,
    completion,
    loggedSets
  }
}