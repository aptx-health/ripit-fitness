/**
 * Build Exercise Name Mapping
 *
 * Parses our seed SQL files AND curated TypeScript exercise definitions
 * to extract exercise names + IDs, fetches the free-exercise-db JSON,
 * and performs normalized name matching (exact + fuzzy) to produce a
 * mapping file.
 *
 * Usage:
 *   npx ts-node --skip-project \
 *     --compiler-options '{"module":"commonjs","target":"ES2020","types":["node"]}' \
 *     scripts/build-exercise-mapping.ts
 *
 * Output: scripts/exercise-mapping.json
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs') as typeof import('fs')
const path = require('path') as typeof import('path')

import type {
  OurExercise,
  TheirExercise,
  Match,
  UnmatchedExercise,
  MappingOutput,
} from './exercise-matching-utils'

import {
  normalize,
  deepNormalize,
  findBestMatch,
} from './exercise-matching-utils'

// ---------------------------------------------------------------------------
// SQL Parsing
// ---------------------------------------------------------------------------

function parseSeedFile(filePath: string): OurExercise[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const exercises: OurExercise[] = []

  // Match each VALUES row: ('id', 'name', 'normalizedName', ARRAY[...], ...)
  const rowRegex =
    /\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*ARRAY\[([^\]]*)\]/g

  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(content)) !== null) {
    const [, id, name, normalizedName, aliasesRaw] = match

    const aliases: string[] = []
    const aliasRegex = /'([^']+)'/g
    let aliasMatch: RegExpExecArray | null
    while ((aliasMatch = aliasRegex.exec(aliasesRaw)) !== null) {
      aliases.push(aliasMatch[1])
    }

    exercises.push({ id, name, normalizedName, aliases })
  }

  return exercises
}

function parseAllSeedFiles(seedDir: string): OurExercise[] {
  const seedFiles = [
    '00_legacy_exercises.sql',
    '01_bodyweight_exercises.sql',
    '02_dumbbell_exercises.sql',
    '03_resistance_band_exercises.sql',
    '04_kettlebell_exercises.sql',
    '05_climbing_exercises.sql',
    '06_cable_machine_exercises.sql',
    '07_core_mobility_exercises.sql',
  ]

  const allExercises: OurExercise[] = []
  const seenNormalized = new Set<string>()

  for (const file of seedFiles) {
    const filePath = path.join(seedDir, file)
    if (!fs.existsSync(filePath)) {
      console.warn(`  Warning: ${file} not found, skipping`)
      continue
    }

    const exercises = parseSeedFile(filePath)
    console.log(`  ${file}: ${exercises.length} exercises`)

    // Deduplicate by normalizedName (mimics ON CONFLICT behavior)
    for (const ex of exercises) {
      if (!seenNormalized.has(ex.normalizedName)) {
        seenNormalized.add(ex.normalizedName)
        allExercises.push(ex)
      }
    }
  }

  return allExercises
}

// ---------------------------------------------------------------------------
// Curated TypeScript Exercise Parsing
// ---------------------------------------------------------------------------

function parseCuratedExerciseDefs(filePath: string): OurExercise[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const exercises: OurExercise[] = []

  // Match: { name: 'Exercise Name', category: '...', aliases: [...] }
  // Uses alternation to handle apostrophes in double-quoted names (e.g. "Farmer's Walk")
  const entryRegex =
    /\{\s*name:\s*(?:'([^']+)'|"([^"]+)")\s*,\s*category:\s*['"][^'"]+['"]\s*,\s*aliases:\s*\[([^\]]*)\]\s*\}/g

  let match: RegExpExecArray | null
  let index = 0
  while ((match = entryRegex.exec(content)) !== null) {
    const [, singleQuoteName, doubleQuoteName, aliasesRaw] = match
    const name = singleQuoteName || doubleQuoteName

    const aliases: string[] = []
    const aliasRegex = /['"]([^'"]+)['"]/g
    let aliasMatch: RegExpExecArray | null
    while ((aliasMatch = aliasRegex.exec(aliasesRaw)) !== null) {
      aliases.push(aliasMatch[1])
    }

    const id = `ex_curated_${String(index).padStart(3, '0')}`
    const normalizedName = name.toLowerCase()
    exercises.push({ id, name, normalizedName, aliases })
    index++
  }

  return exercises
}

// ---------------------------------------------------------------------------
// Manual Overrides
// ---------------------------------------------------------------------------

interface ManualOverrides {
  overrides: Record<string, string>
}

function loadManualOverrides(scriptDir: string): Map<string, string> {
  const overridePath = path.join(scriptDir, 'exercise-manual-overrides.json')
  if (!fs.existsSync(overridePath)) {
    return new Map()
  }

  const data = JSON.parse(
    fs.readFileSync(overridePath, 'utf-8')
  ) as ManualOverrides
  const map = new Map<string, string>()
  for (const [ourName, theirId] of Object.entries(data.overrides)) {
    map.set(ourName.toLowerCase(), theirId)
  }
  console.log(`  Manual overrides: ${map.size}`)
  return map
}

// ---------------------------------------------------------------------------
// Free Exercise DB Fetching
// ---------------------------------------------------------------------------

async function fetchFreeExerciseDb(): Promise<TheirExercise[]> {
  const url =
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
  console.log('\nFetching free-exercise-db from GitHub...')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch exercise DB: ${response.status} ${response.statusText}`
    )
  }

  const exercises = (await response.json()) as TheirExercise[]
  console.log(`  Fetched ${exercises.length} exercises`)
  return exercises
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const scriptDir = path.dirname(__filename)
  const seedDir = path.join(scriptDir, '..', 'prisma', 'seeds')
  const outputPath = path.join(scriptDir, 'exercise-mapping.json')

  console.log('=== Exercise Name Mapping Builder ===\n')

  // 1. Parse seed files (SQL + curated TypeScript)
  console.log('Parsing seed SQL files...')
  const sqlExercises = parseAllSeedFiles(seedDir)
  console.log(`  SQL seed exercises: ${sqlExercises.length}`)

  const curatedPath = path.join(seedDir, 'curated', 'exercise-defs.ts')
  const curatedExercises = parseCuratedExerciseDefs(curatedPath)
  console.log(`  Curated exercise defs: ${curatedExercises.length}`)

  // Merge, deduplicating by normalizedName (SQL exercises take priority)
  const seenNormalized = new Set(sqlExercises.map((e) => e.normalizedName))
  const ourExercises = [...sqlExercises]
  let curatedNew = 0
  for (const ex of curatedExercises) {
    if (!seenNormalized.has(ex.normalizedName)) {
      seenNormalized.add(ex.normalizedName)
      ourExercises.push(ex)
      curatedNew++
    }
  }
  console.log(`  New from curated (not in SQL): ${curatedNew}`)
  console.log(`\nTotal unique exercises (ours): ${ourExercises.length}`)

  // 2. Load manual overrides
  const manualOverrides = loadManualOverrides(scriptDir)

  // 3. Fetch free-exercise-db
  const theirExercises = await fetchFreeExerciseDb()

  // 4. Build lookup structures
  const theirNormalized = new Map<string, TheirExercise>()
  const theirDeepNormalized = new Map<string, TheirExercise>()
  const theirNormalizedList: { norm: string; exercise: TheirExercise }[] = []
  const theirById = new Map<string, TheirExercise>()

  for (const ex of theirExercises) {
    const norm = normalize(ex.name)
    const deep = deepNormalize(ex.name)
    theirNormalized.set(norm, ex)
    theirById.set(ex.id, ex)
    if (!theirDeepNormalized.has(deep)) {
      theirDeepNormalized.set(deep, ex)
    }
    theirNormalizedList.push({ norm, exercise: ex })
  }

  // 5. Match exercises
  console.log('\nMatching exercises...')
  const matches: Match[] = []
  const unmatchedOurs: UnmatchedExercise[] = []
  const matchedTheirIds = new Set<string>()

  for (const ourEx of ourExercises) {
    // Check manual overrides first
    const overrideId = manualOverrides.get(ourEx.name.toLowerCase())
    if (overrideId) {
      const theirEx = theirById.get(overrideId)
      if (theirEx) {
        matches.push({
          our_id: ourEx.id,
          our_name: ourEx.name,
          their_id: theirEx.id,
          their_name: theirEx.name,
          match_type: 'exact',
          confidence: 'high',
          validated: true,
          force: theirEx.force,
          mechanic: theirEx.mechanic,
          level: theirEx.level,
        })
        matchedTheirIds.add(theirEx.id)
        continue
      }
      console.warn(
        `  Warning: manual override "${ourEx.name}" -> "${overrideId}" not found in free-exercise-db`
      )
    }

    const candidate = findBestMatch(
      ourEx,
      theirNormalized,
      theirDeepNormalized,
      theirNormalizedList
    )

    if (candidate) {
      matches.push({
        our_id: ourEx.id,
        our_name: ourEx.name,
        their_id: candidate.theirExercise.id,
        their_name: candidate.theirExercise.name,
        match_type: candidate.matchType,
        confidence: candidate.confidence,
        ...(candidate.matchType === 'close'
          ? { similarity: candidate.similarity }
          : {}),
        validated: false,
        force: candidate.theirExercise.force,
        mechanic: candidate.theirExercise.mechanic,
        level: candidate.theirExercise.level,
      })
      matchedTheirIds.add(candidate.theirExercise.id)
    } else {
      unmatchedOurs.push({ id: ourEx.id, name: ourEx.name })
    }
  }

  // 5. Find their unmatched exercises
  const unmatchedTheirs: UnmatchedExercise[] = theirExercises
    .filter((ex) => !matchedTheirIds.has(ex.id))
    .map((ex) => ({ id: ex.id, name: ex.name }))

  // 6. Build stats
  const exactMatches = matches.filter((m) => m.match_type === 'exact').length
  const aliasMatches = matches.filter((m) => m.match_type === 'alias').length
  const closeMatches = matches.filter((m) => m.match_type === 'close').length

  const output: MappingOutput = {
    generated_at: new Date().toISOString(),
    stats: {
      our_total: ourExercises.length,
      their_total: theirExercises.length,
      exact_matches: exactMatches,
      alias_matches: aliasMatches,
      close_matches: closeMatches,
      our_unmatched: unmatchedOurs.length,
      their_unmatched: unmatchedTheirs.length,
    },
    matches: matches.sort((a, b) => {
      const typeOrder = { exact: 0, alias: 1, close: 2 }
      if (typeOrder[a.match_type] !== typeOrder[b.match_type]) {
        return typeOrder[a.match_type] - typeOrder[b.match_type]
      }
      const confOrder = { high: 0, medium: 1, low: 2 }
      return confOrder[a.confidence] - confOrder[b.confidence]
    }),
    our_unmatched: unmatchedOurs.sort((a, b) => a.name.localeCompare(b.name)),
    their_unmatched: unmatchedTheirs.sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
  }

  // 7. Write output
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n')

  // 8. Print summary
  console.log('\n=== Results ===')
  console.log(`Our exercises:     ${output.stats.our_total}`)
  console.log(`Their exercises:   ${output.stats.their_total}`)
  console.log(`Exact matches:     ${output.stats.exact_matches}`)
  console.log(`Alias matches:     ${output.stats.alias_matches}`)
  console.log(`Close matches:     ${output.stats.close_matches}`)
  console.log(
    `Total matched:     ${exactMatches + aliasMatches + closeMatches}`
  )
  console.log(`Our unmatched:     ${output.stats.our_unmatched}`)
  console.log(`Their unmatched:   ${output.stats.their_unmatched}`)
  console.log(`\nOutput written to: ${outputPath}`)

  // Print close matches for review
  const closeForReview = matches.filter((m) => m.match_type === 'close')
  if (closeForReview.length > 0) {
    console.log(`\n=== Close Matches (need review) ===`)
    for (const m of closeForReview) {
      console.log(
        `  [${m.confidence}] "${m.our_name}" ~~ "${m.their_name}" (${m.similarity})`
      )
    }
  }
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
