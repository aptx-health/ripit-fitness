/**
 * Global setup - runs once before all test files, in its own process.
 *
 * Starts one Postgres container for the whole run and pushes the schema into
 * a template database. Each test file then clones its own database from the
 * template (see lib/test/database.ts), which takes milliseconds instead of a
 * container start plus a schema push per file. Env vars set here don't reach
 * the test workers, so the connection details are handed over with `provide`.
 */
import { execSync } from 'node:child_process'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type { GlobalSetupContext } from 'vitest/node'

export const TEMPLATE_DB = 'ripit_template'

declare module 'vitest' {
  export interface ProvidedContext {
    pgAdminUrl: string
  }
}

let container: StartedPostgreSqlContainer | undefined

export async function setup({ provide }: GlobalSetupContext) {
  container = await new PostgreSqlContainer('postgres:15')
    .withDatabase(TEMPLATE_DB)
    .withUsername('test_user')
    .withPassword('test_password')
    .start()

  const templateUrl = container.getConnectionUri()
  const url = new URL(templateUrl)
  if (!['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) {
    throw new Error(`SAFETY CHECK FAILED: refusing to push schema to non-localhost database ${url.hostname}`)
  }

  execSync('npx prisma db push --force-reset --skip-generate', {
    stdio: 'pipe',
    env: {
      ...process.env,
      DATABASE_URL: templateUrl,
      DIRECT_URL: templateUrl,
      // Bypass Prisma safety check for Testcontainers (isolated Docker database, not production)
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'Testcontainer database reset for automated testing',
    },
  })

  // Workers connect to the maintenance database to clone the template.
  url.pathname = '/postgres'
  provide('pgAdminUrl', url.toString())
  console.log('🌍 Global test setup complete: one Postgres container, schema template ready')
}

export async function teardown() {
  await container?.stop()
  console.log('🌍 Global test teardown complete')
}
