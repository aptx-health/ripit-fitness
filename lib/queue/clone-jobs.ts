import { Queue } from 'bullmq'

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
    maxRetriesPerRequest: null as null,
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

  const bullJob = await q.add('clone', job, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  })

  console.log(`Published clone job for program ${job.programId}: jobId=${bullJob.id}`)
  return bullJob.id!
}
