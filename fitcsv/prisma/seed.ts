import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Note: You'll need to replace 'USER_ID_HERE' with an actual user ID from your Supabase auth
  // You can get this after creating a user account
  const userId = process.env.SEED_USER_ID

  if (!userId) {
    console.log('⚠️  No SEED_USER_ID environment variable found')
    console.log('To seed data:')
    console.log('1. Create a user account via /signup')
    console.log('2. Get the user ID from Supabase Dashboard → Authentication → Users')
    console.log('3. Run: doppler secrets set SEED_USER_ID="your-user-id"')
    console.log('4. Run: doppler run -- npx prisma db seed')
    return
  }

  console.log(`Seeding for user: ${userId}`)

  // Create a sample program
  const program = await prisma.program.create({
    data: {
      name: 'Sample 3-Day Strength Program',
      description: 'A simple 3-day per week strength training program',
      userId,
      isActive: true,
    },
  })

  console.log(`✓ Created program: ${program.name}`)

  // Create Week 1
  const week1 = await prisma.week.create({
    data: {
      weekNumber: 1,
      programId: program.id,
    },
  })

  console.log(`✓ Created week ${week1.weekNumber}`)

  // Day 1: Upper Body
  const day1 = await prisma.workout.create({
    data: {
      name: 'Upper Body',
      dayNumber: 1,
      weekId: week1.id,
    },
  })

  // Day 1 Exercises
  await prisma.exercise.create({
    data: {
      name: 'Bench Press',
      order: 1,
      workoutId: day1.id,
      prescribedSets: {
        create: [
          { setNumber: 1, reps: 5, weight: '135lbs', rir: 3 },
          { setNumber: 2, reps: 5, weight: '135lbs', rir: 2 },
          { setNumber: 3, reps: 5, weight: '135lbs', rir: 1 },
        ],
      },
    },
  })

  await prisma.exercise.create({
    data: {
      name: 'Barbell Rows',
      order: 2,
      workoutId: day1.id,
      prescribedSets: {
        create: [
          { setNumber: 1, reps: 8, weight: '95lbs', rir: 2 },
          { setNumber: 2, reps: 8, weight: '95lbs', rir: 2 },
          { setNumber: 3, reps: 8, weight: '95lbs', rir: 1 },
        ],
      },
    },
  })

  console.log(`✓ Created ${day1.name} with 2 exercises`)

  // Day 2: Lower Body
  const day2 = await prisma.workout.create({
    data: {
      name: 'Lower Body',
      dayNumber: 2,
      weekId: week1.id,
    },
  })

  await prisma.exercise.create({
    data: {
      name: 'Squat',
      order: 1,
      workoutId: day2.id,
      prescribedSets: {
        create: [
          { setNumber: 1, reps: 5, weight: '185lbs', rir: 3 },
          { setNumber: 2, reps: 5, weight: '185lbs', rir: 2 },
          { setNumber: 3, reps: 5, weight: '185lbs', rir: 1 },
        ],
      },
    },
  })

  await prisma.exercise.create({
    data: {
      name: 'Romanian Deadlift',
      order: 2,
      workoutId: day2.id,
      prescribedSets: {
        create: [
          { setNumber: 1, reps: 8, weight: '135lbs', rir: 2 },
          { setNumber: 2, reps: 8, weight: '135lbs', rir: 2 },
          { setNumber: 3, reps: 8, weight: '135lbs', rir: 1 },
        ],
      },
    },
  })

  console.log(`✓ Created ${day2.name} with 2 exercises`)

  // Day 3: Full Body
  const day3 = await prisma.workout.create({
    data: {
      name: 'Full Body',
      dayNumber: 3,
      weekId: week1.id,
    },
  })

  await prisma.exercise.create({
    data: {
      name: 'Deadlift',
      order: 1,
      workoutId: day3.id,
      prescribedSets: {
        create: [
          { setNumber: 1, reps: 5, weight: '225lbs', rir: 3 },
          { setNumber: 2, reps: 5, weight: '225lbs', rir: 2 },
          { setNumber: 3, reps: 5, weight: '225lbs', rir: 1 },
        ],
      },
    },
  })

  await prisma.exercise.create({
    data: {
      name: 'Overhead Press',
      order: 2,
      workoutId: day3.id,
      prescribedSets: {
        create: [
          { setNumber: 1, reps: 8, weight: '75lbs', rir: 2 },
          { setNumber: 2, reps: 8, weight: '75lbs', rir: 2 },
          { setNumber: 3, reps: 8, weight: '75lbs', rir: 1 },
        ],
      },
    },
  })

  console.log(`✓ Created ${day3.name} with 2 exercises`)

  console.log('✅ Seeding finished successfully!')
  console.log(`\nProgram "${program.name}" created with 1 week and 3 workouts`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
