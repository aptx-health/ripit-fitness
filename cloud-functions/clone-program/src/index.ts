import http from 'node:http'
import { PrismaClient } from '@prisma/client'
import { type Job, Worker } from 'bullmq'
import { cloneStrengthProgramData, type ProgramCloneJob } from './cloning'

const QUEUE_NAME = 'program-clone-jobs'

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
})

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
  }
}

const connectionOpts = parseRedisUrl(redisUrl)

/**
 * Process a program clone job from the BullMQ queue.
 */
async function processCloneJob(job: Job<ProgramCloneJob>): Promise<void> {
  const { communityProgramId, programId, userId, programType } = job.data

  if (!communityProgramId || !programId || !userId || !programType) {
    throw new Error(`Invalid job payload: missing required fields`)
  }

  console.log(`Processing clone job: communityProgramId=${communityProgramId} programId=${programId} type=${programType}`)

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
    console.log(`Program ${programId} already has copyStatus=${shellProgram.copyStatus}, skipping`)
    return
  }

  const communityProgram = await prisma.communityProgram.findUnique({
    where: { id: communityProgramId },
    select: { programData: true },
  })

  if (!communityProgram || !communityProgram.programData) {
    throw new Error(`Community program not found or has no data: ${communityProgramId}`)
  }

  // programData is stored as JSON - cast to the expected structure
  const programData = communityProgram.programData as { weeks: unknown[] }

  await cloneStrengthProgramData(prisma, programId, programData as Parameters<typeof cloneStrengthProgramData>[2], userId)

  console.log(`Clone job completed: programId=${programId}`)
}

const worker = new Worker(QUEUE_NAME, processCloneJob, {
  connection: connectionOpts,
  concurrency: 1,
})

let workerReady = false

worker.on('ready', () => {
  workerReady = true
  console.log('Worker connected to Redis')
})

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed for program ${job.data.programId}`)
})

worker.on('failed', async (job, error) => {
  if (!job) return

  console.error(`Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}):`, error.message)

  // Only mark as failed when all retries are exhausted
  if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
    console.error(`All retries exhausted for program ${job.data.programId}, marking as failed`)
    try {
      await prisma.program.update({
        where: { id: job.data.programId },
        data: { copyStatus: 'failed' },
      })
    } catch (statusError) {
      console.error('Failed to update copyStatus to failed:', statusError)
    }
  }
})

worker.on('error', (error) => {
  console.error('Worker error:', error.message)
  workerReady = false
})

// Health server for k8s probes
const healthServer = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200)
    res.end('OK')
    return
  }

  if (req.url === '/readyz') {
    if (workerReady) {
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
  console.log('Shutting down clone worker...')
  await worker.close()
  healthServer.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
