import { PrismaClient } from '@prisma/client'
import { recordStrengthPerformance, recordCardioPerformance } from '../lib/stats/exercise-performance'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding brag strip test data...')

  // 1. Find or create test user
  const testEmail = 'test@example.com'
  let user = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM auth.users WHERE email = ${testEmail} LIMIT 1
  `

  let userId: string
  if (user.length === 0) {
    console.log(`❌ No user found with email ${testEmail}`)
    console.log('Please create a user account first by signing up in the app')
    process.exit(1)
  } else {
    userId = user[0].id
    console.log(`✅ Found user: ${testEmail} (${userId})`)
  }

  // 2. Create or find exercise definitions
  const benchPress = await prisma.exerciseDefinition.upsert({
    where: { normalizedName: 'bench_press' },
    update: {},
    create: {
      name: 'Bench Press',
      normalizedName: 'bench_press',
      aliases: ['bench', 'bp'],
      category: 'chest',
      isSystem: true,
      userId,
      primaryFAUs: ['chest'],
      equipment: ['barbell'],
    },
  })

  const squat = await prisma.exerciseDefinition.upsert({
    where: { normalizedName: 'squat' },
    update: {},
    create: {
      name: 'Squat',
      normalizedName: 'squat',
      aliases: ['back squat', 'barbell squat'],
      category: 'legs',
      isSystem: true,
      userId,
      primaryFAUs: ['quads'],
      equipment: ['barbell'],
    },
  })

  const deadlift = await prisma.exerciseDefinition.upsert({
    where: { normalizedName: 'deadlift' },
    update: {},
    create: {
      name: 'Deadlift',
      normalizedName: 'deadlift',
      aliases: ['conventional deadlift'],
      category: 'back',
      isSystem: true,
      userId,
      primaryFAUs: ['back'],
      equipment: ['barbell'],
    },
  })

  console.log('✅ Created exercise definitions')

  // 3. Create test program
  const program = await prisma.program.create({
    data: {
      name: 'Brag Strip Test Program',
      description: 'Test program for brag strip seeding',
      userId,
      isActive: true,
      isUserCreated: true,
      programType: 'strength',
    },
  })

  const week = await prisma.week.create({
    data: {
      weekNumber: 1,
      programId: program.id,
      userId,
    },
  })

  const workout = await prisma.workout.create({
    data: {
      name: 'Upper Body',
      dayNumber: 1,
      weekId: week.id,
      userId,
    },
  })

  // Create exercises in the workout
  const workoutExercises = await Promise.all([
    prisma.exercise.create({
      data: {
        name: 'Bench Press',
        exerciseDefinitionId: benchPress.id,
        workoutId: workout.id,
        order: 1,
        userId,
      },
    }),
    prisma.exercise.create({
      data: {
        name: 'Squat',
        exerciseDefinitionId: squat.id,
        workoutId: workout.id,
        order: 2,
        userId,
      },
    }),
    prisma.exercise.create({
      data: {
        name: 'Deadlift',
        exerciseDefinitionId: deadlift.id,
        workoutId: workout.id,
        order: 3,
        userId,
      },
    }),
  ])

  console.log('✅ Created test program with workout')

  // 4. Create workout completions spread across time periods
  const now = new Date()

  // Helper to create a date X days ago
  const daysAgo = (days: number) => {
    const date = new Date(now)
    date.setDate(date.getDate() - days)
    return date
  }

  // This week: 3 workouts (days 1, 3, 5)
  const thisWeekDates = [1, 3, 5]

  // This month (not this week): 8 workouts
  const thisMonthDates = [10, 12, 15, 17, 20, 22, 25, 27]

  // Older: 50 workouts (spread over past 6 months)
  const olderDates = Array.from({ length: 50 }, (_, i) => 35 + i * 3)

  const allDates = [
    ...thisWeekDates.map(d => ({ days: d, label: 'this week' })),
    ...thisMonthDates.map(d => ({ days: d, label: 'this month' })),
    ...olderDates.map(d => ({ days: d, label: 'older' })),
  ]

  console.log(`Creating ${allDates.length} workout completions...`)

  for (const { days, label } of allDates) {
    const completedAt = daysAgo(days)

    // Create workout completion
    const completion = await prisma.workoutCompletion.create({
      data: {
        workoutId: workout.id,
        userId,
        status: 'completed',
        completedAt,
      },
    })

    // Create logged sets for bench press (3 sets)
    await prisma.loggedSet.createMany({
      data: [
        {
          exerciseId: workoutExercises[0].id,
          completionId: completion.id,
          userId,
          setNumber: 1,
          reps: 8,
          weight: 135,
          weightUnit: 'lbs',
          rpe: 7,
        },
        {
          exerciseId: workoutExercises[0].id,
          completionId: completion.id,
          userId,
          setNumber: 2,
          reps: 8,
          weight: 135,
          weightUnit: 'lbs',
          rpe: 8,
        },
        {
          exerciseId: workoutExercises[0].id,
          completionId: completion.id,
          userId,
          setNumber: 3,
          reps: 7,
          weight: 135,
          weightUnit: 'lbs',
          rpe: 9,
        },
      ],
    })

    // Create logged sets for squat (3 sets)
    await prisma.loggedSet.createMany({
      data: [
        {
          exerciseId: workoutExercises[1].id,
          completionId: completion.id,
          userId,
          setNumber: 1,
          reps: 5,
          weight: 185,
          weightUnit: 'lbs',
          rpe: 7,
        },
        {
          exerciseId: workoutExercises[1].id,
          completionId: completion.id,
          userId,
          setNumber: 2,
          reps: 5,
          weight: 185,
          weightUnit: 'lbs',
          rpe: 8,
        },
        {
          exerciseId: workoutExercises[1].id,
          completionId: completion.id,
          userId,
          setNumber: 3,
          reps: 5,
          weight: 185,
          weightUnit: 'lbs',
          rpe: 8,
        },
      ],
    })

    // Create logged sets for deadlift (3 sets)
    await prisma.loggedSet.createMany({
      data: [
        {
          exerciseId: workoutExercises[2].id,
          completionId: completion.id,
          userId,
          setNumber: 1,
          reps: 3,
          weight: 225,
          weightUnit: 'lbs',
          rpe: 8,
        },
        {
          exerciseId: workoutExercises[2].id,
          completionId: completion.id,
          userId,
          setNumber: 2,
          reps: 3,
          weight: 225,
          weightUnit: 'lbs',
          rpe: 9,
        },
        {
          exerciseId: workoutExercises[2].id,
          completionId: completion.id,
          userId,
          setNumber: 3,
          reps: 2,
          weight: 225,
          weightUnit: 'lbs',
          rpe: 9,
        },
      ],
    })

    // Record performance metrics
    await recordStrengthPerformance(prisma, completion.id, userId)

    if (allDates.indexOf({ days, label }) % 10 === 0) {
      console.log(`  ✓ Created ${allDates.indexOf({ days, label }) + 1}/${allDates.length} completions`)
    }
  }

  console.log(`✅ Created ${allDates.length} workout completions with performance logs`)

  // 5. Create cardio sessions
  console.log('Creating cardio sessions...')

  // 15 treadmill runs (should count in running miles)
  const treadmillDates = Array.from({ length: 15 }, (_, i) => 5 + i * 7)
  for (const days of treadmillDates) {
    const session = await prisma.loggedCardioSession.create({
      data: {
        userId,
        completedAt: daysAgo(days),
        status: 'completed',
        name: 'Treadmill Run',
        equipment: 'treadmill',
        duration: 30 * 60, // 30 minutes in seconds
        distance: 3.0, // 3 miles
        avgHR: 155,
        peakHR: 175,
      },
    })

    await recordCardioPerformance(prisma, session.id, userId)
  }

  // 5 outdoor runs (should count in running miles)
  const outdoorDates = Array.from({ length: 5 }, (_, i) => 10 + i * 14)
  for (const days of outdoorDates) {
    const session = await prisma.loggedCardioSession.create({
      data: {
        userId,
        completedAt: daysAgo(days),
        status: 'completed',
        name: 'Outdoor Run',
        equipment: 'outdoor_running',
        duration: 35 * 60, // 35 minutes in seconds
        distance: 4.0, // 4 miles
        avgHR: 150,
        peakHR: 170,
      },
    })

    await recordCardioPerformance(prisma, session.id, userId)
  }

  // 10 cycling sessions (should NOT count in running miles)
  const cyclingDates = Array.from({ length: 10 }, (_, i) => 7 + i * 10)
  for (const days of cyclingDates) {
    const session = await prisma.loggedCardioSession.create({
      data: {
        userId,
        completedAt: daysAgo(days),
        status: 'completed',
        name: 'Cycling',
        equipment: 'bike',
        duration: 45 * 60, // 45 minutes in seconds
        distance: 12.0, // 12 miles (but shouldn't count as "running")
        avgHR: 140,
        peakHR: 165,
      },
    })

    await recordCardioPerformance(prisma, session.id, userId)
  }

  console.log('✅ Created 30 cardio sessions (15 treadmill + 5 outdoor + 10 cycling)')

  // 6. Print expected results
  console.log('\n📊 Expected Brag Strip Results:')
  console.log('  • Workouts this week: 3 strength + cardio from this week')
  console.log('  • Workouts this month: 11 strength + cardio from this month')
  console.log('  • Workouts all-time: 61 strength + 30 cardio = 91')

  // Calculate expected volume
  // Per workout: Bench (3x8x135 + 3x8x135 + 3x7x135) + Squat (3x5x185) + Deadlift (3x3x225 + 3x3x225 + 3x2x225)
  const benchVolume = (8 + 8 + 7) * 135
  const squatVolume = 5 * 3 * 185
  const deadliftVolume = (3 + 3 + 2) * 225
  const perWorkoutVolume = benchVolume + squatVolume + deadliftVolume
  const totalVolume = perWorkoutVolume * 61
  console.log(`  • Total volume: ~${Math.round(totalVolume).toLocaleString()} lbs`)

  // Calculate expected running distance
  const treadmillMiles = 15 * 3.0
  const outdoorMiles = 5 * 4.0
  const totalRunningMiles = treadmillMiles + outdoorMiles
  console.log(`  • Running miles: ${totalRunningMiles} mi (treadmill + outdoor only, cycling excluded)`)

  console.log('\n✅ Seed complete! Visit http://localhost:3000/data to see your brag strip')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
