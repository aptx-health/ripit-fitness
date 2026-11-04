import type { Prisma, PrismaClient } from '@prisma/client'

type QueryEvents = { $on(event: 'query', cb: (e: Prisma.QueryEvent) => void): void }

const TRANSACTION = /^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)\b/i
const listeners = new WeakMap<object, Set<(query: string) => void>>()

/**
 * Runs `fn` and counts the SQL statements it sent through `prisma`, so a DB test
 * can pin "N queries however many rows". Transaction BEGIN/COMMIT aren't counted.
 * `prisma` must be built with query events, as getTestDatabase()'s client is;
 * anything else sharing the client meanwhile is counted too.
 *
 *   const { count } = await countQueries(prisma, () => GET(request))
 *   expect(count).toBeLessThanOrEqual(4)
 */
export async function countQueries<T>(
  prisma: PrismaClient,
  fn: () => Promise<T>,
): Promise<{ result: T; count: number; queries: string[] }> {
  let active = listeners.get(prisma)
  if (!active) {
    const set = new Set<(query: string) => void>()
    ;(prisma as unknown as QueryEvents).$on('query', (e) => {
      for (const listen of set) listen(e.query)
    })
    listeners.set(prisma, set)
    active = set
    // A client without query events never calls back: fail loudly rather than count 0.
    let seen = false
    const probe = () => {
      seen = true
    }
    set.add(probe)
    await prisma.$queryRawUnsafe('SELECT 1')
    set.delete(probe)
    if (!seen) throw new Error("countQueries: this client has no query events (build it with log: [{ emit: 'event', level: 'query' }])")
  }
  const queries: string[] = []
  const listen = (query: string) => {
    if (!TRANSACTION.test(query)) queries.push(query)
  }
  active.add(listen)
  try {
    const result = await fn()
    return { result, count: queries.length, queries }
  } finally {
    active.delete(listen)
  }
}
