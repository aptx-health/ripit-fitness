import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// System exercise definitions with aliases
const SYSTEM_EXERCISES = [
  {
    name: 'Barbell Bench Press',
    aliases: ['bench press', 'bench', 'flat bench', 'barbell bench'],
    category: 'chest'
  },
  {
    name: 'Barbell Back Squat',
    aliases: ['squat', 'back squat', 'barbell squat'],
    category: 'legs'
  },
  {
    name: 'Conventional Deadlift',
    aliases: ['deadlift', 'conventional deadlift', 'barbell deadlift'],
    category: 'back'
  },
  {
    name: 'Barbell Row',
    aliases: ['barbell row', 'barbell rows', 'bent over row', 'pendlay row'],
    category: 'back'
  },
  {
    name: 'Overhead Press',
    aliases: ['ohp', 'overhead press', 'military press', 'shoulder press', 'strict press'],
    category: 'shoulders'
  },
  {
    name: 'Romanian Deadlift',
    aliases: ['rdl', 'romanian deadlift', 'stiff leg deadlift', 'stiff legged deadlift'],
    category: 'legs'
  },
  {
    name: 'Incline Barbell Bench Press',
    aliases: ['incline bench', 'incline bench press', 'incline barbell bench'],
    category: 'chest'
  },
  {
    name: 'Dumbbell Bench Press',
    aliases: ['db bench', 'dumbbell bench', 'db bench press'],
    category: 'chest'
  },
  {
    name: 'Pull-Up',
    aliases: ['pull up', 'pullup', 'pull-ups', 'pullups', 'chin up', 'chinup'],
    category: 'back'
  },
  {
    name: 'Barbell Curl',
    aliases: ['barbell curl', 'barbell curls', 'bb curl', 'bicep curl'],
    category: 'arms'
  },
  {
    name: 'Tricep Pushdown',
    aliases: ['tricep pushdown', 'triceps pushdown', 'cable pushdown', 'rope pushdown'],
    category: 'arms'
  },
  {
    name: 'Leg Press',
    aliases: ['leg press', 'machine leg press'],
    category: 'legs'
  },
  {
    name: 'Leg Curl',
    aliases: ['leg curl', 'lying leg curl', 'hamstring curl'],
    category: 'legs'
  },
  {
    name: 'Leg Extension',
    aliases: ['leg extension', 'quad extension'],
    category: 'legs'
  },
  {
    name: 'Lateral Raise',
    aliases: ['lateral raise', 'side raise', 'dumbbell lateral raise', 'db lateral raise'],
    category: 'shoulders'
  },
  {
    name: 'Front Squat',
    aliases: ['front squat', 'front squats', 'barbell front squat'],
    category: 'legs'
  },
  {
    name: 'Sumo Deadlift',
    aliases: ['sumo deadlift', 'sumo dl', 'wide stance deadlift'],
    category: 'legs'
  },
  {
    name: 'Dumbbell Row',
    aliases: ['dumbbell row', 'db row', 'single arm dumbbell row', 'one arm db row'],
    category: 'back'
  },
  {
    name: 'Cable Row',
    aliases: ['cable row', 'seated cable row', 'seated row'],
    category: 'back'
  },
  {
    name: 'Face Pull',
    aliases: ['face pull', 'face pulls', 'cable face pull', 'rope face pull'],
    category: 'shoulders'
  },
  {
    name: 'Dips',
    aliases: ['dips', 'dip', 'parallel bar dips', 'chest dips'],
    category: 'chest'
  },
  {
    name: 'Lunges',
    aliases: ['lunge', 'lunges', 'dumbbell lunges', 'barbell lunges', 'walking lunges'],
    category: 'legs'
  },
  {
    name: 'Calf Raise',
    aliases: ['calf raise', 'calf raises', 'standing calf raise', 'seated calf raise'],
    category: 'legs'
  },
  {
    name: 'Plank',
    aliases: ['plank', 'planks', 'front plank', 'forearm plank'],
    category: 'core'
  },
  {
    name: 'Hammer Curl',
    aliases: ['hammer curl', 'hammer curls', 'dumbbell hammer curl'],
    category: 'arms'
  }
]

async function seedExerciseDefinitions() {
  console.log('Seeding exercise definitions...')

  for (const ex of SYSTEM_EXERCISES) {
    await prisma.exerciseDefinition.upsert({
      where: { normalizedName: ex.name.toLowerCase() },
      create: {
        name: ex.name,
        normalizedName: ex.name.toLowerCase(),
        aliases: ex.aliases,
        category: ex.category,
        isSystem: true,
        createdBy: null,
        userId: '00000000-0000-0000-0000-000000000000' // System exercises use special UUID
      },
      update: {
        aliases: ex.aliases,
        category: ex.category
      }
    })
  }

  console.log(`✓ Created ${SYSTEM_EXERCISES.length} system exercise definitions`)
}

async function main() {
  console.log('Start seeding...')

  // Seed exercise definitions first
  await seedExerciseDefinitions()

  // Note: You'll need to replace 'USER_ID_HERE' with an actual user ID from your Supabase auth
  // You can get this after creating a user account
  const userId = process.env.SEED_USER_ID

  if (!userId) {
    console.log('⚠️  No SEED_USER_ID environment variable found')
    console.log('Exercise definitions seeded, but skipping program seed.')
    console.log('To seed a sample program:')
    console.log('1. Create a user account via /signup')
    console.log('2. Get the user ID from Supabase Dashboard → Authentication → Users')
    console.log('3. Run: doppler secrets set SEED_USER_ID="your-user-id"')
    console.log('4. Run: doppler run -- npx prisma db seed')
    return
  }

  console.log(`Seeding sample program for user: ${userId}`)

  // Get exercise definitions for seeding
  const benchPressDefinition = await prisma.exerciseDefinition.findFirst({
    where: { normalizedName: 'barbell bench press' }
  })
  const rowDefinition = await prisma.exerciseDefinition.findFirst({
    where: { normalizedName: 'barbell row' }
  })
  const squatDefinition = await prisma.exerciseDefinition.findFirst({
    where: { normalizedName: 'barbell back squat' }
  })
  const rdlDefinition = await prisma.exerciseDefinition.findFirst({
    where: { normalizedName: 'romanian deadlift' }
  })
  const deadliftDefinition = await prisma.exerciseDefinition.findFirst({
    where: { normalizedName: 'conventional deadlift' }
  })
  const ohpDefinition = await prisma.exerciseDefinition.findFirst({
    where: { normalizedName: 'overhead press' }
  })

  if (!benchPressDefinition || !rowDefinition || !squatDefinition || !rdlDefinition || !deadliftDefinition || !ohpDefinition) {
    throw new Error('Exercise definitions not found - something went wrong with seeding')
  }

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
      userId,
    },
  })

  console.log(`✓ Created week ${week1.weekNumber}`)

  // Day 1: Upper Body
  const day1 = await prisma.workout.create({
    data: {
      name: 'Upper Body',
      dayNumber: 1,
      weekId: week1.id,
      userId,
    },
  })

  // Day 1 Exercises
  await prisma.exercise.create({
    data: {
      name: 'Bench Press',
      exerciseDefinitionId: benchPressDefinition.id,
      order: 1,
      workoutId: day1.id,
      userId,
      prescribedSets: {
        create: [
          { setNumber: 1, reps: '5', weight: '135lbs', rir: 3, userId },
          { setNumber: 2, reps: '5', weight: '135lbs', rir: 2, userId },
          { setNumber: 3, reps: '5', weight: '135lbs', rir: 1, userId },
        ],
      },
    },
  })

  await prisma.exercise.create({
    data: {
      name: 'Barbell Rows',
      exerciseDefinitionId: rowDefinition.id,
      order: 2,
      workoutId: day1.id,
      userId,
      prescribedSets: {
        create: [
          { setNumber: 1, reps: '8', weight: '95lbs', rir: 2, userId },
          { setNumber: 2, reps: '8', weight: '95lbs', rir: 2, userId },
          { setNumber: 3, reps: '8', weight: '95lbs', rir: 1, userId },
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
      userId,
    },
  })

  await prisma.exercise.create({
    data: {
      name: 'Squat',
      exerciseDefinitionId: squatDefinition.id,
      order: 1,
      workoutId: day2.id,
      userId,
      prescribedSets: {
        create: [
          { setNumber: 1, reps: '5', weight: '185lbs', rir: 3, userId },
          { setNumber: 2, reps: '5', weight: '185lbs', rir: 2, userId },
          { setNumber: 3, reps: '5', weight: '185lbs', rir: 1, userId },
        ],
      },
    },
  })

  await prisma.exercise.create({
    data: {
      name: 'Romanian Deadlift',
      exerciseDefinitionId: rdlDefinition.id,
      order: 2,
      workoutId: day2.id,
      userId,
      prescribedSets: {
        create: [
          { setNumber: 1, reps: '8', weight: '135lbs', rir: 2, userId },
          { setNumber: 2, reps: '8', weight: '135lbs', rir: 2, userId },
          { setNumber: 3, reps: '8', weight: '135lbs', rir: 1, userId },
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
      userId,
    },
  })

  await prisma.exercise.create({
    data: {
      name: 'Deadlift',
      exerciseDefinitionId: deadliftDefinition.id,
      order: 1,
      workoutId: day3.id,
      userId,
      prescribedSets: {
        create: [
          { setNumber: 1, reps: '5', weight: '225lbs', rir: 3, userId },
          { setNumber: 2, reps: '5', weight: '225lbs', rir: 2, userId },
          { setNumber: 3, reps: '5', weight: '225lbs', rir: 1, userId },
        ],
      },
    },
  })

  await prisma.exercise.create({
    data: {
      name: 'Overhead Press',
      exerciseDefinitionId: ohpDefinition.id,
      order: 2,
      workoutId: day3.id,
      userId,
      prescribedSets: {
        create: [
          { setNumber: 1, reps: '8', weight: '75lbs', rir: 2, userId },
          { setNumber: 2, reps: '8', weight: '75lbs', rir: 2, userId },
          { setNumber: 3, reps: '8', weight: '75lbs', rir: 1, userId },
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
