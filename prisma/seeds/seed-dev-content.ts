/**
 * Dev Content Seed — seeds realistic local dev data for test-user-id.
 * Idempotent: skips if data already exists.
 * Usage: DATABASE_URL="..." npx tsx prisma/seeds/seed-dev-content.ts
 */
import { PrismaClient } from '@prisma/client'
import { seedCuratedExerciseDefinitions } from './curated/exercise-defs'
import { COLLECTIONS } from './dev-articles'

const prisma = new PrismaClient()

const USER_ID = 'test-user-id'
const PROGRAM_NAME = 'Dev 4-Week Strength'

type SetDef = { reps: string; weight: string; rir?: number }

type ExDef = { name: string; sets: SetDef[] }

type WorkoutDef = { name: string; dayNumber: number; exercises: ExDef[] }

function sets(count: number, reps: string, weight: string, rir?: number): SetDef[] {
  return Array.from({ length: count }, () => ({ reps, weight, rir }))
}

// Week templates — weeks 2-4 reuse the same structure with slight progression
const WORKOUTS: WorkoutDef[] = [
  {
    name: 'Upper Body',
    dayNumber: 1,
    exercises: [
      { name: 'Barbell Bench Press', sets: sets(4, '5', '155lbs', 3) },
      { name: 'Barbell Row', sets: sets(4, '8', '115lbs', 2) },
      { name: 'Overhead Press', sets: sets(3, '8', '85lbs', 2) },
      { name: 'Face Pull', sets: sets(3, '12', '30lbs', 2) },
      { name: 'Tricep Pushdown', sets: sets(3, '10', '40lbs', 2) },
    ],
  },
  {
    name: 'Lower Body',
    dayNumber: 2,
    exercises: [
      { name: 'Barbell Back Squat', sets: sets(4, '5', '195lbs', 3) },
      { name: 'Romanian Deadlift', sets: sets(3, '8', '155lbs', 2) },
      { name: 'Leg Press', sets: sets(3, '10', '270lbs', 2) },
      { name: 'Leg Curl', sets: sets(3, '12', '80lbs', 2) },
      { name: 'Calf Raise', sets: sets(3, '15', '135lbs', 2) },
    ],
  },
  {
    name: 'Full Body',
    dayNumber: 3,
    exercises: [
      { name: 'Conventional Deadlift', sets: sets(3, '5', '245lbs', 3) },
      { name: 'Dumbbell Bench Press', sets: sets(3, '10', '55lbs', 2) },
      { name: 'Pull-Up', sets: sets(3, '8', 'bodyweight', 2) },
      { name: 'Lateral Raise', sets: sets(3, '12', '20lbs', 2) },
    ],
  },
]

// Weight bumps per week (week index 0 = base, 1 = +5lbs compounds, etc.)
const PROGRESSION: Record<number, number> = { 0: 0, 1: 5, 2: 10, 3: 10 }

function progressWeight(base: string, weekIdx: number): string {
  const bump = PROGRESSION[weekIdx] ?? 0
  if (bump === 0) return base
  const match = base.match(/^(\d+(?:\.\d+)?)(lbs?)$/)
  if (!match) return base
  return `${parseFloat(match[1]) + bump}lbs`
}

async function getExDefLookup(): Promise<Map<string, string>> {
  const defs = await prisma.exerciseDefinition.findMany({
    select: { id: true, normalizedName: true },
  })
  return new Map(defs.map((d) => [d.normalizedName, d.id]))
}

async function seedProgram(lookup: Map<string, string>) {
  // Check idempotency
  const existing = await prisma.program.findFirst({
    where: { userId: USER_ID, name: PROGRAM_NAME },
  })
  if (existing) {
    console.log(`Program "${PROGRAM_NAME}" already exists — skipping program seed`)
    return existing.id
  }

  const program = await prisma.program.create({
    data: {
      name: PROGRAM_NAME,
      description: 'A 4-week upper/lower/full body strength program for local dev testing.',
      userId: USER_ID,
      isActive: true,
      isUserCreated: true,
      programType: 'strength',
      goals: ['strength', 'muscle building'],
      level: 'intermediate',
      durationWeeks: 4,
      durationDisplay: '4 weeks',
      targetDaysPerWeek: 3,
      equipmentNeeded: ['barbell', 'dumbbells', 'cables', 'machines'],
      focusAreas: ['upper', 'lower', 'full body'],
    },
  })

  const workoutIds: { weekNumber: number; dayNumber: number; workoutId: string; exercises: { id: string; name: string; defId: string }[] }[] = []

  for (let w = 0; w < 4; w++) {
    const week = await prisma.week.create({
      data: { weekNumber: w + 1, programId: program.id, userId: USER_ID },
    })

    for (const wDef of WORKOUTS) {
      const workout = await prisma.workout.create({
        data: {
          name: wDef.name,
          dayNumber: wDef.dayNumber,
          weekId: week.id,
          userId: USER_ID,
        },
      })

      const exerciseRecords: { id: string; name: string; defId: string }[] = []

      for (let i = 0; i < wDef.exercises.length; i++) {
        const exDef = wDef.exercises[i]
        const defId = lookup.get(exDef.name.toLowerCase())
        if (!defId) {
          console.warn(`  WARNING: No definition for "${exDef.name}" — skipping`)
          continue
        }

        const exercise = await prisma.exercise.create({
          data: {
            name: exDef.name,
            exerciseDefinitionId: defId,
            order: i + 1,
            workoutId: workout.id,
            userId: USER_ID,
            prescribedSets: {
              create: exDef.sets.map((s, idx) => ({
                setNumber: idx + 1,
                reps: s.reps,
                weight: progressWeight(s.weight, w),
                rir: s.rir ?? null,
                userId: USER_ID,
              })),
            },
          },
        })

        exerciseRecords.push({ id: exercise.id, name: exDef.name, defId })
      }

      workoutIds.push({
        weekNumber: w + 1,
        dayNumber: wDef.dayNumber,
        workoutId: workout.id,
        exercises: exerciseRecords,
      })
    }
  }

  console.log(`Created program "${PROGRAM_NAME}" — 4 weeks, ${workoutIds.length} workouts`)
  return program.id
}

async function seedWorkoutHistory() {
  // Find the program
  const program = await prisma.program.findFirst({
    where: { userId: USER_ID, name: PROGRAM_NAME },
    include: {
      weeks: {
        where: { weekNumber: { lte: 2 } },
        include: {
          workouts: {
            include: {
              exercises: {
                include: { prescribedSets: true },
              },
            },
          },
        },
      },
    },
  })

  if (!program) {
    console.warn('Program not found — skipping history seed')
    return
  }

  // Check if we already have completions
  const existingCompletions = await prisma.workoutCompletion.count({
    where: { userId: USER_ID },
  })
  if (existingCompletions > 0) {
    console.log(`${existingCompletions} completions already exist — skipping history seed`)
    return
  }

  let completionCount = 0

  for (const week of program.weeks) {
    for (const workout of week.workouts) {
      // Completion date: spread across the past 2 weeks
      const daysAgo = (2 - week.weekNumber) * 7 + (3 - workout.dayNumber) * 2 + 1
      const completedAt = new Date()
      completedAt.setDate(completedAt.getDate() - daysAgo)
      completedAt.setHours(7 + workout.dayNumber, 30, 0, 0)

      const completion = await prisma.workoutCompletion.create({
        data: {
          workoutId: workout.id,
          userId: USER_ID,
          status: 'completed',
          completedAt,
          cycleNumber: 1,
        },
      })

      // Create logged sets for each exercise
      for (const exercise of workout.exercises) {
        // Clone exercise onto the completion
        const completionExercise = await prisma.exercise.create({
          data: {
            name: exercise.name,
            exerciseDefinitionId: exercise.exerciseDefinitionId,
            order: exercise.order,
            userId: USER_ID,
            workoutCompletionId: completion.id,
          },
        })

        for (const ps of exercise.prescribedSets) {
          // Simulate realistic logged data: slight variation from prescribed
          const prescribedReps = parseInt(ps.reps) || 8
          const repsVariation = Math.random() > 0.3 ? 0 : -1
          const loggedReps = Math.max(1, prescribedReps + repsVariation)

          const weightMatch = (ps.weight || '0').match(/^(\d+(?:\.\d+)?)/)
          const baseWeight = weightMatch ? parseFloat(weightMatch[1]) : 0

          const loggedRpe = ps.rir != null ? 10 - ps.rir + (Math.random() > 0.5 ? 1 : 0) : null

          await prisma.loggedSet.create({
            data: {
              setNumber: ps.setNumber,
              reps: loggedReps,
              weight: baseWeight,
              weightUnit: 'lbs',
              rpe: loggedRpe,
              exerciseId: completionExercise.id,
              completionId: completion.id,
              userId: USER_ID,
              createdAt: completedAt,
            },
          })
        }
      }

      completionCount++
    }
  }

  console.log(`Created ${completionCount} workout completions with logged sets`)
}

async function seedLearningContent() {
  // Check if Article table exists
  try {
    await prisma.$queryRaw`SELECT 1 FROM "Article" LIMIT 0`
  } catch {
    console.log('Article table not found — skipping learning content seed')
    return
  }

  // Check idempotency
  const existingCollection = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "Collection" WHERE name = 'Getting Started'
  `
  if (Number(existingCollection[0]?.count) > 0) {
    console.log('Learning collections already exist — skipping')
    return
  }

  // Collect all unique tags across all articles
  const allTags = new Set<string>()
  for (const collection of COLLECTIONS) {
    for (const article of collection.articles) {
      for (const tag of article.tags) {
        allTags.add(tag)
      }
    }
  }

  // Create tags
  const tagIdMap = new Map<string, string>()
  for (const tagName of allTags) {
    const result = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "Tag" (id, name, category)
      VALUES (gen_random_uuid()::text, ${tagName}, 'topic'::"TagCategory")
      ON CONFLICT (name, category) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `
    if (result.length > 0) {
      tagIdMap.set(tagName, result[0].id)
    }
  }

  let totalArticles = 0

  for (const collection of COLLECTIONS) {
    // Create articles for this collection
    const articleIds: string[] = []
    for (const article of collection.articles) {
      const result = await prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO "Article" (id, title, slug, body, level, status, "authorId", "readTimeMinutes", "publishedAt", "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid()::text,
          ${article.title},
          ${article.slug},
          ${article.body},
          ${article.level}::"ArticleLevel",
          'published'::"ArticleStatus",
          ${USER_ID},
          ${article.readTimeMinutes},
          NOW(),
          NOW(),
          NOW()
        )
        ON CONFLICT (slug) DO NOTHING
        RETURNING id
      `
      if (result.length > 0) {
        articleIds.push(result[0].id)
        totalArticles++

        // Create article-tag associations
        for (const tagName of article.tags) {
          const tagId = tagIdMap.get(tagName)
          if (tagId) {
            await prisma.$queryRaw`
              INSERT INTO "ArticleTag" ("articleId", "tagId")
              VALUES (${result[0].id}, ${tagId})
              ON CONFLICT DO NOTHING
            `
          }
        }
      }
    }

    // Create collection
    const collectionResult = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "Collection" (id, name, description, "displayOrder", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${collection.name}, ${collection.description}, ${collection.displayOrder}, NOW(), NOW())
      RETURNING id
    `

    if (collectionResult.length > 0) {
      const collectionId = collectionResult[0].id
      for (let i = 0; i < articleIds.length; i++) {
        await prisma.$queryRaw`
          INSERT INTO "CollectionArticle" ("collectionId", "articleId", "order")
          VALUES (${collectionId}, ${articleIds[i]}, ${i + 1})
          ON CONFLICT DO NOTHING
        `
      }
    }

    console.log(`  "${collection.name}": ${articleIds.length} articles`)
  }

  console.log(`Created ${totalArticles} articles across ${COLLECTIONS.length} collections`)
}

async function main() {
  console.log('Seeding dev content...\n')

  // 1. Exercise definitions
  await seedCuratedExerciseDefinitions(prisma)
  console.log()

  // 2. Program
  const lookup = await getExDefLookup()
  await seedProgram(lookup)

  // 3. Workout history
  await seedWorkoutHistory()

  // 4. Learning content
  await seedLearningContent()

  console.log('\nDev content seed complete.')
}

main()
  .catch((e) => {
    console.error('Dev content seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
