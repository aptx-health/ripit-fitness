/**
 * Sync Exercise Images — downloads from free-exercise-db GitHub,
 * uploads to MinIO, generates SQL to update ExerciseDefinition.imageUrls.
 * Run with --help for usage details.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const https = require('https') as typeof import('https')
const fs = require('fs') as typeof import('fs')
const path = require('path') as typeof import('path')

// Types

interface MappingMatch {
  our_id: string
  our_name: string
  their_id: string
  their_name: string
  match_type: string
  confidence: string
  validated: boolean
  similarity?: number
}

interface MappingFile {
  generated_at: string
  stats: Record<string, number>
  matches: MappingMatch[]
  our_unmatched: { id: string; name: string }[]
  their_unmatched: { id: string; name: string }[]
}

interface SyncResult {
  exerciseId: string
  exerciseName: string
  theirId: string
  images: string[]
  skipped: number
  errors: string[]
}

interface Config {
  dryRun: boolean
  force: boolean
  concurrency: number
  mappingPath: string
  minio: {
    endpointUrl: string
    host: string
    port: number
    useSSL: boolean
    accessKey: string
    secretKey: string
    bucket: string
  }
}

// Constants

const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'
// free-exercise-db stores 2 images per exercise (start/end position)
const IMAGE_INDICES = [0, 1]
const MAX_RETRIES = 3
const MAX_REDIRECTS = 5
const BASE_RETRY_DELAY_MS = 1000
const DEFAULT_MAPPING_PATH = path.join(__dirname, 'exercise-mapping.json')
const OUTPUT_SQL_PATH = path.join(__dirname, 'update-image-urls.sql')

// CLI Parsing

function printHelp(): void {
  console.log(`Usage: npx ts-node --skip-project \\
  --compiler-options '{"module":"commonjs","target":"ES2020","types":["node"]}' \\
  scripts/sync-exercise-images.ts [options]

Options:
  --dry-run          Preview without downloading or uploading
  --force            Re-upload images even if they already exist
  --concurrency=N    Parallel downloads (default: 5)
  --mapping=PATH     Path to mapping JSON (default: scripts/exercise-mapping.json)
  -h, --help         Show this help

Environment:
  MINIO_ENDPOINT      Full URL (default: http://localhost:9000)
  MINIO_ROOT_USER     Access key (required unless --dry-run)
  MINIO_ROOT_PASSWORD Secret key (required unless --dry-run)
  MINIO_BUCKET        Bucket name (default: exercise-images)`)
}

function parseConfig(): Config {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  const concurrencyArg = args.find((a) => a.startsWith('--concurrency='))
  const mappingArg = args.find((a) => a.startsWith('--mapping='))

  const endpointUrl = process.env.MINIO_ENDPOINT || 'http://localhost:9000'
  const parsed = new URL(endpointUrl)

  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    concurrency: concurrencyArg
      ? parseInt(concurrencyArg.split('=')[1], 10)
      : 5,
    mappingPath: mappingArg
      ? path.resolve(mappingArg.split('=')[1])
      : DEFAULT_MAPPING_PATH,
    minio: {
      endpointUrl,
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 9000),
      useSSL: parsed.protocol === 'https:',
      accessKey: process.env.MINIO_ROOT_USER || '',
      secretKey: process.env.MINIO_ROOT_PASSWORD || '',
      bucket: process.env.MINIO_BUCKET || 'exercise-images',
    },
  }
}

//
// HTTP Download with Retries
//

function downloadBuffer(
  url: string,
  attempt = 1,
  redirectCount = 0
): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        // Follow redirects (with loop protection)
        if (
          (res.statusCode === 301 || res.statusCode === 302) &&
          res.headers.location
        ) {
          if (redirectCount >= MAX_REDIRECTS) {
            reject(new Error(`Too many redirects (${MAX_REDIRECTS}): ${url}`))
            return
          }
          resolve(downloadBuffer(res.headers.location, attempt, redirectCount + 1))
          return
        }

        // 404 means image doesn't exist - not an error
        if (res.statusCode === 404) {
          resolve(null)
          return
        }

        // Server errors - retry
        if (!res.statusCode || res.statusCode >= 500) {
          if (attempt < MAX_RETRIES) {
            const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
            setTimeout(
              () => resolve(downloadBuffer(url, attempt + 1)),
              delay
            )
          } else {
            reject(new Error(`HTTP ${res.statusCode} after ${MAX_RETRIES} retries: ${url}`))
          }
          return
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`))
          return
        }

        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => resolve(Buffer.concat(chunks)))
        res.on('error', reject)
      })
      .on('error', (err) => {
        if (attempt < MAX_RETRIES) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
          setTimeout(
            () => resolve(downloadBuffer(url, attempt + 1)),
            delay
          )
        } else {
          reject(err)
        }
      })
  })
}

//
// MinIO Helpers
//

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMinioClient(config: Config): any {
  const Minio = require('minio')
  return new Minio.Client({
    endPoint: config.minio.host,
    port: config.minio.port,
    useSSL: config.minio.useSSL,
    accessKey: config.minio.accessKey,
    secretKey: config.minio.secretKey,
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureBucket(client: any, bucket: string): Promise<void> {
  const exists = await client.bucketExists(bucket)
  if (!exists) {
    await client.makeBucket(bucket)
    console.log(`  Created bucket: ${bucket}`)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function objectExists(client: any, bucket: string, key: string): Promise<boolean> {
  try {
    await client.statObject(bucket, key)
    return true
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code === 'NotFound' || code === 'NoSuchKey') {
      return false
    }
    throw err
  }
}

function contentTypeForKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'png': return 'image/png'
    case 'gif': return 'image/gif'
    case 'webp': return 'image/webp'
    default: return 'image/jpeg'
  }
}

async function uploadBuffer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  bucket: string,
  key: string,
  data: Buffer
): Promise<void> {
  await client.putObject(bucket, key, data, data.length, {
    'Content-Type': contentTypeForKey(key),
  })
}

//
// Process a Single Exercise
//

async function syncExercise(
  match: MappingMatch,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  config: Config
): Promise<SyncResult> {
  const result: SyncResult = {
    exerciseId: match.our_id,
    exerciseName: match.our_name,
    theirId: match.their_id,
    images: [],
    skipped: 0,
    errors: [],
  }

  for (const idx of IMAGE_INDICES) {
    const objectKey = `${match.our_id}/${idx}.jpg`
    const sourceUrl = `${GITHUB_RAW_BASE}/${match.their_id}/${idx}.jpg`

    if (config.dryRun) {
      console.log(`  [DRY RUN] ${sourceUrl} -> ${config.minio.bucket}/${objectKey}`)
      result.images.push(objectKey)
      continue
    }

    // Check if already exists in MinIO
    if (!config.force) {
      const exists = await objectExists(client, config.minio.bucket, objectKey)
      if (exists) {
        result.images.push(objectKey)
        result.skipped++
        continue
      }
    }

    // Download from GitHub
    try {
      const data = await downloadBuffer(sourceUrl)
      if (!data) {
        // Only log if the primary image (0.jpg) is missing
        if (idx === 0) {
          result.errors.push(`${idx}.jpg not found at source`)
        }
        continue
      }

      // Upload to MinIO
      await uploadBuffer(client, config.minio.bucket, objectKey, data)
      result.images.push(objectKey)
      console.log(`  Uploaded ${objectKey} (${(data.length / 1024).toFixed(1)} KB)`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`${idx}.jpg: ${msg}`)
    }
  }

  return result
}

//
// SQL Generation
//

function escapeSql(value: string): string {
  return value.replace(/'/g, "''")
}

function generateSql(results: SyncResult[]): string {
  const withImages = results.filter((r) => r.images.length > 0)

  const lines: string[] = [
    '-- Auto-generated by sync-exercise-images.ts',
    `-- Generated at: ${new Date().toISOString()}`,
    `-- Exercises with images: ${withImages.length}`,
    '',
    'BEGIN;',
    '',
  ]

  for (const result of withImages) {
    const arrayLiteral = result.images
      .map((img) => `'${escapeSql(img)}'`)
      .join(', ')
    lines.push(
      `-- ${result.exerciseName}`,
      `UPDATE "ExerciseDefinition" SET "imageUrls" = ARRAY[${arrayLiteral}]`,
      `  WHERE id = '${escapeSql(result.exerciseId)}';`,
      ''
    )
  }

  lines.push('COMMIT;', '')
  return lines.join('\n')
}

//
// Batch Processing
//

async function processBatch<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

//
// Main
//

async function main() {
  const config = parseConfig()

  console.log('=== Exercise Image Sync ===')
  console.log(`Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Force re-upload: ${config.force}`)
  console.log(`Concurrency: ${config.concurrency}`)

  // Read mapping file
  if (!fs.existsSync(config.mappingPath)) {
    console.error(`\nMapping file not found: ${config.mappingPath}`)
    console.error('Run build-exercise-mapping.ts first.')
    process.exit(1)
  }

  console.log(`Mapping: ${config.mappingPath}`)
  const mapping: MappingFile = JSON.parse(
    fs.readFileSync(config.mappingPath, 'utf-8')
  )

  if (!Array.isArray(mapping.matches)) {
    console.error('\nInvalid mapping file: missing "matches" array')
    process.exit(1)
  }

  const invalid = mapping.matches.filter((m) => !m.our_id || !m.their_id)
  if (invalid.length > 0) {
    console.error(`\n${invalid.length} mapping entries missing our_id or their_id:`)
    for (const m of invalid.slice(0, 5)) {
      console.error(`  name="${m.our_name}" our_id="${m.our_id}" their_id="${m.their_id}"`)
    }
    process.exit(1)
  }

  const matches = mapping.matches
  console.log(`\nFound ${matches.length} matched exercises`)
  console.log(
    `  (${mapping.stats.exact_matches} exact, ` +
      `${mapping.stats.alias_matches} alias, ` +
      `${mapping.stats.close_matches} close)`
  )

  // Initialize MinIO client (skip for dry-run)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let minioClient: any = null
  if (!config.dryRun) {
    if (!config.minio.accessKey || !config.minio.secretKey) {
      console.error(
        '\nMINIO_ROOT_USER and MINIO_ROOT_PASSWORD are required (unless --dry-run)'
      )
      process.exit(1)
    }
    console.log(`\nConnecting to MinIO at ${config.minio.endpointUrl}...`)
    minioClient = createMinioClient(config)
    await ensureBucket(minioClient, config.minio.bucket)
    console.log(`Using bucket: ${config.minio.bucket}`)
  }

  // Process all exercises
  console.log('\nSyncing images...\n')
  let completed = 0
  const total = matches.length

  const results = await processBatch(
    matches,
    config.concurrency,
    async (match) => {
      completed++
      const pct = ((completed / total) * 100).toFixed(0)
      console.log(
        `[${completed}/${total} ${pct}%] ${match.our_name} <- ${match.their_id}`
      )
      return syncExercise(match, minioClient, config)
    }
  )

  // Print summary
  const withImages = results.filter((r) => r.images.length > 0)
  const withErrors = results.filter((r) => r.errors.length > 0)
  const totalImages = results.reduce((sum, r) => sum + r.images.length, 0)
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0)

  console.log('\n=== Summary ===')
  console.log(`Exercises processed: ${results.length}`)
  console.log(`Exercises with images: ${withImages.length}`)
  console.log(`Total images: ${totalImages}`)
  if (totalSkipped > 0) {
    console.log(`Skipped (already exist): ${totalSkipped}`)
  }
  console.log(`Exercises with errors: ${withErrors.length}`)

  if (withErrors.length > 0) {
    console.log('\nErrors:')
    for (const r of withErrors) {
      for (const err of r.errors) {
        console.log(`  ${r.exerciseName}: ${err}`)
      }
    }
  }

  // Generate SQL
  const sql = generateSql(results)
  fs.writeFileSync(OUTPUT_SQL_PATH, sql)
  console.log(`\nSQL written to: ${OUTPUT_SQL_PATH}`)
  if (!config.dryRun) {
    console.log(
      'Apply with: psql -f scripts/update-image-urls.sql'
    )
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
