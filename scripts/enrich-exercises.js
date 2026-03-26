#!/usr/bin/env node

/**
 * Enrich exercise seed SQL files with data from free-exercise-db.
 *
 * Adds to each seed file:
 *   - instructions (step-by-step, from free-exercise-db)
 *   - force (push/pull/static)
 *   - mechanic (compound/isolation)
 *   - level (beginner/intermediate/expert)
 *
 * Reads:
 *   - scripts/exercise-mapping.json (matches with their_id + metadata)
 *   - scripts/validated-exercise-ids.json (IDs validated in #240)
 *   - free-exercise-db exercises.json (fetched from GitHub)
 *
 * Writes:
 *   - Updated prisma/seeds/0*.sql files
 *
 * Usage: node scripts/enrich-exercises.js
 */

const fs = require('fs')
const path = require('path')

const EXERCISE_DB_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'

const SEEDS_DIR = path.join(__dirname, '..', 'prisma', 'seeds')
const MAPPING_PATH = path.join(__dirname, 'exercise-mapping.json')
const VALIDATED_IDS_PATH = path.join(__dirname, 'validated-exercise-ids.json')

async function fetchFreeExerciseDb() {
  console.log('Fetching free-exercise-db from GitHub...')
  const response = await fetch(EXERCISE_DB_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
  }
  const exercises = await response.json()
  console.log(`  Fetched ${exercises.length} exercises`)
  return exercises
}

function buildInstructionsLookup(exercises) {
  const lookup = new Map()
  for (const ex of exercises) {
    if (ex.instructions && ex.instructions.length > 0) {
      lookup.set(ex.id, ex.instructions)
    }
  }
  console.log(`  ${lookup.size} exercises have instructions`)
  return lookup
}

function loadMapping() {
  const raw = fs.readFileSync(MAPPING_PATH, 'utf8')
  return JSON.parse(raw).matches
}

function loadValidatedIds() {
  const raw = fs.readFileSync(VALIDATED_IDS_PATH, 'utf8')
  return new Set(JSON.parse(raw))
}

function escapeSQL(str) {
  return str.replace(/'/g, "''")
}

function buildEnrichmentMap(matches, validatedIds, instructionsLookup) {
  const enrichMap = new Map()
  let withInstructions = 0
  let withoutInstructions = 0
  let skippedNotValidated = 0

  for (const m of matches) {
    if (!validatedIds.has(m.our_id)) {
      skippedNotValidated++
      continue
    }

    const instructions = instructionsLookup.get(m.their_id)
    const instructionText = instructions
      ? instructions.map((step, i) => `${i + 1}. ${step}`).join('\n')
      : null

    if (instructions) withInstructions++
    else withoutInstructions++

    enrichMap.set(m.our_id, {
      instructions: instructionText,
      force: m.force || null,
      mechanic: m.mechanic || null,
      level: m.level || null,
    })
  }

  console.log(`\nEnrichment summary:`)
  console.log(`  Validated matches: ${enrichMap.size}`)
  console.log(`  With instructions: ${withInstructions}`)
  console.log(`  Without instructions: ${withoutInstructions}`)
  console.log(`  Skipped (not validated): ${skippedNotValidated}`)
  return enrichMap
}

function updateSeedFile(filePath, enrichMap) {
  const content = fs.readFileSync(filePath, 'utf8')
  const fileName = path.basename(filePath)
  const lines = content.split('\n')

  // Find the INSERT column list
  let insertStart = -1
  let valuesLine = -1

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^INSERT INTO "ExerciseDefinition"/)) {
      insertStart = i
    }
    if (insertStart >= 0 && lines[i].match(/^\) VALUES/)) {
      valuesLine = i
      break
    }
  }

  if (insertStart < 0 || valuesLine < 0) {
    console.log(`  Skipping ${fileName}: no INSERT statement found`)
    return { enriched: 0, total: 0 }
  }

  // Add new columns before "createdAt"
  for (let i = insertStart; i <= valuesLine; i++) {
    if (lines[i].match(/^\s*"createdAt"/)) {
      lines.splice(i, 0, '  instructions,', '  force,', '  mechanic,', '  level,')
      valuesLine += 4
      break
    }
  }

  // Process each VALUES row
  let enriched = 0
  let total = 0

  for (let i = valuesLine + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.match(/^\s*\('/)) continue

    total++

    // Extract exercise ID
    const idMatch = line.match(/^\s*\('([^']+)'/)
    if (!idMatch) {
      console.log(`  Warning: could not parse ID from line ${i + 1}`)
      continue
    }

    const exerciseId = idMatch[1]
    const data = enrichMap.get(exerciseId)

    // Find the NOW(), NOW()) ending
    const nowPattern = /,\s*NOW\(\),\s*NOW\(\)\)([,;]?\s*)$/
    const nowMatch = line.match(nowPattern)
    if (!nowMatch) {
      console.log(`  Warning: could not parse NOW() pattern for ${exerciseId}`)
      continue
    }

    const suffix = nowMatch[1]
    const beforeNow = line.substring(0, line.length - nowMatch[0].length)

    const instrVal = data?.instructions
      ? `'${escapeSQL(data.instructions)}'`
      : 'null'
    const forceVal = data?.force ? `'${data.force}'` : 'null'
    const mechVal = data?.mechanic ? `'${data.mechanic}'` : 'null'
    const levelVal = data?.level ? `'${data.level}'` : 'null'

    lines[i] = `${beforeNow}, ${instrVal}, ${forceVal}, ${mechVal}, ${levelVal}, NOW(), NOW())${suffix}`

    if (data) enriched++
  }

  fs.writeFileSync(filePath, lines.join('\n'))
  console.log(`  ${fileName}: ${enriched}/${total} exercises enriched`)
  return { enriched, total }
}

async function main() {
  const exercises = await fetchFreeExerciseDb()
  const instructionsLookup = buildInstructionsLookup(exercises)

  const matches = loadMapping()
  const validatedIds = loadValidatedIds()
  console.log(`Loaded ${matches.length} matches, ${validatedIds.size} validated IDs`)

  const enrichMap = buildEnrichmentMap(matches, validatedIds, instructionsLookup)

  console.log('\nUpdating seed SQL files...')
  const seedFiles = fs
    .readdirSync(SEEDS_DIR)
    .filter((f) => f.match(/^0\d_.*\.sql$/))
    .sort()

  let totalEnriched = 0
  let totalExercises = 0

  for (const file of seedFiles) {
    const { enriched, total } = updateSeedFile(
      path.join(SEEDS_DIR, file),
      enrichMap
    )
    totalEnriched += enriched
    totalExercises += total
  }

  console.log(
    `\nDone! ${totalEnriched}/${totalExercises} exercises enriched across ${seedFiles.length} files`
  )
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
