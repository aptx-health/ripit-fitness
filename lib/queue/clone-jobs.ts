import { Queue } from 'bullmq'
import { logger } from '@/lib/logger'

const QUEUE_NAME = 'program-clone-jobs'

export interface ProgramCloneJob {
  communityProgramId: string
  programId: string
  userId: string
  programType: 'strength'
}

let queue: Queue | null = null

function parseRedisUrl(url: string) {
  const parsed = new URL(url)
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
    db: parseInt(parsed.pathname.slice(1) || '0', 10),
    maxRetriesPerRequest: null as null,
    enableKeepAlive: true,
    keepAliveInitialDelay: 30_000,
  }
}

function getQueue(): Queue {
  if (!queue) {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      throw new Error('REDIS_URL is not set')
    }

    queue = new Queue(QUEUE_NAME, {
      connection: parseRedisUrl(redisUrl),
    })
  }
  return queue
}

/**
 * Publishes a program clone job to the BullMQ queue.
 * The worker picks this up and processes the clone.
 */
export async function publishProgramCloneJob(job: ProgramCloneJob): Promise<string> {
  const q = getQueue()

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Redis connection timeout — queue unavailable')), 5000)
  )

  const bullJob = await Promise.race([q.add('clone', job, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  }), timeout])

  logger.info({ programId: job.programId, jobId: bullJob.id }, 'Published clone job')
  return bullJob.id!
}
