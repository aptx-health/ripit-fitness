/**
 * Build the iOS app's bundled exercise catalog (work item 154).
 *
 * Reads prisma/seeds/exercise-definitions.json (the 312 system exercises) and
 * scripts/exercise-mapping.json (which free-exercise-db exercise each one matches), then writes:
 *   ios/RipitCore/Sources/RipitCore/Resources/catalog.json   the catalog RipitCore seeds from
 *   ios/App/ExerciseImages/<id>_0.jpg, <id>_1.jpg             start/finish photos
 *
 * Images come from free-exercise-db (The Unlicense, public domain; see ios/README.md).
 * Already-downloaded images are skipped, so re-running only fetches what is missing.
 *
 * Run: node scripts/ios/build-catalog.ts [--skip-images]
 */

import fs from 'node:fs'
import path from 'node:path'

interface SeedExercise {
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
  their_id: string
}

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const SEED_PATH = path.join(ROOT, 'prisma/seeds/exercise-definitions.json')
const MAPPING_PATH = path.join(ROOT, 'scripts/exercise-mapping.json')
const CATALOG_PATH = path.join(ROOT, 'ios/RipitCore/Sources/RipitCore/Resources/catalog.json')
const IMAGES_DIR = path.join(ROOT, 'ios/App/ExerciseImages')
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'
// free-exercise-db stores 2 images per exercise (start/end position)
const IMAGE_INDICES = [0, 1]
const CONCURRENCY = 8
const MAX_RETRIES = 3

async function download(url: string, dest: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
      return
    } catch (err) {
      if (attempt >= MAX_RETRIES) throw new Error(`${url}: ${(err as Error).message}`)
      await new Promise((r) => setTimeout(r, 1000 * attempt))
    }
  }
}

async function main(): Promise<void> {
  const skipImages = process.argv.includes('--skip-images')
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8')) as SeedExercise[]
  const mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8')) as { matches: MappingMatch[] }
  const theirId = new Map(mapping.matches.map((m) => [m.our_id, m.their_id]))

  const catalog = seed.map((e) => ({
    id: e.id,
    name: e.name,
    normalizedName: e.normalizedName,
    aliases: e.aliases,
    category: e.category,
    equipment: e.equipment,
    primaryFAUs: e.primaryFAUs,
    secondaryFAUs: e.secondaryFAUs,
    instructions: e.instructions,
    force: e.force,
    mechanic: e.mechanic,
    level: e.level,
    images: theirId.has(e.id) ? IMAGE_INDICES.map((i) => `${e.id}_${i}.jpg`) : [],
  }))
  fs.mkdirSync(path.dirname(CATALOG_PATH), { recursive: true })
  fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 1)}\n`)
  console.log(`catalog: ${catalog.length} exercises, ${theirId.size} with images -> ${path.relative(ROOT, CATALOG_PATH)}`)

  if (skipImages) return
  fs.mkdirSync(IMAGES_DIR, { recursive: true })
  const jobs = mapping.matches.flatMap((m) =>
    IMAGE_INDICES.map((i) => ({
      url: `${GITHUB_RAW_BASE}/${m.their_id}/${i}.jpg`,
      dest: path.join(IMAGES_DIR, `${m.our_id}_${i}.jpg`),
    })),
  )
  const todo = jobs.filter((j) => !fs.existsSync(j.dest))
  const failures: string[] = []
  let done = 0
  async function worker(): Promise<void> {
    for (let job = todo.shift(); job; job = todo.shift()) {
      try {
        await download(job.url, job.dest)
      } catch (err) {
        failures.push((err as Error).message)
      }
      if (++done % 100 === 0) console.log(`images: ${done} downloaded`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  const bytes = fs.readdirSync(IMAGES_DIR).reduce((n, f) => n + fs.statSync(path.join(IMAGES_DIR, f)).size, 0)
  console.log(`images: ${jobs.length} expected, ${done} downloaded now, ${(bytes / 1e6).toFixed(1)} MB total`)
  if (failures.length) {
    console.error(`images: ${failures.length} failed:\n  ${failures.join('\n  ')}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
