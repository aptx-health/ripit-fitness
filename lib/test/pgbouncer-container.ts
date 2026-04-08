import { execSync } from 'node:child_process'
import {
  GenericContainer,
  Network,
  Wait,
  type StartedNetwork,
  type StartedTestContainer,
} from 'testcontainers'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'

/**
 * Spins up Postgres + PgBouncer (transaction mode) in a shared Docker network.
 *
 * Pinned to the same PgBouncer image we run in production
 * (`edoburu/pgbouncer:v1.25.1-p0`) so test behavior matches the cluster.
 *
 * Pool size is intentionally small (DEFAULT_POOL_SIZE=2) to force server-side
 * connection reuse, which is what triggers the prepared-statement bug when
 * `pgbouncer=true` is missing from DATABASE_URL.
 */
export class PgBouncerHarness {
  private network?: StartedNetwork
  private postgres?: StartedPostgreSqlContainer
  private pgbouncer?: StartedTestContainer

  /** Connection URL routed through PgBouncer (port 6432). */
  pgbouncerUrl = ''
  /** Direct connection URL to Postgres (port 5432), used to apply schema. */
  directUrl = ''

  async start(): Promise<void> {
    this.network = await new Network().start()

    this.postgres = await new PostgreSqlContainer('postgres:15')
      .withNetwork(this.network)
      .withNetworkAliases('postgres')
      .withDatabase('ripit_test')
      .withUsername('test_user')
      .withPassword('test_password')
      .start()

    const directHost = this.postgres.getHost()
    const directPort = this.postgres.getMappedPort(5432)
    this.directUrl = `postgresql://test_user:test_password@${directHost}:${directPort}/ripit_test`

    // PgBouncer config — match our prod sidecar settings, but with a tiny pool
    // to force server-conn reuse (which is what surfaces the prepared-statement bug).
    this.pgbouncer = await new GenericContainer('edoburu/pgbouncer:v1.25.1-p0')
      .withNetwork(this.network)
      .withExposedPorts(6432)
      .withEnvironment({
        DB_HOST: 'postgres',
        DB_PORT: '5432',
        DB_USER: 'test_user',
        DB_PASSWORD: 'test_password',
        DB_NAME: 'ripit_test',
        POOL_MODE: 'transaction',
        DEFAULT_POOL_SIZE: '2',
        MAX_CLIENT_CONN: '100',
        LISTEN_PORT: '6432',
        AUTH_TYPE: 'plain',
      })
      .withWaitStrategy(Wait.forLogMessage(/process up/i))
      .start()

    const bouncerHost = this.pgbouncer.getHost()
    const bouncerPort = this.pgbouncer.getMappedPort(6432)
    this.pgbouncerUrl = `postgresql://test_user:test_password@${bouncerHost}:${bouncerPort}/ripit_test`

    // Apply Prisma schema via the DIRECT URL (PgBouncer transaction mode can't
    // run DDL safely).
    execSync('npx prisma db push --force-reset --skip-generate', {
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: this.directUrl,
        DIRECT_URL: this.directUrl,
        PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION:
          'Testcontainer database reset for automated testing',
      },
    })
  }

  /** Returns DATABASE_URL with pgbouncer=true appended. */
  withFlag(): string {
    const url = new URL(this.pgbouncerUrl)
    url.searchParams.set('pgbouncer', 'true')
    return url.toString()
  }

  /** Returns DATABASE_URL without the flag (used for the negative-control test). */
  withoutFlag(): string {
    return this.pgbouncerUrl
  }

  async stop(): Promise<void> {
    await this.pgbouncer?.stop().catch(() => {})
    await this.postgres?.stop().catch(() => {})
    await this.network?.stop().catch(() => {})
  }
}
