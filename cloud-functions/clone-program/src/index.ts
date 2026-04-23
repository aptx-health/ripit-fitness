import http from 'node:http'
import { PrismaClient } from '@prisma/client'
import { type Job, Worker } from 'bullmq'
import { cloneStrengthProgramData, type ProgramCloneJob } from './cloning'

const QUEUE_NAME = 'program-clone-jobs'

// Clone worker bypasses PgBouncer and connects directly to Postgres (:5432).
// Why: this worker uses a 30s `prisma.$transaction()` for week-batch inserts
// and is exactly the kind of long-lived interactive transaction that gets
// awkward under transaction-mode pooling. Direct connection avoids all
// pgbouncer footguns (prepared statements, SET LOCAL, advisory locks). The
// worker is single-replica with concurrency=1, so connection count is bounded.
const workerDbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL

if (process.env.NODE_ENV === 'production') {
  if (!workerDbUrl) {
    console.error('Neither DIRECT_URL nor DATABASE_URL is set')
    process.exit(1)
  }
  try {
    const parsed = new URL(workerDbUrl)
    if (parsed.port === '6432') {
      console.error(
        'Clone worker DB URL points at PgBouncer (:6432). It must use direct Postgres (:5432). ' +
          'Set DIRECT_URL in the worker pod env.'
      )
      process.exit(1)
    }
  } catch {
    console.error('Clone worker DB URL is not a valid URL')
    process.exit(1)
  }
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: workerDbUrl },
  },
})

// Log DB target on startup (redact password)
try {
  const dbParsed = new URL(workerDbUrl!)
  console.log(`DB target: ${dbParsed.hostname}:${dbParsed.port}${dbParsed.pathname} (source: ${process.env.DIRECT_URL ? 'DIRECT_URL' : 'DATABASE_URL'})`)
} catch { /* startup logging only */ }

const redisUrl = process.env.REDIS_URL
if (!redisUrl) {
  console.error('REDIS_URL is not set')
  process.exit(1)
}

function parseRedisUrl(url: string) {
  const parsed = new URL(url)
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
    maxRetriesPerRequest: null as null,
    enableKeepAlive: true,
    keepAliveInitialDelay: 30_000,
  }
}

const connectionOpts = parseRedisUrl(redisUrl)

// Redis connection event logging is attached after worker creation (see below)
// so we can observe BullMQ's own ioredis connection without importing ioredis directly.

/**
 * Process a program clone job from the BullMQ queue.
 */
async function processCloneJob(job: Job<ProgramCloneJob>): Promise<void> {
  const { communityProgramId, programId, userId, programType } = job.data

  if (!communityProgramId || !programId || !userId || !programType) {
    throw new Error(`Invalid job payload: missing required fields`)
  }

  console.log(`[job ${job.id}] Processing: communityProgramId=${communityProgramId} programId=${programId} type=${programType}`)

  // Verify the shell program exists before proceeding
  const shellProgram = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, copyStatus: true },
  })

  if (!shellProgram) {
    throw new Error(`Shell program not found: ${programId}. It may not be committed yet — will retry.`)
  }

  // Skip if already completed or failed (idempotency guard)
  if (shellProgram.copyStatus === 'ready' || shellProgram.copyStatus === 'failed') {
    console.log(`[job ${job.id}] Program ${programId} already has copyStatus=${shellProgram.copyStatus}, skipping`)
    return
  }

  console.log(`[job ${job.id}] Looking up community program: ${communityProgramId}`)
  const communityProgram = await prisma.communityProgram.findUnique({
    where: { id: communityProgramId },
    select: { id: true, programData: true },
  })
  console.log(`[job ${job.id}] Community program lookup: found=${!!communityProgram} hasData=${!!communityProgram?.programData}`)

  if (!communityProgram?.programData) {
    throw new Error(`Community program not found or has no data: ${communityProgramId}`)
  }

  // programData is stored as JSON - cast to the expected structure
  const programData = communityProgram.programData as { weeks: unknown[] }

  await cloneStrengthProgramData(prisma, programId, programData as Parameters<typeof cloneStrengthProgramData>[2], userId)

  console.log(`[job ${job.id}] Clone completed: programId=${programId}`)
}

const worker = new Worker(QUEUE_NAME, processCloneJob, {
  connection: connectionOpts,
  concurrency: 1,
})

let workerReady = false

// Attach Redis connection lifecycle logging via BullMQ's internal client
worker.client.then((client) => {
  console.log('[redis] attached lifecycle listeners to BullMQ connection')
  client.on('connect', () => console.log('[redis] connected'))
  client.on('ready', () => console.log('[redis] ready'))
  client.on('error', (err: Error) => console.error('[redis] error:', err.message))
  client.on('close', () => console.warn('[redis] connection closed'))
  client.on('reconnecting', () => console.warn('[redis] reconnecting'))
  client.on('end', () => console.error('[redis] connection ended (will not reconnect)'))
}).catch((err) => {
  console.error('[redis] failed to get client for lifecycle logging:', err)
})

worker.on('ready', () => {
  workerReady = true
  console.log('[worker] connected to Redis, polling for jobs')
})

worker.on('active', (job) => {
  console.log(`[worker] job ${job.id} became active (program=${job.data.programId})`)
})

worker.on('completed', (job) => {
  console.log(`[worker] job ${job.id} completed (program=${job.data.programId})`)
})

worker.on('failed', async (job, error) => {
  if (!job) {
    console.error('[worker] job failed but job reference is null:', error.message)
    return
  }

  console.error(`[worker] job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${error.message}`)
  console.error(`[worker] job ${job.id} stack:`, error.stack)

  // Only mark as failed when all retries are exhausted
  if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
    console.error(`[worker] job ${job.id} all retries exhausted, marking program ${job.data.programId} as failed`)
    try {
      await prisma.program.update({
        where: { id: job.data.programId },
        data: { copyStatus: 'failed' },
      })
    } catch (statusError) {
      console.error('[worker] failed to update copyStatus:', statusError)
    }
  }
})

worker.on('error', (error) => {
  console.error('[worker] error:', error.message)
  console.error('[worker] error stack:', error.stack)
  workerReady = false
})

worker.on('closed', () => {
  workerReady = false
  console.warn('[worker] closed — no longer polling for jobs')
})

worker.on('stalled', (jobId) => {
  console.warn(`[worker] job ${jobId} stalled (took too long, BullMQ may re-queue it)`)
})

worker.on('drained', () => {
  console.log('[worker] queue drained, waiting for new jobs')
})

// Catch unhandled errors that could silently kill the worker loop
process.on('unhandledRejection', (reason) => {
  console.error('[process] unhandledRejection:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('[process] uncaughtException:', error.message, error.stack)
  // Exit so k8s restarts us — continuing after uncaught exception is unsafe
  process.exit(1)
})

// Periodic heartbeat: log worker + Redis state every 30s.
// This creates a timeline so we can pinpoint exactly when the worker stops polling.
const HEARTBEAT_INTERVAL = 30_000
setInterval(async () => {
  const running = worker.isRunning()
  const isPaused = worker.isPaused()
  let redisPing = 'unknown'
  try {
    const client = await worker.client
    redisPing = await client.ping()
  } catch (err) {
    redisPing = `error: ${(err as Error).message}`
  }
  console.log(`[heartbeat] running=${running} paused=${isPaused} workerReady=${workerReady} redis=${redisPing}`)
}, HEARTBEAT_INTERVAL)

// Active readiness check: verify the worker can actually reach Redis,
// not just that the flag is set. This lets k8s restart the pod if the
// connection silently drops.
async function isWorkerHealthy(): Promise<boolean> {
  if (!workerReady) return false
  if (!worker.isRunning()) return false
  try {
    const client = await worker.client
    const pong = await client.ping()
    return pong === 'PONG'
  } catch {
    return false
  }
}

// Health server for k8s probes
const healthServer = http.createServer(async (req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200)
    res.end('OK')
    return
  }

  if (req.url === '/readyz') {
    const healthy = await isWorkerHealthy()
    if (healthy) {
      res.writeHead(200)
      res.end('OK')
    } else {
      res.writeHead(503)
      res.end('Worker not ready')
    }
    return
  }

  res.writeHead(404)
  res.end('Not Found')
})

const port = process.env.PORT || 8080
healthServer.listen(port, () => {
  console.log(`Clone worker started, health server on port ${port}`)
})

// Graceful shutdown
async function shutdown() {
  console.log('[shutdown] shutting down clone worker...')
  await worker.close()
  healthServer.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
