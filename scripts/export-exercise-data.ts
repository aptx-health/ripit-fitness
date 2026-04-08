#!/usr/bin/env node

/**
 * Export all system exercise definitions from the database to a JSON file.
 * This creates the canonical source of truth for the sync script.
 *
 * Run against a fully-seeded database (e.g., staging):
 *   DATABASE_URL=<conn> npx tsx scripts/export-exercise-data.ts
 *
 * Writes: prisma/seeds/exercise-definitions.json
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const exercises = await prisma.exerciseDefinition.findMany({
    where: { isSystem: true },
    select: {
      id: true,
      name: true,
      normalizedName: true,
      aliases: true,
      category: true,
      equipment: true,
      primaryFAUs: true,
      secondaryFAUs: true,
      instructions: true,
      force: true,
      mechanic: true,
      level: true,
    },
    orderBy: { id: 'asc' },
  })

  const outPath = join(__dirname, '..', 'prisma', 'seeds', 'exercise-definitions.json')
  writeFileSync(outPath, `${JSON.stringify(exercises, null, 2)}\n`)

  console.log(`Exported ${exercises.length} exercise definitions to prisma/seeds/exercise-definitions.json`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
