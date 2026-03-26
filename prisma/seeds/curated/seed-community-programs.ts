import { type Prisma, PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

type CuratedMeta = {
  file: string
  level: string
  targetDaysPerWeek: number
  equipmentNeeded: string[]
  goals: string[]
  focusAreas: string[]
}

const CURATED_PROGRAMS: CuratedMeta[] = [
  {
    file: '01-machine-starter.json',
    level: 'beginner',
    targetDaysPerWeek: 3,
    equipmentNeeded: ['machines'],
    goals: ['muscle building', 'general fitness'],
    focusAreas: ['full body'],
  },
  {
    file: '02-confidence-builder.json',
    level: 'beginner',
    targetDaysPerWeek: 3,
    equipmentNeeded: ['machines', 'dumbbells'],
    goals: ['muscle building', 'general fitness'],
    focusAreas: ['full body'],
  },
  {
    file: '03-full-body-strength.json',
    level: 'intermediate',
    targetDaysPerWeek: 3,
    equipmentNeeded: ['barbell', 'machines'],
    goals: ['strength', 'muscle building'],
    focusAreas: ['full body'],
  },
  {
    file: '04-push-pull-legs.json',
    level: 'intermediate',
    targetDaysPerWeek: 3,
    equipmentNeeded: ['barbell', 'dumbbells', 'cables', 'machines'],
    goals: ['muscle building', 'strength'],
    focusAreas: ['push', 'pull', 'legs'],
  },
  {
    file: '05-nothing-but-cables.json',
    level: 'beginner',
    targetDaysPerWeek: 3,
    equipmentNeeded: ['cables', 'dumbbells', 'machines'],
    goals: ['muscle building', 'general fitness'],
    focusAreas: ['full body'],
  },
  {
    file: '06-barbell-basics.json',
    level: 'intermediate',
    targetDaysPerWeek: 3,
    equipmentNeeded: ['barbell', 'cables'],
    goals: ['strength'],
    focusAreas: ['full body'],
  },
  {
    file: '07-heavy-upper-lower.json',
    level: 'intermediate',
    targetDaysPerWeek: 3,
    equipmentNeeded: ['barbell', 'dumbbells', 'machines'],
    goals: ['strength', 'muscle building'],
    focusAreas: ['upper', 'lower', 'full body'],
  },
  {
    file: '08-home-training.json',
    level: 'beginner',
    targetDaysPerWeek: 3,
    equipmentNeeded: ['bodyweight', 'pull-up bar'],
    goals: ['general fitness', 'muscle building'],
    focusAreas: ['full body'],
  },
  {
    file: '09-modern-bodybuild.json',
    level: 'intermediate',
    targetDaysPerWeek: 4,
    equipmentNeeded: ['machines', 'cables', 'dumbbells'],
    goals: ['muscle building'],
    focusAreas: ['upper', 'lower', 'full body'],
  },
  {
    file: '10-modern-bodybuild-female.json',
    level: 'intermediate',
    targetDaysPerWeek: 4,
    equipmentNeeded: ['machines', 'cables', 'dumbbells'],
    goals: ['muscle building'],
    focusAreas: ['upper', 'lower', 'glutes', 'full body'],
  },
]

const DISPLAY_NAME = 'Ripit Fitness'

const updateMode = process.argv.includes('--update')

// Resolve exerciseDefinitionIds in programData to match the target database.
// Snapshots contain IDs from the environment where they were generated, which
// may not exist in staging/prod. This rewrites them using normalizedName lookups.
function resolveExerciseIds(
  programData: Record<string, unknown>,
  idLookup: Map<string, string>
): { resolved: Record<string, unknown>; missing: string[] } {
  const missing: string[] = []
  const data = JSON.parse(JSON.stringify(programData)) // deep clone

  for (const week of (data.weeks || []) as Array<Record<string, unknown>>) {
    for (const workout of (week.workouts || []) as Array<Record<string, unknown>>) {
      for (const exercise of (workout.exercises || []) as Array<Record<string, unknown>>) {
        const name = exercise.name as string
        const normalized = name.toLowerCase()
        const resolvedId = idLookup.get(normalized)
        if (resolvedId) {
          exercise.exerciseDefinitionId = resolvedId
        } else {
          missing.push(name)
        }
      }
    }
  }

  return { resolved: data, missing }
}

function buildProgramData(
  meta: CuratedMeta,
  snapshotDir: string,
  idLookup: Map<string, string>
) {
  const raw = readFileSync(join(snapshotDir, meta.file), 'utf-8')
  const rawProgramData = JSON.parse(raw)

  const { resolved: programData, missing } = resolveExerciseIds(rawProgramData, idLookup)

  if (missing.length > 0) {
    console.warn(`  WARNING: ${rawProgramData.name} has ${missing.length} unresolved exercises:`)
    for (const name of [...new Set(missing)]) {
      console.warn(`    - ${name}`)
    }
  }

  const weeks = (programData.weeks || []) as Array<Record<string, unknown>>
  const weekCount = weeks.length
  const firstWeekWorkouts = (weeks[0]?.workouts || []) as Array<Record<string, unknown>>
  const workoutsPerWeek = firstWeekWorkouts.length
  const workoutCount = weekCount * workoutsPerWeek
  let exerciseCount = 0
  for (const week of weeks) {
    for (const workout of (week.workouts || []) as Array<Record<string, unknown>>) {
      exerciseCount += ((workout.exercises || []) as unknown[]).length
    }
  }

  const durationDisplay = weekCount === 1
    ? '1 week (repeating)'
    : `${weekCount} weeks`

  return {
    name: (programData.name || '') as string,
    description: (programData.description || '') as string,
    programType: (programData.programType || 'strength') as string,
    displayName: DISPLAY_NAME,
    programData: programData as Prisma.InputJsonValue,
    curated: true,
    weekCount,
    workoutCount,
    exerciseCount,
    level: meta.level,
    goals: meta.goals,
    targetDaysPerWeek: meta.targetDaysPerWeek,
    durationWeeks: weekCount,
    durationDisplay,
    equipmentNeeded: meta.equipmentNeeded,
    focusAreas: meta.focusAreas,
  }
}

async function main() {
  if (updateMode) {
    console.log('Running in --update mode (will replace existing programs)\n')
  }

  // Build normalizedName → id lookup from the target database
  const allDefs = await prisma.exerciseDefinition.findMany({
    select: { id: true, normalizedName: true },
  })
  const idLookup = new Map(allDefs.map((d) => [d.normalizedName, d.id]))
  console.log(`Loaded ${idLookup.size} exercise definitions for ID resolution\n`)

  const snapshotDir = join(__dirname, 'snapshots')

  let created = 0
  let updated = 0
  let skipped = 0

  for (const meta of CURATED_PROGRAMS) {
    const data = buildProgramData(meta, snapshotDir, idLookup)

    const existing = await prisma.communityProgram.findFirst({
      where: { name: data.name, curated: true },
    })

    if (existing) {
      if (updateMode) {
        await prisma.communityProgram.update({
          where: { id: existing.id },
          data,
        })
        console.log(`  UPDATED: ${data.name} (${data.weekCount}w, ${data.workoutCount} workouts, ${data.exerciseCount} exercises)`)
        updated++
      } else {
        console.log(`  SKIP (exists): ${data.name}`)
        skipped++
      }
      continue
    }

    await prisma.communityProgram.create({ data })
    console.log(`  CREATED: ${data.name} (${data.weekCount}w, ${data.workoutCount} workouts, ${data.exerciseCount} exercises)`)
    created++
  }

  console.log(`\nDone. Created ${created}, updated ${updated}, skipped ${skipped}.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
