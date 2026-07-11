import { Queue } from 'bullmq'
import { logger } from '@/lib/logger'

/**
 * Publisher for the UserTrainingAggregates recompute queue (issue #919).
 *
 * Mirrors lib/queue/clone-jobs.ts: a lazy singleton Queue over REDIS_URL. The
 * job carries only a userId; the worker does a full recompute. Enqueue is
 * fire-and-forget from workout-completion routes and must never block the
 * response (callers guard failures).
 */

export const AGGREGATES_QUEUE_NAME = 'user-training-aggregates'

export interface AggregatesRecomputeJob {
  userId: string
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
    queue = new Queue(AGGREGATES_QUEUE_NAME, {
      connection: parseRedisUrl(redisUrl),
    })
  }
  return queue
}

/**
 * Closes the lazily-created singleton Queue and its Redis connection.
 * Intended for test teardown — production never needs to call this.
 */
export async function closeAggregatesJobsQueue(): Promise<void> {
  if (queue) {
    await queue.close()
    queue = null
  }
}

/**
 * Enqueue a recompute for a user. Coalesces bursts by using a per-user jobId
 * (BullMQ dedupes an id that is still waiting), so rapid successive completions
 * don't pile up redundant full recomputes.
 */
export async function publishAggregatesRecomputeJob(
  job: AggregatesRecomputeJob
): Promise<string | null> {
  const q = getQueue()

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Redis connection timeout — queue unavailable')), 5000)
  )

  const bullJob = await Promise.race([
    q.add('recompute', job, {
      // BullMQ rejects a custom jobId containing ':' (its Redis key separator),
      // so use '-'. A stable per-user id coalesces bursts.
      jobId: `aggregates-${job.userId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      // Remove terminal jobs from Redis immediately. The stable per-user jobId
      // still coalesces bursts (BullMQ ignores a re-add while a job with that
      // id is waiting/active), but a *retained* completed/failed job with that
      // id would block every future enqueue for the user — so aggregates would
      // stop updating after the first recompute. Must be true, not a count.
      removeOnComplete: true,
      removeOnFail: true,
    }),
    timeout,
  ])

  logger.info({ userId: job.userId, jobId: bullJob.id }, 'Published aggregates recompute job')
  return bullJob.id ?? null
}

/**
 * Fire-and-forget wrapper for request handlers: enqueues a recompute and
 * swallows/loggs any failure so a queue outage never breaks the completion
 * response. Returns nothing; do not await its effect on the response path.
 */
export async function enqueueAggregatesRecompute(userId: string): Promise<void> {
  try {
    await publishAggregatesRecomputeJob({ userId })
  } catch (error) {
    logger.error({ error, userId }, 'Failed to enqueue aggregates recompute (non-fatal)')
  }
}
