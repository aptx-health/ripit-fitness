import { PrismaClient } from '@prisma/client'
import { seedCuratedExerciseDefinitions } from './exercise-defs'
import { createProgramFromSpec } from './helpers'
import { machineStarter } from './programs/01-machine-starter'
import { confidenceBuilder } from './programs/02-confidence-builder'
import { fullBodyStrength } from './programs/03-full-body-strength'
import { pushPullLegs } from './programs/04-push-pull-legs'
import { nothingButCables } from './programs/05-nothing-but-cables'
import { barbellBasics } from './programs/06-barbell-basics'
import { heavyUpperLower } from './programs/07-heavy-upper-lower'
import { homeTraining } from './programs/08-home-training'

const prisma = new PrismaClient()

const PROGRAMS = [
  machineStarter,
  confidenceBuilder,
  fullBodyStrength,
  pushPullLegs,
  nothingButCables,
  barbellBasics,
  heavyUpperLower,
  homeTraining,
]

async function main() {
  // Get user ID from args or env
  const userId =
    process.argv[2] || process.env.SEED_USER_ID

  if (!userId) {
    console.error(
      'Usage: npx tsx prisma/seeds/curated/index.ts <userId>\n' +
        '  or set SEED_USER_ID env var'
    )
    process.exit(1)
  }

  console.log(`Seeding curated workouts for user: ${userId}\n`)

  // Step 1: Ensure exercise definitions exist
  await seedCuratedExerciseDefinitions(prisma)
  console.log()

  // Step 2: Create programs
  console.log('Creating programs...')
  const programIds: string[] = []
  for (const spec of PROGRAMS) {
    const id = await createProgramFromSpec(prisma, userId, spec)
    programIds.push(id)
  }

  console.log(`\nDone! Created ${programIds.length} programs.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
