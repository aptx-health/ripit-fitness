/**
 * Validates Prisma <-> PgBouncer configuration at boot.
 *
 * PgBouncer in transaction-mode pooling is incompatible with named prepared
 * statements. Prisma defaults to using them unless `pgbouncer=true` is set in
 * DATABASE_URL. Without the flag, queries silently fail under load with
 * `prepared statement "sN" does not exist` errors.
 *
 * `pgbouncer=true` is a Prisma-specific query parameter — non-Prisma clients
 * reading the same URL ignore it.
 *
 * In our infra, PgBouncer listens on :6432 (sidecar to Postgres pod). Direct
 * Postgres is on :5432. DIRECT_URL must NEVER point at :6432 — `prisma migrate
 * deploy` would hang on advisory locks against the pooler.
 */

export class PgBouncerConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PgBouncerConfigError'
  }
}

/** Loose env shape so callers (and tests) can pass partial maps. */
type EnvLike = {
  NODE_ENV?: string
  DATABASE_URL?: string
  DIRECT_URL?: string
}

interface AssertOptions {
  /** Logger with a `warn` method. Defaults to console. */
  logger?: { warn: (obj: object, msg: string) => void }
}

/**
 * Throws in production if Prisma is misconfigured for PgBouncer.
 * Logs a warning in dev/test instead of throwing, so local Postgres works.
 */
export function assertPgBouncerConfig(
  env: EnvLike = process.env,
  opts: AssertOptions = {}
): void {
  const isProd = env.NODE_ENV === 'production'
  const databaseUrl = env.DATABASE_URL
  const directUrl = env.DIRECT_URL
  const warn = opts.logger?.warn ?? ((o: object, m: string) => console.warn(m, o))

  if (!databaseUrl) {
    if (isProd) {
      throw new PgBouncerConfigError('DATABASE_URL is not set')
    }
    return
  }

  const dbProblems = checkDatabaseUrl(databaseUrl)
  const directProblems = checkDirectUrl(directUrl)
  const problems = [...dbProblems, ...directProblems]

  if (problems.length === 0) return

  if (isProd) {
    throw new PgBouncerConfigError(
      `PgBouncer config invalid:\n  - ${problems.join('\n  - ')}`
    )
  } else {
    warn({ problems }, 'PgBouncer config warnings (would throw in production)')
  }
}

function checkDatabaseUrl(rawUrl: string): string[] {
  const problems: string[] = []
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return [`DATABASE_URL is not a valid URL`]
  }

  // Only the :6432 port indicates PgBouncer in our infra. Direct Postgres
  // (:5432) doesn't need the flag.
  if (url.port === '6432') {
    const flag = url.searchParams.get('pgbouncer')
    if (flag !== 'true') {
      problems.push(
        'DATABASE_URL points at PgBouncer (:6432) but is missing `pgbouncer=true` query param. ' +
          'This causes intermittent `prepared statement "sN" does not exist` errors under load.'
      )
    }
  }

  return problems
}

function checkDirectUrl(rawUrl: string | undefined): string[] {
  if (!rawUrl) return []
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return [`DIRECT_URL is set but not a valid URL`]
  }

  if (url.port === '6432') {
    return [
      'DIRECT_URL points at PgBouncer (:6432). It must point at Postgres directly (:5432) — ' +
        '`prisma migrate deploy` will hang on advisory locks against the pooler.',
    ]
  }

  return []
}

/**
 * Returns true if DATABASE_URL is configured correctly for PgBouncer.
 * Used by /api/health/ready to expose config state.
 */
export function isPgBouncerConfigured(env: EnvLike = process.env): boolean {
  const url = env.DATABASE_URL
  if (!url) return false
  try {
    const parsed = new URL(url)
    if (parsed.port !== '6432') return true // direct postgres, flag not needed
    return parsed.searchParams.get('pgbouncer') === 'true'
  } catch {
    return false
  }
}
