#!/usr/bin/env node

/**
 * Sync exercise data to the target database.
 *
 * Handles:
 *   1. Exercise definitions (upsert from exercise-definitions.json)
 *   2. Image URLs (from exercise-mapping.json + validated IDs)
 *   3. Community programs (from snapshots, with ID resolution)
 *
 * Designed to run as part of the deploy pipeline (after prisma migrate deploy).
 * Idempotent — safe to run multiple times. Additive only — never deletes data.
 *
 * Usage:
 *   DATABASE_URL=<conn> npx tsx scripts/sync-exercise-data.ts
 *   doppler run --config preview -- npx tsx scripts/sync-exercise-data.ts
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SCRIPTS_DIR = __dirname
const SEEDS_DIR = join(SCRIPTS_DIR, '..', 'prisma', 'seeds')
const CURATED_DIR = join(SEEDS_DIR, 'curated')
const SNAPSHOT_DIR = join(CURATED_DIR, 'snapshots')

const DISPLAY_NAME = 'Ripit Fitness'

// ── Types ──────────────────────────────────────────────────────────

interface ExerciseDef {
  id: string
  name: string
  normalizedName: string
  aliases: string[]
  category: string | null
  equipment: string[]
  primaryFAUs: string[]
  secondaryFAUs: string[]
  instructions: string | null
  force: string | null
  mechanic: string | null
  level: string | null
}

interface MappingMatch {
  our_id: string
  our_name: string
  their_id: string
  their_name: string
  match_type: string
  confidence: string
  validated: boolean
}

interface CuratedMeta {
  file: string
  level: string
  targetDaysPerWeek: number
  equipmentNeeded: string[]
  goals: string[]
  focusAreas: string[]
}

// ── Data loading ───────────────────────────────────────────────────

function loadExerciseDefinitions(): ExerciseDef[] {
  const raw = readFileSync(join(SEEDS_DIR, 'exercise-definitions.json'), 'utf8')
  return JSON.parse(raw)
}

function loadMapping(): MappingMatch[] {
  const raw = readFileSync(join(SCRIPTS_DIR, 'exercise-mapping.json'), 'utf8')
  return JSON.parse(raw).matches
}

function loadValidatedIds(): Set<string> {
  const raw = readFileSync(join(SCRIPTS_DIR, 'validated-exercise-ids.json'), 'utf8')
  return new Set(JSON.parse(raw))
}

function loadCuratedPrograms(): CuratedMeta[] {
  // Import the metadata inline rather than parsing TS
  return [
    { file: '01-machine-starter.json', level: 'beginner', targetDaysPerWeek: 3, equipmentNeeded: ['machines'], goals: ['muscle building', 'general fitness'], focusAreas: ['full body'] },
    { file: '02-confidence-builder.json', level: 'beginner', targetDaysPerWeek: 3, equipmentNeeded: ['machines', 'dumbbells'], goals: ['muscle building', 'general fitness'], focusAreas: ['full body'] },
    { file: '03-full-body-strength.json', level: 'intermediate', targetDaysPerWeek: 3, equipmentNeeded: ['barbell', 'machines'], goals: ['strength', 'muscle building'], focusAreas: ['full body'] },
    { file: '04-push-pull-legs.json', level: 'intermediate', targetDaysPerWeek: 3, equipmentNeeded: ['barbell', 'dumbbells', 'cables', 'machines'], goals: ['muscle building', 'strength'], focusAreas: ['push', 'pull', 'legs'] },
    { file: '05-nothing-but-cables.json', level: 'beginner', targetDaysPerWeek: 3, equipmentNeeded: ['cables', 'dumbbells', 'machines'], goals: ['muscle building', 'general fitness'], focusAreas: ['full body'] },
    { file: '06-barbell-basics.json', level: 'intermediate', targetDaysPerWeek: 3, equipmentNeeded: ['barbell', 'cables'], goals: ['strength'], focusAreas: ['full body'] },
    { file: '07-heavy-upper-lower.json', level: 'intermediate', targetDaysPerWeek: 3, equipmentNeeded: ['barbell', 'dumbbells', 'machines'], goals: ['strength', 'muscle building'], focusAreas: ['upper', 'lower', 'full body'] },
    { file: '08-home-training.json', level: 'beginner', targetDaysPerWeek: 3, equipmentNeeded: ['bodyweight', 'pull-up bar'], goals: ['general fitness', 'muscle building'], focusAreas: ['full body'] },
    { file: '09-modern-bodybuild.json', level: 'intermediate', targetDaysPerWeek: 4, equipmentNeeded: ['machines', 'cables', 'dumbbells'], goals: ['muscle building'], focusAreas: ['upper', 'lower', 'full body'] },
    { file: '10-modern-bodybuild-female.json', level: 'intermediate', targetDaysPerWeek: 4, equipmentNeeded: ['machines', 'cables', 'dumbbells'], goals: ['muscle building'], focusAreas: ['upper', 'lower', 'glutes', 'full body'] },
  ]
}

// ── Step 1: Sync exercise definitions ──────────────────────────────

async function syncExerciseDefinitions(exercises: ExerciseDef[]) {
  console.log('Step 1: Syncing exercise definitions...')

  let created = 0
  let updated = 0
  let unchanged = 0

  for (const ex of exercises) {
    const existing = await prisma.exerciseDefinition.findUnique({
      where: { normalizedName: ex.normalizedName },
    })

    if (!existing) {
      await prisma.exerciseDefinition.create({
        data: {
          id: ex.id,
          name: ex.name,
          normalizedName: ex.normalizedName,
          aliases: ex.aliases,
          category: ex.category,
          isSystem: true,
          createdBy: null,
          userId: '00000000-0000-0000-0000-000000000000',
          equipment: ex.equipment,
          primaryFAUs: ex.primaryFAUs,
          secondaryFAUs: ex.secondaryFAUs,
          instructions: ex.instructions,
          force: ex.force,
          mechanic: ex.mechanic,
          level: ex.level,
        },
      })
      created++
    } else {
      // Check if any fields need updating
      const needsUpdate =
        existing.instructions !== ex.instructions ||
        existing.force !== ex.force ||
        existing.mechanic !== ex.mechanic ||
        existing.level !== ex.level ||
        JSON.stringify(existing.aliases) !== JSON.stringify(ex.aliases) ||
        JSON.stringify(existing.equipment) !== JSON.stringify(ex.equipment) ||
        JSON.stringify(existing.primaryFAUs) !== JSON.stringify(ex.primaryFAUs) ||
        JSON.stringify(existing.secondaryFAUs) !== JSON.stringify(ex.secondaryFAUs)

      if (needsUpdate) {
        await prisma.exerciseDefinition.update({
          where: { id: existing.id },
          data: {
            aliases: ex.aliases,
            category: ex.category,
            equipment: ex.equipment,
            primaryFAUs: ex.primaryFAUs,
            secondaryFAUs: ex.secondaryFAUs,
            instructions: ex.instructions,
            force: ex.force,
            mechanic: ex.mechanic,
            level: ex.level,
          },
        })
        updated++
      } else {
        unchanged++
      }
    }
  }

  console.log(`  Created: ${created}, Updated: ${updated}, Unchanged: ${unchanged}`)
  return { created, updated, unchanged }
}

// ── Step 2: Sync image URLs ────────────────────────────────────────

// Exercises with bad image matches — skip image sync, clear if present
const SKIP_IMAGES = new Set([
  'ex_curated_033',  // Lat Pull-Around — images don't match the exercise
])

// Exercises with manually uploaded images (not derived from mapping)
const MANUAL_IMAGES: Record<string, string[]> = {
  'ex_bw_016': ['ex_bw_016/0.jpg', 'ex_bw_016/1.jpg'],         // Bulgarian Split Squat
  'ex_db_031': ['ex_db_031/0.jpg', 'ex_db_031/1.jpg'],         // Dumbbell Bulgarian Split Squat
  'ex_curated_057': ['ex_curated_057/0.jpg', 'ex_curated_057/1.jpg'], // Bodyweight Bulgarian Split Squat
}

async function syncImageUrls(
  mapping: MappingMatch[],
  validatedIds: Set<string>
) {
  console.log('Step 2: Syncing image URLs...')

  // Clear images for exercises with known bad matches
  let cleared = 0
  for (const id of SKIP_IMAGES) {
    const ex = await prisma.exerciseDefinition.findUnique({
      where: { id },
      select: { imageUrls: true },
    })
    if (ex && ex.imageUrls.length > 0) {
      await prisma.exerciseDefinition.update({
        where: { id },
        data: { imageUrls: [] },
      })
      cleared++
    }
  }
  if (cleared > 0) console.log(`  Cleared ${cleared} bad image matches`)

  // Apply manually uploaded images
  let manual = 0
  for (const [id, imageUrls] of Object.entries(MANUAL_IMAGES)) {
    const ex = await prisma.exerciseDefinition.findUnique({
      where: { id },
      select: { imageUrls: true },
    })
    if (ex && JSON.stringify(ex.imageUrls) !== JSON.stringify(imageUrls)) {
      await prisma.exerciseDefinition.update({
        where: { id },
        data: { imageUrls },
      })
      manual++
    }
  }
  if (manual > 0) console.log(`  Set ${manual} manual image overrides`)

  // Build lookup: for curated exercises, find the original exercise that
  // shares the same free-exercise-db match (to reuse its image path)
  const nonCurated = mapping.filter((m) => !m.our_id.startsWith('ex_curated_'))
  const nonCuratedByTheirId: Record<string, string> = {}
  for (const m of nonCurated) {
    nonCuratedByTheirId[m.their_id] = m.our_id
  }

  let updated = 0
  let skipped = 0

  for (const m of mapping) {
    // Skip exercises with known bad image matches
    if (SKIP_IMAGES.has(m.our_id)) continue

    // Only process validated exercises and curated exercises
    if (!validatedIds.has(m.our_id) && !m.our_id.startsWith('ex_curated_')) {
      continue
    }

    // Determine the image path base ID
    let imageBaseId: string
    if (m.our_id.startsWith('ex_curated_')) {
      // Curated exercises reuse the original's image path
      const origId = nonCuratedByTheirId[m.their_id]
      if (!origId) continue // No matching original, skip
      imageBaseId = origId
    } else {
      imageBaseId = m.our_id
    }

    const imageUrls = [`${imageBaseId}/0.jpg`, `${imageBaseId}/1.jpg`]

    // Only update if currently empty
    const existing = await prisma.exerciseDefinition.findUnique({
      where: { id: m.our_id },
      select: { imageUrls: true },
    })

    if (!existing) continue

    if (existing.imageUrls.length === 0) {
      await prisma.exerciseDefinition.update({
        where: { id: m.our_id },
        data: { imageUrls },
      })
      updated++
    } else {
      skipped++
    }
  }

  console.log(`  Updated: ${updated}, Skipped (already have images): ${skipped}`)
  return { updated, skipped }
}

// ── Step 3: Sync community programs ────────────────────────────────

function resolveExerciseIds(
  programData: Record<string, unknown>,
  idLookup: Map<string, string>
): { resolved: Record<string, unknown>; missing: string[] } {
  const missing: string[] = []
  const data = JSON.parse(JSON.stringify(programData))

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

const updatePrograms = process.argv.includes('--update-programs')

async function syncCommunityPrograms(programs: CuratedMeta[]) {
  if (updatePrograms) {
    console.log('Step 3: Syncing community programs (--update-programs: will overwrite existing)...')
  } else {
    console.log('Step 3: Syncing community programs...')
  }

  // Build name → id lookup
  const allDefs = await prisma.exerciseDefinition.findMany({
    select: { id: true, normalizedName: true },
  })
  const idLookup = new Map(allDefs.map((d) => [d.normalizedName, d.id]))

  let created = 0
  let updated = 0
  let skipped = 0

  // Check which snapshot files exist
  const availableSnapshots = new Set(readdirSync(SNAPSHOT_DIR))

  for (const meta of programs) {
    if (!availableSnapshots.has(meta.file)) {
      console.log(`  SKIP: ${meta.file} (snapshot not found)`)
      continue
    }

    const raw = readFileSync(join(SNAPSHOT_DIR, meta.file), 'utf-8')
    const rawProgramData = JSON.parse(raw)
    const { resolved: programData, missing } = resolveExerciseIds(rawProgramData, idLookup)

    if (missing.length > 0) {
      const unique = [...new Set(missing)]
      console.warn(`  WARNING: ${rawProgramData.name} has ${unique.length} unresolved exercises:`)
      for (const name of unique) console.warn(`    - ${name}`)
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

    const durationDisplay = weekCount === 1 ? '1 week (repeating)' : `${weekCount} weeks`

    const data = {
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

    const existing = await prisma.communityProgram.findFirst({
      where: { name: data.name, curated: true },
    })

    if (existing) {
      if (updatePrograms) {
        await prisma.communityProgram.update({
          where: { id: existing.id },
          data,
        })
        console.log(`  UPDATED: ${data.name}`)
        updated++
      } else {
        console.log(`  SKIP (exists): ${data.name}`)
        skipped++
      }
    } else {
      await prisma.communityProgram.create({ data })
      created++
    }
  }

  console.log(`  Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`)
  return { created, updated, skipped }
}

// ── Step 4: Verify ─────────────────────────────────────────────────

async function verify() {
  console.log('\nStep 4: Verification...')

  const exerciseCount = await prisma.exerciseDefinition.count({
    where: { isSystem: true },
  })
  const withInstructions = await prisma.exerciseDefinition.count({
    where: { isSystem: true, instructions: { not: null } },
  })

  // Count exercises with non-empty imageUrls
  const allExercises = await prisma.exerciseDefinition.findMany({
    where: { isSystem: true },
    select: { imageUrls: true },
  })
  const withImages = allExercises.filter((e) => e.imageUrls.length > 0).length

  const communityPrograms = await prisma.communityProgram.count({
    where: { curated: true },
  })

  console.log('')
  console.log('  ┌─────────────────────────┬───────┐')
  console.log(`  │ Exercise definitions     │ ${String(exerciseCount).padStart(5)} │`)
  console.log(`  │ With instructions        │ ${String(withInstructions).padStart(5)} │`)
  console.log(`  │ With images              │ ${String(withImages).padStart(5)} │`)
  console.log(`  │ Community programs       │ ${String(communityPrograms).padStart(5)} │`)
  console.log('  └─────────────────────────┴───────┘')
  console.log('')

  // Fail if critical thresholds aren't met
  const errors: string[] = []
  if (exerciseCount < 312) errors.push(`Expected >= 312 exercises, got ${exerciseCount}`)
  if (withInstructions < 230) errors.push(`Expected >= 230 with instructions, got ${withInstructions}`)
  if (withImages < 275) errors.push(`Expected >= 275 with images, got ${withImages}`)
  if (communityPrograms < 10) errors.push(`Expected >= 10 community programs, got ${communityPrograms}`)

  if (errors.length > 0) {
    console.error('VERIFICATION FAILED:')
    for (const err of errors) console.error(`  - ${err}`)
    process.exit(1)
  }

  console.log('Verification passed.')
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('=== Exercise Data Sync ===\n')

  const exercises = loadExerciseDefinitions()
  const mapping = loadMapping()
  const validatedIds = loadValidatedIds()
  const programs = loadCuratedPrograms()

  await syncExerciseDefinitions(exercises)
  console.log('')
  await syncImageUrls(mapping, validatedIds)
  console.log('')
  await syncCommunityPrograms(programs)
  await verify()

  console.log('Done.')
}

main()
  .catch((err) => {
    console.error('Sync failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
