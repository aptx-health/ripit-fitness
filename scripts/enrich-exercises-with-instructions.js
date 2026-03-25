#!/usr/bin/env node

/**
 * Enrich exercise seed SQL files with instructions from free-exercise-db.
 *
 * Reads:
 *   - scripts/exercise-mapping.json (validated matches with their_id)
 *   - free-exercise-db exercises.json (fetched from GitHub)
 *
 * Writes:
 *   - Updated prisma/seeds/0*.sql files with instructions column
 *
 * Usage: node scripts/enrich-exercises-with-instructions.js
 */

const fs = require('fs')
const path = require('path')

const EXERCISE_DB_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'

const SEEDS_DIR = path.join(__dirname, '..', 'prisma', 'seeds')
const MAPPING_PATH = path.join(__dirname, 'exercise-mapping.json')

// Validated IDs extracted from commit 1820697 (the validation commit).
// The later regeneration (PR #257) reset validated flags, so we use this
// snapshot to identify which exercises were human-validated.
const VALIDATED_IDS_PATH = path.join(__dirname, 'validated-exercise-ids.json')

async function fetchFreeExerciseDb() {
  console.log('Fetching free-exercise-db from GitHub...')
  const response = await fetch(EXERCISE_DB_URL)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch exercise DB: ${response.status} ${response.statusText}`
    )
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
  const data = JSON.parse(raw)
  return data.matches
}

function loadValidatedIds() {
  const raw = fs.readFileSync(VALIDATED_IDS_PATH, 'utf8')
  return new Set(JSON.parse(raw))
}

function buildEnrichmentMap(matches, validatedIds, instructionsLookup) {
  const enrichMap = new Map()
  let matched = 0
  let skippedNotValidated = 0
  let skippedNoInstructions = 0

  for (const m of matches) {
    if (!validatedIds.has(m.our_id)) {
      skippedNotValidated++
      continue
    }
    const instructions = instructionsLookup.get(m.their_id)
    if (!instructions) {
      skippedNoInstructions++
      continue
    }
    // Join instruction steps as numbered list
    const text = instructions
      .map((step, i) => `${i + 1}. ${step}`)
      .join('\n')
    enrichMap.set(m.our_id, text)
    matched++
  }

  console.log(`\nEnrichment summary:`)
  console.log(`  Matched with instructions: ${matched}`)
  console.log(`  Skipped (not validated): ${skippedNotValidated}`)
  console.log(`  Skipped (no instructions): ${skippedNoInstructions}`)
  return enrichMap
}

function escapeSQL(str) {
  return str.replace(/'/g, "''")
}

function updateSeedFile(filePath, enrichMap) {
  const content = fs.readFileSync(filePath, 'utf8')
  const fileName = path.basename(filePath)
  const lines = content.split('\n')

  // Find the INSERT column list and add instructions before createdAt
  let insertStartLine = -1
  let valuesStartLine = -1
  let columnLines = []

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^INSERT INTO "ExerciseDefinition"/)) {
      insertStartLine = i
    }
    if (insertStartLine >= 0 && lines[i].match(/^\) VALUES/)) {
      valuesStartLine = i
      break
    }
    if (insertStartLine >= 0) {
      columnLines.push({ index: i, content: lines[i] })
    }
  }

  if (insertStartLine < 0 || valuesStartLine < 0) {
    console.log(`  Skipping ${fileName}: no INSERT statement found`)
    return { enriched: 0, total: 0 }
  }

  // Check if instructions column already exists
  const columnSection = lines
    .slice(insertStartLine, valuesStartLine + 1)
    .join('\n')
  if (columnSection.includes('instructions')) {
    console.log(`  Skipping ${fileName}: instructions column already present`)
    return { enriched: 0, total: 0 }
  }

  // Add instructions column before "createdAt"
  for (let i = insertStartLine; i <= valuesStartLine; i++) {
    if (lines[i].match(/^\s*"createdAt"/)) {
      lines.splice(i, 0, '  instructions,')
      valuesStartLine++
      break
    }
  }

  // Now process each VALUES row to add instruction value
  // Each row is a single line starting with ( and the first field is the ID
  let enriched = 0
  let total = 0

  for (let i = valuesStartLine + 1; i < lines.length; i++) {
    const line = lines[i]
    // Skip comments, blank lines, and ON CONFLICT
    if (!line.match(/^\s*\('/)) continue

    total++

    // Extract the exercise ID (first quoted string)
    const idMatch = line.match(/^\s*\('([^']+)'/)
    if (!idMatch) continue

    const exerciseId = idMatch[1]
    const instructions = enrichMap.get(exerciseId)

    // We need to insert the instructions value before NOW(), NOW())
    // The pattern is: ..., ARRAY[...], ARRAY[...], NOW(), NOW())
    // We insert after the last ARRAY before NOW()

    // Find the position just before the last NOW(), NOW() part
    // The line ends with: NOW(), NOW()), or NOW(), NOW())
    const nowPattern = /,\s*NOW\(\),\s*NOW\(\)\)([,;]?)$/
    const nowMatch = line.match(nowPattern)

    if (!nowMatch) {
      console.log(`  Warning: could not parse row for ${exerciseId}`)
      continue
    }

    const suffix = nowMatch[1] // comma or semicolon or empty
    const beforeNow = line.substring(
      0,
      line.length - nowMatch[0].length
    )

    if (instructions) {
      const escaped = escapeSQL(instructions)
      lines[i] = `${beforeNow}, '${escaped}', NOW(), NOW())${suffix}`
      enriched++
    } else {
      lines[i] = `${beforeNow}, null, NOW(), NOW())${suffix}`
    }
  }

  fs.writeFileSync(filePath, lines.join('\n'))
  console.log(
    `  ${fileName}: ${enriched}/${total} exercises enriched with instructions`
  )
  return { enriched, total }
}

async function main() {
  // 1. Fetch free-exercise-db
  const exercises = await fetchFreeExerciseDb()
  const instructionsLookup = buildInstructionsLookup(exercises)

  // 2. Load mapping and validated IDs
  const matches = loadMapping()
  const validatedIds = loadValidatedIds()
  console.log(`\nLoaded ${matches.length} matches, ${validatedIds.size} validated IDs`)

  // 3. Build enrichment map
  const enrichMap = buildEnrichmentMap(
    matches,
    validatedIds,
    instructionsLookup
  )

  // 4. Update seed SQL files
  console.log('\nUpdating seed SQL files...')
  const seedFiles = fs
    .readdirSync(SEEDS_DIR)
    .filter((f) => f.match(/^0\d_.*\.sql$/))
    .sort()

  let totalEnriched = 0
  let totalExercises = 0

  for (const file of seedFiles) {
    const filePath = path.join(SEEDS_DIR, file)
    const { enriched, total } = updateSeedFile(filePath, enrichMap)
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
