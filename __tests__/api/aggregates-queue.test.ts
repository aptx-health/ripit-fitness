/**
 * @vitest-environment node
 *
 * Regression guard for the aggregates recompute publisher (#919 / PR #939).
 *
 * The publisher uses a stable per-user jobId to coalesce bursts. A retained
 * terminal job under that id would make BullMQ silently ignore every later
 * enqueue for the user, so aggregates would freeze after the first recompute.
 * These tests exercise the real Queue + Worker against a Testcontainers Redis
 * (no Postgres — the compute core is tested separately) and assert that a
 * completed job does NOT block the next enqueue.
 */

import { type Job, QueueEvents, Worker } from 'bullmq'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  AGGREGATES_QUEUE_NAME,
  closeAggregatesJobsQueue,
  publishAggregatesRecomputeJob,
} from '@/lib/queue/aggregates-jobs'
import { startRedisContainer, stopRedisContainer } from '@/lib/test/redis-container'

interface AggregatesRecomputeJob {
  userId: string
}

function getConnection() {
  const parsed = new URL(process.env.REDIS_URL!)
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
    maxRetriesPerRequest: null as null,
  }
}

/** Poll until `predicate` is true or the timeout elapses. */
async function waitUntil(predicate: () => boolean, timeoutMs = 5000): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitUntil timed out after ${timeoutMs}ms`)
    }
    await new Promise((r) => setTimeout(r, 25))
  }
}

describe('Aggregates recompute queue', () => {
  let worker: Worker<AggregatesRecomputeJob>
  let queueEvents: QueueEvents
  // Every completed job id, in order — a stable jobId repeats across recomputes.
  let completed: string[] = []

  beforeAll(async () => {
    await startRedisContainer()

    queueEvents = new QueueEvents(AGGREGATES_QUEUE_NAME, { connection: getConnection() })
    worker = new Worker<AggregatesRecomputeJob>(
      AGGREGATES_QUEUE_NAME,
      // No-op processor: we're testing publish/dedup/retention semantics, not compute.
      async (job: Job<AggregatesRecomputeJob>) => {
        completed.push(job.id!)
      },
      { connection: getConnection(), concurrency: 1 }
    )
    await worker.waitUntilReady()
    await queueEvents.waitUntilReady()
  }, 60000)

  afterAll(async () => {
    await worker.close()
    await queueEvents.close()
    await closeAggregatesJobsQueue()
    await stopRedisContainer()
  }, 15000)

  afterEach(() => {
    completed = []
  })

  it('re-enqueues a fresh job after the previous one completes (retention regression)', async () => {
    completed = []
    const userId = 'queue-user-retention'

    // First completion -> first recompute job runs to completion.
    await publishAggregatesRecomputeJob({ userId })
    await waitUntil(() => completed.length === 1)

    // A later completion must enqueue and run AGAIN, despite sharing the jobId.
    // With removeOnComplete retaining the terminal job, BullMQ would ignore this
    // add and the count would stay at 1.
    await publishAggregatesRecomputeJob({ userId })
    await waitUntil(() => completed.length === 2)

    expect(completed).toEqual([`aggregates-${userId}`, `aggregates-${userId}`])
  })

  it('processes distinct users independently', async () => {
    completed = []
    await publishAggregatesRecomputeJob({ userId: 'queue-user-a' })
    await publishAggregatesRecomputeJob({ userId: 'queue-user-b' })
    await waitUntil(() => completed.length === 2)

    expect(new Set(completed)).toEqual(
      new Set(['aggregates-queue-user-a', 'aggregates-queue-user-b'])
    )
  })
})
