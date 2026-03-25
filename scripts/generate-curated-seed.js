#!/usr/bin/env node

/**
 * Generate seed SQL for 47 curated exercises not yet in seed files.
 *
 * Reads:
 *   - scripts/exercise-mapping.json (curated entries with their_id)
 *   - scripts/fau-mapping/ (muscle-to-FAU mappings)
 *   - prisma/seeds/curated/exercise-defs.ts (exercise names, aliases, categories)
 *   - free-exercise-db exercises.json (fetched from GitHub)
 *
 * Writes:
 *   - prisma/seeds/08_curated_exercises.sql
 *
 * Usage: node scripts/generate-curated-seed.js
 */

const fs = require('fs')
const path = require('path')

const EXERCISE_DB_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'

// ── Manual overrides ────────────────────────────────────────────────
// Equipment overrides (when free-exercise-db's value is wrong for our context)
const EQUIPMENT_OVERRIDES = {
  ex_curated_005: ['machine'],              // Back Extension — hyperextension machine
  ex_curated_020: ['dumbbell'],             // Goblet Squat — typically dumbbell
  ex_curated_021: ['dumbbell'],             // Farmer's Walk — dumbbells
  ex_curated_027: ['barbell', 'bench'],     // Bench Press
  ex_curated_030: ['ez_bar', 'bench'],      // Lying Triceps Press
  ex_curated_039: ['dumbbell', 'bench'],    // Incline Dumbbell Press
  ex_curated_049: ['barbell', 'bench'],     // Barbell Glute Bridge
  ex_curated_054: ['bodyweight'],           // Bodyweight Lunges
  ex_curated_056: ['bodyweight'],           // Bodyweight Step-Ups
  ex_curated_057: ['bodyweight'],           // Bodyweight Bulgarian Split Squat
  ex_curated_058: ['barbell', 'bench'],     // Hip Thrust
  ex_curated_060: ['machine'],              // Assisted Pull-up
  ex_curated_061: ['machine'],              // Assisted Dip
  ex_curated_067: ['dumbbell'],             // DB Overhead Triceps Extension
}

// Secondary "shoulders" FAU resolution — pressing = front-delts, rowing/lateral = rear-delts
const SECONDARY_SHOULDER_OVERRIDES = {
  ex_curated_000: ['front-delts'],  // Chest Press
  ex_curated_007: ['front-delts'],  // Dip Machine
  ex_curated_016: [],               // Cable Wood Chop — shoulder involvement is minimal
  ex_curated_019: ['rear-delts'],   // Seated Cable Rows
  ex_curated_020: [],               // Goblet Squat — shoulder is stabilizer, not meaningful
  ex_curated_026: ['rear-delts'],   // One-Arm Dumbbell Row
  ex_curated_027: ['front-delts'],  // Bench Press
  ex_curated_028: ['rear-delts'],   // Bent Over Barbell Row
  ex_curated_031: ['front-delts'],  // Smith Machine Incline Bench Press
  ex_curated_039: ['front-delts'],  // Incline Dumbbell Press
  ex_curated_046: ['front-delts'],  // Pushups
  ex_curated_050: ['front-delts'],  // Dumbbell Floor Press
  ex_curated_061: ['front-delts'],  // Assisted Dip
}

// Secondary "abdominals" FAU resolution
const SECONDARY_ABS_OVERRIDES = {
  ex_curated_021: ['abs'],  // Farmer's Walk — core stabilization
}

// Exercises where the free-exercise-db match is too different — null out instructions
const SKIP_INSTRUCTIONS = new Set([
  'ex_curated_052',  // Pike Pushups matched to Handstand Push-Ups
  'ex_curated_057',  // Bodyweight Bulgarian Split Squat matched to Barbell Side Split Squat
  'ex_curated_067',  // DB Overhead Triceps Extension matched to Sled Overhead Triceps Extension
])

// Full FAU overrides for badly-matched exercises
const FAU_OVERRIDES = {
  ex_curated_052: { primary: ['front-delts', 'triceps'], secondary: ['chest'] },          // Pike Pushups
  ex_curated_057: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves'] },   // BW Bulgarian Split Squat
  ex_curated_067: { primary: ['triceps'], secondary: [] },                                  // DB Overhead Triceps Extension
}

// ── Data loading ────────────────────────────────────────────────────

async function fetchFreeExerciseDb() {
  console.log('Fetching free-exercise-db...')
  const res = await fetch(EXERCISE_DB_URL)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const data = await res.json()
  console.log(`  ${data.length} exercises`)
  return Object.fromEntries(data.map((e) => [e.id, e]))
}

function loadMapping() {
  const raw = fs.readFileSync(
    path.join(__dirname, 'exercise-mapping.json'),
    'utf8'
  )
  return JSON.parse(raw).matches
}

function loadFauMappings() {
  const defaults = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'fau-mapping', 'default-mappings.json'),
      'utf8'
    )
  ).mappings
  const shoulders = Object.fromEntries(
    JSON.parse(
      fs.readFileSync(
        path.join(__dirname, 'fau-mapping', 'shoulders-classified.json'),
        'utf8'
      )
    ).map((e) => [e.name, e])
  )
  const abs = Object.fromEntries(
    JSON.parse(
      fs.readFileSync(
        path.join(__dirname, 'fau-mapping', 'abs-classified.json'),
        'utf8'
      )
    ).map((e) => [e.name, e])
  )
  return { defaults, shoulders, abs }
}

function parseCuratedExerciseDefs() {
  const content = fs.readFileSync(
    path.join(__dirname, '..', 'prisma', 'seeds', 'curated', 'exercise-defs.ts'),
    'utf8'
  )
  const exercises = []
  const re =
    /\{\s*name:\s*['"](.+?)['"]\s*,\s*category:\s*['"](.+?)['"]\s*,\s*aliases:\s*\[([^\]]*)\]\s*\}/g
  let match
  while ((match = re.exec(content)) !== null) {
    const name = match[1]
    const category = match[2]
    const aliases = match[3]
      .split(',')
      .map((a) => a.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
    exercises.push({ name, category, aliases })
  }
  return Object.fromEntries(exercises.map((e) => [e.name.toLowerCase(), e]))
}

// ── Equipment mapping ───────────────────────────────────────────────

const EQUIP_MAP = {
  'body only': ['bodyweight'],
  barbell: ['barbell'],
  dumbbell: ['dumbbell'],
  cable: ['cable'],
  machine: ['machine'],
  kettlebells: ['kettlebell'],
  'e-z curl bar': ['ez_bar'],
  'foam roll': ['foam_roller'],
  bands: ['resistance_band'],
  other: [],
  none: [],
  'exercise ball': ['exercise_ball'],
  'medicine ball': ['medicine_ball'],
}

// ── FAU resolution ──────────────────────────────────────────────────

function resolveFaus(exerciseId, freeEx, fauMappings) {
  const primaryFaus = []
  const secondaryFaus = []

  for (const muscle of freeEx.primaryMuscles || []) {
    if (muscle === 'shoulders' && fauMappings.shoulders[freeEx.name]) {
      primaryFaus.push(...fauMappings.shoulders[freeEx.name].primaryFAUs)
      secondaryFaus.push(
        ...(fauMappings.shoulders[freeEx.name].secondaryFAUs || [])
      )
    } else if (
      muscle === 'abdominals' &&
      fauMappings.abs[freeEx.name]
    ) {
      primaryFaus.push(...fauMappings.abs[freeEx.name].primaryFAUs)
      secondaryFaus.push(
        ...(fauMappings.abs[freeEx.name].secondaryFAUs || [])
      )
    } else if (fauMappings.defaults[muscle]) {
      primaryFaus.push(...fauMappings.defaults[muscle])
    }
  }

  for (const muscle of freeEx.secondaryMuscles || []) {
    if (muscle === 'shoulders') {
      const override = SECONDARY_SHOULDER_OVERRIDES[exerciseId]
      if (override) secondaryFaus.push(...override)
    } else if (muscle === 'abdominals') {
      const override = SECONDARY_ABS_OVERRIDES[exerciseId]
      if (override) secondaryFaus.push(...override)
    } else if (fauMappings.defaults[muscle]) {
      secondaryFaus.push(...fauMappings.defaults[muscle])
    }
  }

  // Dedupe, remove secondary items already in primary
  const primary = [...new Set(primaryFaus)]
  const secondary = [
    ...new Set(secondaryFaus.filter((f) => !primary.includes(f))),
  ]

  return { primary, secondary }
}

// ── SQL generation ──────────────────────────────────────────────────

function escapeSQL(str) {
  return str.replace(/'/g, "''")
}

function sqlArray(arr) {
  if (!arr.length) return "ARRAY[]::text[]"
  return `ARRAY[${arr.map((v) => `'${escapeSQL(v)}'`).join(', ')}]`
}

function sqlString(val) {
  return val ? `'${escapeSQL(val)}'` : 'null'
}

function generateRow(entry, freeEx, curatedDef, fauMappings) {
  const id = entry.our_id
  const name = curatedDef.name
  const normalized = name.toLowerCase()
  const aliases = curatedDef.aliases
  const category = curatedDef.category

  // Equipment
  const equipment =
    EQUIPMENT_OVERRIDES[id] || EQUIP_MAP[freeEx.equipment || ''] || []

  // FAUs
  const { primary, secondary } = FAU_OVERRIDES[id]
    ? FAU_OVERRIDES[id]
    : resolveFaus(id, freeEx, fauMappings)

  // Instructions (skip for bad matches)
  const instrs =
    SKIP_INSTRUCTIONS.has(id) ? [] : (freeEx.instructions || [])
  const instrText = instrs.length
    ? instrs.map((s, i) => `${i + 1}. ${s}`).join('\n')
    : null

  // Metadata
  const force = entry.force || null
  const mechanic = entry.mechanic || null
  const level = entry.level || null

  return (
    `('${id}', '${escapeSQL(name)}', '${escapeSQL(normalized)}', ` +
    `${sqlArray(aliases)}, '${escapeSQL(category)}', true, null, ` +
    `'00000000-0000-0000-0000-000000000000', ${sqlArray(equipment)}, ` +
    `${sqlArray(primary)}, ${sqlArray(secondary)}, ` +
    `${sqlString(instrText)}, ${sqlString(force)}, ${sqlString(mechanic)}, ${sqlString(level)}, ` +
    `NOW(), NOW())`
  )
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const freeLookup = await fetchFreeExerciseDb()
  const matches = loadMapping()
  const fauMappings = loadFauMappings()
  const curatedDefs = parseCuratedExerciseDefs()

  const curated = matches
    .filter((m) => m.our_id.startsWith('ex_curated_'))
    .sort((a, b) => a.our_id.localeCompare(b.our_id))

  console.log(`\n${curated.length} curated exercises to generate`)

  const rows = []
  const issues = []

  for (const entry of curated) {
    const freeEx = freeLookup[entry.their_id]
    if (!freeEx) {
      issues.push(`  ${entry.our_id}: no free-exercise-db entry for ${entry.their_id}`)
      continue
    }
    const def = curatedDefs[entry.our_name.toLowerCase()]
    if (!def) {
      issues.push(`  ${entry.our_id}: no curated def for "${entry.our_name}"`)
      continue
    }
    rows.push(generateRow(entry, freeEx, def, fauMappings))
  }

  if (issues.length) {
    console.log('\nIssues:')
    issues.forEach((i) => console.log(i))
  }

  // Build SQL file
  const sql = `-- Curated Exercises Seed File
-- Exercises added from free-exercise-db for curated workout programs
-- Generated by: node scripts/generate-curated-seed.js

INSERT INTO "ExerciseDefinition" (
  id,
  name,
  "normalizedName",
  aliases,
  category,
  "isSystem",
  "createdBy",
  "userId",
  equipment,
  "primaryFAUs",
  "secondaryFAUs",
  instructions,
  force,
  mechanic,
  level,
  "createdAt",
  "updatedAt"
) VALUES
${rows.join(',\n')}

ON CONFLICT ("normalizedName") DO NOTHING;
`

  const outPath = path.join(
    __dirname,
    '..',
    'prisma',
    'seeds',
    '08_curated_exercises.sql'
  )
  fs.writeFileSync(outPath, sql)
  console.log(`\nWrote ${rows.length} exercises to ${path.basename(outPath)}`)
  console.log(`File size: ${sql.split('\n').length} lines`)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
