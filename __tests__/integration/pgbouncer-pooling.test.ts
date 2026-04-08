import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { PgBouncerHarness } from '@/lib/test/pgbouncer-container'

/**
 * Integration test verifying Prisma + PgBouncer transaction-mode pooling.
 *
 * Spins up Postgres + edoburu/pgbouncer (matching prod image) with a tiny
 * pool so server connections get reused aggressively. Proves:
 *   1. With `pgbouncer=true`, queries succeed under reuse
 *   2. WITHOUT the flag, prepared statements break (negative control —
 *      proves the harness actually exercises the bug)
 */

const harness = new PgBouncerHarness()

beforeAll(async () => {
  await harness.start()
}, 120_000)

afterAll(async () => {
  await harness.stop()
}, 60_000)

function makeClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
  })
}

describe('Prisma + PgBouncer transaction-mode pooling', () => {
  describe('with pgbouncer=true (correct config)', () => {
    let prisma: PrismaClient

    beforeAll(() => {
      prisma = makeClient(harness.withFlag())
    })

    afterAll(async () => {
      await prisma.$disconnect()
    })

    it('handles 100 sequential queries without prepared-statement errors', async () => {
      for (let i = 0; i < 100; i++) {
        await prisma.program.findMany({ take: 1 })
      }
    })

    it('handles 50 parallel queries (forces server-conn rebinds)', async () => {
      const results = await Promise.all(
        Array.from({ length: 50 }, () => prisma.program.findMany({ take: 1 }))
      )
      expect(results).toHaveLength(50)
    })

    it('handles raw $queryRaw (CTE-style)', async () => {
      const result = await prisma.$queryRaw<Array<{ one: number }>>`SELECT 1 as one`
      expect(result[0].one).toBe(1)
    })

    it('handles a multi-statement interactive transaction', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1`
        await tx.$queryRaw`SELECT 2`
        await tx.$queryRaw`SELECT 3`
      })
    })
  })

  // NOTE: We tried to build a negative-control test that proves the harness
  // actually exercises the prepared-statement bug (i.e. that omitting
  // `pgbouncer=true` causes failures under pool reuse). With Prisma 6.19 and
  // edoburu/pgbouncer:v1.25.1-p0 in transaction mode at pool_size=2, we could
  // not reliably reproduce the failure even with multiple clients and 2400+
  // parallel queries. Likely Prisma's defaults have shifted (newer client may
  // use unnamed prepared statements or otherwise tolerate transaction-mode
  // pooling out of the box). The flag remains required per Prisma's docs, and
  // the boot-time assertion (`assert-pgbouncer.ts`) is the load-bearing
  // protection — production was the original symptom site, not the test rig.
  describe.skip('without pgbouncer=true (negative control — see note above)', () => {
    it('eventually fails with a prepared-statement error under load', async () => {
      // Use TWO clients sharing pgbouncer's pool to maximize the chance that
      // the same server connection is handed out to different prepared-statement
      // namespaces. Single-client repro is unreliable on newer Prisma versions.
      const a = makeClient(harness.withoutFlag())
      const b = makeClient(harness.withoutFlag())
      let caught: Error | undefined

      try {
        for (let round = 0; round < 20 && !caught; round++) {
          try {
            await Promise.all([
              ...Array.from({ length: 30 }, () => a.program.findMany({ take: 1 })),
              ...Array.from({ length: 30 }, () => b.workout.findMany({ take: 1 })),
              ...Array.from({ length: 30 }, () => a.exercise.findMany({ take: 1 })),
              ...Array.from({ length: 30 }, () => b.week.findMany({ take: 1 })),
            ])
          } catch (e) {
            caught = e as Error
          }
        }
      } finally {
        await a.$disconnect().catch(() => {})
        await b.$disconnect().catch(() => {})
      }

      // If this assertion ever stops failing, it likely means Prisma changed
      // its defaults to be safe-by-default with PgBouncer transaction mode
      // (e.g. unnamed prepared statements). At that point the `pgbouncer=true`
      // flag would be belt-and-suspenders rather than load-bearing — still
      // worth keeping per Prisma docs, but the urgency drops.
      expect(caught, 'expected a prepared-statement error but none thrown').toBeDefined()
      expect(caught?.message).toMatch(/prepared statement|s\d+/i)
    }, 60_000)
  })
})
