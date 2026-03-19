import { PrismaClient } from '@prisma/client'
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

const DISPLAY_NAME = 'Iron Works Fitness'

async function main() {
  const snapshotDir = join(__dirname, 'snapshots')

  let created = 0
  let skipped = 0

  for (const meta of CURATED_PROGRAMS) {
    const raw = readFileSync(join(snapshotDir, meta.file), 'utf-8')
    const programData = JSON.parse(raw)

    // Check if already exists by name
    const existing = await prisma.communityProgram.findFirst({
      where: { name: programData.name, curated: true },
    })

    if (existing) {
      console.log(`  SKIP (exists): ${programData.name}`)
      skipped++
      continue
    }

    // Count exercises and workouts from the snapshot
    const weeks = programData.weeks || []
    const weekCount = weeks.length
    const workoutsPerWeek = weeks[0]?.workouts?.length || 0
    const workoutCount = weekCount * workoutsPerWeek
    let exerciseCount = 0
    for (const week of weeks) {
      for (const workout of week.workouts || []) {
        exerciseCount += (workout.exercises || []).length
      }
    }

    const durationDisplay = weekCount === 1
      ? '1 week (repeating)'
      : `${weekCount} weeks`

    await prisma.communityProgram.create({
      data: {
        name: programData.name,
        description: programData.description || '',
        programType: programData.programType || 'strength',
        displayName: DISPLAY_NAME,
        programData,
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
      },
    })

    console.log(`  CREATED: ${programData.name} (${weekCount}w, ${workoutCount} workouts, ${exerciseCount} exercises)`)
    created++
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
